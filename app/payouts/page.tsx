'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Euro, Loader2, Send, Wallet } from 'lucide-react';

import { formatDate, formatEur } from '@/lib/format';
import { getCreator } from '@/lib/data/creators';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { StatCard } from '@/components/stat-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState, useToast } from '@/components/ui/feedback';
import { PayoutStatusPill } from '@/components/ui/status';
import { useStripeAvailability } from '@/lib/stripe/use-stripe';
import type { PayoutStatus } from '@/lib/types';

/**
 * Payout ledger.
 *
 * Shows the states the real product moves through - pending on invite,
 * scheduled on publish, paid on completion.
 *
 * A scheduled fee can also be released directly, and whether that does
 * anything depends on two things being true: the deployment has a Stripe key,
 * and the creator has finished Connect onboarding. Both have to hold, because
 * a release is a destination charge and there is no destination without an
 * onboarded account. When either is missing the button is absent rather than
 * disabled-with-a-tooltip - there is nothing the brand can do about it from
 * this screen, so offering the action would be theatre.
 */
export default function PayoutsPage() {
  return (
    <RequireAuth>
      <PayoutsInner />
    </RequireAuth>
  );
}

interface Row {
  key: string;
  creatorId: string;
  campaignId: string;
  campaignName: string;
  amount: number;
  status: PayoutStatus;
  date: string;
}

function PayoutsInner() {
  const { campaigns, connectedAccounts, releasePayout } = useStore();
  const { push } = useToast();
  const availability = useStripeAvailability();
  const stripeOn = availability?.configured === true;

  /** Which row is mid-flight, so only that button spins. */
  const [releasing, setReleasing] = useState<string | null>(null);

  async function release(row: Row, accountId: string) {
    setReleasing(row.key);
    try {
      const res = await fetch('/api/stripe/payout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          accountId,
          // The ledger is in euros; Stripe counts in cents.
          amountCents: Math.round(row.amount * 100),
          description: `${row.campaignName} — creator fee`,
        }),
      });
      const data = await res.json();

      if (!res.ok || data?.error) {
        push({
          tone: 'error',
          title: 'Stripe declined the release',
          body: data?.error ?? 'The charge did not go through.',
        });
        return;
      }

      releasePayout(row.campaignId, row.creatorId, data.paymentIntentId);
      push({
        tone: 'success',
        title: `${formatEur(row.amount)} released`,
        body: `Destination charge ${data.paymentIntentId} settled${
          data.livemode ? '' : ' in test mode'
        }.`,
      });
    } catch {
      push({ tone: 'error', title: 'Could not reach Stripe' });
    } finally {
      setReleasing(null);
    }
  }

  const rows = useMemo<Row[]>(
    () =>
      campaigns
        .flatMap((c) =>
          c.collaborations.map((collab) => ({
            key: `${c.id}-${collab.creatorId}`,
            creatorId: collab.creatorId,
            campaignId: c.id,
            campaignName: c.name,
            amount: collab.fee,
            status: collab.payoutStatus,
            date: collab.publishedAt ?? collab.deliverBy,
          })),
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [campaigns],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc[r.status] += r.amount;
          return acc;
        },
        { pending: 0, scheduled: 0, paid: 0 } as Record<PayoutStatus, number>,
      ),
    [rows],
  );

  return (
    <AppShell title="Payouts" subtitle="Creator fees across every campaign">
      <div className="mx-auto max-w-4xl space-y-5">
        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payouts yet"
            body="Once you book creators onto a campaign, their fixed fees appear here and move through pending, scheduled and paid."
            action={
              <Link href="/marketplace">
                <Button>Find creators</Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Paid" value={totals.paid} format="eur" icon={Euro} tone="money" caption="Released to creators" />
              <StatCard label="Scheduled" value={totals.scheduled} format="eur" icon={Wallet} caption="Releases on completion" />
              <StatCard label="Pending" value={totals.pending} format="eur" icon={Wallet} caption="Awaiting acceptance" />
            </div>

            <section className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
              <div className="border-b border-line p-5">
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Ledger</h2>
                <p className="mt-0.5 text-[12.5px] text-ink-muted">
                  Fixed fee per post, agreed before booking. Approving a creator&apos;s post schedules
                  their payout.
                </p>
              </div>

              <ul className="divide-y divide-line">
                {rows.map((row) => {
                  const creator = getCreator(row.creatorId);
                  if (!creator) return null;
                  // Undefined until this creator has connected Stripe; that is
                  // what gates the Release button below.
                  const account = connectedAccounts[row.creatorId];
                  return (
                    <li key={row.key} className="flex flex-wrap items-center gap-3 p-4 sm:px-5">
                      <Avatar seed={creator.avatarSeed} name={creator.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/creators/${creator.slug}`} className="text-[13.5px] font-medium text-ink hover:underline">
                          {creator.name}
                        </Link>
                        <p className="truncate text-[12px] text-ink-muted">
                          <Link href={`/campaigns/${row.campaignId}`} className="hover:underline">
                            {row.campaignName}
                          </Link>
                          {' · '}
                          {formatDate(row.date)}
                        </p>
                      </div>
                      <PayoutStatusPill status={row.status} />
                      <span className="tabular w-20 shrink-0 text-right text-[13.5px] font-semibold text-ink">
                        {formatEur(row.amount)}
                      </span>
                      {stripeOn && row.status === 'scheduled' && account && (
                        <Button
                          variant="ghost"
                          onClick={() => void release(row, account)}
                          disabled={releasing !== null}
                          aria-label={`Release ${formatEur(row.amount)} to ${creator.name}`}
                        >
                          {releasing === row.key ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4" />
                          )}
                          Release
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <p className="text-[12px] leading-relaxed text-ink-faint">
              {stripeOn ? (
                <>
                  Releases are real Stripe destination charges
                  {availability?.testMode ? ', in test mode' : ''} — the platform takes the
                  charge, Stripe splits it, and the creator&apos;s connected account receives the
                  remainder less the 10% fee. A row only offers Release once that creator has
                  finished Connect onboarding.
                </>
              ) : (
                <>
                  Payments are represented, not processed. No Stripe key is configured in this
                  deployment — see the README for what is mocked and why.
                </>
              )}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
