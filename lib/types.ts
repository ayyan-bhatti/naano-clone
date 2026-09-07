/**
 * Domain types for Vouch.
 *
 * These mirror the entities observed on naano.com (see REVERSE_ENGINEERING.md
 * section 8). Everything the UI renders is typed here, so wiring this to a real
 * backend later is a matter of swapping the data source in lib/store, not
 * touching components.
 */

export type Role = 'brand' | 'creator';

export type Platform = 'linkedin' | 'x' | 'youtube' | 'newsletter';

export type Availability = 'open' | 'limited' | 'booked';

export type CampaignStatus = 'draft' | 'scheduled' | 'live' | 'completed';

export type CollaborationStatus =
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'in_review'
  | 'published';

export type PayoutStatus = 'pending' | 'scheduled' | 'paid';

export type Objective =
  | 'pipeline'
  | 'awareness'
  | 'signups'
  | 'launch'
  | 'hiring';

/** A slice of a creator's audience, e.g. 38% Founders. Sums to ~100. */
export interface AudienceSegment {
  label: string;
  share: number;
}

export interface RecentPost {
  id: string;
  excerpt: string;
  reactions: number;
  comments: number;
  postedAt: string;
}

export interface Creator {
  id: string;
  slug: string;
  name: string;
  username: string;
  avatarSeed: string;
  headline: string;
  bio: string;
  whyWorkWithMe: string;
  category: string;
  topics: string[];
  country: string;
  countryFlag: string;
  followers: number;
  medianViews: number;
  avgReactions: number;
  avgComments: number;
  /** Percentage, one decimal, e.g. 4.2 */
  engagement: number;
  audience: AudienceSegment[];
  pricePerPost: number;
  platforms: Platform[];
  availability: Availability;
  verified: boolean;
  /** Days since stats were refreshed - drives the "updated Nd ago" stamp. */
  statsAgeDays: number;
  recentPosts: RecentPost[];
}

/**
 * Match score is computed against the signed-in brand's buyer profile rather
 * than stored on the creator - audience fit is relational, not intrinsic. See
 * lib/match.ts.
 */
export interface BuyerProfile {
  vertical: string;
  /** Audience segment labels this brand sells to, e.g. ["Founders","GTM teams"] */
  personas: string[];
  topics: string[];
  markets: string[];
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  leads: number;
  /** Attributed pipeline in EUR. */
  pipeline: number;
  spend: number;
}

/** Per-creator performance inside a campaign. */
export interface CollaborationMetrics {
  impressions: number;
  clicks: number;
  leads: number;
  pipeline: number;
}

export interface Collaboration {
  creatorId: string;
  status: CollaborationStatus;
  fee: number;
  deliverables: string;
  deliverBy: string;
  payoutStatus: PayoutStatus;
  /** Present once the collaboration has published. */
  metrics?: CollaborationMetrics;
  publishedAt?: string;
}

export interface Brief {
  objectives: string[];
  keyMessages: string[];
  creatorGuidelines: string[];
  callToAction: string;
  toneOfVoice: string;
  mustAvoid: string[];
  landingUrl: string;
  /** Short code powering the per-campaign tracked link. */
  trackingCode: string;
}

export interface Campaign {
  id: string;
  name: string;
  brand: string;
  objective: Objective;
  budget: number;
  status: CampaignStatus;
  audience: string;
  keyMessage: string;
  collaborations: Collaboration[];
  brief: Brief;
  startDate: string;
  endDate: string;
  createdAt: string;
  /** Daily series for the trend chart; index 0 is the campaign start. */
  daily: DailyPoint[];
}

export interface DailyPoint {
  date: string;
  impressions: number;
  clicks: number;
  leads: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company: string;
  companyDomain: string;
  avatarSeed: string;
  onboarded: boolean;
  buyerProfile: BuyerProfile;
  /** Only set when role === 'creator': links the account to a marketplace profile. */
  creatorId?: string;
}

export interface Notification {
  id: string;
  kind: 'collaboration' | 'campaign' | 'payout' | 'system';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

/** Everything persisted to localStorage under one versioned key. */
export interface PersistedState {
  version: number;
  user: User | null;
  campaigns: Campaign[];
  shortlist: string[];
  notifications: Notification[];
}
