import type { Brief, Creator, Objective } from '@/lib/types';

/**
 * Campaign brief generation.
 *
 * Naano labels this step "AI" on their site. We generate it locally with
 * deterministic template assembly instead of calling a model. That is a
 * deliberate trade: the demo has no keys, no network dependency and no failure
 * mode, and the output is reproducible - the same inputs always give the same
 * brief, which is exactly what you want when a reviewer clicks through twice.
 *
 * It is labelled "Assisted" in the UI rather than "AI", because claiming a model
 * ran when none did would be dishonest.
 */

export interface BriefInput {
  campaignName: string;
  company: string;
  objective: Objective;
  audience: string;
  keyMessage: string;
  landingUrl: string;
  creators: Creator[];
}

const OBJECTIVE_FRAMES: Record<
  Objective,
  { primary: string; secondary: string; cta: string; tone: string }
> = {
  pipeline: {
    primary: 'Generate qualified pipeline from {audience}',
    secondary: 'Drive tracked clicks from readers who match the ICP, not raw reach',
    cta: 'Book a 20-minute walkthrough',
    tone: 'Direct and specific. Lead with the problem, not the product.',
  },
  awareness: {
    primary: 'Establish {company} as a credible option among {audience}',
    secondary: 'Earn saves, shares and comments from practitioners in the category',
    cta: 'Read the full breakdown',
    tone: 'Educational and opinionated. Teach something useful even to readers who never convert.',
  },
  signups: {
    primary: 'Convert {audience} into free trials of {company}',
    secondary: 'Shorten the distance between the post and first value in the product',
    cta: 'Start free — no card required',
    tone: 'Practical and hands-on. Show the product doing the work.',
  },
  launch: {
    primary: 'Land the {campaign} launch with {audience}',
    secondary: 'Concentrate attention in a single window rather than spreading it thin',
    cta: 'See what shipped',
    tone: 'Energetic but concrete. What changed, why it matters, who it is for.',
  },
  hiring: {
    primary: 'Put {company} in front of {audience} as a place worth joining',
    secondary: 'Attract inbound from people already respected by their peers',
    cta: 'See open roles',
    tone: 'Human and unpolished. Culture claims need evidence.',
  },
};

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? k);
}

/** Short, URL-safe, human-readable tracking code, stable for a given campaign. */
export function makeTrackingCode(campaignName: string, salt: string = ''): string {
  const base = campaignName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 4)
    .padEnd(4, 'x');
  let h = 0x811c9dc5;
  const input = `${campaignName}${salt}`;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${base}${(h >>> 0).toString(36).slice(0, 4)}`;
}

export function generateBrief(input: BriefInput): Brief {
  const frame = OBJECTIVE_FRAMES[input.objective];
  const vars = {
    company: input.company || 'the brand',
    audience: input.audience || 'your buyers',
    campaign: input.campaignName || 'this campaign',
  };

  // Topics the selected creators actually cover, most common first. This is why
  // the brief changes meaningfully when you change your shortlist.
  const topicCounts = new Map<string, number>();
  input.creators.forEach((c) =>
    c.topics.forEach((t) => topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1)),
  );
  const sharedTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  const objectives = [
    fill(frame.primary, vars),
    fill(frame.secondary, vars),
    sharedTopics.length
      ? `Anchor the story in ${sharedTopics.join(', ')} — the ground this shortlist already covers`
      : 'Keep the story anchored in the reader’s day-to-day work',
  ];

  const keyMessages = [
    input.keyMessage.trim() ||
      `${vars.company} removes a specific, recurring cost from ${vars.audience}`,
    'Open with the problem in the reader’s own language before naming the product',
    'One concrete number, example or before/after — no unquantified superlatives',
  ];

  const creatorGuidelines = [
    'Write in your own voice. Do not reuse our marketing copy — if it sounds like an ad it will not perform.',
    'Disclose the partnership clearly. Our audience overlaps with yours and trust is the asset.',
    'Use the tracked link provided. It is how you get credited for the clicks and leads you drive.',
    input.creators.length > 1
      ? 'Avoid the same opening hook as other creators in this campaign — we are briefing several of you.'
      : 'Lead with a hook drawn from your own experience, not from the brief.',
  ];

  const mustAvoid = [
    'Competitor comparisons by name',
    'Unverifiable performance claims',
    'Reposting the brief verbatim',
  ];

  return {
    objectives,
    keyMessages,
    creatorGuidelines,
    callToAction: frame.cta,
    toneOfVoice: frame.tone,
    mustAvoid,
    landingUrl: input.landingUrl || 'https://example.com',
    trackingCode: makeTrackingCode(input.campaignName, input.company),
  };
}

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  pipeline: 'Pipeline generation',
  awareness: 'Category awareness',
  signups: 'Free trials & signups',
  launch: 'Product launch',
  hiring: 'Hiring & employer brand',
};

export const OBJECTIVE_OPTIONS = Object.entries(OBJECTIVE_LABELS) as [Objective, string][];
