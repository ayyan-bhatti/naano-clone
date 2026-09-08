/**
 * Benchmark datasets for the free tools.
 *
 * IMPORTANT, and stated in the UI wherever these numbers surface: this is our own
 * illustrative dataset. It is shaped like Naano's published tables (same tiers,
 * same columns, same units) so the tools behave identically, but the values are
 * ours. We are not republishing their marketplace data as if it were ours, and
 * we are not inventing "real bookings" we never made.
 *
 * Everything is a plain data table on purpose: thresholds live here, never
 * inline in a component, so a benchmark can be retuned without touching UI.
 */

export const DATASET_LABEL = 'Vouch reference set';
export const DATASET_NOTE =
  'Illustrative benchmark set built for this demo, shaped like a real marketplace index. Not live data.';
export const DATASET_SIZE = 300;
export const DATASET_WINDOW = '14 June – 11 August 2026';

/* ------------------------------------------------------------------ *
 * Engagement rate benchmarks, by audience size
 * ------------------------------------------------------------------ */

export interface EngagementTier {
  id: string;
  label: string;
  min: number;
  /** Exclusive upper bound; Infinity for the top tier. */
  max: number;
  /** "Good" band, as percentages. */
  goodMin: number;
  goodMax: number;
  meaning: string;
}

/**
 * Rates fall as audiences grow: a shared threshold would rank every nano-creator
 * first and every large account as failing, which is the exact mistake the
 * product exists to correct.
 */
export const ENGAGEMENT_TIERS: EngagementTier[] = [
  {
    id: 'under-2k',
    label: 'Under 2,000 followers',
    min: 0,
    max: 2000,
    goodMin: 5,
    goodMax: 8,
    meaning: 'Small, warm audiences engage the most. Above 8% is exceptional.',
  },
  {
    id: '2k-5k',
    label: '2,000 – 5,000 followers',
    min: 2000,
    max: 5000,
    goodMin: 4,
    goodMax: 6,
    meaning: 'The sweet spot for B2B micro-creators: reach with the audience still intact.',
  },
  {
    id: '5k-20k',
    label: '5,000 – 20,000 followers',
    min: 5000,
    max: 20000,
    goodMin: 2.5,
    goodMax: 4,
    meaning: 'Rates dilute as the audience broadens beyond the core network.',
  },
  {
    id: '20k-50k',
    label: '20,000 – 50,000 followers',
    min: 20000,
    max: 50000,
    goodMin: 1.5,
    goodMax: 2.5,
    meaning: 'Large accounts trade engagement depth for raw distribution.',
  },
  {
    id: '50k-plus',
    label: '50,000+ followers',
    min: 50000,
    max: Infinity,
    goodMin: 1,
    goodMax: 1.5,
    meaning: 'At this scale a stable 1%+ rate still means serious absolute reach.',
  },
];

export function engagementTierFor(followers: number): EngagementTier {
  return (
    ENGAGEMENT_TIERS.find((t) => followers >= t.min && followers < t.max) ??
    ENGAGEMENT_TIERS[ENGAGEMENT_TIERS.length - 1]
  );
}

/* ------------------------------------------------------------------ *
 * Delivery odds, by price band
 * ------------------------------------------------------------------ */

export interface PriceBand {
  id: string;
  label: string;
  min: number;
  max: number;
  bookings: number;
  /** Share of settled bookings that ended in a published post, 0-1. */
  publishedRate: number;
  /** Share of offers the creator never responded to, 0-1. */
  neverAnsweredRate: number;
  note: string;
  /** Flagged where the sample is too thin to lean on. */
  directional?: boolean;
}

export const PRICE_BANDS: PriceBand[] = [
  {
    id: 'under-200',
    label: 'Under €200',
    min: 0,
    max: 200,
    bookings: 142,
    publishedRate: 0.304,
    neverAnsweredRate: 0.416,
    note: 'The largest band by volume, and the one offers most often go unanswered in.',
  },
  {
    id: '200-399',
    label: '€200 – €399',
    min: 200,
    max: 400,
    bookings: 70,
    publishedRate: 0.259,
    neverAnsweredRate: 0.409,
    note: 'The weakest observed delivery rate despite costing more than the band below.',
  },
  {
    id: '400-599',
    label: '€400 – €599',
    min: 400,
    max: 600,
    bookings: 36,
    publishedRate: 0.346,
    neverAnsweredRate: 0.25,
    note: 'Directional only — this band rests on a thin set of buying brands.',
    directional: true,
  },
  {
    id: '600-plus',
    label: '€600 and above',
    min: 600,
    max: Infinity,
    bookings: 52,
    publishedRate: 0.646,
    neverAnsweredRate: 0.192,
    note: 'The strongest observed delivery band — but it moved sharply between snapshots.',
  },
];

export function priceBandFor(offer: number): PriceBand {
  return PRICE_BANDS.find((b) => offer >= b.min && offer < b.max) ?? PRICE_BANDS[PRICE_BANDS.length - 1];
}

/* ------------------------------------------------------------------ *
 * Transacted prices, by audience size
 * ------------------------------------------------------------------ */

export interface AudienceBand {
  id: string;
  label: string;
  short: string;
  min: number;
  max: number;
  n: number;
  p25: number;
  median: number;
  p75: number;
}

export const AUDIENCE_BANDS: AudienceBand[] = [
  { id: 'under-5k', label: 'Under 5,000 followers', short: '<5K', min: 0, max: 5000, n: 66, p25: 56, median: 84, p75: 120 },
  { id: '5k-10k', label: '5,000 – 10,000 followers', short: '5–10K', min: 5000, max: 10000, n: 64, p25: 88, median: 180, p75: 423 },
  { id: '10k-25k', label: '10,000 – 25,000 followers', short: '10–25K', min: 10000, max: 25000, n: 118, p25: 122, median: 300, p75: 360 },
  { id: '25k-50k', label: '25,000 – 50,000 followers', short: '25–50K', min: 25000, max: 50000, n: 36, p25: 345, median: 588, p75: 606 },
  { id: '50k-plus', label: '50,000+ followers', short: '50K+', min: 50000, max: Infinity, n: 16, p25: 499, median: 720, p75: 900 },
];

export function audienceBandById(id: string): AudienceBand {
  return AUDIENCE_BANDS.find((b) => b.id === id) ?? AUDIENCE_BANDS[0];
}

export function audienceBandFor(followers: number): AudienceBand {
  return (
    AUDIENCE_BANDS.find((b) => followers >= b.min && followers < b.max) ??
    AUDIENCE_BANDS[AUDIENCE_BANDS.length - 1]
  );
}

/* ------------------------------------------------------------------ *
 * Niches, for the worth calculator
 * ------------------------------------------------------------------ */

export interface Niche {
  id: string;
  label: string;
  multiplier: number;
  note: string;
}

export const NICHES: Niche[] = [
  { id: 'saas', label: 'B2B SaaS / Tech', multiplier: 1.2, note: 'Highest sponsor demand.' },
  { id: 'finance', label: 'Finance', multiplier: 1.15, note: 'Senior audiences, high deal values.' },
  { id: 'sales', label: 'Sales / Marketing', multiplier: 1.1, note: 'Large, well-served buyer pool.' },
  { id: 'hr', label: 'HR / Future of work', multiplier: 1.0, note: 'Baseline B2B demand.' },
  { id: 'other', label: 'Other', multiplier: 0.9, note: 'Weaker fit for B2B sponsors.' },
];

export function nicheById(id: string): Niche {
  return NICHES.find((n) => n.id === id) ?? NICHES[NICHES.length - 1];
}

/* ------------------------------------------------------------------ *
 * Campaign timing
 * ------------------------------------------------------------------ */

export const TIMING = {
  medianDaysToPublish: 8,
  p90DaysToPublish: 14,
  medianAcceptanceMinutes: 35,
};

/** Preset allocations for the budget planner. */
export const ALLOCATIONS = [
  {
    id: 'spread',
    label: 'Spread',
    audienceBandId: 'under-5k',
    blurb: 'Under 5,000 followers. Most posts per euro, weakest delivery rate.',
  },
  {
    id: 'mid',
    label: 'Mid-tier',
    audienceBandId: '10k-25k',
    blurb: '10,000 – 25,000 followers. Middle on price, weakest response rate.',
  },
  {
    id: 'concentrated',
    label: 'Concentrated',
    audienceBandId: '50k-plus',
    blurb: '50,000+ followers. Fewest posts, strongest observed delivery.',
  },
] as const;
