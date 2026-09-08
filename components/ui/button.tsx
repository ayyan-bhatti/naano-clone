'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

/**
 * Primary is near-black, not the accent colour.
 *
 * That is naano's actual treatment and it is the single easiest thing to get
 * wrong: their blue is reserved for links, match scores and the matching bar,
 * so a blue primary button competes with the one number on a creator card that
 * is supposed to draw the eye. Measured off their "Launch a campaign" CTA:
 * rgb(23,24,28), 12px radius, weight 600, no shadow.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-[#2b2d33] active:bg-[#0f1014]',
  secondary:
    'bg-surface text-ink border border-line hover:bg-sunken hover:border-line-strong active:bg-sunken',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-100',
  ghost: 'bg-transparent text-ink-soft hover:bg-sunken hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-95 active:brightness-90',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-11 px-5 text-sm gap-2 rounded-[12px]',
  lg: 'h-[52px] px-7 text-[16px] gap-2 rounded-[14px]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Renders a full-width block button. */
  block?: boolean;
}

/**
 * The press feedback (active:scale) is deliberately tiny - 1% - and disabled
 * under reduced motion via the global media query in globals.css.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, block, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap',
        'transition-[background-color,border-color,color,transform,box-shadow] duration-150',
        'active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
