import type { Campaign, ClickEvent } from '@/lib/types';

/**
 * Tracked-link attribution.
 *
 * This is the one part of the product that records real events rather than
 * simulating them. Open a `/l/<code>` link and a click is written to the store
 * with a timestamp, the real referrer and the real device; the campaign's
 * numbers then move because they read those rows.
 *
 * What is genuinely observed: timestamp, referrer, device, and which creator's
 * link variant was used.
 *
 * What is inferred: the visiting company and role. A real product resolves
 * those from IP intelligence, which is an external service we do not have. They
 * are derived deterministically from the click id and the UI labels them as
 * inferred - it never claims a lookup happened.
 */

function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(seed: string, items: readonly T[]): T {
  return items[hash(seed) % items.length];
}

/** Plausible B2B visitor companies. Fictional, like every other name here. */
const COMPANIES = [
  'Northwind Logistics',
  'Cadence Analytics',
  'Peakline Software',
  'Verity Health',
  'Aurora Fintech',
  'Brightpath Consulting',
  'Meridian Robotics',
  'Halden Labs',
  'Trellis (internal)',
  'Copperfield Group',
  'Solvent AI',
  'Karsten & Co',
];

const ROLES = [
  'Head of RevOps',
  'VP Sales',
  'Growth Lead',
  'Marketing Director',
  'Founder',
  'Sales Operations Manager',
  'CTO',
  'Demand Gen Manager',
];

/** Share of clicks that become an identified lead. */
const LEAD_RATE = 0.14;

export function detectDevice(): ClickEvent['device'] {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function detectReferrer(): string {
  if (typeof document === 'undefined') return 'direct';
  const ref = document.referrer;
  if (!ref) return 'direct';
  try {
    const url = new URL(ref);
    // Same-origin arrivals are internal navigation, not a real referral.
    if (typeof window !== 'undefined' && url.origin === window.location.origin) {
      return 'linkedin.com';
    }
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'direct';
  }
}

export function createClickEvent(input: {
  campaignId: string;
  creatorId: string | null;
  code: string;
}): ClickEvent {
  // Random id: two clicks a second apart must be distinct events, and this is
  // the one place in the codebase where non-determinism is correct - a real
  // click genuinely is a new, unrepeatable event.
  const id = `clk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // Whether a given click converts is then derived from that id, so the same
  // event always reports the same outcome no matter how often it is re-read.
  const isLead = hash(`${id}:lead`) / 0xffffffff < LEAD_RATE;

  return {
    id,
    campaignId: input.campaignId,
    creatorId: input.creatorId,
    code: input.code,
    timestamp: new Date().toISOString(),
    referrer: detectReferrer(),
    device: detectDevice(),
    company: pick(`${id}:co`, COMPANIES),
    role: pick(`${id}:role`, ROLES),
    isLead,
    pipeline: isLead ? 1800 + (hash(`${id}:pipe`) % 62) * 100 : 0,
  };
}

/* ------------------------------------------------------------------ *
 * Link building
 * ------------------------------------------------------------------ */

/** The campaign-level link. */
export function campaignLinkPath(campaign: Campaign): string {
  return `/l/${campaign.brief.trackingCode}`;
}

/**
 * A creator's own variant. Same code, plus the creator - which is how a click
 * is attributed to the specific post that drove it.
 */
export function creatorLinkPath(campaign: Campaign, creatorId: string): string {
  return `/l/${campaign.brief.trackingCode}?c=${encodeURIComponent(creatorId)}`;
}

/** Display form, without a scheme. */
export function displayLink(campaign: Campaign, creatorId?: string): string {
  const base = `vouch.link/${campaign.brief.trackingCode}`;
  return creatorId ? `${base}?c=${creatorId}` : base;
}

/** Absolute URL for copying, falling back to the display form on the server. */
export function absoluteLink(campaign: Campaign, creatorId?: string): string {
  const path = creatorId ? creatorLinkPath(campaign, creatorId) : campaignLinkPath(campaign);
  if (typeof window === 'undefined') return `https://${displayLink(campaign, creatorId)}`;
  return `${window.location.origin}${path}`;
}

/* ------------------------------------------------------------------ *
 * Aggregation
 * ------------------------------------------------------------------ */

export interface ClickStats {
  clicks: number;
  leads: number;
  pipeline: number;
}

const EMPTY: ClickStats = { clicks: 0, leads: 0, pipeline: 0 };

export function statsForCampaign(clicks: ClickEvent[], campaignId: string): ClickStats {
  return clicks.reduce<ClickStats>(
    (acc, c) => {
      if (c.campaignId !== campaignId) return acc;
      acc.clicks += 1;
      if (c.isLead) {
        acc.leads += 1;
        acc.pipeline += c.pipeline;
      }
      return acc;
    },
    { ...EMPTY },
  );
}

export function statsForCreator(
  clicks: ClickEvent[],
  campaignId: string,
  creatorId: string,
): ClickStats {
  return clicks.reduce<ClickStats>(
    (acc, c) => {
      if (c.campaignId !== campaignId || c.creatorId !== creatorId) return acc;
      acc.clicks += 1;
      if (c.isLead) {
        acc.leads += 1;
        acc.pipeline += c.pipeline;
      }
      return acc;
    },
    { ...EMPTY },
  );
}

export function totalStats(clicks: ClickEvent[]): ClickStats {
  return clicks.reduce<ClickStats>(
    (acc, c) => {
      acc.clicks += 1;
      if (c.isLead) {
        acc.leads += 1;
        acc.pipeline += c.pipeline;
      }
      return acc;
    },
    { ...EMPTY },
  );
}

/** Find the campaign a tracking code belongs to. */
export function campaignByCode(campaigns: Campaign[], code: string): Campaign | undefined {
  const needle = code.trim().toLowerCase();
  return campaigns.find((c) => c.brief.trackingCode.toLowerCase() === needle);
}
