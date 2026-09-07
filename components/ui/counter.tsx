'use client';

import { useCountUp } from '@/lib/hooks/use-motion';
import { formatCompact, formatEur, formatNumber } from '@/lib/format';

type Format = 'number' | 'compact' | 'eur' | 'eurCompact' | 'percent';

function render(value: number, format: Format): string {
  switch (format) {
    case 'compact':
      return formatCompact(value);
    case 'eur':
      return formatEur(value);
    case 'eurCompact':
      return formatEur(value, { compact: true });
    case 'percent':
      return `${value.toFixed(1)}%`;
    default:
      return formatNumber(value);
  }
}

/**
 * Counts up on first scroll into view. Always `tabular` so the digits do not
 * jitter the layout while animating, and it renders the final value
 * immediately under reduced motion.
 */
export function Counter({
  value,
  format = 'number',
  className,
}: {
  value: number;
  format?: Format;
  className?: string;
}) {
  const { ref, value: current } = useCountUp(value);
  return (
    <span ref={ref} className={`tabular ${className ?? ''}`}>
      {render(current, format)}
    </span>
  );
}
