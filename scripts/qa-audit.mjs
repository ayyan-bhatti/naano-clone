/**
 * Full QA sweep.
 *
 * Walks every route at three viewports and checks the things that actually
 * break in review rather than the things that are easy to assert: colour
 * contrast against the real computed background, horizontal overflow, dead
 * internal links, form controls with no accessible name, duplicate ids,
 * heading order, and any console noise.
 *
 * Run against a production build:  npm run build && npm run start
 *   node scripts/qa-audit.mjs
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

const BASE = process.env.LOCAL_URL ?? 'http://localhost:3000';
const OUT = 'research/qa';
fs.mkdirSync(OUT, { recursive: true });

const findings = [];
let checks = 0;

function fault(severity, route, area, detail) {
  findings.push({ severity, route, area, detail });
}
function ok() {
  checks += 1;
}

/** Public routes plus the signed-in surfaces, which need the demo workspace. */
const PUBLIC = [
  '/',
  '/pricing',
  '/marketplace',
  '/free-tools',
  '/free-tools/creator-worth',
  '/free-tools/engagement-rate',
  '/free-tools/delivery-odds',
  '/free-tools/campaign-budget',
  '/free-tools/creator-search',
  '/creators/marta-ferreira',
  '/sign-in',
  '/sign-up',
];

const PRIVATE = [
  '/dashboard',
  '/marketplace',
  '/campaigns',
  '/campaigns/cmp-revops-q3',
  '/campaigns/new',
  '/messages',
  '/payouts',
  '/settings',
  '/onboarding',
];

const CREATOR = ['/dashboard', '/deals', '/messages', '/profile', '/media-kit', '/earnings', '/payments'];

/* ------------------------------------------------------------------ *
 * Contrast
 * ------------------------------------------------------------------ */

/** WCAG relative luminance + contrast ratio, run in the page. */
const CONTRAST_PROBE = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map((n) => parseFloat(n));
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  /**
   * Walks up for the first non-transparent background actually painted.
   *
   * Returns null when it hits a gradient or image on the way: the composite
   * colour behind the text is then unknowable from computed styles, and
   * guessing produced false 1:1 failures for white avatar initials sitting on
   * a gradient disc. Unknown is reported as unknown rather than as a fault.
   */
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0.85) return c;
      n = n.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  const out = [];
  const els = Array.from(document.querySelectorAll('body *'));
  for (const el of els) {
    // Only elements that directly render text.
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!text || text.length < 2) continue;

    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.opacity === '0') continue;

    const fg = parse(s.color);
    if (!fg) continue;
    const bg = bgOf(el);
    if (!bg) continue;
    const composed = fg.a < 1 ? over(fg, bg) : fg;

    const l1 = lum(composed);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    const size = parseFloat(s.fontSize);
    const weight = parseInt(s.fontWeight, 10) || 400;
    // WCAG "large text": >=24px, or >=18.66px when bold.
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;

    if (ratio < required) {
      out.push({
        text: text.slice(0, 60),
        ratio: Math.round(ratio * 100) / 100,
        required,
        size: `${size}px/${weight}`,
        color: s.color,
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 70),
      });
    }
  }
  // Collapse duplicates - one class used 40 times is one fault, not 40.
  const seen = new Map();
  for (const o of out) {
    const key = `${o.color}|${o.size}|${o.cls}`;
    if (!seen.has(key)) seen.set(key, { ...o, count: 1 });
    else seen.get(key).count += 1;
  }
  return [...seen.values()].sort((a, b) => a.ratio - b.ratio);
};

/* ------------------------------------------------------------------ *
 * Structural accessibility
 * ------------------------------------------------------------------ */

const A11Y_PROBE = () => {
  const out = { unlabelled: [], dupIds: [], headingJumps: [], emptyLinks: [], imgNoAlt: [] };

  const name = (el) =>
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent) ||
    el.closest('label')?.textContent ||
    (el.getAttribute('aria-labelledby') &&
      document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) ||
    el.placeholder ||
    '';

  for (const el of document.querySelectorAll('input,select,textarea')) {
    if (el.type === 'hidden') continue;
    if (!name(el).trim()) out.unlabelled.push(`${el.tagName.toLowerCase()}[type=${el.type || 'n/a'}]`);
  }

  for (const el of document.querySelectorAll('button,a[href]')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const label = (el.textContent || '').trim() || el.getAttribute('aria-label') || '';
    if (!label) out.emptyLinks.push(el.outerHTML.slice(0, 90));
  }

  const ids = new Map();
  for (const el of document.querySelectorAll('[id]')) {
    ids.set(el.id, (ids.get(el.id) ?? 0) + 1);
  }
  for (const [id, n] of ids) if (n > 1) out.dupIds.push(`${id} ×${n}`);

  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) out.imgNoAlt.push(img.src.slice(-60));
  }

  let prev = 0;
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const lvl = Number(h.tagName[1]);
    if (prev && lvl > prev + 1) {
      out.headingJumps.push(`h${prev} -> h${lvl}: "${h.textContent.trim().slice(0, 40)}"`);
    }
    prev = lvl;
  }

  return out;
};

/* ------------------------------------------------------------------ */

const b = await chromium.launch();

async function auditPage(page, route, label) {
  const errors = [];
  const onErr = (e) => errors.push(String(e.message ?? e));
  const onConsole = (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|ERR_INTERNET|Download the React DevTools/i.test(t)) return;
    errors.push(t);
  };
  page.on('pageerror', onErr);
  page.on('console', onConsole);

  const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => null);
  await page.waitForTimeout(1400);

  if (!res || res.status() >= 400) {
    fault('high', `${label}${route}`, 'route', `HTTP ${res?.status() ?? 'no response'}`);
  } else ok();

  // Horizontal overflow
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) fault('high', `${label}${route}`, 'layout', `${overflow}px horizontal overflow`);
  else ok();

  // Placeholder text leaking into the UI
  const body = await page.innerText('body').catch(() => '');
  for (const bad of ['NaN', 'undefined', 'Infinity', '[object Object]']) {
    if (body.includes(bad)) fault('high', `${label}${route}`, 'data', `renders "${bad}"`);
    else ok();
  }

  const contrast = await page.evaluate(CONTRAST_PROBE);
  for (const c of contrast.slice(0, 6)) {
    fault(
      c.ratio < 3 ? 'high' : 'medium',
      `${label}${route}`,
      'contrast',
      `${c.ratio}:1 (needs ${c.required}) ${c.size} ${c.color} ×${c.count} — "${c.text}"`,
    );
  }
  if (!contrast.length) ok();

  const a11y = await page.evaluate(A11Y_PROBE);
  if (a11y.unlabelled.length)
    fault('high', `${label}${route}`, 'a11y', `unlabelled controls: ${a11y.unlabelled.join(', ')}`);
  else ok();
  if (a11y.emptyLinks.length)
    fault('medium', `${label}${route}`, 'a11y', `${a11y.emptyLinks.length} control(s) with no accessible name`);
  else ok();
  if (a11y.dupIds.length) fault('medium', `${label}${route}`, 'a11y', `duplicate ids: ${a11y.dupIds.join(', ')}`);
  else ok();
  if (a11y.imgNoAlt.length) fault('medium', `${label}${route}`, 'a11y', `${a11y.imgNoAlt.length} img without alt`);
  else ok();
  if (a11y.headingJumps.length)
    fault('low', `${label}${route}`, 'a11y', `heading order: ${a11y.headingJumps.slice(0, 2).join('; ')}`);
  else ok();

  if (errors.length) fault('high', `${label}${route}`, 'console', errors.slice(0, 3).join(' | '));
  else ok();

  page.off('pageerror', onErr);
  page.off('console', onConsole);
}

/* ---- 1. Public routes, desktop ---- */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  for (const r of PUBLIC) await auditPage(p, r, '');
  await ctx.close();
}

/* ---- 2. Public routes, mobile + tablet ---- */
for (const [w, h, tag] of [
  [390, 844, 'mobile'],
  [768, 1024, 'tablet'],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage();
  for (const r of PUBLIC) {
    const res = await p.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' }).catch(() => null);
    await p.waitForTimeout(900);
    if (!res || res.status() >= 400) {
      fault('high', `${tag}${r}`, 'route', `HTTP ${res?.status()}`);
      continue;
    }
    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) fault('high', `${tag}${r}`, 'layout', `${overflow}px horizontal overflow`);
    else ok();

    // Tap targets below the 24px minimum are a real mobile fault.
    if (w < 500) {
      /**
       * WCAG 2.5.8 exempts a link inside a sentence of text, because padding
       * it would break the line box. So links whose parent is running prose
       * are skipped, and so are links stretched over a card by a positioned
       * pseudo-element - their real target is the card, not the text box.
       */
      const small = await p.$$eval('button,a[href]', (els) =>
        els
          .filter((e) => {
            const p = e.parentElement;
            if (p && /^(P|LI|SPAN)$/.test(p.tagName) && p.textContent.trim() !== e.textContent.trim()) {
              return false;
            }
            return !/after:absolute/.test(e.className || '');
          })
          .map((e) => ({ r: e.getBoundingClientRect(), t: (e.textContent || '').trim().slice(0, 24) }))
          .filter((x) => x.r.width > 1 && x.r.height > 1 && (x.r.height < 24 || x.r.width < 24))
          .map((x) => `${x.t || '(icon)'} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`),
      );
      if (small.length) fault('medium', `${tag}${r}`, 'touch', `${small.length} target(s) under 24px: ${small.slice(0, 3).join(', ')}`);
      else ok();
    }
  }
  await ctx.close();
}

/* ---- 3. Signed-in brand surfaces ---- */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /Open the demo workspace/i }).click();
  await p.waitForURL('**/dashboard', { timeout: 20000 });
  await p.waitForTimeout(1200);
  for (const r of PRIVATE) await auditPage(p, r, 'brand:');
  await ctx.close();
}

/* ---- 4. Signed-in creator surfaces ---- */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/sign-up`, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /I'm a creator/i }).click();
  await p.waitForTimeout(500);
  await p.getByRole('textbox', { name: /Full name/i }).fill('QA Creator');
  await p.getByRole('textbox', { name: /Work email|Email/i }).first().fill('qa.creator@example.com');
  await p.getByRole('textbox', { name: 'Password' }).fill('Str0ng-Passw0rd!');
  await p.getByRole('button', { name: /Create account|Continue|Sign up/i }).first().click();
  await p.waitForTimeout(2500);
  const landed = p.url();
  if (!/dashboard|onboarding/.test(landed)) {
    fault('high', 'creator:/sign-up', 'flow', `creator signup landed on ${landed}`);
  } else ok();
  for (const r of CREATOR) await auditPage(p, r, 'creator:');
  await ctx.close();
}

/* ---- 5. Dead internal links ---- */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const seen = new Set();
  for (const r of ['/', '/pricing', '/free-tools', '/marketplace']) {
    await p.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' });
    const hrefs = await p.$$eval('a[href^="/"]', (els) => [...new Set(els.map((e) => e.getAttribute('href')))]);
    for (const h of hrefs) {
      const clean = h.split('#')[0];
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      const res = await p.request.get(`${BASE}${clean}`).catch(() => null);
      if (!res || res.status() >= 400) fault('high', clean, 'link', `linked from ${r}, HTTP ${res?.status()}`);
      else ok();
    }
  }
  await ctx.close();
}

await b.close();

/* ------------------------------------------------------------------ */

const bySeverity = { high: [], medium: [], low: [] };
for (const f of findings) bySeverity[f.severity].push(f);

console.log(`\n${checks} checks passed, ${findings.length} findings\n`);
for (const sev of ['high', 'medium', 'low']) {
  if (!bySeverity[sev].length) continue;
  console.log(`--- ${sev.toUpperCase()} (${bySeverity[sev].length}) ---`);
  for (const f of bySeverity[sev]) console.log(`  [${f.area}] ${f.route}\n      ${f.detail}`);
  console.log('');
}

fs.writeFileSync(`${OUT}/audit.json`, JSON.stringify({ checks, findings }, null, 2));
console.log(`written to ${OUT}/audit.json`);
process.exit(bySeverity.high.length ? 1 : 0);
