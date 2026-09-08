import { NextResponse } from 'next/server';

import type { ConnectStatus } from '@/lib/stripe/shared';
import { stripeClient, stripeGuard } from '@/lib/stripe/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read the live state of a connected account.
 *
 * The creator's browser holds only the account id; everything shown about the
 * account - whether payouts are enabled, what Stripe is still waiting for, the
 * bank tail - is read back from Stripe on each visit rather than cached
 * locally. Onboarding state changes on Stripe's side, so a local copy would
 * start lying the moment verification completed.
 */
export async function GET(req: Request) {
  const blocked = stripeGuard();
  if (blocked) return NextResponse.json({ configured: false, reason: blocked }, { status: 200 });

  const stripe = stripeClient();
  if (!stripe) {
    return NextResponse.json({ configured: false, reason: 'No Stripe client.' }, { status: 200 });
  }

  const id = new URL(req.url).searchParams.get('id');
  if (!id?.startsWith('acct_')) {
    return NextResponse.json({ error: 'Pass ?id=acct_...' }, { status: 400 });
  }

  try {
    const account = await stripe.accounts.retrieve(id);

    const external = account.external_accounts?.data?.[0];
    const bankLast4 =
      external && 'last4' in external && typeof external.last4 === 'string' ? external.last4 : null;

    const status: ConnectStatus = {
      accountId: account.id,
      detailsSubmitted: account.details_submitted ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      // Shown verbatim. Paraphrasing Stripe's requirement codes into friendlier
      // wording is how people end up unable to work out what is actually
      // missing.
      pendingRequirements: account.requirements?.currently_due ?? [],
      country: account.country ?? null,
      bankLast4,
    };

    return NextResponse.json({ configured: true, ...status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe rejected the request.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
