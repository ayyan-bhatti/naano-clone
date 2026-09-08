import { NextResponse } from 'next/server';

import type { StripeTransfer } from '@/lib/stripe/shared';
import { platformFeeCents } from '@/lib/stripe/shared';
import { stripeClient, stripeGuard } from '@/lib/stripe/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Nothing in the seeded data comes near this; it is here so a typo cannot. */
const MAX_CENTS = 2_000_00;

/**
 * Release a creator's fee as a real Stripe destination charge.
 *
 * This is the marketplace payment shape rather than a plain transfer: the
 * platform takes the charge, Stripe splits it, `application_fee_amount` stays
 * with the platform and the remainder lands in the creator's connected
 * account. It is the same call a production marketplace makes - the only thing
 * standing in is the card, which is Stripe's shared `pm_card_visa` test token
 * because a demo has no cardholder to collect from.
 *
 * So the money movement is genuinely modelled end to end and shows up in the
 * Stripe dashboard as a charge, a fee and a transfer. It is test-mode money.
 * The build refuses to run this against a live key unless STRIPE_ALLOW_LIVE
 * is explicitly set, because a public demo that can charge a real card is a
 * liability, not a feature.
 */
export async function POST(req: Request) {
  const blocked = stripeGuard();
  if (blocked) return NextResponse.json({ configured: false, reason: blocked }, { status: 200 });

  const stripe = stripeClient();
  if (!stripe) {
    return NextResponse.json({ configured: false, reason: 'No Stripe client.' }, { status: 200 });
  }

  let body: { accountId?: string; amountCents?: number; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { accountId, amountCents, description } = body;

  if (!accountId?.startsWith('acct_')) {
    return NextResponse.json({ error: 'A connected account id is required.' }, { status: 400 });
  }
  if (!Number.isFinite(amountCents) || !amountCents || amountCents < 100 || amountCents > MAX_CENTS) {
    return NextResponse.json(
      { error: `amountCents must be between 100 and ${MAX_CENTS}.` },
      { status: 400 },
    );
  }

  const fee = platformFeeCents(amountCents);

  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      // Explicit rather than automatic: automatic payment methods can select a
      // redirect-based method, which needs a return_url and a browser. This
      // call is server-to-server.
      payment_method_types: ['card'],
      payment_method: 'pm_card_visa',
      confirm: true,
      application_fee_amount: fee,
      transfer_data: { destination: accountId },
      description: description ?? 'Vouch creator fee',
      metadata: { app: 'vouch', destination: accountId },
    });

    const transfer: StripeTransfer = {
      paymentIntentId: intent.id,
      amountCents: intent.amount,
      currency: intent.currency,
      applicationFeeCents: fee,
      destinationAccountId: accountId,
      created: new Date(intent.created * 1000).toISOString(),
      livemode: intent.livemode,
    };

    return NextResponse.json({ configured: true, status: intent.status, ...transfer });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe rejected the payment.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
