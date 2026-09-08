'use client';

import { cn } from '@/lib/cn';
import { Counter } from '@/components/ui/counter';

/**
 * Result display primitives shared by the tools.
 *
 * The hierarchy every tool follows: one headline metric large enough to be the
 * obvious answer, supporting metrics beneath it, then the explanation, then the
 * benchmark, then what to do about it. Reaching a result should feel like an
 * answer, not a data dump.
 */

export function HeadlineMetric({
  label,
  value,
  format = 'number',
  suffix,
  prefix,
  sub,
}: {
  label: string;
  value: number;
  format?: 'number' | 'compact' | 'eur' | 'eurCompact' | 'percent';
  suffix?: string;
  prefix?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div>
      <span className="micro-label">{label}</span>
      <p className="mt-2 flex items-baseline gap-1 text-[42px] font-extrabold leading-none tracking-[-0.035em] text-ink sm:text-[52px]">
        {prefix && <span className="text-[26px] font-bold text-ink-muted">{prefix}</span>}
        <Counter value={value} format={format} />
        {suffix && <span className="text-[22px] font-bold text-ink-muted">{suffix}</span>}
      </p>
      {sub && <div className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">{sub}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  format = 'number',
  caption,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: number;
  format?: 'number' | 'compact' | 'eur' | 'eurCompact' | 'percent';
  caption?: string;
  tone?: 'neutral' | 'money' | 'warn' | 'danger' | 'brand';
  className?: string;
}) {
  const tones = {
    neutral: 'text-ink',
    money: 'text-money',
    warn: 'text-warn',
    danger: 'text-danger',
    brand: 'text-brand-700',
  };

  return (
    <div className={cn('rounded-[12px] border border-line bg-ground p-4', className)}>
      <span className="micro-label text-[10px]">{label}</span>
      <p className={cn('tabular mt-1.5 text-[22px] font-bold tracking-[-0.02em]', tones[tone])}>
        <Counter value={value} format={format} />
      </p>
      {caption && <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{caption}</p>}
    </div>
  );
}

/** Verdict chip against a benchmark band. */
export function BenchmarkBadge({
  verdict,
  label,
  detail,
}: {
  verdict: 'excellent' | 'healthy' | 'below' | 'none' | 'good' | 'average' | 'low';
  label: string;
  detail?: string;
}) {
  const tones: Record<string, string> = {
    excellent: 'bg-money-soft text-money ring-money/20',
    good: 'bg-money-soft text-money ring-money/20',
    healthy: 'bg-brand-50 text-brand-700 ring-brand-100',
    average: 'bg-warn-soft text-warn ring-warn/20',
    below: 'bg-danger-soft text-danger ring-danger/20',
    low: 'bg-danger-soft text-danger ring-danger/20',
    none: 'bg-sunken text-ink-muted ring-line',
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ring-1 ring-inset',
          tones[verdict],
        )}
      >
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        {label}
      </span>
      {detail && <span className="text-[12.5px] text-ink-muted">{detail}</span>}
    </div>
  );
}

/**
 * A value plotted against a benchmark band, with the "good" range shaded.
 * Communicates "you are here relative to normal" far faster than two numbers.
 */
export function BandMeter({
  value,
  bandMin,
  bandMax,
  scaleMax,
  unit = '%',
  label,
}: {
  value: number;
  bandMin: number;
  bandMax: number;
  scaleMax?: number;
  unit?: string;
  label?: string;
}) {
  const max = scaleMax ?? Math.max(bandMax * 1.6, value * 1.15, 1);
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / max) * 100))}%`;

  return (
    <div>
      {label && <span className="micro-label">{label}</span>}
      <div className="relative mt-2 h-8">
        {/* Track */}
        <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-sunken" />
        {/* Good band */}
        <div
          className="absolute top-3 h-2 rounded-full bg-brand-200"
          style={{ left: pct(bandMin), width: `calc(${pct(bandMax)} - ${pct(bandMin)})` }}
          aria-hidden
        />
        {/* Marker */}
        <div
          className="absolute top-0 -translate-x-1/2 transition-[left] duration-700 ease-out"
          style={{ left: pct(value) }}
        >
          <div className="h-8 w-0.5 rounded-full bg-ink" />
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
        <span>0{unit}</span>
        <span>
          Benchmark {bandMin}–{bandMax}
          {unit}
        </span>
        <span>
          {Math.round(max * 10) / 10}
          {unit}
        </span>
      </div>
    </div>
  );
}

/** Ordered list of recommendations. */
export function Recommendations({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="micro-label">What to do about it</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Step-by-step arithmetic, for the "no black box" panels. */
export function StepBreakdown({ steps }: { steps: { label: string; value: string; detail: string }[] }) {
  return (
    <ol className="divide-y divide-line rounded-[12px] border border-line">
      {steps.map((s, i) => (
        <li key={s.label} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3.5">
          <span className="tabular w-5 shrink-0 text-[12px] font-semibold text-ink-faint">{i + 1}</span>
          <span className="min-w-[130px] text-[13px] font-medium text-ink">{s.label}</span>
          <span className="tabular text-[13px] font-semibold text-brand-700">{s.value}</span>
          <span className="w-full pl-8 text-[12px] leading-relaxed text-ink-muted sm:w-auto sm:flex-1 sm:pl-0">
            {s.detail}
          </span>
        </li>
      ))}
    </ol>
  );
}
