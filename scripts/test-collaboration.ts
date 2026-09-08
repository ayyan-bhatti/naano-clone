/**
 * Collaboration test harness — content review and messaging.
 *
 * These two features carry state machines rather than formulas, so what is
 * asserted here is that the transitions cannot land somewhere incoherent: a
 * revision that overwrites its predecessor, a thread that counts your own
 * message as unread, a reply that arrives for the wrong side of the
 * conversation.
 *
 * Run with:
 *   node --experimental-strip-types --import ./scripts/alias-hook-register.mjs scripts/test-collaboration.ts
 */

import {
  awaitingReview,
  awaitingRevision,
  checkDraft,
  createDraft,
  draftCount,
  latestDraft,
  suggestDraftCopy,
} from '@/lib/drafts';
import {
  counterpartReply,
  createMessage,
  lastMessage,
  messagesForThread,
  parseThreadId,
  seedMessages,
  seedThread,
  threadId,
  totalUnreadForRole,
  unreadForRole,
} from '@/lib/messages';
import { SEED_CAMPAIGNS } from '@/lib/data/campaigns';
import { CREATORS, getCreator } from '@/lib/data/creators';
import type { Collaboration, Draft, Message } from '@/lib/types';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

const campaign = SEED_CAMPAIGNS[0];
const creator = getCreator(campaign.collaborations[0].creatorId) ?? CREATORS[0];

function collabWith(drafts: Draft[], status: Collaboration['status'] = 'in_review'): Collaboration {
  return {
    creatorId: creator.id,
    status,
    fee: 200,
    deliverables: '1 post',
    deliverBy: campaign.endDate,
    payoutStatus: 'pending',
    drafts,
  };
}

/* ------------------------------------------------------------------ *
 * Drafts
 * ------------------------------------------------------------------ */

section('Drafts — revisions');

const d1 = createDraft({ revision: 1, body: '  first draft body  ', note: '  a note  ' });
check('d1 trims body', d1.body === 'first draft body', JSON.stringify(d1.body));
check('d1 trims note', d1.note === 'a note', JSON.stringify(d1.note));
check('d1 starts submitted', d1.status === 'submitted', d1.status);
check('d1 has an id', d1.id.length > 6, d1.id);
check('d1 timestamp parses', !Number.isNaN(new Date(d1.submittedAt).getTime()));

const dBlankNote = createDraft({ revision: 1, body: 'body', note: '   ' });
check('blank note becomes undefined', dBlankNote.note === undefined, String(dBlankNote.note));

const d2 = createDraft({ revision: 2, body: 'second draft body' });
check('ids are unique across revisions', d1.id !== d2.id);

const empty = collabWith([]);
check('no drafts -> latestDraft undefined', latestDraft(empty) === undefined);
check('no drafts -> count 0', draftCount(empty) === 0);
check('no drafts -> not awaiting review', awaitingReview(empty) === false);
check('no drafts -> not awaiting revision', awaitingRevision(empty) === false);

const one = collabWith([d1]);
check('latestDraft returns the last one', latestDraft(one)?.id === d1.id);
check('one submitted draft is awaiting review', awaitingReview(one) === true);

const two = collabWith([d1, d2]);
check('latest of two is the newer', latestDraft(two)?.revision === 2);
check('history is preserved, not overwritten', draftCount(two) === 2);
check('revision 1 still readable', two.drafts?.[0].body === 'first draft body');

const sentBack = collabWith(
  [{ ...d1, status: 'changes_requested', feedback: 'Cut the third paragraph.' }],
  'accepted',
);
check('changes_requested is awaiting revision', awaitingRevision(sentBack) === true);
check('changes_requested is NOT awaiting review', awaitingReview(sentBack) === false);
check('feedback survives on the revision', latestDraft(sentBack)?.feedback?.includes('third') === true);

const approved = collabWith([{ ...d1, status: 'approved' }], 'published');
check('approved is not awaiting review', awaitingReview(approved) === false);
check('approved is not awaiting revision', awaitingRevision(approved) === false);

// An accepted collaboration whose draft came back must not read as "with the
// brand" - that was the specific state the status flip used to blur.
check(
  'sent-back collaboration is back with the creator',
  sentBack.status === 'accepted' && awaitingRevision(sentBack),
);

section('Drafts — brief checks');

const suggested = suggestDraftCopy(campaign, creator, campaign.collaborations[0]);
check('suggested copy is substantial', suggested.length > 200, String(suggested.length));
check('suggested copy carries the tracking code', suggested.includes(campaign.brief.trackingCode));
check('suggested copy discloses the partnership', /paid partnership/i.test(suggested));

const suggestedAgain = suggestDraftCopy(campaign, creator, campaign.collaborations[0]);
check('suggested copy is deterministic', suggested === suggestedAgain);

const okChecks = checkDraft(suggested, campaign, creator.id);
check('checks pass on the suggested copy: link', okChecks.hasLink === true);
check('checks pass on the suggested copy: disclosure', okChecks.hasDisclosure === true);
check('char count matches the body', okChecks.chars === suggested.length);
check('aboveFold is a prefix of the body', suggested.startsWith(okChecks.aboveFold));

const bad = checkDraft('Just some words with no link and no disclaimer.', campaign, creator.id);
check('missing link is caught', bad.hasLink === false);
check('missing disclosure is caught', bad.hasDisclosure === false);

check(
  'sponsored counts as disclosure',
  checkDraft('Sponsored by someone.', campaign, creator.id).hasDisclosure === true,
);
check(
  '#ad counts as disclosure',
  checkDraft('Great tool #ad', campaign, creator.id).hasDisclosure === true,
);

const emptyChecks = checkDraft('', campaign, creator.id);
check('empty body does not throw', emptyChecks.chars === 0);
check('empty body has no link', emptyChecks.hasLink === false);
check('empty body aboveFold is empty', emptyChecks.aboveFold === '');

// A creator-specific link must satisfy the check for that creator.
const creatorVariant = `Read it here: vouch.link/${campaign.brief.trackingCode}`;
check(
  'campaign code satisfies the link check',
  checkDraft(creatorVariant, campaign, creator.id).hasLink === true,
);

/* ------------------------------------------------------------------ *
 * Messaging
 * ------------------------------------------------------------------ */

section('Messages — thread identity');

const tid = threadId('cmp-x', 'creator-y');
check('threadId composes', tid === 'cmp-x:creator-y', tid);
const parsed = parseThreadId(tid);
check('parseThreadId round-trips campaign', parsed?.campaignId === 'cmp-x');
check('parseThreadId round-trips creator', parsed?.creatorId === 'creator-y');
check('parseThreadId rejects garbage', parseThreadId('nocolon') === null);

// Creator ids are slugs, but a colon in one must not split the thread wrongly.
const odd = parseThreadId('cmp-a:weird:id');
check('parseThreadId splits on the first colon only', odd?.creatorId === 'weird:id', String(odd?.creatorId));

// Two collaborations between the same parties on different campaigns are
// different conversations. This is the whole reason threads are keyed this way.
check(
  'same creator on two campaigns gets two threads',
  threadId('cmp-1', 'c') !== threadId('cmp-2', 'c'),
);

section('Messages — reading');

const t1 = threadId('cmp-1', 'c1');
const t2 = threadId('cmp-2', 'c1');
const pool: Message[] = [
  { ...createMessage({ threadId: t1, from: 'brand', authorName: 'B', body: 'first', at: '2026-09-01T10:00:00Z' }), read: true },
  createMessage({ threadId: t1, from: 'creator', authorName: 'C', body: 'second', at: '2026-09-03T10:00:00Z' }),
  { ...createMessage({ threadId: t1, from: 'brand', authorName: 'B', body: 'third', at: '2026-09-02T10:00:00Z' }), read: true },
  createMessage({ threadId: t2, from: 'creator', authorName: 'C', body: 'other thread', at: '2026-09-04T10:00:00Z' }),
];

const thread1 = messagesForThread(pool, t1);
check('thread filters by id', thread1.length === 3, String(thread1.length));
check('thread is sorted oldest first', thread1.map((m) => m.body).join(',') === 'first,third,second');
check('lastMessage is the newest', lastMessage(pool, t1)?.body === 'second');
check('lastMessage on an empty thread is undefined', lastMessage(pool, 'nope') === undefined);

check('unread counts the other side only', unreadForRole(pool, t1, 'brand') === 1);
check('your own unread messages do not count', unreadForRole(pool, t1, 'creator') === 0);
check('total unread spans threads', totalUnreadForRole(pool, 'brand') === 2);
check('total unread for the creator side', totalUnreadForRole(pool, 'creator') === 0);

section('Messages — the counterpart');

const reply = counterpartReply({
  threadId: t1,
  body: 'What is the deadline on this one?',
  from: 'brand',
  counterpartName: 'Marta',
});
check('reply exists', reply !== null);
check('reply comes from the other side', reply?.from === 'creator', String(reply?.from));
check('reply is attributed to the counterpart', reply?.authorName === 'Marta');
check('reply is flagged as generated', reply?.auto === true);
check('reply lands in the same thread', reply?.threadId === t1);
check('reply is not empty', (reply?.body.length ?? 0) > 20);

const replyToCreator = counterpartReply({
  threadId: t1,
  body: 'Draft is with you.',
  from: 'creator',
  counterpartName: 'Trellis',
});
check('replying to a creator comes from the brand', replyToCreator?.from === 'brand');

check('empty message gets no reply', counterpartReply({ threadId: t1, body: '   ', from: 'brand', counterpartName: 'X' }) === null);

// Same question, same answer. A reviewer pressing send twice should not see a
// slot machine.
const a = counterpartReply({ threadId: t1, body: 'When can you publish?', from: 'brand', counterpartName: 'M' });
const b = counterpartReply({ threadId: t1, body: 'When can you publish?', from: 'brand', counterpartName: 'M' });
check('replies are deterministic', a?.body === b?.body, `${a?.body} vs ${b?.body}`);

const c = counterpartReply({ threadId: t2, body: 'When can you publish?', from: 'brand', counterpartName: 'M' });
check('the thread is part of the seed', typeof c?.body === 'string');

// Category routing: a question about money should not be answered about dates.
const money = counterpartReply({ threadId: t1, body: 'Is the fee negotiable?', from: 'brand', counterpartName: 'M' });
check('money question gets a money answer', /fee/i.test(money?.body ?? ''), money?.body);

const edits = counterpartReply({ threadId: t1, body: 'Can you rework the opening?', from: 'brand', counterpartName: 'M' });
check('edit request gets a revision answer', /(rework|revision|tighten)/i.test(edits?.body ?? ''), edits?.body);

section('Messages — seeded history');

const invited = campaign.collaborations.find((x) => x.status === 'invited');
const publishedCollab = campaign.collaborations.find((x) => x.status === 'published');
const inReview = campaign.collaborations.find((x) => x.status === 'in_review');

if (invited) {
  const t = seedThread(campaign, invited, 'Someone');
  check('an unanswered invite has one message', t.length === 1, String(t.length));
  check('the invite comes from the brand', t[0].from === 'brand');
}

if (publishedCollab) {
  const t = seedThread(campaign, publishedCollab, 'Someone');
  check('a published collaboration has a fuller history', t.length >= 4, String(t.length));
  check('seeded history is all read', t.every((m) => m.read), 'unread seeded message');
  check('seeded history is chronological', t.every((m, i) => i === 0 || new Date(t[i - 1].createdAt) <= new Date(m.createdAt)));
}

if (inReview) {
  const t = seedThread(campaign, inReview, 'Someone');
  check('an in-review thread mentions the draft', t.some((m) => /draft/i.test(m.body)));
  check('the submitted note is unread for the brand', unreadForRole(t, t[0].threadId, 'brand') >= 1);
}

const declined = seedThread(
  campaign,
  { ...campaign.collaborations[0], status: 'declined' },
  'Someone',
);
check('a declined invite has a decline in it', declined.some((m) => m.from === 'creator'));
check('a declined thread does not claim acceptance', !declined.some((m) => /^In\./.test(m.body)));

const all = seedMessages(SEED_CAMPAIGNS, (id) => getCreator(id)?.name);
const collabTotal = SEED_CAMPAIGNS.reduce((s, c) => s + c.collaborations.length, 0);
check('every collaboration gets a thread', new Set(all.map((m) => m.threadId)).size === collabTotal, `${new Set(all.map((m) => m.threadId)).size} of ${collabTotal}`);
check('seeded messages all carry an author', all.every((m) => m.authorName.length > 0));
check('seeded messages all carry a body', all.every((m) => m.body.length > 10));
check('unknown creators are skipped, not crashed', seedMessages(SEED_CAMPAIGNS, () => undefined).length === 0);

/* ------------------------------------------------------------------ *
 * Seed integrity
 * ------------------------------------------------------------------ */

section('Seed data');

const seededReview = SEED_CAMPAIGNS.flatMap((c) => c.collaborations).filter(
  (c) => c.status === 'in_review',
);
check('at least one seeded collaboration is in review', seededReview.length > 0);
check(
  'every in-review collaboration has something to review',
  seededReview.every((c) => (c.drafts?.length ?? 0) > 0),
);
check(
  'seeded drafts are marked submitted',
  seededReview.every((c) => latestDraft(c)?.status === 'submitted'),
);
check(
  'a status that is not in-review carries no stray drafts',
  SEED_CAMPAIGNS.flatMap((c) => c.collaborations)
    .filter((c) => c.status !== 'in_review')
    .every((c) => c.drafts === undefined),
);

/* ------------------------------------------------------------------ */
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
