'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Euro, Wallet } from 'lucide-react';

import { formatDate, formatEur } from '@/lib/format';
import { getCreator } from '@/lib/data/creators';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { StatCard } from '@/components/stat-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { PayoutStatusPill } from '@/components/ui/status';
import type { PayoutStatus } from '@/lib/types';

/**
 * Payout ledger.
 *
 * Read-only and deliberately the least-built screen in the app - the honest
 * trade for spending that time on the marketplace and campaign flow. It shows
 * the states the real product moves through (pending on invite, scheduled on
 * publish, paid on completion) without pretending to process money.
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
  const { campaigns } = useStore();

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
                    </li>
                  );
                })}
              </ul>
            </section>

            <p className="text-[12px] leading-relaxed text-ink-faint">
              Payments are represented, not processed. There is no payment provider wired into this
              build — see the README for what is mocked and why.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
