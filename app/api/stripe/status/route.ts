import { NextResponse } from 'next/server';

import { isLiveKey, stripeGuard } from '@/lib/stripe/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Is Stripe usable in this deployment?
 *
 * The client cannot read STRIPE_SECRET_KEY - correctly - so it asks. Every
 * payment surface calls this once on mount and renders either the Connect
 * flow or the represented flow it had before. Nothing about the answer is
 * secret: it says whether a key exists and whether it is a test key, never
 * anything derived from the key itself.
 */
export function GET() {
  const blocked = stripeGuard();
  return NextResponse.json({
    configured: blocked === null,
    reason: blocked,
    // Drives the "Test mode" badge, so a viewer can see at a glance that no
    // real money is involved.
    testMode: !isLiveKey(),
  });
}
