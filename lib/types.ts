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

export type DraftStatus = 'submitted' | 'changes_requested' | 'approved';

/**
 * One revision of the post copy a creator submits for approval.
 *
 * Revisions are appended, never overwritten, so the review history stays
 * readable: what was sent, what the brand asked for, what changed.
 */
export interface Draft {
  id: string;
  /** 1-indexed. Revision 2 exists only because revision 1 was sent back. */
  revision: number;
  /** The post copy itself. */
  body: string;
  /** Optional note from the creator to the brand. */
  note?: string;
  submittedAt: string;
  status: DraftStatus;
  /** What the brand asked to change. Only set when status is changes_requested. */
  feedback?: string;
  reviewedAt?: string;
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
  /**
   * Submitted copy awaiting or having passed review. Approval of the latest
   * revision is what publishes the collaboration and schedules the payout.
   */
  drafts?: Draft[];
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

export type PayoutMethodType = 'bank' | 'paypal';

/**
 * Where a creator's fees are sent.
 *
 * Represented, not processed - no payment provider is wired into this build,
 * which is why only a masked tail of the account is ever kept. Storing a full
 * IBAN in localStorage to make a demo look complete would be the wrong trade.
 */
export interface PayoutMethod {
  type: PayoutMethodType;
  accountName: string;
  /** Last four characters only; the rest is discarded on entry. */
  last4: string;
  country: string;
  addedAt: string;
}

/**
 * Creator-authored overrides on top of the seeded marketplace profile.
 *
 * Kept as a sparse patch rather than a full copy of the Creator so the base
 * data stays the single source of truth for everything the creator has not
 * touched - and so an unedited field keeps tracking the seed.
 */
export interface CreatorEdits {
  headline?: string;
  bio?: string;
  whyWorkWithMe?: string;
  topics?: string[];
  pricePerPost?: number;
  availability?: Availability;
  updatedAt?: string;
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
  /** SHA-256 of the demo password. See lib/auth.ts - not real authentication. */
  passwordHash?: string;
  buyerProfile: BuyerProfile;
  /** Only set when role === 'creator': links the account to a marketplace profile. */
  creatorId?: string;
  /** Creator-side only: edits applied over the seeded profile. */
  creatorEdits?: CreatorEdits;
  /** Creator-side only: where fees are sent. */
  payoutMethod?: PayoutMethod;
}

/**
 * One message in a brand <-> creator thread.
 *
 * Threads are keyed by collaboration (`campaignId:creatorId`) rather than by
 * person, because the same two parties can be talking about two campaigns and
 * conflating those conversations is how real tools get confusing.
 */
export interface Message {
  id: string;
  threadId: string;
  from: Role;
  authorName: string;
  body: string;
  createdAt: string;
  read: boolean;
  /**
   * True when written by the local demo counterpart rather than typed by a
   * person. Surfaced in the UI - a scripted reply that pretends to be a human
   * is the kind of thing this build is trying not to do.
   */
  auto?: boolean;
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

/**
 * A real click on a tracked link.
 *
 * Device and referrer are genuinely observed from the browser. The visitor
 * identity fields are synthesised - a real product resolves these from IP
 * intelligence, and the UI labels them as inferred rather than claiming they
 * were looked up.
 */
export interface ClickEvent {
  id: string;
  campaignId: string;
  /** Which creator's link variant was used; null for the campaign-level link. */
  creatorId: string | null;
  code: string;
  timestamp: string;
  /** Observed. 'direct' when there is no referrer. */
  referrer: string;
  /** Observed from the user agent. */
  device: 'desktop' | 'mobile' | 'tablet';
  /** Inferred, not looked up. */
  company: string;
  role: string;
  /** Deterministically derived from the click id - a fixed share convert. */
  isLead: boolean;
  /** Attributed pipeline in EUR when isLead, else 0. */
  pipeline: number;
}

/** Everything persisted to localStorage under one versioned key. */
export interface PersistedState {
  version: number;
  user: User | null;
  campaigns: Campaign[];
  shortlist: string[];
  notifications: Notification[];
  /** Real clicks recorded by the /l/[code] route. */
  clicks: ClickEvent[];
  /** Brand <-> creator conversation, across every collaboration. */
  messages: Message[];
}
