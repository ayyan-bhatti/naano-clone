/** Shared display formatting. Kept in one place so numbers look identical everywhere. */

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-GB').format(Math.round(n));
}

export function formatEur(n: number, opts: { compact?: boolean } = {}): string {
  // Compact has to keep going past a thousand thousands. Without the millions
  // branch an attributed-pipeline figure renders as "EUR 1535.9K", which is
  // both wrong and the kind of thing that makes every other number on the page
  // look untrustworthy.
  if (opts.compact && n >= 1_000_000) {
    return `€${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (opts.compact && n >= 1000) {
    return `€${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

/** Click-through rate as a percentage string, guarding divide-by-zero. */
export function ctr(clicks: number, impressions: number): string {
  if (!impressions) return '—';
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DATE_FMT_SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : DATE_FMT.format(d);
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : DATE_FMT_SHORT.format(d);
}

/**
 * Relative time against a fixed reference date. Using a fixed "now" keeps
 * server and client output identical, which a live Date.now() would not.
 */
export const NOW = new Date('2026-09-07T12:00:00Z');

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffDays = Math.round((NOW.getTime() - then) / 86_400_000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function daysBetween(startIso: string, endIso: string): number {
  return Math.max(
    1,
    Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000),
  );
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

/** "Aymane Belkacem" -> "AB". Used for avatar fallbacks. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
