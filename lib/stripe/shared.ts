/**
 * Types crossing the client/server line for the Stripe integration.
 *
 * Kept apart from lib/stripe/server.ts because that module reads the secret
 * key at import time and must never be pulled into a client bundle. Anything
 * a page component needs to know about Stripe lives here.
 */

/** What /api/stripe/account reports back about a connected account. */
export interface ConnectStatus {
  accountId: string;
  /** Stripe has everything it needs; nothing further is being asked for. */
  detailsSubmitted: boolean;
  /** Money can actually leave the platform to this account. */
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  /** Requirements Stripe is still waiting on, verbatim from the API. */
  pendingRequirements: string[];
  country: string | null;
  /** Present once onboarding has produced an external account. */
  bankLast4: string | null;
}

/** A settled transfer, as the payouts ledger wants to display it. */
export interface StripeTransfer {
  paymentIntentId: string;
  amountCents: number;
  currency: string;
  /** Platform take, in cents. */
  applicationFeeCents: number;
  destinationAccountId: string;
  created: string;
  livemode: boolean;
}

/**
 * The shape every Stripe route returns when the key is absent.
 *
 * The build has to run with no Stripe configured - that is the state the
 * public demo deploy is in unless keys are set - so "not configured" is a
 * first-class answer rather than an error. The UI reads this and falls back to
 * the represented payout flow.
 */
export interface StripeUnavailable {
  configured: false;
  reason: string;
}

export type StripeResult<T> = ({ configured: true } & T) | StripeUnavailable;

/** The platform's cut, matching the fee the rest of the app already quotes. */
export const PLATFORM_FEE_RATE = 0.1;

export function platformFeeCents(amountCents: number): number {
  return Math.round(amountCents * PLATFORM_FEE_RATE);
}

/**
 * The payout countries the app already offers, as the ISO-3166 alpha-2 codes
 * Stripe requires when creating a connected account.
 *
 * Every entry is a country Stripe Connect actually supports, so the list the
 * creator sees and the list Stripe will accept cannot drift apart.
 */
export const COUNTRY_CODES: Record<string, string> = {
  Germany: 'DE',
  France: 'FR',
  Netherlands: 'NL',
  Spain: 'ES',
  Italy: 'IT',
  Portugal: 'PT',
  Belgium: 'BE',
  Ireland: 'IE',
  Poland: 'PL',
  Czechia: 'CZ',
  Denmark: 'DK',
  Sweden: 'SE',
  Norway: 'NO',
  'United Kingdom': 'GB',
};

export function countryCode(name: string): string {
  return COUNTRY_CODES[name] ?? 'DE';
}
