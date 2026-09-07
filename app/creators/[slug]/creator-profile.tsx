'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Heart,
  Linkedin,
  MessageCircle,
  Star,
  TrendingUp,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatCompact, formatEur, formatNumber, relativeTime } from '@/lib/format';
import { matchScore } from '@/lib/match';
import { DEMO_USER, useStore } from '@/lib/store';
import { AppShell } from '@/components/app-shell';
import { SiteFooter, SiteNav } from '@/components/marketing/site-chrome';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ShareBar } from '@/components/ui/chart';
import { useToast } from '@/components/ui/feedback';
import { Pill } from '@/components/ui/status';
import type { Creator } from '@/lib/types';

const AVAILABILITY: Record<Creator['availability'], { label: string; tone: 'money' | 'warn' | 'neutral' }> = {
  open: { label: 'Available now', tone: 'money' },
  limited: { label: 'Limited slots', tone: 'warn' },
  booked: { label: 'Booked out', tone: 'neutral' },
};

export function CreatorProfile({ creator }: { creator: Creator }) {
  const { user, hydrated, shortlist, toggleShortlist } = useStore();
  const { push } = useToast();
  const router = useRouter();

  const profile = user?.onboarded && user.buyerProfile.personas.length ? user.buyerProfile : DEMO_USER.buyerProfile;
  const match = useMemo(() => matchScore(creator, profile), [creator, profile]);

  const shortlisted = shortlist.includes(creator.id);
  const availability = AVAILABILITY[creator.availability];

  function onShortlist() {
    if (!user) {
      push({ tone: 'info', title: 'Sign in to shortlist', body: 'Your shortlist is saved to your workspace.' });
      return;
    }
    toggleShortlist(creator.id);
    push({ tone: 'success', title: shortlisted ? 'Removed from shortlist' : 'Added to shortlist' });
  }

  function onBook() {
    if (!user) {
      router.push('/sign-up');
      return;
    }
    router.push(`/campaigns/new?creators=${creator.id}`);
  }

  const content = (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Back to marketplace
      </Link>

      {/* ---------- Header ---------- */}
      <div className="mt-4 overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
        <div className="card-band h-24 bg-brand-50" />
        <div className="px-5 pb-5 sm:px-7 sm:pb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <Avatar seed={creator.avatarSeed} name={creator.name} size="xl" ring className="-mt-10 shrink-0" />
              <div className="min-w-0 pb-0.5">
                <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-[-0.02em] text-ink sm:text-[26px]">
                  {creator.name}
                  {creator.verified && <BadgeCheck className="size-5 shrink-0 text-brand-600" aria-label="Verified creator" />}
                </h1>
                <p className="mt-0.5 text-[13.5px] text-ink-soft">{creator.headline}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Pill tone="info">{creator.category}</Pill>
                  <Pill>
                    <span aria-hidden>{creator.countryFlag}</span>
                    {creator.country}
                  </Pill>
                  <Pill tone={availability.tone} dot>
                    {availability.label}
                  </Pill>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="secondary" onClick={onShortlist} aria-pressed={shortlisted}>
                <Star className={cn('size-4', shortlisted && 'fill-brand-600 text-brand-600')} />
                {shortlisted ? 'Shortlisted' : 'Shortlist'}
              </Button>
              <Button onClick={onBook} disabled={creator.availability === 'booked'}>
                Book {formatEur(creator.pricePerPost)}
              </Button>
            </div>
          </div>

          {/* Stat strip */}
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line sm:grid-cols-4">
            <StatCell label="Followers" value={formatCompact(creator.followers)} />
            <StatCell label="Median views" value={formatCompact(creator.medianViews)} />
            <StatCell label="Engagement" value={`${creator.engagement.toFixed(1)}%`} />
            <StatCell label="Price per post" value={formatEur(creator.pricePerPost)} />
          </dl>
          <p className="mt-2 text-[11.5px] text-ink-faint">
            Stats updated {creator.statsAgeDays}d ago
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {/* ---------- Why work with me ---------- */}
          <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Why work with me</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{creator.whyWorkWithMe}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {creator.topics.map((t) => (
                <span key={t} className="rounded-full bg-sunken px-2.5 py-1 text-[12px] text-ink-soft">
                  {t}
                </span>
              ))}
            </div>
          </section>

          {/* ---------- Recent posts ---------- */}
          <section className="rounded-[16px] border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line p-5 sm:px-6">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Recent posts</h2>
              <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                <Linkedin className="size-3.5 text-[#0a66c2]" />
                LinkedIn
              </span>
            </div>
            <ul className="divide-y divide-line">
              {creator.recentPosts.map((post) => (
                <li key={post.id} className="p-5 sm:px-6">
                  <p className="text-[14px] leading-relaxed text-ink">{post.excerpt}</p>
                  <div className="mt-3 flex items-center gap-4 text-[12px] text-ink-muted">
                    <span className="tabular flex items-center gap-1.5">
                      <Heart className="size-3.5" aria-hidden />
                      {formatNumber(post.reactions)}
                    </span>
                    <span className="tabular flex items-center gap-1.5">
                      <MessageCircle className="size-3.5" aria-hidden />
                      {formatNumber(post.comments)}
                    </span>
                    <span className="text-ink-faint">{relativeTime(post.postedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---------- Sidebar ---------- */}
        <div className="space-y-5">
          {/* Match breakdown - the improvement over a bare score */}
          <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Audience match</h2>
              <span className="tabular text-[20px] font-bold text-ink">{match.score}/100</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700" style={{ width: `${match.score}%` }} />
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-ink-muted">
              {user?.onboarded
                ? `Scored against ${user.company}'s buyer profile.`
                : 'Scored against a sample buyer profile. Sign in to score against yours.'}
            </p>

            <ul className="mt-4 space-y-3.5 border-t border-line pt-4">
              {match.factors.map((f) => (
                <li key={f.label}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-ink">{f.label}</span>
                    <span className="tabular text-[12px] text-ink-muted">
                      {Math.round(f.score)}/{f.max}
                    </span>
                  </div>
                  <ShareBar share={(f.score / f.max) * 100} className="mt-1.5" />
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{f.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Audience composition */}
          <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Who engages</h2>
            <ul className="mt-4 space-y-3">
              {creator.audience.map((seg) => (
                <li key={seg.label}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-ink-soft">{seg.label}</span>
                    <span className="tabular text-[12.5px] font-semibold text-ink">{seg.share}%</span>
                  </div>
                  <ShareBar share={seg.share} className="mt-1.5" />
                </li>
              ))}
            </ul>
          </section>

          {/* Typical performance */}
          <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
              <TrendingUp className="size-4 text-brand-600" />
              Typical post
            </h2>
            <dl className="mt-4 space-y-2.5 text-[13px]">
              <Row label="Reactions" value={formatNumber(creator.avgReactions)} />
              <Row label="Comments" value={formatNumber(creator.avgComments)} />
              <Row label="Median views" value={formatCompact(creator.medianViews)} />
              <Row label="Deliverables" value="1 post + 1 repost" />
            </dl>
            <Button block className="mt-5" onClick={onBook} disabled={creator.availability === 'booked'}>
              Book {formatEur(creator.pricePerPost)}
            </Button>
            <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-ink-faint">
              Fixed price, agreed before booking. No cost per click.
            </p>
          </section>
        </div>
      </div>
    </div>
  );

  if (hydrated && user) {
    return <AppShell title={creator.name} subtitle={creator.category}>{content}</AppShell>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <main id="main" className="flex-1 px-4 py-8 sm:px-6">
        {content}
      </main>
      <SiteFooter />
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <dt className="micro-label">{label}</dt>
      <dd className="tabular mt-1 text-[17px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular font-medium text-ink">{value}</dd>
    </div>
  );
}
