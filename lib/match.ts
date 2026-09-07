import { formatCompact } from '@/lib/format';
import type { BuyerProfile, Creator } from '@/lib/types';

/**
 * Audience-fit scoring.
 *
 * Naano's marketplace ranks on "MATCHING xx/100" and states the principle
 * explicitly: audience fit comes before follower count. So this is relational -
 * a creator has no intrinsic score, only a score against a given buyer profile.
 *
 * We go one step further than the original and return the breakdown, so the
 * profile page can explain *why* a creator scores what they do instead of
 * showing an unexplained number.
 */

export interface MatchFactor {
  label: string;
  /** Points earned. */
  score: number;
  /** Points available. */
  max: number;
  detail: string;
}

export interface MatchResult {
  score: number;
  factors: MatchFactor[];
}

const WEIGHTS = {
  personas: 42,
  topics: 30,
  market: 12,
  quality: 16,
} as const;

/** "A", "A and B", "A, B and C" - reads as a sentence, not a join. */
function listSentence(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function overlap(a: string[], b: string[]): string[] {
  const norm = (s: string) => s.toLowerCase().trim();
  const bs = new Set(b.map(norm));
  return a.filter((x) => bs.has(norm(x)));
}

/**
 * Engagement quality, normalised against what is realistic at that audience
 * size. Small accounts naturally engage harder, so a flat threshold would just
 * rank every nano-creator first and defeat the purpose.
 */
function qualityScore(creator: Creator): { ratio: number; expected: number } {
  const expected = Math.max(1.8, 9.5 - Math.log10(Math.max(creator.followers, 1000)) * 1.55);
  return { ratio: creator.engagement / expected, expected };
}

export function matchScore(creator: Creator, profile: BuyerProfile): MatchResult {
  const factors: MatchFactor[] = [];

  // 1. Persona overlap, weighted by how much of the audience each segment is.
  const matchedSegments = creator.audience.filter((seg) =>
    profile.personas.some((p) => p.toLowerCase().trim() === seg.label.toLowerCase().trim()),
  );
  const coveredShare = matchedSegments.reduce((sum, s) => sum + s.share, 0);
  const personaScore = Math.min(WEIGHTS.personas, (coveredShare / 70) * WEIGHTS.personas);
  factors.push({
    label: 'Audience match',
    score: personaScore,
    max: WEIGHTS.personas,
    detail: matchedSegments.length
      ? `${coveredShare}% of this audience is ${listSentence(matchedSegments.map((s) => s.label))}`
      : 'No overlap with your buyer personas',
  });

  // 2. Topic overlap.
  const sharedTopics = overlap(creator.topics, profile.topics);
  const topicScore = profile.topics.length
    ? Math.min(WEIGHTS.topics, (sharedTopics.length / Math.min(profile.topics.length, 3)) * WEIGHTS.topics)
    : WEIGHTS.topics * 0.5;
  factors.push({
    label: 'Topic relevance',
    score: topicScore,
    max: WEIGHTS.topics,
    detail: sharedTopics.length
      ? `Writes about ${sharedTopics.join(', ')}`
      : `Covers ${creator.topics.slice(0, 2).join(', ')} — outside your topics`,
  });

  // 3. Market.
  const inMarket = profile.markets.some((m) => m.toLowerCase() === creator.country.toLowerCase());
  const marketScore = inMarket ? WEIGHTS.market : profile.markets.length === 0 ? WEIGHTS.market * 0.5 : WEIGHTS.market * 0.25;
  factors.push({
    label: 'Market',
    score: marketScore,
    max: WEIGHTS.market,
    detail: inMarket ? `Based in ${creator.country}, a target market` : `Based in ${creator.country}`,
  });

  // 4. Engagement quality for their size.
  const { ratio, expected } = qualityScore(creator);
  const qScore = Math.max(0, Math.min(WEIGHTS.quality, (ratio / 1.35) * WEIGHTS.quality));
  factors.push({
    label: 'Engagement quality',
    score: qScore,
    max: WEIGHTS.quality,
    detail: `${creator.engagement.toFixed(1)}% vs ${expected.toFixed(1)}% typical at ${formatCompact(creator.followers)} followers`,
  });

  const total = factors.reduce((sum, f) => sum + f.score, 0);
  return { score: Math.max(11, Math.min(99, Math.round(total))), factors };
}

/** Cheap variant for list rendering, where the breakdown is not needed. */
export function matchScoreOnly(creator: Creator, profile: BuyerProfile): number {
  return matchScore(creator, profile).score;
}
