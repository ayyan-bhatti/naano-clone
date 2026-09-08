/**
 * Functional inventory of naano.com.
 *
 * Walks the public surface and records what each page actually *does* -
 * headings, forms, inputs, buttons - so the gap analysis is based on observed
 * capability rather than recollection. Does not create an account or submit
 * anything; it reads forms, it does not fill them.
 *
 *   node scripts/feature-audit.mjs
 */

import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'https://naano.com';

const ROUTES = [
  '/',
  '/creators',
  '/agencies',
  '/about',
  '/pricing',
  '/reports',
  '/book',
  '/selection',
  '/register',
  '/register?role=saas',
  '/login',
  '/case-studies/blogseo',
];

const out = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const route of ROUTES) {
  const entry = { route, ok: false };
  try {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    entry.status = res?.status() ?? 0;
    await page.waitForTimeout(2200);

    entry.ok = true;
    entry.title = await page.title();

    entry.data = await page.evaluate(() => {
      const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

      const inputs = [...document.querySelectorAll('input, textarea, select')]
        .map((el) => {
          const label =
            el.getAttribute('aria-label') ||
            el.getAttribute('placeholder') ||
            el.getAttribute('name') ||
            document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() ||
            '';
          return `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ''}: ${label}`.slice(0, 80);
        })
        .filter(Boolean);

      const buttons = [...document.querySelectorAll('button, a[role=button]')]
        .map((b) => text(b))
        .filter((t) => t && t.length < 45);

      return {
        h1: [...document.querySelectorAll('h1')].map(text).slice(0, 3),
        h2: [...document.querySelectorAll('h2')].map(text).slice(0, 12),
        inputs: [...new Set(inputs)].slice(0, 20),
        buttons: [...new Set(buttons)].slice(0, 18),
        forms: document.querySelectorAll('form').length,
      };
    });
  } catch (e) {
    entry.error = e.message.split('\n')[0];
  }
  out.push(entry);
  console.log(`${entry.status ?? '---'}  ${route}  ${entry.error ?? entry.title ?? ''}`);
}

await browser.close();

fs.mkdirSync('research', { recursive: true });
fs.writeFileSync('research/naano-feature-audit.json', JSON.stringify(out, null, 2));
console.log('\nwritten: research/naano-feature-audit.json');

// Compact console summary for the routes that matter most.
for (const e of out) {
  if (!e.data) continue;
  if (!['/register?role=saas', '/selection', '/reports', '/agencies', '/book'].includes(e.route)) continue;
  console.log(`\n=== ${e.route} ===`);
  console.log('H1:', e.data.h1.join(' | '));
  console.log('H2:', e.data.h2.slice(0, 6).join(' | '));
  console.log('inputs:', e.data.inputs.join(' ; ') || 'none');
  console.log('buttons:', e.data.buttons.slice(0, 10).join(' ; '));
}
