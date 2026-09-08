/**
 * Pulls naano.com's real design system out of the live site.
 *
 * Reading colours off a screenshot is guesswork; this reads computed styles
 * from the rendered DOM, so what comes back is what the browser actually
 * painted - fonts, the exact palette in use ranked by how much of the page
 * uses it, radii, shadows, heading scale and button treatments.
 *
 *   node scripts/extract-design.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'research/reference';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['home', 'https://naano.com/'],
  ['pricing', 'https://naano.com/pricing'],
  ['creators', 'https://naano.com/creators'],
  ['register', 'https://naano.com/register?role=saas'],
];

const extract = () => {
  const tally = (map, key) => {
    if (!key) return;
    map.set(key, (map.get(key) ?? 0) + 1);
  };
  const top = (map, n = 14) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}  ×${v}`);

  const colors = new Map();
  const bgs = new Map();
  const fonts = new Map();
  const radii = new Map();
  const shadows = new Map();
  const borders = new Map();

  const all = Array.from(document.querySelectorAll('body *')).slice(0, 4000);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const s = getComputedStyle(el);
    if (el.textContent?.trim()) tally(colors, s.color);
    if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') tally(bgs, s.backgroundColor);
    tally(fonts, s.fontFamily.split(',')[0].replace(/["']/g, ''));
    if (s.borderRadius !== '0px') tally(radii, s.borderRadius);
    if (s.boxShadow !== 'none') tally(shadows, s.boxShadow);
    if (s.borderTopWidth !== '0px') tally(borders, `${s.borderTopWidth} ${s.borderTopColor}`);
  }

  const typeOf = (sel) =>
    Array.from(document.querySelectorAll(sel))
      .slice(0, 4)
      .map((el) => {
        const s = getComputedStyle(el);
        return {
          text: el.textContent.trim().slice(0, 70),
          font: s.fontFamily.split(',')[0].replace(/["']/g, ''),
          size: s.fontSize,
          weight: s.fontWeight,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing,
          color: s.color,
        };
      });

  const buttons = Array.from(document.querySelectorAll('a[class],button'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.height > 28 && r.width > 60 && s.backgroundColor !== 'rgba(0, 0, 0, 0)';
    })
    .slice(0, 8)
    .map((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        text: el.textContent.trim().slice(0, 40),
        bg: s.backgroundColor,
        color: s.color,
        radius: s.borderRadius,
        height: Math.round(r.height),
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        border: `${s.borderTopWidth} ${s.borderTopColor}`,
        shadow: s.boxShadow,
      };
    });

  const body = getComputedStyle(document.body);

  return {
    title: document.title,
    body: { bg: body.backgroundColor, color: body.color, font: body.fontFamily },
    fonts: top(fonts),
    textColors: top(colors),
    backgrounds: top(bgs),
    radii: top(radii),
    shadows: top(shadows, 8),
    borders: top(borders, 8),
    h1: typeOf('h1'),
    h2: typeOf('h2'),
    h3: typeOf('h3'),
    p: typeOf('p'),
    buttons,
    sectionCount: document.querySelectorAll('section').length,
    // Anything loaded from a font service tells us the family without guessing.
    fontLinks: Array.from(document.querySelectorAll('link[rel="stylesheet"],link[rel="preload"]'))
      .map((l) => l.href)
      .filter((h) => /font/i.test(h))
      .slice(0, 6),
  };
};

const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
});
const report = {};

for (const [name, url] of PAGES) {
  const p = await ctx.newPage();
  try {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await p.waitForTimeout(2500);
    report[name] = await p.evaluate(extract);
    await p.screenshot({ path: `${OUT}/naano-${name}.png` });
    await p.screenshot({ path: `${OUT}/naano-${name}-full.png`, fullPage: true });
    console.log(`captured ${name}`);
  } catch (e) {
    report[name] = { error: e.message };
    console.log(`FAILED  ${name} — ${e.message}`);
  }
  await p.close();
}

fs.writeFileSync(`${OUT}/design-tokens.json`, JSON.stringify(report, null, 2));
console.log(`\nwrote ${OUT}/design-tokens.json`);
await b.close();
