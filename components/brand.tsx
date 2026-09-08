import { cn } from '@/lib/cn';

/**
 * Vouch wordmark.
 *
 * Still our mark, not theirs - a check inside a rounded square, one creator
 * vouching for one product. But it is set in ink rather than a blue-violet
 * gradient, because on naano the logo is solid black and a gradient mark is
 * the one element that would keep announcing "template" next to type this
 * restrained. The accent survives as the single dot.
 */
export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0 text-ink">
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <path
          d="M9.5 16.5l4.2 4.2 8.8-9.4"
          fill="none"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25.5" cy="24.5" r="3.2" fill="var(--color-brand-600)" />
      </svg>
      <span className="text-[17px] font-semibold tracking-[-0.042em] text-ink">Vouch</span>
    </span>
  );
}
