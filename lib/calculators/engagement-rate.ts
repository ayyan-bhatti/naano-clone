import { engagementTierFor, type EngagementTier } from '@/lib/data/benchmarks';

/**
 * Engagement rate.
 *
 * Two rates, deliberately kept separate:
 *   by followers   = (reactions + comments + reposts) / followers x 100
 *   by impressions = (reactions + comments + reposts) / impressions x 100
 *
 * By-followers is the comparable metric (anyone can compute it from a public
 * profile). By-impressions is the fairer one, because follower counts include
 * dormant accounts the algorithm never serves.
 *
 * Note this does NOT double-weight comments - the worth calculator does, and
 * they are different formulas for different jobs. Unifying them would break
 * agreement with the published benchmark tiers.
 */

export type Verdict = 'excellent' | 'healthy' | 'below' | 'none';

export interface EngagementInput {
  followers: number;
  reactions: number;
  comments: number;
  reposts: number;
  /** Optional. When absent we estimate it. */
  impressions?: number | null;
}

export interface EngagementResult {
  valid: boolean;
  totalEngagements: number;
  byFollowers: number;
  byImpressions: number;
  /** True when impressions were estimated rather than supplied. */
  impressionsEstimated: boolean;
  estimatedImpressions: number;
  tier: EngagementTier;
  verdict: Verdict;
  verdictLabel: string;
  /** How far above/below the good band, in percentage points. Negative = below. */
  deltaToBand: number;
  summary: string;
  recommendations: string[];
}

/**
 * Local impression model, used only when the user has not supplied impressions.
 *
 * LinkedIn reach as a multiple of followers falls as the audience grows - small
 * accounts get served well beyond their network, large ones increasingly do not.
 * Engagement lifts distribution, so a well-engaged post reaches further. Both
 * effects are bounded so extreme inputs cannot produce absurd numbers.
 */
export function estimateImpressions(followers: number, engagements: number): number {
  if (followers <= 0) return 0;

  const base = Math.max(0.55, 3.2 - Math.log10(Math.max(followers, 500)) * 0.52);
  const rawRate = engagements / followers;
  // Engagement lift, clamped so a freak ratio cannot run away with the estimate.
  const lift = 1 + Math.min(0.9, Math.max(0, rawRate) * 9);
  return Math.round(followers * base * lift);
}

function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** Guards every user-supplied number: no NaN, no Infinity, no negatives. */
function clean(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

export function calculateEngagementRate(input: EngagementInput): EngagementResult {
  const followers = clean(input.followers);
  const reactions = clean(input.reactions);
  const comments = clean(input.comments);
  const reposts = clean(input.reposts);
  const suppliedImpressions = clean(input.impressions);

  const totalEngagements = reactions + comments + reposts;
  const tier = engagementTierFor(followers);

  if (followers <= 0) {
    return {
      valid: false,
      totalEngagements,
      byFollowers: 0,
      byImpressions: 0,
      impressionsEstimated: false,
      estimatedImpressions: 0,
      tier,
      verdict: 'none',
      verdictLabel: '—',
      deltaToBand: 0,
      summary: 'Enter a follower count to calculate your rate.',
      recommendations: [],
    };
  }

  const byFollowers = round((totalEngagements / followers) * 100);

  const impressionsEstimated = suppliedImpressions <= 0;
  const estimatedImpressions = impressionsEstimated
    ? estimateImpressions(followers, totalEngagements)
    : suppliedImpressions;
  const byImpressions =
    estimatedImpressions > 0 ? round((totalEngagements / estimatedImpressions) * 100) : 0;

  let verdict: Verdict;
  let verdictLabel: string;
  let deltaToBand: number;

  if (byFollowers > tier.goodMax) {
    verdict = 'excellent';
    verdictLabel = 'Excellent';
    deltaToBand = round(byFollowers - tier.goodMax);
  } else if (byFollowers >= tier.goodMin) {
    verdict = 'healthy';
    verdictLabel = 'Healthy';
    deltaToBand = 0;
  } else {
    verdict = 'below';
    verdictLabel = 'Below benchmark';
    deltaToBand = round(byFollowers - tier.goodMin);
  }

  const summary =
    verdict === 'excellent'
      ? `${byFollowers}% is above the ${tier.goodMin}–${tier.goodMax}% band for your audience size. That is a strong, defensible rate to quote sponsors.`
      : verdict === 'healthy'
        ? `${byFollowers}% sits inside the ${tier.goodMin}–${tier.goodMax}% band for your audience size. Healthy, and comparable to peers at your scale.`
        : `${byFollowers}% is below the ${tier.goodMin}–${tier.goodMax}% band for your audience size. That usually points at content or consistency, not audience quality.`;

  return {
    valid: true,
    totalEngagements,
    byFollowers,
    byImpressions,
    impressionsEstimated,
    estimatedImpressions,
    tier,
    verdict,
    verdictLabel,
    deltaToBand,
    summary,
    recommendations: buildRecommendations({ verdict, comments, reactions, reposts, byFollowers, tier }),
  };
}

function buildRecommendations({
  verdict,
  comments,
  reactions,
  reposts,
  tier,
}: {
  verdict: Verdict;
  comments: number;
  reactions: number;
  reposts: number;
  byFollowers: number;
  tier: EngagementTier;
}): string[] {
  const out: string[] = [];
  const commentShare = reactions > 0 ? comments / reactions : 0;

  if (verdict === 'below') {
    out.push(
      `Post consistently before optimising anything else. Reaching the ${tier.goodMin}% floor for your tier is usually a cadence problem first.`,
    );
    out.push('Open with a specific claim rather than a question — questions underperform on LinkedIn in B2B.');
  }

  if (commentShare < 0.05) {
    out.push(
      'Comments are low relative to reactions. Ending on a genuine open question, and replying to every comment in the first hour, moves this fastest.',
    );
  } else if (commentShare > 0.15) {
    out.push(
      'Strong comment ratio — that is the number sponsors care about most. Quote it directly when you set your rate.',
    );
  }

  if (reposts === 0) {
    out.push('No reposts recorded. Frameworks and checklists get reshared far more often than opinion posts.');
  }

  if (verdict === 'excellent') {
    out.push('You are above benchmark for your size — this is the single best argument for charging above the median rate.');
  }

  out.push('Track this over ~10 posts rather than one. A single viral post distorts the average in both directions.');

  return out.slice(0, 4);
}
