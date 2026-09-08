/**
 * Visual + behavioural QA.
 *
 * Two jobs in one run:
 *
 *  1. Capture naano.com and our build at matched viewports so the two can be
 *     compared side by side rather than from memory.
 *  2. Actually drive our free tools and auth pages in a real browser - typing
 *     into fields, reading the rendered result, checking console errors. That
 *     is the gap the calculator unit tests could not close.
 *
 * Playwright is installed with --no-save and is not a project dependency: it is
 * a QA tool, not part of the app.
 *
 *   node scripts/qa-compare.mjs
 */

/*
 * Navigation waits use 'domcontentloaded', not 'networkidle'.
 *
 * The signup panel embeds a Spline scene that fires roughly sixty requests and
 * keeps streaming for a dozen seconds. 'networkidle' waits for the network to
 * go quiet, so once that page exists it either times out or bleeds into the
 * next navigation on the same page object. Every goto here is followed by an
 * explicit settle timeout, which is what these assertions actually depend on.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'research/qa';
const LOCAL = process.env.LOCAL_URL ?? 'http://localhost:3000';
const REAL = 'https://naano.com';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

fs.mkdirSync(OUT, { recursive: true });

const results = { shots: [], checks: [], consoleErrors: [] };

function check(name, ok, detail = '') {
  results.checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function shoot(page, name, opts = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: Boolean(opts.fullPage) });
  results.shots.push(file);
  console.log(`  shot  ${file}`);
}

/** Collects console errors for the page it is attached to. */
function watchConsole(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Favicon/404 noise from third-party pages is not our problem.
      if (/favicon|net::ERR_|Failed to load resource/i.test(text)) return;
      results.consoleErrors.push({ label, text });
    }
  });
  page.on('pageerror', (err) => {
    results.consoleErrors.push({ label, text: `pageerror: ${err.message}` });
  });
}

async function main() {
  const browser = await chromium.launch();

  /* ---------------- The real product ---------------- */
  console.log('\n=== naano.com ===');
  const realCtx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1 });
  const real = await realCtx.newPage();

  for (const [name, url] of [
    ['naano-home', REAL],
    ['naano-free-tools', `${REAL}/free-tools`],
    ['naano-worth', `${REAL}/free-tools/linkedin-creator-worth-calculator`],
    ['naano-pricing', `${REAL}/pricing`],
  ]) {
    try {
      await real.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // Dismiss the cookie bar so it does not cover the design in every shot.
      for (const label of ['Reject', 'Allow']) {
        const btn = real.getByRole('button', { name: label }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click().catch(() => {});
          break;
        }
      }
      await real.waitForTimeout(1200);
      await shoot(real, name);
    } catch (e) {
      console.log(`  skip  ${name} — ${e.message.split('\n')[0]}`);
    }
  }

  // Mobile view of their landing, for the responsive comparison.
  const realMobileCtx = await browser.newContext({ viewport: MOBILE, isMobile: true, hasTouch: true });
  const realMobile = await realMobileCtx.newPage();
  try {
    await realMobile.goto(REAL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await realMobile.waitForTimeout(1000);
    await shoot(realMobile, 'naano-home-mobile');
  } catch (e) {
    console.log(`  skip  naano mobile — ${e.message.split('\n')[0]}`);
  }
  await realCtx.close();
  await realMobileCtx.close();

  /* ---------------- Ours ---------------- */
  console.log('\n=== ours ===');
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  watchConsole(page, 'ours');

  for (const [name, route] of [
    ['ours-home', '/'],
    ['ours-free-tools', '/free-tools'],
    ['ours-marketplace', '/marketplace'],
    ['ours-sign-up', '/sign-up'],
  ]) {
    await page.goto(`${LOCAL}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2200);
    await shoot(page, name);
  }

  /* ---------------- Behaviour: the free tools ---------------- */
  console.log('\n--- engagement rate ---');
  await page.goto(`${LOCAL}/free-tools/engagement-rate`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Follower count').fill('5000');
  await page.getByLabel('Average reactions per post').fill('120');
  await page.getByLabel('Average comments per post').fill('18');
  await page.getByLabel('Average reposts per post').fill('6');
  await page.waitForTimeout(700);
  let body = await page.textContent('body');
  check('engagement rate renders 2.88%', body.includes('2.88%'), body.match(/[\d.]+%/g)?.slice(0, 3).join(' '));
  check('engagement verdict shown', /Healthy|Excellent|Below benchmark/.test(body));
  check('no NaN on screen', !body.includes('NaN'));
  await shoot(page, 'ours-tool-engagement-result');

  // Zero / empty handling
  await page.getByLabel('Follower count').fill('0');
  await page.waitForTimeout(600);
  body = await page.textContent('body');
  check('zero followers falls back to idle', body.includes('Enter your numbers to calculate'));
  check('no NaN at zero', !body.includes('NaN'));

  // Reset
  await page.getByLabel('Follower count').fill('4000');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Reset the form' }).click();
  await page.waitForTimeout(500);
  check('reset clears the form', (await page.getByLabel('Follower count').inputValue()) === '');

  console.log('\n--- creator worth ---');
  await page.goto(`${LOCAL}/free-tools/creator-worth`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Follower count').fill('10000');
  await page.getByLabel('Average reactions per post').fill('300');
  await page.getByLabel('Average comments per post').fill('50');
  await page.waitForTimeout(700);
  body = await page.textContent('body');
  check('worth renders €290', body.includes('€290'), body.match(/€[\d,]+/g)?.slice(0, 4).join(' '));
  check('worth shows excellent rating', body.includes('Excellent'));
  check('worth shows step breakdown', body.includes('Base value'));
  check('no NaN on worth', !body.includes('NaN'));
  await shoot(page, 'ours-tool-worth-result');

  console.log('\n--- campaign budget ---');
  await page.goto(`${LOCAL}/free-tools/campaign-budget`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Campaign budget (€)').fill('5000');
  await page.waitForTimeout(800);
  body = await page.textContent('body');
  check('budget books 59 posts', body.includes('59'), 'expected 59 booked at €84');
  check('budget shows published expectation', body.includes('17.9'), 'expected 17.9 published');
  check('no NaN on budget', !body.includes('NaN'));
  await shoot(page, 'ours-tool-budget-result', { fullPage: true });

  console.log('\n--- delivery odds ---');
  await page.goto(`${LOCAL}/free-tools/delivery-odds`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Your offer per post (€)').fill('150');
  await page.waitForTimeout(700);
  body = await page.textContent('body');
  check('delivery shows 30.4%', body.includes('30.4'));
  check('delivery shows upgrade prompt', /moves this into/.test(body));
  check('no NaN on delivery', !body.includes('NaN'));
  await shoot(page, 'ours-tool-delivery-result');

  console.log('\n--- creator search ---');
  await page.goto(`${LOCAL}/free-tools/creator-search`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('What do you sell?').fill('RevOps automation for sales teams');
  await page.getByLabel('Who do you want to reach?').fill('RevOps managers and sales leaders');
  await page.waitForTimeout(900);
  body = await page.textContent('body');
  check('search returns ranked creators', /Fit score/.test(body));
  check('search detects personas', /RevOps|Sales leaders/.test(body));
  check('no NaN on search', !body.includes('NaN'));
  await shoot(page, 'ours-tool-search-result');

  /* ---------------- Behaviour: auth + crowd ---------------- */
  console.log('\n--- sign-up crowd ---');
  await page.goto(`${LOCAL}/sign-up`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /I'm a brand/ }).click();
  await page.waitForTimeout(600);
  await page.getByLabel('Full name').fill('Ayyan Bhatti');
  await page.waitForTimeout(500);
  await shoot(page, 'ours-crowd-watching');
  await page.getByRole('textbox', { name: 'Password' }).fill('supersecret123');
  await page.waitForTimeout(700);
  await shoot(page, 'ours-crowd-away');
  await page.waitForTimeout(2200); // let the peek build
  await shoot(page, 'ours-crowd-peeking');
  check('password field present and typed', (await page.getByRole('textbox', { name: 'Password' }).inputValue()).length > 0);

  /* ---------------- Mobile ---------------- */
  console.log('\n--- mobile ---');
  const mobileBrowser = await chromium.launch();
  const mCtx = await mobileBrowser.newContext({ viewport: MOBILE, isMobile: true, hasTouch: true });
  const mobile = await mCtx.newPage();
  watchConsole(mobile, 'ours-mobile');
  for (const [name, route] of [
    ['ours-home-mobile', '/'],
    ['ours-free-tools-mobile', '/free-tools'],
    ['ours-budget-mobile', '/free-tools/campaign-budget'],
    ['ours-marketplace-mobile', '/marketplace'],
  ]) {
    await mobile.goto(`${LOCAL}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await mobile.waitForTimeout(2200);
    await shoot(mobile, name);
    // Horizontal overflow is the classic responsive failure.
    const overflow = await mobile.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`${name}: no horizontal overflow`, overflow <= 1, `${overflow}px`);
  }
  await mCtx.close();
  await mobileBrowser.close();

  /* ---------------- Report ---------------- */
  const failed = results.checks.filter((c) => !c.ok);
  console.log(`\n${results.checks.length - failed.length}/${results.checks.length} checks passed`);
  console.log(`${results.shots.length} screenshots in ${OUT}/`);
  if (results.consoleErrors.length) {
    console.log(`\nConsole errors (${results.consoleErrors.length}):`);
    results.consoleErrors.slice(0, 12).forEach((e) => console.log(`  [${e.label}] ${e.text}`));
  } else {
    console.log('No console errors.');
  }
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('QA run failed:', e);
  process.exit(1);
});
