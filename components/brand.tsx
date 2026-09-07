import { cn } from '@/lib/cn';

/**
 * Vouch wordmark.
 *
 * Deliberately not Naano's logo or palette - the brief is to rebuild the
 * product, not clone the brand. The mark is a check inside a rounded square:
 * one creator vouching for one product.
 */
export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <defs>
          <linearGradient id="vouch-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3f63e8" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#vouch-mark)" />
        <path
          d="M9.5 16.5l4.2 4.2 8.8-9.4"
          fill="none"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[17px] font-bold tracking-[-0.03em] text-ink">Vouch</span>
    </span>
  );
}
