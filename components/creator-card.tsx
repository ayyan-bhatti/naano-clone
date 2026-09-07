'use client';

import Link from 'next/link';
import { BadgeCheck, Linkedin, Star } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatCompact, formatEur } from '@/lib/format';
import { Avatar } from '@/components/ui/avatar';
import type { Creator } from '@/lib/types';

/**
 * Marketplace creator card.
 *
 * Anatomy follows the observed Naano card (see research/screenshots/
 * 02-app-marketplace-ui.png): gradient band, ghosted rank numeral, select
 * checkbox and platform badge top-left, book + favourite top-right, overlapping
 * avatar, niche line, country pill, truncated bio, match bar, three-column
 * stat strip.
 *
 * One improvement over the original: hovering surfaces the price and
 * availability without navigating, so a buyer can scan a grid and compare
 * without opening twenty profiles.
 */

const AVAILABILITY_COPY: Record<Creator['availability'], { label: string; className: string }> = {
  open: { label: 'Available now', className: 'text-money' },
  limited: { label: 'Limited slots', className: 'text-warn' },
  booked: { label: 'Booked out', className: 'text-ink-faint' },
};

export function CreatorCard({
  creator,
  score,
  rank,
  shortlisted,
  onToggleShortlist,
  selected,
  onToggleSelect,
  onBook,
}: {
  creator: Creator;
  score: number;
  rank?: number;
  shortlisted?: boolean;
  onToggleShortlist?: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onBook?: (id: string) => void;
}) {
  const availability = AVAILABILITY_COPY[creator.availability];

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[16px] border bg-surface shadow-card',
        'transition-[box-shadow,border-color,transform] duration-200',
        'hover:-translate-y-0.5 hover:shadow-lift focus-within:-translate-y-0.5 focus-within:shadow-lift',
        selected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-line hover:border-line-strong',
      )}
    >
      {/* Band */}
      <div className="card-band relative h-[74px] bg-brand-50">
        {rank !== undefined && (
          <span
            aria-hidden
            className="absolute left-3 top-1 select-none text-[40px] font-extrabold leading-none text-white/50"
          >
            {rank}
          </span>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          {onToggleSelect && (
            <label className="relative flex size-[18px] cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={Boolean(selected)}
                onChange={() => onToggleSelect(creator.id)}
                aria-label={`Select ${creator.name} for a campaign`}
                className="peer absolute inset-0 cursor-pointer opacity-0"
              />
              <span
                aria-hidden
                className={cn(
                  'flex size-[18px] items-center justify-center rounded-[6px] border transition-all duration-150',
                  selected ? 'border-brand-600 bg-brand-600' : 'border-white/70 bg-white/70 backdrop-blur',
                )}
              >
                <svg viewBox="0 0 12 12" className={cn('size-3 transition-transform duration-150', selected ? 'scale-100' : 'scale-0')}>
                  <path d="M2.5 6.2l2.3 2.3 4.7-4.9" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
          )}
          <span className="flex size-[22px] items-center justify-center rounded-[6px] bg-[#0a66c2] text-white" title="LinkedIn">
            <Linkedin className="size-3" aria-label="LinkedIn creator" />
          </span>
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {onBook && (
            <button
              onClick={() => onBook(creator.id)}
              className="rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-ink shadow-card transition-colors hover:bg-white"
            >
              Book
            </button>
          )}
          {onToggleShortlist && (
            <button
              onClick={() => onToggleShortlist(creator.id)}
              aria-pressed={Boolean(shortlisted)}
              aria-label={shortlisted ? `Remove ${creator.name} from shortlist` : `Add ${creator.name} to shortlist`}
              className="flex size-7 items-center justify-center rounded-full bg-surface shadow-card transition-transform duration-150 hover:scale-105 active:scale-95"
            >
              <Star
                className={cn('size-3.5 transition-colors', shortlisted ? 'fill-brand-600 text-brand-600' : 'text-ink-faint')}
              />
            </button>
          )}
        </div>
      </div>

      {/* Identity */}
      <div className="flex flex-col items-center px-5 text-center">
        <Avatar seed={creator.avatarSeed} name={creator.name} size="lg" ring className="-mt-8" />

        <h3 className="mt-2.5 flex items-center gap-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
          <Link href={`/creators/${creator.slug}`} className="after:absolute after:inset-0 hover:underline">
            {creator.name}
          </Link>
          {creator.verified && <BadgeCheck className="size-4 shrink-0 text-brand-600" aria-label="Verified" />}
        </h3>

        <p className="mt-0.5 text-[12.5px] text-ink-muted">{creator.category}</p>

        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-[12px] text-ink-soft">
          <span aria-hidden>{creator.countryFlag}</span>
          {creator.country}
        </span>

        <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">{creator.bio}</p>
      </div>

      {/* Match */}
      <div className="mt-4 px-5">
        <div className="flex items-center justify-between">
          <span className="micro-label flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
            Matching
          </span>
          <span className="tabular text-[13px] font-semibold text-ink">{score}/100</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-700 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line bg-sunken/40">
        <Stat label="Followers" value={formatCompact(creator.followers)} />
        <Stat label="Median views" value={formatCompact(creator.medianViews)} />
        <Stat label="Post cost" value={formatEur(creator.pricePerPost)} />
      </div>

      {/* Hover detail - secondary info without a navigation */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 translate-y-full border-t border-line bg-surface px-5 py-2.5',
          'flex items-center justify-between transition-transform duration-200 ease-out',
          'group-hover:translate-y-0 group-focus-within:translate-y-0',
        )}
      >
        <span className={cn('text-[12px] font-medium', availability.className)}>{availability.label}</span>
        <span className="tabular text-[12px] text-ink-muted">
          {creator.engagement.toFixed(1)}% engagement
        </span>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-3 text-center">
      <p className="tabular text-[14px] font-semibold text-ink">{value}</p>
      <p className="micro-label mt-0.5 text-[10px]">{label}</p>
    </div>
  );
}
