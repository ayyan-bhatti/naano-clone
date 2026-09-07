'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Info, X, AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ *
 * Empty + loading states
 * ------------------------------------------------------------------ */

/**
 * Empty states are treated as a real design surface here, not a shrug. Each one
 * says what is missing, why, and gives the single action that fixes it.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[16px] border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600">
        <Icon className="size-5" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[8px] bg-sunken', className)} />;
}

/** Marketplace loading state - mirrors the real card so the swap is not jarring. */
export function CreatorCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
      <Skeleton className="h-[74px] rounded-none" />
      <div className="flex flex-col items-center px-5 pb-5">
        <Skeleton className="-mt-8 size-16 rounded-full ring-4 ring-surface" />
        <Skeleton className="mt-3 h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-24" />
        <Skeleton className="mt-3 h-5 w-20 rounded-full" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-1.5 h-3 w-4/5" />
        <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
        <div className="mt-4 grid w-full grid-cols-3 gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Toasts
 * ------------------------------------------------------------------ */

type ToastTone = 'success' | 'info' | 'error';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

const ToastContext = createContext<{ push: (t: Omit<Toast, 'id'>) => void } | null>(null);

const TONE_STYLES: Record<ToastTone, { ring: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  success: { ring: 'ring-money/20', icon: Check, color: 'bg-money-soft text-money' },
  info: { ring: 'ring-brand-100', icon: Info, color: 'bg-brand-50 text-brand-600' },
  error: { ring: 'ring-danger/20', icon: AlertTriangle, color: 'bg-danger-soft text-danger' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live so confirmations are announced, not just shown. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((t) => {
          const style = TONE_STYLES[t.tone];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-[12px] border border-line bg-surface p-3.5 shadow-pop ring-1',
                style.ring,
                'animate-[toast-in_200ms_ease-out]',
              )}
            >
              <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', style.color)}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{t.title}</p>
                {t.body && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{t.body}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded-[6px] p-1 text-ink-faint transition-colors hover:bg-sunken hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:none}}`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/* ------------------------------------------------------------------ *
 * Modal
 * ------------------------------------------------------------------ */

/**
 * Modal with the accessibility basics done properly: Escape closes, focus moves
 * in on open and returns to the trigger on close, background scroll is locked,
 * and Tab is trapped inside.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    window.setTimeout(() => focusables()[0]?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-[fade-in_150ms_ease-out]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full rounded-t-[20px] border border-line bg-surface shadow-pop sm:rounded-[16px]',
          'animate-[modal-in_200ms_cubic-bezier(0.16,1,0.3,1)]',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 rounded-[8px] p-1.5 text-ink-faint transition-colors hover:bg-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line p-4">{footer}</div>}
      </div>
      <style>{`
        @keyframes fade-in{from{opacity:0}to{opacity:1}}
        @keyframes modal-in{from{opacity:0;transform:translateY(12px) scale(0.98)}to{opacity:1;transform:none}}
      `}</style>
    </div>
  );
}

/** Confirmation dialog for destructive or irreversible-feeling actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  tone = 'primary',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={tone}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-soft">{body}</p>
    </Modal>
  );
}
