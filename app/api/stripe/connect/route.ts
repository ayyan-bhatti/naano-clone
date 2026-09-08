import { NextResponse } from 'next/server';

import { countryCode } from '@/lib/stripe/shared';
import { siteOrigin, stripeClient, stripeGuard } from '@/lib/stripe/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Start (or resume) Stripe Express onboarding for a creator.
 *
 * This is the piece that makes the payout flow real rather than represented.
 * Stripe hosts the form, collects the bank details and the identity documents,
 * and hands back an account id - which means this build never sees, and
 * therefore never stores, an IBAN. The old form kept four characters as a
 * compromise; Connect removes the need for the compromise entirely.
 *
 * `accountId` is optional. Passing one resumes an unfinished onboarding
 * instead of creating a second account, which is what happens when a creator
 * abandons the Stripe form and comes back later.
 */
export async function POST(req: Request) {
  const blocked = stripeGuard();
  if (blocked) return NextResponse.json({ configured: false, reason: blocked }, { status: 200 });

  const stripe = stripeClient();
  if (!stripe) {
    return NextResponse.json({ configured: false, reason: 'No Stripe client.' }, { status: 200 });
  }

  let body: { email?: string; country?: string; accountId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const origin = siteOrigin(req);

  try {
    let accountId = body.accountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: body.email,
        country: countryCode(body.country ?? ''),
        capabilities: {
          // Destination charges need both: the platform takes the payment, the
          // connected account receives the split.
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          product_description: 'Sponsored LinkedIn content for B2B brands via Vouch.',
        },
        metadata: { app: 'vouch', surface: 'creator-payments' },
      });
      accountId = account.id;
    }

    /*
      Account links are single-use and expire in minutes, so one is minted per
      attempt rather than stored. `refresh_url` is where Stripe sends the
      creator when the link has gone stale - it points back at the same page,
      which re-requests a fresh link.
    */
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/payments?stripe=refresh`,
      return_url: `${origin}/payments?stripe=return`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ configured: true, accountId, url: link.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe rejected the request.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
