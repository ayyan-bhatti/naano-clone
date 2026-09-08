/**
 * Motion safety net.
 *
 * The failure mode of scroll-driven animation is not that it looks wrong - it
 * is that something never arrives and the visitor reads a blank section. So
 * this asserts the opposite of what a demo video would: that every animated
 * element ends up visible, that reduced motion renders the final state with no
 * animation at all, and that nothing is left mid-tween after a fast scroll to
 * the bottom.
 *
 * Run against a production build:  npm run build && npm start
 */
import { chromium } from 'playwright';

const BASE = process.env.LOCAL_URL ?? 'http://localhost:3000';
let pass = 0,
  fail = 0;
const check = (n, ok, d = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`);
};

const b = await chromium.launch();

/** Every element that any of our animations touches. */
const ANIMATED = '[data-line],[data-word],[data-card],[data-node],[data-number]';

/** Reads computed opacity for a selector, returning the minimum found. */
const minOpacity = (page, sel) =>
  page.$$eval(sel, (els) =>
    els.length
      ? Math.min(
          ...els
            .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
            .map((e) => parseFloat(getComputedStyle(e).opacity)),
        )
      : 1,
  );

/* ================================================================== *
 * 1. Motion on
 * ================================================================== */

{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await p.goto(BASE, { waitUntil: 'networkidle' });

  // The hero must resolve without any scrolling at all.
  await p.waitForTimeout(2600);
  const heroLines = await p.$$eval('h1 [data-line]', (els) =>
    els.map((e) => ({
      text: e.textContent.trim(),
      opacity: parseFloat(getComputedStyle(e).opacity),
      y: e.getBoundingClientRect().top,
    })),
  );
  check('hero headline split into lines', heroLines.length === 2, String(heroLines.length));
  check('hero headline is fully visible', heroLines.every((l) => l.opacity > 0.99), JSON.stringify(heroLines.map((l) => l.opacity)));
  check('hero headline is on screen', heroLines.every((l) => l.y > 0 && l.y < 900));
  check('hero headline still reads correctly', heroLines[0]?.text === 'The creators your');

  const heroWords = await p.$$eval('[data-word]', (els) =>
    els.map((e) => parseFloat(getComputedStyle(e).opacity)),
  );
  check('hero copy split into words', heroWords.length > 15, String(heroWords.length));
  check('every hero word arrived', heroWords.every((o) => o > 0.99));

  const heroText = await p.innerText('h1');
  check('no words were dropped by splitting', /trace the clicks/i.test(await p.innerText('main')));
  check('headline text intact', /creators your/i.test(heroText) && /already trust/i.test(heroText));

  // Scroll the whole page in steps, the way a person does.
  const height = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await p.waitForTimeout(90);
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(2200);

  const lowest = await minOpacity(p, ANIMATED);
  check('nothing is left invisible after scrolling', lowest > 0.99, `min opacity ${lowest}`);

  // The counters must land on their real values, not stop mid-count.
  const numbers = await p.$$eval('[data-number]', (els) =>
    els.map((e) => ({ shown: e.textContent.trim(), target: e.dataset.value, format: e.dataset.format })),
  );
  check('the attribution scene has four figures', numbers.length === 4, String(numbers.length));
  const expected = { number: (v) => new Intl.NumberFormat('en-GB').format(v) };
  check(
    'impressions counted to the real value',
    numbers[0]?.shown === expected.number(42800),
    numbers[0]?.shown,
  );
  check('clicks counted to the real value', numbers[1]?.shown === '312', numbers[1]?.shown);
  check('leads counted to the real value', numbers[2]?.shown === '18', numbers[2]?.shown);
  check('pipeline counted to a euro value', /^€48,200$/.test(numbers[3]?.shown ?? ''), numbers[3]?.shown);
  check('no figure is stuck at zero', numbers.every((n) => !/^(0|€0)$/.test(n.shown)));

  // The scroll progress bar should be full at the bottom.
  const scaleX = await p.$eval('[data-bar]', (e) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(e).transform);
    return m.a;
  });
  check('scroll progress reaches the end', scaleX > 0.95, String(scaleX.toFixed(3)));

  // Scrolling back up must not un-render anything.
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(900);
  const afterUp = await minOpacity(p, 'h1 [data-line],[data-word]');
  check('scrolling back up leaves the hero intact', afterUp > 0.99, String(afterUp));

  check('no console or page errors with motion on', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================================================================== *
 * 2. Reduced motion
 * ================================================================== */

{
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);

  // Nothing should have been touched: no splitting, no hidden starting state.
  const reduced = await minOpacity(p, '[data-line],[data-card],[data-number]');
  check('reduced motion renders everything immediately', reduced > 0.99, String(reduced));

  const split = await p.$$eval('[data-word]', (els) => els.length);
  check('reduced motion does not split text at all', split === 0, String(split));

  const text = await p.innerText('h1');
  check('reduced motion headline is complete', /creators your/i.test(text) && /already trust/i.test(text));

  const nums = await p.$$eval('[data-number]', (els) => els.map((e) => e.textContent.trim()));
  check('reduced motion shows final figures, not zeros', nums.every((n) => !/^(0|€0)$/.test(n)), nums.join(','));
  check('reduced motion pipeline figure is correct', nums[3] === '€48,200', nums[3]);

  // The progress bar is inert but must not cover content or catch clicks.
  const pe = await p.$eval('[data-bar]', (e) => getComputedStyle(e.parentElement).pointerEvents);
  check('scroll progress never intercepts clicks', pe === 'none', pe);

  check('no console or page errors with reduced motion', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================================================================== *
 * 3. Mobile
 * ================================================================== */

{
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));

  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2200);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1800);

  const lowest = await minOpacity(p, ANIMATED);
  check('mobile: nothing left invisible', lowest > 0.99, String(lowest));

  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check('mobile: no horizontal overflow', overflow <= 0, `${overflow}px`);

  const traceVisible = await p.$$eval('[data-node]', (els) => els.length);
  check('mobile: the attribution chain still renders', traceVisible === 4, String(traceVisible));

  check('mobile: no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
await b.close();
process.exit(fail === 0 ? 0 : 1);
