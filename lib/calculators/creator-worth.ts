import { nicheById, type Niche } from '@/lib/data/benchmarks';

/**
 * Creator worth.
 *
 * Reproduces the model Naano publishes on their own tool, step for step:
 *
 *   1. engagement rate  = (reactions + 2 x comments) / followers        [%]
 *   2. base value       = EUR 12 per 1,000 followers, floor EUR 100
 *   3. engagement adj.  = base x (0.6 + rate / 2.5), capped at x2
 *   4. niche multiplier = 1.2 / 1.15 / 1.1 / 1.0 / 0.9
 *   5. range            = +/-20%, rounded to nearest 10, never below 100
 *
 * Comments are double-weighted here (unlike the engagement-rate tool) because
 * this model is about what a sponsor will pay, and a comment signals someone
 * who actually read the post.
 */

const BASE_PER_1K = 12;
const FLOOR = 100;
const ENGAGEMENT_CAP = 2;
const RANGE = 0.2;

export type WorthRating = 'excellent' | 'good' | 'average' | 'low';

export interface WorthInput {
  followers: number;
  reactions: number;
  comments: number;
  postsPerWeek: number;
  nicheId: string;
}

export interface WorthResult {
  valid: boolean;
  engagementRate: number;
  rating: WorthRating;
  ratingLabel: string;
  baseValue: number;
  engagementMultiplier: number;
  niche: Niche;
  /** Headline per-post fee. */
  estimate: number;
  low: number;
  high: number;
  monthlyLow: number;
  monthlyHigh: number;
  /** Ordered breakdown for the "how this was calculated" panel. */
  steps: { label: string; value: string; detail: string }[];
  summary: string;
  recommendations: string[];
}

function clean(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

/** Round to nearest 10, never below the marketplace floor. */
function toFee(value: number): number {
  return Math.max(FLOOR, Math.round(value / 10) * 10);
}

export function ratingFor(engagementRate: number): { rating: WorthRating; label: string } {
  if (engagementRate >= 4) return { rating: 'excellent', label: 'Excellent' };
  if (engagementRate >= 2) return { rating: 'good', label: 'Good' };
  if (engagementRate >= 1) return { rating: 'average', label: 'Average' };
  return { rating: 'low', label: 'Low' };
}

export function calculateCreatorWorth(input: WorthInput): WorthResult {
  const followers = clean(input.followers);
  const reactions = clean(input.reactions);
  const comments = clean(input.comments);
  const postsPerWeek = Math.min(7, Math.max(1, clean(input.postsPerWeek) || 1));
  const niche = nicheById(input.nicheId);

  if (followers <= 0) {
    return {
      valid: false,
      engagementRate: 0,
      rating: 'low',
      ratingLabel: '—',
      baseValue: 0,
      engagementMultiplier: 0,
      niche,
      estimate: 0,
      low: 0,
      high: 0,
      monthlyLow: 0,
      monthlyHigh: 0,
      steps: [],
      summary: 'Enter a follower count and your typical engagement to see an estimate.',
      recommendations: [],
    };
  }

  // 1. Engagement rate, comments double-weighted.
  const engagementRate = Math.round(((reactions + 2 * comments) / followers) * 100 * 100) / 100;
  const { rating, label } = ratingFor(engagementRate);

  // 2. Base value from audience size.
  const rawBase = (followers / 1000) * BASE_PER_1K;
  const baseValue = Math.max(FLOOR, rawBase);

  // 3. Engagement adjustment, capped.
  const engagementMultiplier = Math.min(ENGAGEMENT_CAP, 0.6 + engagementRate / 2.5);

  // 4. Niche.
  const adjusted = baseValue * engagementMultiplier * niche.multiplier;

  // 5. Range.
  const estimate = toFee(adjusted);
  const low = toFee(adjusted * (1 - RANGE));
  const high = toFee(adjusted * (1 + RANGE));

  // Monthly potential assumes 2-4 sponsored posts - the ceiling before sponsored
  // content starts crowding out the organic voice that made the audience worth
  // sponsoring in the first place.
  const monthlyLow = estimate * 2;
  const monthlyHigh = estimate * 4;

  const steps = [
    {
      label: 'Engagement rate',
      value: `${engagementRate.toFixed(2)}%`,
      detail: `(${Math.round(reactions)} reactions + 2 × ${Math.round(comments)} comments) ÷ ${Math.round(followers).toLocaleString('en-GB')} followers`,
    },
    {
      label: 'Base value',
      value: `€${Math.round(baseValue)}`,
      detail: `€${BASE_PER_1K} per 1,000 followers, floored at €${FLOOR}`,
    },
    {
      label: 'Engagement adjustment',
      value: `×${engagementMultiplier.toFixed(2)}`,
      detail:
        engagementMultiplier >= ENGAGEMENT_CAP
          ? `0.6 + (${engagementRate.toFixed(2)} ÷ 2.5), capped at ×${ENGAGEMENT_CAP}`
          : `0.6 + (${engagementRate.toFixed(2)} ÷ 2.5)`,
    },
    {
      label: 'Niche multiplier',
      value: `×${niche.multiplier}`,
      detail: `${niche.label} — ${niche.note}`,
    },
    {
      label: 'Range',
      value: `€${low} – €${high}`,
      detail: '±20%, rounded to the nearest €10',
    },
  ];

  return {
    valid: true,
    engagementRate,
    rating,
    ratingLabel: label,
    baseValue,
    engagementMultiplier,
    niche,
    estimate,
    low,
    high,
    monthlyLow,
    monthlyHigh,
    steps,
    summary: buildSummary(estimate, engagementRate, rating, niche),
    recommendations: buildRecommendations({ rating, engagementRate, followers, postsPerWeek, niche, estimate }),
  };
}

function buildSummary(estimate: number, rate: number, rating: WorthRating, niche: Niche): string {
  if (rating === 'excellent') {
    return `At ${rate.toFixed(1)}% engagement in ${niche.label}, roughly €${estimate} per sponsored post is defensible — you are in the top band, and that is the argument for holding the rate.`;
  }
  if (rating === 'good') {
    return `A ${rate.toFixed(1)}% engagement rate puts you in the good band. Around €${estimate} per sponsored post is a fair asking price in ${niche.label}.`;
  }
  if (rating === 'average') {
    return `At ${rate.toFixed(1)}% engagement, about €${estimate} per post is realistic. Lifting engagement moves this faster than growing the audience.`;
  }
  return `Engagement of ${rate.toFixed(1)}% keeps the estimate near the €${estimate} floor. Sponsors buy attention, not follower counts — engagement is the lever here.`;
}

function buildRecommendations({
  rating,
  followers,
  postsPerWeek,
  niche,
  estimate,
}: {
  rating: WorthRating;
  engagementRate: number;
  followers: number;
  postsPerWeek: number;
  niche: Niche;
  estimate: number;
}): string[] {
  const out: string[] = [];

  if (rating === 'low' || rating === 'average') {
    out.push(
      'Engagement is worth more than reach here: doubling your engagement rate raises this estimate far more than doubling your followers would.',
    );
  }
  if (rating === 'excellent') {
    out.push(`Quote the engagement rate alongside the fee. At your level it justifies pricing above the €${estimate} midpoint.`);
  }
  if (postsPerWeek <= 1) {
    out.push('Posting once a week makes averages volatile and slows audience growth. Two to three is the usual floor for sponsor interest.');
  }
  if (postsPerWeek >= 6) {
    out.push('At six or more posts a week, keep sponsored content to two to four a month so it does not crowd out the organic voice sponsors are paying for.');
  }
  if (niche.multiplier < 1) {
    out.push('A more defined B2B niche carries a pricing premium. Narrowing your topic focus is the single biggest lever on this number.');
  }
  if (followers < 2000) {
    out.push('Under 2,000 followers, lead with audience quality — job titles in your comments beat any follower count in a pitch.');
  }

  out.push('This is an estimate, not a quote. It cannot see audience seniority, content quality or niche authority — all of which move real rates.');

  return out.slice(0, 4);
}
