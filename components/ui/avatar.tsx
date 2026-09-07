import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

/**
 * Deterministic generated avatars.
 *
 * No external avatar service and no bundled photos of real people: each avatar
 * is a gradient derived from the seed plus the person's initials. Stable across
 * renders, zero network requests, and honest about being generated.
 */

const PALETTES: [string, string][] = [
  ['#3f63e8', '#6d28d9'],
  ['#0b8f5f', '#3f63e8'],
  ['#a5620a', '#b4232a'],
  ['#2540b4', '#0b8f5f'],
  ['#6d28d9', '#b4232a'],
  ['#0d1220', '#3f63e8'],
  ['#b4232a', '#a5620a'],
  ['#2f4fd8', '#0b8f5f'],
];

function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-[11px]',
  md: 'size-10 text-[13px]',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
} as const;

export function Avatar({
  seed,
  name,
  size = 'md',
  className,
  ring,
}: {
  seed: string;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}) {
  const h = hash(seed);
  const [from, to] = PALETTES[h % PALETTES.length];
  const angle = h % 360;

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none',
        SIZES[size],
        ring && 'ring-2 ring-surface',
        className,
      )}
      style={{ backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})` }}
    >
      {initials(name)}
    </span>
  );
}
