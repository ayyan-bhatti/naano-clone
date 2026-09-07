'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Check,
  Euro,
  Eye,
  Handshake,
  MousePointerClick,
  UserCheck,
  X,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatCompact, formatDate, formatEur, formatNumber } from '@/lib/format';
import { getCreator } from '@/lib/data/creators';
import { useStore } from '@/lib/store';
import { StatCard } from '@/components/stat-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState, useToast } from '@/components/ui/feedback';
import { Reveal } from '@/components/ui/reveal';
import { CollaborationStatusPill, PayoutStatusPill } from '@/components/ui/status';
import type { Campaign, Collaboration } from '@/lib/types';

/**
 * Creator-side screens.
 *
 * Secondary to the brand flow by design, so these are three focused surfaces
 * rather than a mirror of the full brand app: what am I earning, what has been
 * offered to me, and how did my posts perform. The accept/decline on an
 * inbound offer is the one interaction that genuinely belongs to this side, so
 * it is the one that got built properly.
 */

export interface Deal {
  campaign: Campaign;
  collab: Collaboration;
}

/** Every collaboration addressed to the signed-in creator. */
export function useCreatorDeals(): { deals: Deal[]; creatorId: string | undefined } {
  const { user, campaigns } = useStore();
  const creatorId = user?.creatorId;

  const deals = useMemo(() => {
    if (!creatorId) return [];
    return campaigns
      .flatMap((campaign) =>
        campaign.collaborations
          .filter((collab) => collab.creatorId === creatorId)
          .map((collab) => ({ campaign, collab })),
      )
      .sort((a, b) => new Date(b.campaign.startDate).getTime() - new Date(a.campaign.startDate).getTime());
  }, [campaigns, creatorId]);

  return { deals, creatorId };
}

function totals(deals: Deal[]) {
  return deals.reduce(
    (acc, { collab }) => {
      if (collab.payoutStatus === 'paid') acc.paid += collab.fee;
      if (collab.payoutStatus === 'scheduled') acc.scheduled += collab.fee;
      if (collab.status !== 'declined' && collab.status !== 'invited') acc.active += 1;
      if (collab.metrics) {
        acc.impressions += collab.metrics.impressions;
        acc.clicks += collab.metrics.clicks;
        acc.leads += collab.metrics.leads;
      }
      return acc;
    },
    { paid: 0, scheduled: 0, active: 0, impressions: 0, clicks: 0, leads: 0 },
  );
}

/* ------------------------------------------------------------------ *
 * Overview
 * ------------------------------------------------------------------ */

export function CreatorOverview() {
  const { deals, creatorId } = useCreatorDeals();
  const creator = creatorId ? getCreator(creatorId) : undefined;
  const t = totals(deals);
  const pending = deals.filter((d) => d.collab.status === 'invited');

  if (deals.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={Handshake}
          title="No collaborations yet"
          body="When a brand invites you to a campaign it will appear here, with the fee and deliverables agreed up front."
          action={
            <Link href="/marketplace">
              <Button>See who else is on the marketplace</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal>
          <StatCard
            label="Total earnings"
            value={t.paid + t.scheduled}
            format="eur"
            caption={`${formatEur(t.paid)} paid, ${formatEur(t.scheduled)} scheduled`}
            icon={Euro}
            tone="money"
          />
        </Reveal>
        <Reveal delay={60}>
          <StatCard
            label="Active collaborations"
            value={t.active}
            caption={pending.length ? `${pending.length} awaiting your answer` : 'All up to date'}
            icon={Handshake}
          />
        </Reveal>
        <Reveal delay={120}>
          <StatCard
            label="Post views"
            value={t.impressions}
            format="compact"
            caption="Across published posts"
            icon={Eye}
            tone="live"
          />
        </Reveal>
      </div>

      {pending.length > 0 && (
        <Reveal>
          <section>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Waiting on you
            </h2>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">
              Accept to lock in the fee, or decline — no penalty either way.
            </p>
            <ul className="mt-4 space-y-3">
              {pending.map((deal) => (
                <li key={`${deal.campaign.id}-${deal.collab.creatorId}`}>
                  <DealCard deal={deal} />
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      <Reveal>
        <section className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-line p-5">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Collaborations</h2>
            <Link href="/deals" className="text-[13px] font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {deals.slice(0, 5).map(({ campaign, collab }) => (
              <li key={`${campaign.id}-${collab.creatorId}`} className="flex flex-wrap items-center gap-3 p-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">{campaign.brand}</p>
                  <p className="truncate text-[12px] text-ink-muted">{campaign.name}</p>
                </div>
                <CollaborationStatusPill status={collab.status} />
                <span className="tabular w-20 shrink-0 text-right text-[13.5px] font-semibold text-money">
                  {formatEur(collab.fee)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      {creator && (
        <Reveal>
          <section className="flex flex-wrap items-center gap-4 rounded-[16px] border border-line bg-surface p-5 shadow-card">
            <Avatar seed={creator.avatarSeed} name={creator.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold text-ink">Your public profile</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                This is what brands see in the marketplace — {formatCompact(creator.followers)} followers,{' '}
                {creator.engagement.toFixed(1)}% engagement, {formatEur(creator.pricePerPost)} per post.
              </p>
            </div>
            <Link href={`/creators/${creator.slug}`}>
              <Button variant="secondary">View profile</Button>
            </Link>
          </section>
        </Reveal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Deals
 * ------------------------------------------------------------------ */

export function CreatorDeals() {
  const { deals } = useCreatorDeals();

  if (deals.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={Handshake}
          title="No deals yet"
          body="Brands invite creators whose audience matches their buyers. Offers arrive here with the fee and deliverables already agreed."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {deals.map((deal, i) => (
        <Reveal key={`${deal.campaign.id}-${deal.collab.creatorId}`} delay={i * 40}>
          <DealCard deal={deal} showBrief />
        </Reveal>
      ))}
    </div>
  );
}

function DealCard({ deal, showBrief }: { deal: Deal; showBrief?: boolean }) {
  const { campaign, collab } = deal;
  const { setCollaborationStatus } = useStore();
  const { push } = useToast();

  const pending = collab.status === 'invited';

  function respond(accept: boolean) {
    setCollaborationStatus(campaign.id, collab.creatorId, accept ? 'accepted' : 'declined');
    push({
      tone: accept ? 'success' : 'info',
      title: accept ? 'Deal accepted' : 'Deal declined',
      body: accept
        ? `${formatEur(collab.fee)} locked in. Publish by ${formatDate(collab.deliverBy)}.`
        : 'The brand has been told. Nothing else to do.',
    });
  }

  return (
    <article
      className={cn(
        'rounded-[16px] border bg-surface p-5 shadow-card',
        pending ? 'border-brand-300 ring-1 ring-brand-500/15' : 'border-line',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14.5px] font-semibold text-ink">{campaign.brand}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">{campaign.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <CollaborationStatusPill status={collab.status} />
          <PayoutStatusPill status={collab.payoutStatus} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Cell label="Fee" value={formatEur(collab.fee)} accent />
        <Cell label="Deliverables" value={collab.deliverables} />
        <Cell label="Deliver by" value={formatDate(collab.deliverBy)} />
        <Cell label="Objective" value={campaign.audience.split(' ').slice(0, 4).join(' ') + '…'} />
      </dl>

      {showBrief && (
        <div className="mt-4 rounded-[12px] bg-sunken/60 p-4">
          <h3 className="micro-label">What they want landed</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{campaign.keyMessage}</p>
        </div>
      )}

      {collab.metrics && (
        <dl className="mt-4 flex flex-wrap gap-5 border-t border-line pt-4">
          <Perf label="Impressions" value={formatCompact(collab.metrics.impressions)} icon={Eye} />
          <Perf label="Clicks" value={formatNumber(collab.metrics.clicks)} icon={MousePointerClick} />
          <Perf label="Leads" value={formatNumber(collab.metrics.leads)} icon={UserCheck} />
        </dl>
      )}

      {pending && (
        <div className="mt-5 flex gap-2 border-t border-line pt-4">
          <Button onClick={() => respond(true)}>
            <Check className="size-4" />
            Accept {formatEur(collab.fee)}
          </Button>
          <Button variant="secondary" onClick={() => respond(false)}>
            <X className="size-4" />
            Decline
          </Button>
        </div>
      )}
    </article>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="micro-label">{label}</dt>
      <dd className={cn('mt-1 truncate text-[13.5px] font-medium', accent ? 'tabular text-money' : 'text-ink')}>
        {value}
      </dd>
    </div>
  );
}

function Perf({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-ink-faint" aria-hidden />
      <div>
        <dd className="tabular text-[13.5px] font-semibold text-ink">{value}</dd>
        <dt className="micro-label text-[10px]">{label}</dt>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Earnings
 * ------------------------------------------------------------------ */

export function CreatorEarnings() {
  const { deals } = useCreatorDeals();
  const t = totals(deals);
  const earning = deals.filter((d) => d.collab.status !== 'declined' && d.collab.status !== 'invited');

  if (earning.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={Euro}
          title="Nothing earned yet"
          body="Accept a deal and its fee appears here. Payment is scheduled when the brand approves your post, and released on campaign completion."
          action={
            <Link href="/deals">
              <Button>See your deals</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Paid out" value={t.paid} format="eur" icon={Euro} tone="money" caption="Cleared to your account" />
        <StatCard label="Scheduled" value={t.scheduled} format="eur" icon={Euro} caption="Releases on approval" />
      </div>

      <section className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
        <div className="border-b border-line p-5">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Earnings by collaboration</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            Fixed fee per post, agreed before you accept. No invoicing.
          </p>
        </div>
        <ul className="divide-y divide-line">
          {earning.map(({ campaign, collab }) => (
            <li key={`${campaign.id}-${collab.creatorId}`} className="flex flex-wrap items-center gap-3 p-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink">{campaign.brand}</p>
                <p className="truncate text-[12px] text-ink-muted">
                  {campaign.name} · {formatDate(collab.publishedAt ?? collab.deliverBy)}
                </p>
              </div>
              <PayoutStatusPill status={collab.payoutStatus} />
              <span className="tabular w-20 shrink-0 text-right text-[13.5px] font-semibold text-money">
                {formatEur(collab.fee)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line bg-sunken/40 px-5 py-3">
          <span className="text-[13px] font-medium text-ink">Total</span>
          <span className="tabular text-[14px] font-semibold text-ink">{formatEur(t.paid + t.scheduled)}</span>
        </div>
      </section>

      <p className="text-[12px] leading-relaxed text-ink-faint">
        Payments are represented, not processed — no payment provider is wired into this build.
      </p>
    </div>
  );
}
