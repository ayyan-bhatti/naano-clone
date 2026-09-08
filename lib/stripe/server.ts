import 'server-only';

import Stripe from 'stripe';

/**
 * The Stripe client, or null when the build has no key.
 *
 * Two rules govern this file.
 *
 * The key is read from the environment and never from anything committed. It
 * is the only secret in the project, `.env*` is gitignored, and `.env.example`
 * carries the names with no values.
 *
 * And a missing key is a supported state, not a crash. The public demo deploy
 * may well run without one, and every route here answers "not configured"
 * rather than throwing, so the payouts and payments screens keep working on
 * the represented flow they had before Stripe existed. That is why this
 * returns null instead of asserting.
 */

let cached: Stripe | null = null;

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached) return cached;

  // No apiVersion pin: the installed SDK's default is the version its types
  // were generated against, and pinning to anything else fails to compile.
  cached = new Stripe(key, {
    // Shows up in the Stripe dashboard's request log, which makes it obvious
    // which calls came from this build during a demo.
    appInfo: { name: 'Vouch (8x assessment build)', version: '0.1.0' },
  });
  return cached;
}

/**
 * Guard against a live key reaching a public demo.
 *
 * A build like this one should be moving test money and nothing else. If a
 * live secret is configured we refuse to use it rather than quietly charging
 * a real card, and say why. The check is on the key prefix because that is
 * decidable without a network round trip.
 */
export function isLiveKey(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_');
}

export const ALLOW_LIVE = process.env.STRIPE_ALLOW_LIVE === 'true';

/**
 * One place that decides whether a request may proceed.
 *
 * Returns null when it may, or the reason it may not.
 */
export function stripeGuard(): string | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return 'No STRIPE_SECRET_KEY is set, so payouts run in represented mode.';
  }
  if (isLiveKey() && !ALLOW_LIVE) {
    return 'A live Stripe key is configured. This build refuses live mode - set a sk_test_ key, or STRIPE_ALLOW_LIVE=true if you genuinely mean it.';
  }
  return null;
}

/** Absolute origin for Stripe redirect URLs, which cannot be relative. */
export function siteOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  // Vercel sets this on every deployment, preview included.
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return new URL(req.url).origin;
}
