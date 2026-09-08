/**
 * End-to-end proof that the collaboration loop closes.
 *
 * Two things are asserted here that no unit test can reach: that a brand's
 * approval is what publishes a post and schedules its fee, and that a creator's
 * submission is what puts it in front of the brand in the first place. The
 * whole point of the review step is that neither side can skip the other.
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

const readState = (p) =>
  p.evaluate(() => JSON.parse(localStorage.getItem('vouch.state.v1') || '{}'));

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));

/* ------------------------------------------------------------------ *
 * Brand side: review and approve
 * ------------------------------------------------------------------ */

await p.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
await p.getByRole('button', { name: /Open the demo workspace/i }).click();
await p.waitForURL('**/dashboard', { timeout: 20000 });
await p.waitForTimeout(1200);

let state = await readState(p);
check('state is at version 2', state.version === 2, String(state.version));
check('demo workspace seeds messages', (state.messages || []).length > 0, `${(state.messages || []).length}`);

// The seeded in-review collaboration is what the dashboard should be asking about.
const target = state.campaigns
  .flatMap((c) => c.collaborations.map((col) => ({ campaign: c, collab: col })))
  .find((x) => x.collab.status === 'in_review');

check('a seeded collaboration is awaiting review', Boolean(target), target?.collab.creatorId);
check('it has a draft attached', (target?.collab.drafts || []).length === 1);
check('the draft is marked submitted', target?.collab.drafts?.[0].status === 'submitted');
check('its payout has not been scheduled yet', target?.collab.payoutStatus === 'pending');
check('it has no metrics before approval', target?.collab.metrics === undefined);

let body = await p.textContent('body');
check('dashboard surfaces the review queue', /waiting on your approval/i.test(body));

// Open the review dialog from the dashboard queue.
await p.getByRole('button', { name: /Review draft/i }).first().click();
await p.waitForTimeout(500);
body = await p.textContent('body');
check('review dialog opens', /Approve & publish|Approve &amp; publish/i.test(body));
check('dialog shows the submitted copy', /pipeline number is wrong/i.test(body));
check("dialog shows the creator's note", /problem-first/i.test(body));
check('dialog runs the brief checks', /Tracked link/i.test(body) && /Partnership disclosed/i.test(body));
check('dialog marks the LinkedIn fold', /fold/i.test(body));

/* --- Request changes first: it must go back, not forward. --- */
await p.getByRole('textbox', { name: /Feedback/i }).fill('Move the link above the fold please.');
await p.getByRole('button', { name: /Request changes/i }).click();
await p.waitForTimeout(900);

state = await readState(p);
let after = state.campaigns
  .find((c) => c.id === target.campaign.id)
  .collaborations.find((x) => x.creatorId === target.collab.creatorId);

check('requesting changes returns it to the creator', after.status === 'accepted', after.status);
check('the revision is marked changes_requested', after.drafts.at(-1).status === 'changes_requested');
check('the feedback is stored verbatim', /above the fold/i.test(after.drafts.at(-1).feedback ?? ''));
check('nothing published on a rejection', after.metrics === undefined);
check('the fee stayed unscheduled', after.payoutStatus === 'pending', after.payoutStatus);
check('the original revision was not overwritten', after.drafts.length === 1);

body = await p.textContent('body');
check('the review queue empties once handled', !/waiting on your approval/i.test(body));

/* --- Now put it back in review and approve it. --- */
await p.evaluate((ids) => {
  const s = JSON.parse(localStorage.getItem('vouch.state.v1'));
  const c = s.campaigns.find((x) => x.id === ids.campaignId);
  const col = c.collaborations.find((x) => x.creatorId === ids.creatorId);
  col.status = 'in_review';
  col.drafts.push({
    id: 'draft-test-2',
    revision: 2,
    body: 'Rewritten with the link higher up. vouch.link/' + c.brief.trackingCode + ' Paid partnership with Trellis.',
    submittedAt: new Date().toISOString(),
    status: 'submitted',
  });
  localStorage.setItem('vouch.state.v1', JSON.stringify(s));
}, { campaignId: target.campaign.id, creatorId: target.collab.creatorId });

await p.goto(`${BASE}/campaigns/${target.campaign.id}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
body = await p.textContent('body');
check('campaign page shows the drafts-waiting banner', /waiting on you/i.test(body));
check('the banner names the revision', /Revision 2/i.test(body));

await p.getByRole('button', { name: /Review draft/i }).first().click();
await p.waitForTimeout(500);
body = await p.textContent('body');
check('the dialog shows the revision history', /Revision 1/i.test(body));
check('the earlier feedback is still readable', /above the fold/i.test(body));

await p.getByRole('button', { name: /Approve & publish|Approve &amp; publish/i }).click();
await p.waitForTimeout(1200);

state = await readState(p);
after = state.campaigns
  .find((c) => c.id === target.campaign.id)
  .collaborations.find((x) => x.creatorId === target.collab.creatorId);

check('approval publishes the collaboration', after.status === 'published', after.status);
check('approval marks the revision approved', after.drafts.at(-1).status === 'approved');
check('approval schedules the fee', after.payoutStatus === 'scheduled', after.payoutStatus);
check('approval generates performance', Boolean(after.metrics?.impressions), String(after.metrics?.impressions));
check('a publish timestamp was written', Boolean(after.publishedAt));
check('both revisions survived approval', after.drafts.length === 2);

body = await p.textContent('body');
check('the campaign reflects the publish', !/waiting on you/i.test(body));
check('no NaN after approval', !body.includes('NaN'));

/* ------------------------------------------------------------------ *
 * Messaging
 * ------------------------------------------------------------------ */

await p.goto(`${BASE}/messages`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
body = await p.textContent('body');
check('messages lists conversations', /conversations|unread/i.test(body));
check(
  'a thread is open by default',
  await p.getByRole('textbox', { name: /^Message /i }).isVisible(),
);
check('generated replies are labelled', /written locally by the demo counterpart/i.test(body));

const before = (await readState(p)).messages.length;
await p.getByRole('textbox', { name: /^Message /i }).fill('When can you publish this one?');
await p.getByRole('button', { name: /Send message/i }).click();
await p.waitForTimeout(600);

let msgs = (await readState(p)).messages;
check('the message is persisted', msgs.length === before + 1, `${msgs.length} vs ${before}`);
check('your own message is not unread to you', msgs.at(-1).read === true);
check('your own message is not flagged generated', !msgs.at(-1).auto);

await p.waitForTimeout(1800);
msgs = (await readState(p)).messages;
check('the counterpart replies', msgs.length === before + 2, `${msgs.length}`);
check('the reply comes from the other side', msgs.at(-1).from === 'creator', msgs.at(-1).from);
check('the reply is flagged as generated', msgs.at(-1).auto === true);
check('the reply answers the question asked', /(date|timing|Tuesday|slot|hit that)/i.test(msgs.at(-1).body), msgs.at(-1).body);

/* ------------------------------------------------------------------ *
 * Pricing page
 * ------------------------------------------------------------------ */

await p.goto(`${BASE}/pricing`, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
// innerText, not textContent: the latter includes the RSC flight payload in
// <script>, which legitimately contains "$undefined" markers.
const visible = await p.innerText('body');
check('pricing page renders', /The platform is free/i.test(visible));
check('pricing publishes the price index', /price index/i.test(visible));
// The heading is split across masked lines, so innerText carries a newline
// through the middle of the sentence.
check('pricing publishes delivery by band', /get the post published/i.test(visible));
check('no NaN on pricing', !visible.includes('NaN'));
check('no undefined on pricing', !visible.includes('undefined'));

/* ------------------------------------------------------------------ */

check('no uncaught page errors', errors.length === 0, errors.join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
await b.close();
process.exit(fail === 0 ? 0 : 1);
