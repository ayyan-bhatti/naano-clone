import { ALL_TOPICS, CREATORS } from '@/lib/data/creators';
import { matchScore } from '@/lib/match';
import type { BuyerProfile, Creator } from '@/lib/types';

/**
 * Creator search.
 *
 * The original is a lead-capture form: a human at Naano builds the shortlist and
 * emails it within 48 hours. That is not reproducible, and rebuilding it as a
 * form that goes nowhere would give a reviewer nothing to click. So this runs
 * the match instantly against our own marketplace dataset instead, and the UI
 * says exactly that.
 *
 * It deliberately reuses `lib/match.ts` rather than introducing a second scoring
 * engine: the marketplace and this tool must never disagree about how well a
 * creator fits. What this adds on top is budget compatibility, which the
 * marketplace has no reason to model.
 */

export type Objective = 'leads' | 'awareness' | 'launch';

export interface SearchInput {
  /** Free text: what the product is. */
  product: string;
  /** Free text: who they sell to. */
  audience: string;
  objective: Objective;
  /** Total campaign budget in EUR. */
  budget: number;
  /** Explicitly chosen topics, merged with anything parsed from the free text. */
  topics: string[];
}

export interface CreatorMatch {
  creator: Creator;
  score: number;
  /** Audience-fit portion, from the shared scorer. */
  fitScore: number;
  budgetScore: number;
  /** How many posts the whole budget buys from this creator. */
  postsAffordable: number;
  reason: string;
  factors: { label: string; detail: string }[];
}

export interface SearchResult {
  matches: CreatorMatch[];
  derivedProfile: BuyerProfile;
  /** Topics we recognised in the free text, for "we understood this" feedback. */
  detectedTopics: string[];
  detectedPersonas: string[];
  totalConsidered: number;
  affordableCount: number;
}

/** Every persona label that exists across the dataset. */
export const ALL_PERSONAS = Array.from(
  new Set(CREATORS.flatMap((c) => c.audience.map((a) => a.label))),
).sort();

/**
 * Pull known topics and personas out of free text.
 *
 * Deliberately simple substring matching against a closed vocabulary rather than
 * anything fuzzy: it is deterministic, explainable, and when it misses the UI
 * still lets the user pick topics explicitly.
 */
export function parseIntent(text: string): { topics: string[]; personas: string[] } {
  const haystack = ` ${text.toLowerCase()} `;

  const topics = ALL_TOPICS.filter((t) => haystack.includes(t.toLowerCase()));

  const personas = ALL_PERSONAS.filter((p) => {
    const needle = p.toLowerCase();
    if (haystack.includes(needle)) return true;
    // Match the head noun too, so "we sell to founders" catches "Founders".
    const head = needle.split(/[&\s]+/)[0];
    return head.length > 3 && haystack.includes(head);
  });

  // A few common phrasings that do not literally contain a vocabulary term.
  const aliases: [RegExp, string][] = [
    [/\bdevelopers?\b|\bengineers?\b|\bdevs?\b/, 'Engineers'],
    [/\bctos?\b|\bvp eng|\bhead of engineering/, 'CTOs'],
    [/\bsales\b|\baes?\b|\bsdrs?\b/, 'Sales leaders'],
    [/\bmarketers?\b|\bcmos?\b|\bdemand gen/, 'Marketing leaders'],
    [/\bfounders?\b|\bceos?\b/, 'Founders'],
    [/\brevops\b|\brevenue ops/, 'RevOps'],
    [/\bpms?\b|\bproduct managers?\b/, 'Product managers'],
    [/\bfinance\b|\bcfos?\b/, 'CFOs & finance'],
    [/\bhr\b|\bpeople ops\b|\brecruit/, 'People & HR'],
  ];
  aliases.forEach(([re, persona]) => {
    if (re.test(haystack) && ALL_PERSONAS.includes(persona) && !personas.includes(persona)) {
      personas.push(persona);
    }
  });

  return { topics, personas };
}

/**
 * Budget compatibility, 0-1.
 *
 * A creator who eats the whole budget in one post scores badly even if the fit
 * is perfect, because a single post is not a campaign. The peak sits where the
 * budget buys roughly 3-12 posts from that creator.
 */
export function budgetFit(price: number, budget: number): { score: number; posts: number } {
  if (budget <= 0 || price <= 0) return { score: 0, posts: 0 };

  const posts = Math.floor(budget / price);
  if (posts < 1) return { score: 0, posts: 0 };
  if (posts === 1) return { score: 0.35, posts };
  if (posts === 2) return { score: 0.65, posts };
  if (posts <= 12) return { score: 1, posts };
  // Very cheap relative to budget: fine, but suggests aiming higher too.
  return { score: 0.82, posts };
}

const OBJECTIVE_WEIGHTS: Record<Objective, { fit: number; budget: number; engagement: number }> = {
  // Leads: fit matters most - a wrong audience produces no pipeline at any price.
  leads: { fit: 0.62, budget: 0.2, engagement: 0.18 },
  // Awareness: reach and repetition, so budget efficiency carries more.
  awareness: { fit: 0.5, budget: 0.32, engagement: 0.18 },
  // Launch: concentrated attention, engagement quality weighted up.
  launch: { fit: 0.55, budget: 0.2, engagement: 0.25 },
};

export function calculateCreatorFit(input: SearchInput): SearchResult {
  const parsedProduct = parseIntent(input.product);
  const parsedAudience = parseIntent(input.audience);

  const detectedTopics = Array.from(new Set([...parsedProduct.topics, ...parsedAudience.topics]));
  const detectedPersonas = Array.from(
    new Set([...parsedProduct.personas, ...parsedAudience.personas]),
  );

  const topics = Array.from(new Set([...input.topics, ...detectedTopics]));

  const derivedProfile: BuyerProfile = {
    vertical: input.product.trim() || 'B2B',
    // With nothing recognised, fall back to the broadest sensible set rather
    // than scoring everyone at zero and showing an empty result.
    personas: detectedPersonas.length ? detectedPersonas : ALL_PERSONAS,
    topics,
    markets: [],
  };

  const budget = Number.isFinite(input.budget) && input.budget > 0 ? input.budget : 0;
  const weights = OBJECTIVE_WEIGHTS[input.objective] ?? OBJECTIVE_WEIGHTS.leads;

  const matches: CreatorMatch[] = CREATORS.map((creator) => {
    const fit = matchScore(creator, derivedProfile);
    const { score: bScore, posts } = budgetFit(creator.pricePerPost, budget);

    // Engagement normalised against what is realistic at that audience size, so
    // this does not simply re-rank by "smallest creator first".
    const expected = Math.max(1.8, 9.5 - Math.log10(Math.max(creator.followers, 1000)) * 1.55);
    const engagementScore = Math.max(0, Math.min(1, creator.engagement / expected / 1.35));

    const score = Math.round(
      (fit.score / 100) * weights.fit * 100 +
        bScore * weights.budget * 100 +
        engagementScore * weights.engagement * 100,
    );

    return {
      creator,
      score: Math.max(1, Math.min(99, score)),
      fitScore: fit.score,
      budgetScore: Math.round(bScore * 100),
      postsAffordable: posts,
      reason: buildReason(creator, fit.factors, posts, input.objective),
      factors: fit.factors.map((f) => ({ label: f.label, detail: f.detail })),
    };
  })
    .filter((m) => m.creator.availability !== 'booked')
    .sort((a, b) => b.score - a.score || a.creator.pricePerPost - b.creator.pricePerPost);

  return {
    matches,
    derivedProfile,
    detectedTopics,
    detectedPersonas,
    totalConsidered: CREATORS.length,
    affordableCount: matches.filter((m) => m.postsAffordable >= 1).length,
  };
}

function buildReason(
  creator: Creator,
  factors: { label: string; score: number; max: number; detail: string }[],
  posts: number,
  objective: Objective,
): string {
  const audience = factors.find((f) => f.label === 'Audience match');
  const topic = factors.find((f) => f.label === 'Topic relevance');

  const parts: string[] = [];

  if (audience && audience.score > audience.max * 0.45) {
    parts.push(audience.detail.charAt(0).toLowerCase() + audience.detail.slice(1));
  } else if (topic && topic.score > topic.max * 0.5) {
    parts.push(topic.detail.charAt(0).toLowerCase() + topic.detail.slice(1));
  } else {
    parts.push(`covers ${creator.topics.slice(0, 2).join(' and ').toLowerCase()}`);
  }

  if (posts >= 2) {
    parts.push(`your budget covers ${posts} post${posts === 1 ? '' : 's'} at €${creator.pricePerPost}`);
  } else if (posts === 1) {
    parts.push(`one post fits your budget at €${creator.pricePerPost}`);
  }

  if (objective === 'leads' && creator.engagement >= 5) {
    parts.push(`${creator.engagement.toFixed(1)}% engagement suggests an audience that actually reads`);
  }

  const sentence = parts.join(', and ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}
