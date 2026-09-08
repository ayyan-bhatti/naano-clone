import {
  ALLOCATIONS,
  audienceBandById,
  priceBandFor,
  TIMING,
  type AudienceBand,
  type PriceBand,
} from '@/lib/data/benchmarks';

/**
 * Campaign budget planner.
 *
 * The chain the whole tool exists to show:
 *
 *   budget / median price      -> posts booked
 *   booked x delivery rate     -> posts published        (the correction)
 *   budget / published         -> true cost per published post
 *
 * The point is the gap between booked and published. Planning on booked posts
 * is systematically optimistic - by a factor of three to five at the cheap end -
 * and that gap is the single most useful thing this tool has to say.
 *
 * The price band is always derived from the price, so a preset allocation and a
 * custom price of the same value produce identical results. Getting that wrong
 * makes the tool visibly contradict itself.
 */

export interface BudgetInput {
  budget: number;
  /** Optional override; when absent each allocation uses its tier median. */
  customPrice?: number | null;
}

export interface AllocationResult {
  id: string;
  label: string;
  blurb: string;
  audience: AudienceBand;
  band: PriceBand;
  pricePerPost: number;
  postsBooked: number;
  postsPublished: number;
  /** Budget actually committed once rounded to whole posts. */
  committed: number;
  leftover: number;
  costPerPublished: number;
  deliveryPct: number;
  neverAnsweredPct: number;
  /** True for the allocation with the lowest cost per published post. */
  best: boolean;
}

export interface BudgetResult {
  valid: boolean;
  budget: number;
  allocations: AllocationResult[];
  best: AllocationResult | null;
  custom: AllocationResult | null;
  summary: string;
  timing: { median: number; p90: number; acceptanceMinutes: number };
  recommendations: string[];
}

function clean(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

function buildAllocation(
  id: string,
  label: string,
  blurb: string,
  audience: AudienceBand,
  pricePerPost: number,
  budget: number,
): AllocationResult {
  // Band derived from price, never from the preset - see the note above.
  const band = priceBandFor(pricePerPost);

  const postsBooked = pricePerPost > 0 ? Math.floor(budget / pricePerPost) : 0;
  const committed = postsBooked * pricePerPost;
  const leftover = Math.max(0, Math.round(budget - committed));

  // Expected value, kept to one decimal: rounding 0.4 published posts to zero
  // would misrepresent a small budget as producing nothing at all.
  const postsPublished = Math.round(postsBooked * band.publishedRate * 10) / 10;
  const costPerPublished = postsPublished > 0 ? Math.round(committed / postsPublished) : 0;

  return {
    id,
    label,
    blurb,
    audience,
    band,
    pricePerPost,
    postsBooked,
    postsPublished,
    committed,
    leftover,
    costPerPublished,
    deliveryPct: Math.round(band.publishedRate * 1000) / 10,
    neverAnsweredPct: Math.round(band.neverAnsweredRate * 1000) / 10,
    best: false,
  };
}

export function calculateCampaignBudget(input: BudgetInput): BudgetResult {
  const budget = clean(input.budget);
  const customPrice = clean(input.customPrice);

  const timing = {
    median: TIMING.medianDaysToPublish,
    p90: TIMING.p90DaysToPublish,
    acceptanceMinutes: TIMING.medianAcceptanceMinutes,
  };

  if (budget <= 0) {
    return {
      valid: false,
      budget: 0,
      allocations: [],
      best: null,
      custom: null,
      summary: 'Enter a campaign budget to see how many posts it books — and how many historically got published.',
      timing,
      recommendations: [],
    };
  }

  const allocations = ALLOCATIONS.map((a) => {
    const audience = audienceBandById(a.audienceBandId);
    return buildAllocation(a.id, a.label, a.blurb, audience, audience.median, budget);
  });

  // Cheapest per *published* post wins - the whole point of the tool.
  const viable = allocations.filter((a) => a.postsPublished > 0);
  const best = viable.length
    ? viable.reduce((a, b) => (a.costPerPublished <= b.costPerPublished ? a : b))
    : null;
  if (best) {
    const idx = allocations.findIndex((a) => a.id === best.id);
    if (idx >= 0) allocations[idx] = { ...allocations[idx], best: true };
  }

  const custom =
    customPrice > 0
      ? buildAllocation(
          'custom',
          'Your price',
          'Your own price per post, using the delivery rate for the band it falls into.',
          audienceBandById('10k-25k'),
          customPrice,
          budget,
        )
      : null;

  return {
    valid: true,
    budget,
    allocations,
    best: best ? { ...best, best: true } : null,
    custom,
    summary: buildSummary(budget, best, custom),
    timing,
    recommendations: buildRecommendations(budget, allocations, best, custom),
  };
}

function buildSummary(
  budget: number,
  best: AllocationResult | null,
  custom: AllocationResult | null,
): string {
  const subject = custom ?? best;
  if (!subject || subject.postsBooked === 0) {
    return `€${Math.round(budget).toLocaleString('en-GB')} does not cover a single post at these medians. The cheapest tier transacts around €84.`;
  }
  return `€${Math.round(budget).toLocaleString('en-GB')} books ${subject.postsBooked} post${subject.postsBooked === 1 ? '' : 's'} at €${subject.pricePerPost}, of which roughly ${subject.postsPublished} historically ended up published — about €${subject.costPerPublished.toLocaleString('en-GB')} per published post.`;
}

function buildRecommendations(
  budget: number,
  allocations: AllocationResult[],
  best: AllocationResult | null,
  custom: AllocationResult | null,
): string[] {
  const out: string[] = [];

  if (best) {
    const others = allocations.filter((a) => a.id !== best.id && a.costPerPublished > 0);
    const worst = others.length
      ? others.reduce((a, b) => (a.costPerPublished >= b.costPerPublished ? a : b))
      : null;
    if (worst && worst.costPerPublished > best.costPerPublished) {
      const multiple = (worst.costPerPublished / best.costPerPublished).toFixed(1);
      out.push(
        `On these rates the ${best.label.toLowerCase()} allocation costs about €${best.costPerPublished.toLocaleString('en-GB')} per published post against €${worst.costPerPublished.toLocaleString('en-GB')} for ${worst.label.toLowerCase()} — roughly ${multiple}× cheaper for the same budget.`,
      );
    }
  }

  if (custom && best && custom.costPerPublished > 0 && custom.costPerPublished > best.costPerPublished * 1.2) {
    out.push(
      `Your price of €${custom.pricePerPost} lands in the ${custom.band.label} band at a ${custom.deliveryPct}% delivery rate. Spreading the same budget across the ${best.label.toLowerCase()} tier would cost less per published post.`,
    );
  }

  const lowest = allocations.find((a) => a.id === 'spread');
  if (lowest && lowest.postsBooked > 0 && lowest.neverAnsweredPct > 35) {
    out.push(
      `Budget for the attrition rather than being surprised by it: ${lowest.neverAnsweredPct}% of offers in the cheapest band were never answered at all.`,
    );
  }

  if (budget < 500) {
    out.push('Under €500 the outcome is dominated by luck — with only a handful of bookings, an average delivery rate tells you very little.');
  }

  out.push(
    `Allow ${TIMING.p90DaysToPublish} days rather than ${TIMING.medianDaysToPublish}: most of the elapsed time sits after acceptance, in drafting and approval.`,
  );

  return out.slice(0, 4);
}
