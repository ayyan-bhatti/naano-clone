'use client';

import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Form primitives.
 *
 * Every control gets a real <label htmlFor>, and errors are wired through
 * aria-describedby + aria-invalid so a screen reader hears the message rather
 * than just seeing a red border.
 */

const CONTROL =
  'w-full rounded-[10px] border bg-surface px-3 text-sm text-ink placeholder:text-ink-faint ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 ' +
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted';

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-[12px] text-danger">
          <AlertCircle aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[12px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'h-10', invalid ? 'border-danger' : 'border-line', className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'min-h-24 py-2.5 leading-relaxed', invalid ? 'border-danger' : 'border-line', className)}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'h-10 cursor-pointer pr-8', invalid ? 'border-danger' : 'border-line', className)}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Checkbox with an animated tick. The scale/opacity transition is what makes
 * filtering feel responsive rather than instantaneous-but-dead.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  count,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  count?: number;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 -mx-2',
        'transition-colors duration-150 hover:bg-sunken',
        className,
      )}
    >
      <span className="relative flex size-[18px] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 cursor-pointer opacity-0"
        />
        <span
          aria-hidden
          className={cn(
            'flex size-[18px] items-center justify-center rounded-[6px] border transition-all duration-150',
            checked ? 'border-brand-600 bg-brand-600' : 'border-line-strong bg-surface group-hover:border-brand-300',
          )}
        >
          <svg
            viewBox="0 0 12 12"
            className={cn(
              'size-3 transition-[transform,opacity] duration-150',
              checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
            )}
          >
            <path
              d="M2.5 6.2l2.3 2.3 4.7-4.9"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
      <span className="flex-1 text-[13px] text-ink-soft group-hover:text-ink">{label}</span>
      {count !== undefined && <span className="tabular text-[12px] text-ink-faint">{count}</span>}
    </label>
  );
}
