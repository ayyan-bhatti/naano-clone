'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  Eye,
  Heart,
  Link2,
  MessageCircle,
  Printer,
  UserRound,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatCompact, formatEur, formatNumber, formatPercent } from '@/lib/format';
import { audienceBandFor } from '@/lib/data/benchmarks';
import { useCreatorDeals } from '@/components/creator/creator-screens';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState, useToast } from '@/components/ui/feedback';
import { Pill } from '@/components/ui/status';
import type { Creator } from '@/lib/types';

/**
 * Media kit.
 *
 * The document a creator sends a brand that has not found them on the
 * marketplace yet. Everything on it already exists elsewhere in the product -
 * the value is that it is one page, in the order a buyer reads, and it prints.
 *
 * Printing goes through the browser's own print-to-PDF rather than a PDF
 * library: no dependency, no server, and the output is a real PDF the creator
 * can attach to an email. The print rules live in globals.css.
 */

export default function MediaKitPage() {
  return (
    <RequireAuth>
      <MediaKitInner />
    </RequireAuth>
  );
}

function MediaKitInner() {
  const { user, myCreator } = useStore();

  if (user?.role !== 'creator' || !myCreator) {
    return (
      <AppShell title="Media kit">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={UserRound}
            title="Media kits belong to creators"
            body="You are signed in as a brand. What you want is the marketplace — every creator's profile carries the same numbers this page collects."
            action={
              <Link href="/marketplace">
                <Button>Browse creators</Button>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return <Kit creator={myCreator} />;
}

function Kit({ creator }: { creator: Creator }) {
  const { deals } = useCreatorDeals();
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  const band = audienceBandFor(creator.followers);

  /**
   * Delivery record, summed from real collaborations rather than asserted.
   * A creator with no history gets no claim - the section simply says so.
   */
  const record = useMemo(() => {
    return deals
      .filter((d) => d.collab.status === 'published')
      .reduce(
        (acc, { collab, campaign }) => {
          acc.posts += 1;
          acc.impressions += collab.metrics?.impressions ?? 0;
          acc.clicks += collab.metrics?.clicks ?? 0;
          acc.leads += collab.metrics?.leads ?? 0;
          acc.brands.add(campaign.brand);
          return acc;
        },
        { posts: 0, impressions: 0, clicks: 0, leads: 0, brands: new Set<string>() },
      );
  }, [deals]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/creators/${creator.slug}`);
      setCopied(true);
      push({ tone: 'success', title: 'Profile link copied' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      push({ tone: 'error', title: 'Could not copy', body: 'Your browser blocked clipboard access.' });
    }
  }

  return (
    <AppShell
      title="Media kit"
      subtitle="One page, in the order a brand reads it"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={copyLink}>
            {copied ? <Check className="size-4 text-money" /> : <Link2 className="size-4" />}
            Copy link
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print / PDF
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href="/profile"
          className="no-print inline-flex min-h-[24px] items-center gap-1.5 py-0.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Back to profile
        </Link>

        {/* The printable sheet. */}
        <article
          id="media-kit"
          className="print-sheet mt-4 overflow-hidden rounded-[18px] border border-line bg-surface shadow-card"
        >
          {/* ---------- Header ---------- */}
          <header className="border-b border-line p-6 sm:p-8">
            <div className="flex flex-wrap items-start gap-5">
              <Avatar seed={creator.avatarSeed} name={creator.name} size="xl" ring />
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-2 text-[24px] font-semibold tracking-[-0.04em] text-ink sm:text-[28px]">
                  {creator.name}
                  {creator.verified && (
                    <BadgeCheck className="size-5 shrink-0 text-brand-600" aria-label="Verified" />
                  )}
                </h1>
                <p className="mt-1 text-[14px] leading-snug text-ink-soft">{creator.headline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill tone="info">{creator.category}</Pill>
                  <Pill>
                    <span aria-hidden>{creator.countryFlag}</span>
                    {creator.country}
                  </Pill>
                  <Pill tone={creator.availability === 'open' ? 'money' : 'warn'} dot>
                    {creator.availability === 'open'
                      ? 'Available now'
                      : creator.availability === 'limited'
                        ? 'Limited slots'
                        : 'Booked out'}
                  </Pill>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="micro-label">From</p>
                <p className="tabular text-[24px] font-semibold tracking-[-0.032em] text-ink">
                  {formatEur(creator.pricePerPost)}
                </p>
                <p className="text-[11.5px] text-ink-muted">per sponsored post</p>
              </div>
            </div>
          </header>

          {/* ---------- Reach ---------- */}
          <section className="border-b border-line p-6 sm:p-8">
            <h2 className="micro-label">Reach</h2>
            <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line sm:grid-cols-4">
              <Stat label="Followers" value={formatCompact(creator.followers)} />
              <Stat label="Median views" value={formatCompact(creator.medianViews)} />
              <Stat label="Engagement" value={formatPercent(creator.engagement)} />
              <Stat
                label="Avg. reactions"
                value={formatCompact(creator.avgReactions)}
              />
            </dl>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-faint">
              Measured, not claimed — refreshed {creator.statsAgeDays} days ago. The median booking
              at {band.short} followers is {formatEur(band.median)} across {band.n} deals, so this
              rate sits {creator.pricePerPost >= band.median ? 'at or above' : 'below'} the market.
            </p>
          </section>

          {/* ---------- Audience ---------- */}
          <section className="border-b border-line p-6 sm:p-8">
            <h2 className="micro-label">Who reads it</h2>
            <ul className="mt-3 space-y-2.5">
              {creator.audience.map((seg) => (
                <li key={seg.label} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-[13px] text-ink-soft">{seg.label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                    <span
                      className="block h-full rounded-full bg-brand-600"
                      style={{ width: `${seg.share}%` }}
                    />
                  </span>
                  <span className="tabular w-10 shrink-0 text-right text-[12.5px] font-medium text-ink">
                    {seg.share}%
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- Positioning ---------- */}
          <section className="border-b border-line p-6 sm:p-8">
            <h2 className="micro-label">Why work with me</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{creator.whyWorkWithMe}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {creator.topics.map((t) => (
                <span key={t} className="rounded-full bg-sunken px-2.5 py-1 text-[12px] text-ink-soft">
                  {t}
                </span>
              ))}
            </div>
          </section>

          {/* ---------- Track record ---------- */}
          <section className="border-b border-line p-6 sm:p-8">
            <h2 className="micro-label">Track record on Vouch</h2>
            {record.posts === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                No sponsored posts published here yet. Rather than pad this section, it stays empty
                until there is something to put in it.
              </p>
            ) : (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line sm:grid-cols-4">
                  <Stat label="Sponsored posts" value={formatNumber(record.posts)} />
                  <Stat label="Impressions" value={formatCompact(record.impressions)} />
                  <Stat label="Clicks driven" value={formatNumber(record.clicks)} />
                  <Stat label="Leads" value={formatNumber(record.leads)} accent />
                </dl>
                <p className="mt-2.5 text-[11.5px] text-ink-faint">
                  Summed from every collaboration that published across{' '}
                  {record.brands.size} brand{record.brands.size === 1 ? '' : 's'} — not typed in by
                  hand.
                </p>
              </>
            )}
          </section>

          {/* ---------- Recent posts ---------- */}
          <section className="p-6 sm:p-8">
            <h2 className="micro-label">Recent posts</h2>
            <ul className="mt-3 space-y-3">
              {creator.recentPosts.slice(0, 3).map((post) => (
                <li key={post.id} className="rounded-[12px] border border-line bg-sunken/40 p-4">
                  <p className="text-[13.5px] leading-relaxed text-ink">{post.excerpt}</p>
                  <div className="mt-2.5 flex items-center gap-4 text-[12px] text-ink-muted">
                    <span className="tabular flex items-center gap-1.5">
                      <Heart className="size-3.5" aria-hidden />
                      {formatNumber(post.reactions)}
                    </span>
                    <span className="tabular flex items-center gap-1.5">
                      <MessageCircle className="size-3.5" aria-hidden />
                      {formatNumber(post.comments)}
                    </span>
                    <span className="tabular flex items-center gap-1.5">
                      <Eye className="size-3.5" aria-hidden />
                      {formatCompact(creator.medianViews)} typical
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <footer className="border-t border-line bg-sunken/50 px-6 py-4 sm:px-8">
            <p className="text-[12px] text-ink-muted">
              Book at a fixed fee, no negotiation round-trip —{' '}
              <span className="font-medium text-ink">vouch.so/creators/{creator.slug}</span>
            </p>
          </footer>
        </article>

        <p className="no-print mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-faint">
          <Copy className="mt-0.5 size-3 shrink-0" />
          Print goes through your browser&apos;s own print-to-PDF. No PDF library, no server, and
          the result is a real file you can attach to an email.
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-surface p-3.5 text-center">
      <dd className={cn('tabular text-[17px] font-semibold tracking-[-0.032em]', accent ? 'text-money' : 'text-ink')}>
        {value}
      </dd>
      <dt className="micro-label mt-0.5 text-[10px]">{label}</dt>
    </div>
  );
}
