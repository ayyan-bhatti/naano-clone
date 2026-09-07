import { getCreator } from '@/lib/data/creators';
import type {
  Campaign,
  CampaignMetrics,
  Collaboration,
  CollaborationMetrics,
  DailyPoint,
} from '@/lib/types';

/**
 * Performance simulation.
 *
 * Campaign totals are never stored as loose numbers - they are always the sum
 * of per-creator collaboration metrics, which are themselves derived from that
 * creator's real reach and engagement. So the dashboard, the campaign detail
 * page and the per-creator table can never disagree with each other, and adding
 * a creator to a live campaign moves every number that depends on it.
 *
 * Derivation is deterministic (hashed from campaign + creator id) so charts do
 * not reshuffle on every render or differ between server and client.
 */

function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rand(seed: string): number {
  return hash(seed) / 0xffffffff;
}

/**
 * Smaller, nichier audiences click harder. This is the central claim of the
 * product ("audience fit before follower count"), so the simulation has to
 * reflect it or the dashboard would argue against the pitch.
 */
function expectedCtr(followers: number, seed: string): number {
  const base = 2.6 - Math.log10(Math.max(followers, 1000)) * 0.42;
  const jitter = 0.75 + rand(`${seed}:ctr`) * 0.6;
  return Math.max(0.35, base * jitter) / 100;
}

export function simulateCollaboration(
  campaignId: string,
  collab: Collaboration,
): CollaborationMetrics {
  const creator = getCreator(collab.creatorId);
  if (!creator) return { impressions: 0, clicks: 0, leads: 0, pipeline: 0 };

  const seed = `${campaignId}:${collab.creatorId}`;
  const reachFactor = 0.72 + rand(`${seed}:reach`) * 0.85;
  const impressions = Math.round(creator.medianViews * reachFactor);
  const clicks = Math.round(impressions * expectedCtr(creator.followers, seed));
  const leadRate = 0.05 + rand(`${seed}:lead`) * 0.13;
  const leads = Math.round(clicks * leadRate);
  const dealValue = 1800 + rand(`${seed}:deal`) * 6200;
  const pipeline = Math.round((leads * dealValue) / 100) * 100;

  return { impressions, clicks, leads, pipeline };
}

/** Totals for a campaign, always summed from its published collaborations. */
export function campaignMetrics(campaign: Campaign): CampaignMetrics {
  return campaign.collaborations.reduce<CampaignMetrics>(
    (acc, collab) => {
      if (collab.metrics) {
        acc.impressions += collab.metrics.impressions;
        acc.clicks += collab.metrics.clicks;
        acc.leads += collab.metrics.leads;
        acc.pipeline += collab.metrics.pipeline;
      }
      // Spend is committed as soon as a creator accepts, not only on publish.
      if (collab.status === 'accepted' || collab.status === 'in_review' || collab.status === 'published') {
        acc.spend += collab.fee;
      }
      return acc;
    },
    { impressions: 0, clicks: 0, leads: 0, pipeline: 0, spend: 0 },
  );
}

/** Aggregate across many campaigns, for the dashboard. */
export function aggregateMetrics(campaigns: Campaign[]): CampaignMetrics {
  return campaigns.reduce<CampaignMetrics>(
    (acc, c) => {
      const m = campaignMetrics(c);
      acc.impressions += m.impressions;
      acc.clicks += m.clicks;
      acc.leads += m.leads;
      acc.pipeline += m.pipeline;
      acc.spend += m.spend;
      return acc;
    },
    { impressions: 0, clicks: 0, leads: 0, pipeline: 0, spend: 0 },
  );
}

/**
 * Daily series for a campaign. A LinkedIn post front-loads hard: roughly half
 * its lifetime impressions land in the first 48 hours, then it decays. Each
 * collaboration contributes its own decay curve starting on its publish day, so
 * a campaign with staggered publishing shows multiple bumps rather than one
 * smooth arc.
 */
export function buildDailySeries(campaign: Campaign, days = 30): DailyPoint[] {
  const start = new Date(campaign.startDate).getTime();
  const points: DailyPoint[] = Array.from({ length: days }, (_, i) => ({
    date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
    impressions: 0,
    clicks: 0,
    leads: 0,
  }));

  campaign.collaborations.forEach((collab) => {
    if (!collab.metrics || !collab.publishedAt) return;
    const offset = Math.max(
      0,
      Math.round((new Date(collab.publishedAt).getTime() - start) / 86_400_000),
    );

    // Decay weights: day 0 is the spike, then a long thin tail.
    const weights: number[] = [];
    for (let d = 0; d + offset < days; d += 1) {
      weights.push(Math.exp(-d / 3.2));
    }
    const total = weights.reduce((a, b) => a + b, 0) || 1;

    weights.forEach((w, d) => {
      const idx = offset + d;
      if (idx >= days) return;
      const share = w / total;
      points[idx].impressions += Math.round(collab.metrics!.impressions * share);
      points[idx].clicks += Math.round(collab.metrics!.clicks * share);
      points[idx].leads += Math.round(collab.metrics!.leads * share);
    });
  });

  return points;
}

/** Percentage change between the last two equal halves of a series. */
export function trendDelta(points: DailyPoint[], key: keyof Omit<DailyPoint, 'date'>): number | null {
  if (points.length < 4) return null;
  const mid = Math.floor(points.length / 2);
  const first = points.slice(0, mid).reduce((s, p) => s + p[key], 0);
  const second = points.slice(mid).reduce((s, p) => s + p[key], 0);
  if (first === 0) return second === 0 ? 0 : 100;
  return Math.round(((second - first) / first) * 100);
}
