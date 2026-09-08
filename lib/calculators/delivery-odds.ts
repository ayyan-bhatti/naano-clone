import {
  audienceBandById,
  priceBandFor,
  PRICE_BANDS,
  type AudienceBand,
  type PriceBand,
} from '@/lib/data/benchmarks';

/**
 * Delivery odds.
 *
 * Given an audience size and an offer, look up the historical band and report
 * how often offers at that price ended in a published post, how often they went
 * unanswered, and where the offer sits against transacted prices for that tier.
 *
 * Two things this deliberately does NOT do:
 *
 *  - It does not claim causation. Paying more does not make a post appear; a
 *    brand paying more usually also has a brief, a budget and someone chasing
 *    it. The copy says so, because the honest version is more useful.
 *  - It does not interpolate delivery rates between bands. The bands are
 *    discrete observations, and smoothing them would invent precision the
 *    dataset does not have. Price *positioning* is interpolated; odds are not.
 */

export type PricePosition = 'below-p25' | 'p25-median' | 'median-p75' | 'above-p75';

export interface DeliveryInput {
  audienceBandId: string;
  offer: number;
}

export interface DeliveryResult {
  valid: boolean;
  offer: number;
  audience: AudienceBand;
  band: PriceBand;
  publishedPct: number;
  neverAnsweredPct: number;
  /** Neither published nor ignored: answered but not delivered. */
  otherPct: number;
  position: PricePosition;
  positionLabel: string;
  /** 0-100, where the offer sits across the P25-P75 range. Clamped. */
  positionPct: number;
  /** Difference against the tier median, in euros. */
  vsMedian: number;
  headline: string;
  interpretation: string;
  recommendations: string[];
  /** Best alternative band, when moving up materially improves odds. */
  upgrade: { band: PriceBand; extraPerPost: number; gainPct: number } | null;
}

function clean(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

function positionFor(offer: number, audience: AudienceBand): { position: PricePosition; label: string } {
  if (offer < audience.p25) return { position: 'below-p25', label: 'Below the bottom quartile' };
  if (offer < audience.median) return { position: 'p25-median', label: 'Below the median' };
  if (offer < audience.p75) return { position: 'median-p75', label: 'Above the median' };
  return { position: 'above-p75', label: 'Top quartile' };
}

export function calculateDeliveryOdds(input: DeliveryInput): DeliveryResult {
  const offer = clean(input.offer);
  const audience = audienceBandById(input.audienceBandId);
  const band = priceBandFor(offer);

  if (offer <= 0) {
    return {
      valid: false,
      offer: 0,
      audience,
      band,
      publishedPct: 0,
      neverAnsweredPct: 0,
      otherPct: 0,
      position: 'below-p25',
      positionLabel: '—',
      positionPct: 0,
      vsMedian: 0,
      headline: 'Enter an offer to see how often bookings at that price were published.',
      interpretation: '',
      recommendations: [],
      upgrade: null,
    };
  }

  const publishedPct = Math.round(band.publishedRate * 1000) / 10;
  const neverAnsweredPct = Math.round(band.neverAnsweredRate * 1000) / 10;
  const otherPct = Math.round((100 - publishedPct - neverAnsweredPct) * 10) / 10;

  const { position, label } = positionFor(offer, audience);

  // Where the offer sits across the tier's quartile spread, for the marker.
  const span = Math.max(1, audience.p75 - audience.p25);
  const positionPct = Math.max(0, Math.min(100, ((offer - audience.p25) / span) * 100));
  const vsMedian = Math.round(offer - audience.median);

  // Is there a band above this one that meaningfully improves the odds?
  const currentIndex = PRICE_BANDS.findIndex((b) => b.id === band.id);
  let upgrade: DeliveryResult['upgrade'] = null;
  for (let i = currentIndex + 1; i < PRICE_BANDS.length; i += 1) {
    const candidate = PRICE_BANDS[i];
    const gain = (candidate.publishedRate - band.publishedRate) * 100;
    if (gain >= 10) {
      upgrade = {
        band: candidate,
        extraPerPost: Math.max(0, Math.round(candidate.min - offer)),
        gainPct: Math.round(gain * 10) / 10,
      };
      break;
    }
  }

  return {
    valid: true,
    offer,
    audience,
    band,
    publishedPct,
    neverAnsweredPct,
    otherPct,
    position,
    positionLabel: label,
    positionPct,
    vsMedian,
    headline: `${publishedPct}% of settled bookings in the ${band.label} band ended in a published post.`,
    interpretation: buildInterpretation({ band, audience, offer, position, publishedPct, neverAnsweredPct }),
    recommendations: buildRecommendations({ band, audience, offer, position, upgrade }),
    upgrade,
  };
}

function buildInterpretation({
  band,
  audience,
  offer,
  position,
  publishedPct,
  neverAnsweredPct,
}: {
  band: PriceBand;
  audience: AudienceBand;
  offer: number;
  position: PricePosition;
  publishedPct: number;
  neverAnsweredPct: number;
}): string {
  const vs =
    position === 'below-p25'
      ? `€${offer} is below the bottom quartile for ${audience.label.toLowerCase()} (P25 €${audience.p25}, median €${audience.median})`
      : position === 'above-p75'
        ? `€${offer} sits in the top quartile for ${audience.label.toLowerCase()} (median €${audience.median}, P75 €${audience.p75})`
        : `€${offer} is ${offer >= audience.median ? 'above' : 'below'} the €${audience.median} median for ${audience.label.toLowerCase()}`;

  return `${vs}. In that price band, ${neverAnsweredPct}% of offers were never answered at all and ${publishedPct}% reached a published post.${
    band.directional ? ' This band rests on a thin sample, so read it as directional.' : ''
  }`;
}

function buildRecommendations({
  band,
  audience,
  offer,
  position,
  upgrade,
}: {
  band: PriceBand;
  audience: AudienceBand;
  offer: number;
  position: PricePosition;
  upgrade: DeliveryResult['upgrade'];
}): string[] {
  const out: string[] = [];

  if (position === 'below-p25') {
    out.push(
      `Offers below the quartile for this tier are the ones most often ignored. Moving to the €${audience.median} median costs €${Math.max(0, audience.median - offer)} more per post and puts you where most bookings actually happen.`,
    );
  }

  if (upgrade) {
    out.push(
      `Raising the offer to €${upgrade.band.min} moves into the ${upgrade.band.label} band, where the observed delivery rate is ${Math.round(upgrade.band.publishedRate * 100)}% — ${upgrade.gainPct} points higher.`,
    );
  }

  if (band.neverAnsweredRate > 0.35) {
    out.push(
      'Unanswered offers are the dominant failure mode at this price, not rejected ones. A specific brief and a named contact reduce that more reliably than a small price bump.',
    );
  }

  out.push(
    "Anchor on the creator's own published rate rather than a tier benchmark. Follower count explains under a third of what creators actually charge.",
  );

  return out.slice(0, 4);
}
