'use client';

import { useId, useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import { formatCompact, formatDateShort } from '@/lib/format';
import type { DailyPoint } from '@/lib/types';

/**
 * Hand-rolled SVG charts.
 *
 * A charting library would add ~150KB to render two shapes. These are plain
 * SVG: they scale with the container, respond to hover, and have no runtime
 * dependency. The trade is that we implement only what we actually use - an
 * area chart and a sparkline - which is the right trade at this size.
 */

interface Series {
  key: keyof Omit<DailyPoint, 'date'>;
  label: string;
  color: string;
}

const W = 720;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 26, left: 40 };

function buildPath(values: number[], max: number, w: number, h: number, pad: typeof PAD) {
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;

  return values.map((v, i) => {
    const x = pad.left + i * step;
    const y = pad.top + innerH - (max === 0 ? 0 : (v / max) * innerH);
    return { x, y, v };
  });
}

function toLine(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export function AreaChart({
  data,
  series,
  className,
  height = H,
}: {
  data: DailyPoint[];
  series: Series;
  className?: string;
  height?: number;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { points, max, ticks } = useMemo(() => {
    const values = data.map((d) => d[series.key]);
    const rawMax = Math.max(...values, 1);
    // Round the axis up to something human, so gridlines read cleanly.
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const niceMax = Math.ceil(rawMax / magnitude) * magnitude;
    return {
      points: buildPath(values, niceMax, W, height, PAD),
      max: niceMax,
      ticks: [0, 0.5, 1].map((f) => Math.round(niceMax * f)),
    };
  }, [data, series.key, height]);

  if (data.length === 0) return null;

  const innerH = height - PAD.top - PAD.bottom;
  const areaPath = `${toLine(points)} L${points[points.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const active = hover !== null ? points[hover] : null;
  const activeDate = hover !== null ? data[hover].date : null;

  return (
    <div className={cn('relative w-full', className)}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${series.label} over ${data.length} days`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series.color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={series.color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines + y axis */}
        {ticks.map((t, i) => {
          const y = PAD.top + innerH - (max === 0 ? 0 : (t / max) * innerH);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeDasharray={i === 0 ? undefined : '3 4'}
              />
              <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" className="fill-[var(--color-ink-faint)] text-[10px]">
                {formatCompact(t)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={toLine(points)} fill="none" stroke={series.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* x labels: first, middle, last only - more would collide on mobile */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text
            key={i}
            x={points[i].x}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            className="fill-[var(--color-ink-faint)] text-[10px]"
          >
            {formatDateShort(data[i].date)}
          </text>
        ))}

        {active && (
          <g>
            <line x1={active.x} x2={active.x} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-line-strong)" />
            <circle cx={active.x} cy={active.y} r="4" fill="var(--color-surface)" stroke={series.color} strokeWidth="2" />
          </g>
        )}

        {/* Invisible hit areas - one per point, full height, so hover is easy */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - (W - PAD.left - PAD.right) / data.length / 2}
            y={PAD.top}
            width={(W - PAD.left - PAD.right) / data.length}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {active && activeDate && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-[8px] border border-line bg-surface px-2.5 py-1.5 shadow-lift"
          style={{ left: `${(active.x / W) * 100}%`, top: 0 }}
        >
          <p className="micro-label">{formatDateShort(activeDate)}</p>
          <p className="tabular text-[13px] font-semibold text-ink">
            {formatCompact(active.v)} <span className="font-normal text-ink-muted">{series.label.toLowerCase()}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/** Tiny inline trend line, for table rows and stat cards. */
export function Sparkline({
  values,
  color = 'var(--color-brand-600)',
  className,
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 96;
  const h = 28;
  const step = w / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-7 w-24', className)} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Horizontal share bar, used for audience breakdowns. */
export function ShareBar({ share, className }: { share: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}>
      <div
        className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
        style={{ width: `${Math.min(100, share)}%` }}
      />
    </div>
  );
}
