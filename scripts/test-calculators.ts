/**
 * Calculator test harness.
 *
 * Runs the pure calculators against normal, zero, empty, negative, decimal and
 * extreme inputs and asserts nothing ever produces NaN, Infinity or undefined -
 * the failure mode that would show up as a broken number in the UI.
 *
 * Run with:
 *   node --experimental-strip-types --import ./scripts/alias-hook-register.mjs scripts/test-calculators.ts
 */

import { calculateEngagementRate } from '@/lib/calculators/engagement-rate';
import { calculateCreatorWorth } from '@/lib/calculators/creator-worth';
import { calculateDeliveryOdds } from '@/lib/calculators/delivery-odds';
import { calculateCampaignBudget } from '@/lib/calculators/campaign-budget';
import { calculateCreatorFit } from '@/lib/calculators/creator-matching';

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

/**
 * Walks a result object and fails on any NaN or non-finite number.
 *
 * `max` is exempt from the finite check: the top benchmark tier deliberately
 * uses Infinity as its open upper bound. It is a sentinel used for range
 * lookups and is never rendered, so Infinity there is correct - but NaN there
 * would still be a bug, and is still caught.
 */
function assertFinite(name: string, value: unknown, seen = new Set<unknown>()) {
  if (value === null || value === undefined) return;
  if (typeof value === 'number') {
    check(`${name} is not NaN`, !Number.isNaN(value), `got ${value}`);
    if (!name.endsWith('.max')) {
      check(`${name} is finite`, Number.isFinite(value), `got ${value}`);
    }
    return;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return;
    seen.add(value);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      assertFinite(`${name}.${k}`, v, seen);
    }
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

/* ------------------------------------------------------------------ */
section('Engagement rate');

const er1 = calculateEngagementRate({ followers: 5000, reactions: 120, comments: 18, reposts: 6 });
assertFinite('er1', er1);
check('er1 rate correct', er1.byFollowers === 2.88, `got ${er1.byFollowers}`);
check('er1 tier is 5k-20k', er1.tier.id === '5k-20k', er1.tier.id);
check('er1 healthy', er1.verdict === 'healthy', er1.verdict);
check('er1 estimates impressions', er1.impressionsEstimated && er1.estimatedImpressions > 0);

const er2 = calculateEngagementRate({ followers: 0, reactions: 0, comments: 0, reposts: 0 });
assertFinite('er2', er2);
check('er2 invalid on zero followers', !er2.valid);
check('er2 no NaN rate', er2.byFollowers === 0);

const er3 = calculateEngagementRate({ followers: -500, reactions: -10, comments: -1, reposts: -3 });
assertFinite('er3', er3);
check('er3 negatives clamped to invalid', !er3.valid);

const er4 = calculateEngagementRate({ followers: 1e9, reactions: 1e9, comments: 1e9, reposts: 1e9 });
assertFinite('er4', er4);
check('er4 extreme handled', Number.isFinite(er4.byFollowers));

const er5 = calculateEngagementRate({ followers: 1250.5, reactions: 47.3, comments: 9.8, reposts: 2.2 });
assertFinite('er5', er5);
check('er5 decimals fine', er5.valid && er5.byFollowers > 0);

const er6 = calculateEngagementRate({ followers: 8000, reactions: 200, comments: 40, reposts: 10, impressions: 20000 });
assertFinite('er6', er6);
check('er6 uses supplied impressions', !er6.impressionsEstimated && er6.byImpressions === 1.25, `${er6.byImpressions}`);

const er7 = calculateEngagementRate({ followers: 1000, reactions: 500, comments: 200, reposts: 100 });
assertFinite('er7', er7);
check('er7 excellent verdict', er7.verdict === 'excellent', er7.verdict);

/* ------------------------------------------------------------------ */
section('Creator worth');

// followers 10000 -> base 120; ER = (300 + 2*50)/10000 = 4% -> mult 0.6+1.6 = 2.2 -> capped 2
// 120 * 2 * 1.2 (saas) = 288 -> rounds to 290
const w1 = calculateCreatorWorth({ followers: 10000, reactions: 300, comments: 50, postsPerWeek: 3, nicheId: 'saas' });
assertFinite('w1', w1);
check('w1 engagement 4%', w1.engagementRate === 4, `${w1.engagementRate}`);
check('w1 rating excellent', w1.rating === 'excellent', w1.rating);
check('w1 cap applied', w1.engagementMultiplier === 2, `${w1.engagementMultiplier}`);
check('w1 estimate 290', w1.estimate === 290, `${w1.estimate}`);
check('w1 range ordered', w1.low <= w1.estimate && w1.estimate <= w1.high);
check('w1 monthly', w1.monthlyLow === w1.estimate * 2 && w1.monthlyHigh === w1.estimate * 4);

const w2 = calculateCreatorWorth({ followers: 0, reactions: 0, comments: 0, postsPerWeek: 1, nicheId: 'saas' });
assertFinite('w2', w2);
check('w2 invalid', !w2.valid);

const w3 = calculateCreatorWorth({ followers: 100, reactions: 0, comments: 0, postsPerWeek: 1, nicheId: 'other' });
assertFinite('w3', w3);
check('w3 never below floor', w3.estimate >= 100 && w3.low >= 100, `${w3.low}/${w3.estimate}`);

const w4 = calculateCreatorWorth({ followers: -9000, reactions: -1, comments: -1, postsPerWeek: -3, nicheId: 'nope' });
assertFinite('w4', w4);
check('w4 negatives safe', !w4.valid);

const w5 = calculateCreatorWorth({ followers: 5e7, reactions: 1e6, comments: 5e5, postsPerWeek: 7, nicheId: 'finance' });
assertFinite('w5', w5);
check('w5 extreme finite', Number.isFinite(w5.estimate) && w5.estimate > 0);

const w6 = calculateCreatorWorth({ followers: 3200.7, reactions: 88.4, comments: 12.6, postsPerWeek: 2, nicheId: 'sales' });
assertFinite('w6', w6);
check('w6 decimals fine', w6.valid && w6.estimate >= 100);

// Determinism
const w7a = calculateCreatorWorth({ followers: 12345, reactions: 210, comments: 33, postsPerWeek: 4, nicheId: 'hr' });
const w7b = calculateCreatorWorth({ followers: 12345, reactions: 210, comments: 33, postsPerWeek: 4, nicheId: 'hr' });
check('w7 deterministic', JSON.stringify(w7a) === JSON.stringify(w7b));

/* ------------------------------------------------------------------ */
section('Delivery odds');

const d1 = calculateDeliveryOdds({ audienceBandId: '10k-25k', offer: 150 });
assertFinite('d1', d1);
check('d1 band under-200', d1.band.id === 'under-200', d1.band.id);
check('d1 published 30.4', d1.publishedPct === 30.4, `${d1.publishedPct}`);
check('d1 below median', d1.vsMedian === -150, `${d1.vsMedian}`);
check('d1 has upgrade', d1.upgrade !== null);
check('d1 shares sum sane', d1.publishedPct + d1.neverAnsweredPct + d1.otherPct <= 100.1);

const d2 = calculateDeliveryOdds({ audienceBandId: 'under-5k', offer: 0 });
assertFinite('d2', d2);
check('d2 invalid on zero offer', !d2.valid);

const d3 = calculateDeliveryOdds({ audienceBandId: '50k-plus', offer: 5000 });
assertFinite('d3', d3);
check('d3 top band', d3.band.id === '600-plus', d3.band.id);
check('d3 position clamped', d3.positionPct >= 0 && d3.positionPct <= 100, `${d3.positionPct}`);
check('d3 no upgrade above top', d3.upgrade === null);

const d4 = calculateDeliveryOdds({ audienceBandId: 'bogus-id', offer: -50 });
assertFinite('d4', d4);
check('d4 unknown band falls back', !d4.valid);

const d5 = calculateDeliveryOdds({ audienceBandId: 'under-5k', offer: 84.5 });
assertFinite('d5', d5);
check('d5 decimal offer fine', d5.valid);

/* ------------------------------------------------------------------ */
section('Campaign budget');

const b1 = calculateCampaignBudget({ budget: 5000 });
assertFinite('b1', b1);
check('b1 three allocations', b1.allocations.length === 3, `${b1.allocations.length}`);
// 5000 / 84 = 59 posts, * 0.304 = 17.9
const spread = b1.allocations.find((a) => a.id === 'spread')!;
check('b1 spread books 59', spread.postsBooked === 59, `${spread.postsBooked}`);
check('b1 spread publishes ~17.9', spread.postsPublished === 17.9, `${spread.postsPublished}`);
check('b1 has a best', b1.best !== null);
check('b1 best is cheapest per published', b1.allocations.every((a) => a.costPerPublished === 0 || a.costPerPublished >= b1.best!.costPerPublished));
check('b1 leftover non-negative', b1.allocations.every((a) => a.leftover >= 0));

const b2 = calculateCampaignBudget({ budget: 0 });
assertFinite('b2', b2);
check('b2 invalid', !b2.valid && b2.allocations.length === 0);

const b3 = calculateCampaignBudget({ budget: 50 });
assertFinite('b3', b3);
check('b3 tiny budget books nothing', b3.allocations.every((a) => a.postsBooked === 0));
check('b3 no divide-by-zero', b3.allocations.every((a) => Number.isFinite(a.costPerPublished)));

const b4 = calculateCampaignBudget({ budget: -1000, customPrice: -50 });
assertFinite('b4', b4);
check('b4 negatives safe', !b4.valid);

const b5 = calculateCampaignBudget({ budget: 20000, customPrice: 650 });
assertFinite('b5', b5);
check('b5 custom present', b5.custom !== null);
check('b5 custom band from price', b5.custom!.band.id === '600-plus', b5.custom!.band.id);
// Preset/custom agreement: a custom price equal to a tier median must match it.
const b6 = calculateCampaignBudget({ budget: 10000, customPrice: 84 });
check(
  'b6 custom at median agrees with preset',
  b6.custom!.postsBooked === b6.allocations.find((a) => a.id === 'spread')!.postsBooked &&
    b6.custom!.deliveryPct === b6.allocations.find((a) => a.id === 'spread')!.deliveryPct,
);

const b7 = calculateCampaignBudget({ budget: 1e9 });
assertFinite('b7', b7);
check('b7 extreme finite', b7.allocations.every((a) => Number.isFinite(a.costPerPublished)));

/* ------------------------------------------------------------------ */
section('Creator matching');

const m1 = calculateCreatorFit({
  product: 'RevOps automation for sales teams',
  audience: 'RevOps managers and sales leaders at B2B SaaS companies',
  objective: 'leads',
  budget: 3000,
  topics: [],
});
assertFinite('m1.matches[0]', m1.matches[0]);
check('m1 returns matches', m1.matches.length > 0, `${m1.matches.length}`);
check('m1 sorted desc', m1.matches.every((x, i) => i === 0 || m1.matches[i - 1].score >= x.score));
check('m1 detects personas', m1.detectedPersonas.length > 0, m1.detectedPersonas.join(','));
check('m1 scores bounded', m1.matches.every((x) => x.score >= 1 && x.score <= 99));
check('m1 has reasons', m1.matches.every((x) => x.reason.length > 10));
check('m1 excludes booked', m1.matches.every((x) => x.creator.availability !== 'booked'));

const m2 = calculateCreatorFit({ product: '', audience: '', objective: 'awareness', budget: 0, topics: [] });
check('m2 empty input still returns list', m2.matches.length > 0);
check('m2 no NaN scores', m2.matches.every((x) => Number.isFinite(x.score)));

const m3 = calculateCreatorFit({ product: 'x', audience: 'y', objective: 'launch', budget: -5, topics: [] });
check('m3 negative budget safe', m3.matches.every((x) => Number.isFinite(x.score) && x.postsAffordable === 0));

const m4a = calculateCreatorFit({ product: 'devtools', audience: 'engineers', objective: 'leads', budget: 2000, topics: ['AI'] });
const m4b = calculateCreatorFit({ product: 'devtools', audience: 'engineers', objective: 'leads', budget: 2000, topics: ['AI'] });
check(
  'm4 deterministic',
  m4a.matches.map((x) => `${x.creator.id}:${x.score}`).join('|') ===
    m4b.matches.map((x) => `${x.creator.id}:${x.score}`).join('|'),
);

/* ------------------------------------------------------------------ */
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
