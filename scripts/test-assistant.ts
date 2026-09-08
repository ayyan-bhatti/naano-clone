/**
 * Assistant retrieval tests.
 *
 * A retrieval bot has two failure modes and they pull against each other:
 * answering the wrong thing confidently, and refusing a question it does cover.
 * So this asserts both directions - that a spread of real phrasings reach the
 * right entry, and that nonsense and out-of-scope questions are refused rather
 * than served the least-bad match.
 *
 * Run with:
 *   node --experimental-strip-types --import ./scripts/alias-hook-register.mjs scripts/test-assistant.ts
 */

import { answer, findDestination, tokenise, CONFIDENCE_FLOOR } from '@/lib/assistant/engine';
import { DESTINATIONS, ENTRIES, suggestionsFor, type AssistantContext } from '@/lib/assistant/knowledge';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (condition) passed += 1;
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

const anon: AssistantContext = {
  route: '/',
  signedIn: false,
  campaigns: 0,
  liveCampaigns: 0,
  pipeline: 0,
  clicks: 0,
  draftsWaiting: 0,
  unreadMessages: 0,
  shortlisted: 0,
  creatorEarnings: 0,
  openDeals: 0,
};

const brand: AssistantContext = {
  ...anon,
  route: '/dashboard',
  signedIn: true,
  role: 'brand',
  company: 'Trellis',
  firstName: 'Elena',
  campaigns: 5,
  liveCampaigns: 2,
  pipeline: 48200,
  clicks: 312,
  draftsWaiting: 1,
  unreadMessages: 3,
  shortlisted: 3,
};

const creator: AssistantContext = {
  ...anon,
  route: '/dashboard',
  signedIn: true,
  role: 'creator',
  firstName: 'Marta',
  openDeals: 2,
  creatorEarnings: 940,
  unreadMessages: 1,
};

/* ------------------------------------------------------------------ *
 * Tokenising
 * ------------------------------------------------------------------ */

section('Tokenising');

check('strips stopwords', !tokenise('what is the price of a post').includes('the'));
check('lowercases', tokenise('PRICING').includes('price'));
check('folds synonyms to a canonical term', tokenise('what do you charge').includes('price'));
check('folds plurals through synonyms', tokenise('influencers').includes('creator'));
check('drops punctuation', !tokenise('price?!').some((t) => t.includes('?')));
check('drops single characters', !tokenise('a b price').includes('b'));
check('empty string yields nothing', tokenise('').length === 0);
check('punctuation only yields nothing', tokenise('???!!!').length === 0);
check('handles apostrophes', tokenise("what's the price").includes('price'));

/* ------------------------------------------------------------------ *
 * Retrieval accuracy
 * ------------------------------------------------------------------ */

section('Retrieval — questions reach the right entry');

/** [question, expected entry id, context] */
const CASES: [string, string, AssistantContext][] = [
  ['what is vouch', 'what-is-vouch', anon],
  ['what does this site do', 'what-is-vouch', anon],
  ['tell me about vouch', 'what-is-vouch', anon],
  ['how much does it cost', 'pricing', anon],
  ['is it free', 'pricing', anon],
  ['what do you charge', 'pricing', anon],
  ['how expensive is this', 'pricing', anon],
  ['what should i pay a creator', 'price-by-size', anon],
  ['what is a fair rate for 10k followers', 'price-by-size', anon],
  ['how does matching work', 'matching', anon],
  ['what is the match score', 'matching', anon],
  ['how do you rank creators', 'matching', anon],
  ['how does tracking work', 'attribution', anon],
  ['how do i know it worked', 'attribution', anon],
  ['explain attribution', 'attribution', anon],
  ['how do i run a campaign', 'campaign-flow', anon],
  ['what are the steps', 'campaign-flow', anon],
  ['how does approval work', 'review', brand],
  ['do i see the post before it goes live', 'review', brand],
  ['can i request changes', 'review', brand],
  ['when do creators get paid', 'payouts', brand],
  ['can i message creators', 'messaging', brand],
  ['what tools are there', 'free-tools', anon],
  ['is this real', 'is-this-real', anon],
  ['are these real creators', 'is-this-real', anon],
  ['how do i log in', 'demo-account', anon],
  ['who are you', 'who-are-you', anon],
  ['are you chatgpt', 'who-are-you', anon],
  ['are you an ai', 'who-are-you', anon],
  ['what is waiting on me', 'my-status', brand],
  ['what should i do next', 'my-status', brand],
  ['how are my campaigns doing', 'my-numbers', brand],
  ['how do i get paid', 'creator-earn', creator],
  ['how much can i earn', 'creator-earn', creator],
  ['can i edit my profile', 'creator-profile', creator],
  ['change my rate', 'creator-profile', creator],
];

for (const [question, expected, ctx] of CASES) {
  const a = answer(question, ctx);
  check(`"${question}" -> ${expected}`, a.entryId === expected, `got ${a.entryId ?? a.kind}`);
}

check(
  'every case cleared the confidence floor',
  CASES.every(([q, , c]) => answer(q, c).confidence > 0),
);

/* ------------------------------------------------------------------ *
 * Refusing what it does not know
 * ------------------------------------------------------------------ */

section('Refusal — no confident answers to things it does not cover');

const OUT_OF_SCOPE = [
  'what is the weather in berlin',
  'write me a poem about otters',
  'asdkjhasd kjhasd',
  'who won the world cup in 1998',
  'what is 17 times 4',
  'recommend a restaurant',
];

for (const q of OUT_OF_SCOPE) {
  const a = answer(q, anon);
  check(`refuses "${q}"`, a.kind === 'unknown', `got ${a.kind} (${a.entryId ?? '-'})`);
}

check('refusal names what it does cover', /pricing|matching|attribution/i.test(answer('xyzzy', anon).text));
check('refusal admits it is not a model', /not a language model/i.test(answer('xyzzy', anon).text));
check('refusal still offers links', answer('xyzzy', anon).links.length > 0);
check('empty question is handled', answer('', anon).kind === 'unknown');
check('whitespace question is handled', answer('    ', anon).kind === 'unknown');

/* ------------------------------------------------------------------ *
 * Navigation
 * ------------------------------------------------------------------ */

section('Navigation');

const NAV: [string, string, AssistantContext][] = [
  ['take me to pricing', '/pricing', anon],
  ['go to the marketplace', '/marketplace', anon],
  ['open the free tools', '/free-tools', anon],
  ['show me the budget planner', '/free-tools/campaign-budget', anon],
  ['take me to my campaigns', '/campaigns', brand],
  ['open my messages', '/messages', brand],
  ['go to my deals', '/deals', creator],
  ['take me to my media kit', '/media-kit', creator],
];

for (const [question, href, ctx] of NAV) {
  const a = answer(question, ctx);
  check(`"${question}" -> ${href}`, a.kind === 'navigate' && a.navigateTo === href, `got ${a.navigateTo ?? a.kind}`);
}

check(
  'longest destination term wins',
  answer('take me to a new campaign', brand).navigateTo === '/campaigns/new',
  answer('take me to a new campaign', brand).navigateTo,
);

// Signed-out visitors must not be routed into the app.
check('does not route anonymous visitors to the dashboard', findDestination('go to the dashboard', anon) === null);
check('does route a signed-in brand there', findDestination('go to the dashboard', brand)?.destination.href === '/dashboard');

// Role-specific pages stay role-specific.
check('a brand is not sent to creator earnings', findDestination('open my earnings', brand)?.destination.href !== '/earnings');
check('a creator is', findDestination('open my earnings', creator)?.destination.href === '/earnings');

// Mentioning a page without asking to move should answer, not navigate.
const mention = answer('how much does the marketplace cost', anon);
check('a mention is answered, not a redirect', mention.kind === 'answer', mention.kind);
check('but it offers the page as a link', mention.links.some((l) => l.href === '/marketplace'));

/* ------------------------------------------------------------------ *
 * Live workspace answers
 * ------------------------------------------------------------------ */

section('Live workspace');

const status = answer('what is waiting on me', brand);
check('reads the draft queue', /1 draft/i.test(status.text), status.text.slice(0, 80));
check('reads unread messages', /3 unread/i.test(status.text));
check('reads attributed pipeline', /48,200/.test(status.text));

const anonStatus = answer('what is waiting on me', anon);
check('signed out is told to sign in', /not signed in/i.test(anonStatus.text));

const quiet = answer('what is waiting on me', { ...brand, draftsWaiting: 0, unreadMessages: 0, liveCampaigns: 0, shortlisted: 0 });
check('nothing waiting says so', /up to date/i.test(quiet.text), quiet.text);

const creatorStatus = answer('what is waiting on me', creator);
check('creator sees their own deals', /2 deals/i.test(creatorStatus.text), creatorStatus.text);

const noCampaigns = answer('how are my campaigns doing', { ...brand, campaigns: 0 });
check('an empty workspace is not reported as numbers', /No campaigns yet/i.test(noCampaigns.text));

/* ------------------------------------------------------------------ *
 * Role scoping
 * ------------------------------------------------------------------ */

section('Role scoping');

const creatorOnly = ENTRIES.filter((e) => e.role === 'creator').map((e) => e.id);
check('creator-only entries exist', creatorOnly.length > 0);
check(
  'a brand never receives a creator-only entry',
  ['how do i get paid', 'can i edit my profile', 'how much can i earn'].every(
    (q) => !creatorOnly.includes(answer(q, brand).entryId ?? ''),
  ),
);

/* ------------------------------------------------------------------ *
 * Determinism and integrity
 * ------------------------------------------------------------------ */

section('Determinism and integrity');

check(
  'the same question always gives the same answer',
  CASES.every(([q, , c]) => answer(q, c).text === answer(q, c).text),
);

check('every entry has patterns', ENTRIES.every((e) => e.patterns.length > 0));
check('every entry has keywords', ENTRIES.every((e) => e.keywords.length > 0));
check('every entry id is unique', new Set(ENTRIES.map((e) => e.id)).size === ENTRIES.length);
check(
  'every entry link points somewhere real',
  ENTRIES.flatMap((e) => e.links ?? []).every((l) => l.href.startsWith('/')),
);
check('every destination href is absolute', DESTINATIONS.every((d) => d.href.startsWith('/')));
check('every destination has terms', DESTINATIONS.every((d) => d.terms.length > 0));
check(
  'no destination term is a bare stopword',
  DESTINATIONS.every((d) => d.terms.every((t) => t.trim().length > 2)),
);

check('confidence never exceeds 1', CASES.every(([q, , c]) => answer(q, c).confidence <= 1));
check('confidence is never negative', CASES.every(([q, , c]) => answer(q, c).confidence >= 0));
check('the floor is a sane value', CONFIDENCE_FLOOR > 0 && CONFIDENCE_FLOOR < 2);

check('suggestions differ by role', suggestionsFor(brand).join() !== suggestionsFor(creator).join());
check('anonymous suggestions avoid signed-in pages', suggestionsFor(anon).every((s) => !/waiting on me/i.test(s)));
check(
  'every suggestion is actually answerable',
  [...suggestionsFor(anon).map((s) => [s, anon] as const),
   ...suggestionsFor(brand).map((s) => [s, brand] as const),
   ...suggestionsFor(creator).map((s) => [s, creator] as const),
  ].every(([s, c]) => answer(s, c).kind !== 'unknown'),
);

/* ------------------------------------------------------------------ */
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
