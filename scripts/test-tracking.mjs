/**
 * End-to-end proof that tracked links record real events.
 *
 * Loads the demo workspace, reads a campaign's click count, opens the tracked
 * link, and asserts the count actually moved - and that a creator variant is
 * attributed to that creator rather than to the campaign as a whole.
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

const BASE = process.env.LOCAL_URL ?? 'http://localhost:3000';
let pass = 0, fail = 0;
const check = (n, ok, d='') => { ok ? pass++ : fail++; console.log(`${ok?'PASS':'FAIL'}  ${n}${d?` — ${d}`:''}`); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));

// 1. Load the seeded demo workspace.
await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
await p.getByRole('button', { name: /Open the demo workspace/i }).click();
await p.waitForURL('**/dashboard', { timeout: 20000 });
await p.waitForTimeout(1200);

const clicksBefore = await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('vouch.state.v1') || '{}');
  return (s.clicks || []).length;
});
check('demo workspace starts with no recorded clicks', clicksBefore === 0, `${clicksBefore}`);

// 2. Read the campaign's tracking code straight from the store.
const { code, campaignId, creatorId } = await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('vouch.state.v1') || '{}');
  const c = (s.campaigns || []).find(x => x.status === 'live');
  const published = c.collaborations.find(x => x.status === 'published');
  return { code: c.brief.trackingCode, campaignId: c.id, creatorId: published.creatorId };
});
check('found a live campaign with a tracking code', Boolean(code), code);

// 3. Campaign-level link.
await p.goto(`${BASE}/l/${code}`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
let body = await p.textContent('body');
check('interstitial confirms the click', /Click recorded/i.test(body));
check('shows an observed device', /observed/i.test(body));

let stored = await p.evaluate(() => JSON.parse(localStorage.getItem('vouch.state.v1') || '{}').clicks || []);
check('one click persisted', stored.length === 1, `${stored.length}`);
check('click carries a real timestamp', Boolean(stored[0]?.timestamp));
check('campaign-level click has no creator', stored[0]?.creatorId === null);

// 4. Creator variant.
await p.goto(`${BASE}/l/${code}?c=${creatorId}`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
stored = await p.evaluate(() => JSON.parse(localStorage.getItem('vouch.state.v1') || '{}').clicks || []);
check('second click persisted', stored.length === 2, `${stored.length}`);
check('creator variant attributed to that creator',
  stored.some(c => c.creatorId === creatorId), creatorId);

// 5. The campaign page reflects it.
await p.goto(`${BASE}/campaigns/${campaignId}`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
body = await p.textContent('body');
check('campaign shows live clicks recorded', /2 recorded/.test(body));
check('campaign lists the click events', /campaign link|via /.test(body));
check('no NaN on campaign after clicks', !body.includes('NaN'));

// 6. Unknown code degrades honestly.
await p.goto(`${BASE}/l/definitelynotreal`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
body = await p.textContent('body');
check('unknown code shows a real not-found state', /does not resolve/i.test(body));

check('no page errors throughout', errors.length === 0, errors.slice(0,2).join(' | '));

console.log(`\n${pass}/${pass+fail} passed`);
await b.close();
process.exit(fail === 0 ? 0 : 1);
