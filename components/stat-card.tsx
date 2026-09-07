import { TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Counter } from '@/components/ui/counter';
import { Sparkline } from '@/components/ui/chart';

/**
 * The recurring metric tile: uppercase micro-label, large animated numeral,
 * one-line caption, soft-tinted icon square. Lifted directly from the observed
 * Naano dashboard structure.
 */
export function StatCard({
  label,
  value,
  format = 'number',
  caption,
  icon: Icon,
  delta,
  spark,
  tone = 'brand',
  className,
}: {
  label: string;
  value: number;
  format?: 'number' | 'compact' | 'eur' | 'eurCompact' | 'percent';
  caption?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Percentage change; positive is good for every metric we show. */
  delta?: number | null;
  spark?: number[];
  tone?: 'brand' | 'money' | 'live';
  className?: string;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    money: 'bg-money-soft text-money',
    live: 'bg-live-soft text-live',
  };

  return (
    <div className={cn('rounded-[16px] border border-line bg-surface p-5 shadow-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="micro-label">{label}</span>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-[10px]', tones[tone])}>
          <Icon className="size-4" />
        </span>
      </div>

      <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
        <Counter value={value} format={format} />
      </p>

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {caption && <p className="truncate text-[12px] text-ink-muted">{caption}</p>}
          {delta !== undefined && delta !== null && (
            <p
              className={cn(
                'mt-1 inline-flex items-center gap-1 text-[12px] font-medium',
                delta >= 0 ? 'text-money' : 'text-danger',
              )}
            >
              {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              <span className="tabular">
                {delta >= 0 ? '+' : ''}
                {delta}%
              </span>
              <span className="font-normal text-ink-faint">vs first half</span>
            </p>
          )}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline values={spark} color={tone === 'money' ? 'var(--color-money)' : 'var(--color-brand-500)'} />
        )}
      </div>
    </div>
  );
}
