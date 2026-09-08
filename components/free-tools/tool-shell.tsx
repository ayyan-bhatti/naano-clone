'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { SiteFooter, SiteNav } from '@/components/marketing/site-chrome';
import { DATASET_NOTE } from '@/lib/data/benchmarks';

/**
 * Shared chrome for every free tool.
 *
 * Mirrors the structure observed on Naano's tool pages: breadcrumb, H1 with a
 * trailing full stop, intro with the privacy line, a two-column input/result
 * split, a method section, FAQ, and cross-links. Free tools are public
 * marketing, so they use SiteNav/SiteFooter rather than the signed-in AppShell.
 */

export interface ToolFaq {
  q: string;
  a: string;
}

export function ToolPage({
  title,
  intro,
  form,
  result,
  method,
  faqs,
  related,
}: {
  title: string;
  intro: string;
  form: React.ReactNode;
  result: React.ReactNode;
  method?: React.ReactNode;
  faqs?: ToolFaq[];
  related?: { href: string; title: string; body: string }[];
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />

      <main id="main" className="flex-1">
        {/* Header */}
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
            <Link
              href="/free-tools"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-3.5" />
              Free tools
            </Link>
            <h1 className="mt-4 max-w-3xl text-[30px] font-extrabold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[40px]">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{intro}</p>
          </div>
        </section>

        {/* Tool */}
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
            <div className="lg:sticky lg:top-24">{form}</div>
            <div className="min-w-0">{result}</div>
          </div>
        </section>

        {method && (
          <section className="border-t border-line bg-surface">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">{method}</div>
          </section>
        )}

        {faqs && faqs.length > 0 && (
          <section className="border-t border-line">
            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
              <h2 className="text-[24px] font-bold tracking-[-0.025em] text-ink sm:text-[28px]">
                Frequently asked questions.
              </h2>
              <div className="mt-6 divide-y divide-line border-y border-line">
                {faqs.map((f, i) => (
                  <Reveal key={f.q} delay={i * 40}>
                    <FaqItem question={f.q} answer={f.a} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {related && related.length > 0 && (
          <section className="border-t border-line bg-surface">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
              <h2 className="text-[20px] font-bold tracking-[-0.02em] text-ink">More free tools.</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {related.map((r, i) => (
                  <Reveal key={r.href} delay={i * 50}>
                    <Link
                      href={r.href}
                      className="group flex h-full flex-col rounded-[16px] border border-line bg-ground p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
                    >
                      <h3 className="text-[14.5px] font-semibold text-ink group-hover:underline">{r.title}</h3>
                      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-muted">{r.body}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600">
                        Open
                        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Dataset disclosure. Appears on every tool, deliberately. */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="text-[12px] leading-relaxed text-ink-faint">
              <span className="font-medium text-ink-muted">About the numbers.</span> {DATASET_NOTE} All
              calculations run in your browser — nothing is sent anywhere, and no account is needed.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">{question}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-ink-muted transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-4 text-[13.5px] leading-relaxed text-ink-soft">{answer}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Form + result building blocks
 * ------------------------------------------------------------------ */

export function ToolForm({
  title,
  hint,
  onReset,
  canReset,
  children,
}: {
  title: string;
  hint?: string;
  onReset?: () => void;
  canReset?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {hint && <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{hint}</p>}
        </div>
        {onReset && (
          <button
            onClick={onReset}
            disabled={!canReset}
            className="shrink-0 rounded-[8px] p-1.5 text-ink-faint transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40"
            aria-label="Reset the form"
            title="Reset"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

/** Idle placeholder shown in the result column before inputs are valid. */
export function ToolIdle({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[16px] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600">
        <Icon className="size-5" />
      </span>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

/** Brief calculating state. Real work is instant, so this is short by design. */
export function ToolCalculating({ label = 'Calculating' }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[16px] border border-line bg-surface px-6 py-12 text-center">
      <span className="size-6 animate-spin rounded-full border-2 border-line border-t-brand-600" />
      <p className="mt-4 text-[13px] font-medium text-ink-soft">{label}…</p>
    </div>
  );
}

export function ResultShell({
  eyebrow,
  children,
  className,
}: {
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[16px] border border-line bg-surface shadow-card', className)}>
      <div className="border-b border-line px-5 py-3 sm:px-6">
        <span className="micro-label">{eyebrow}</span>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/** Section heading used inside the method panels. */
export function MethodSection({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[24px] font-bold tracking-[-0.025em] text-ink sm:text-[28px]">{title}</h2>
      {intro && <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink-soft">{intro}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function ToolCta() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-[16px] border border-line bg-ground p-5">
        <span className="micro-label">For creators</span>
        <h3 className="mt-2 text-[15px] font-semibold text-ink">Set your rate and get booked</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          Publish a flat fee per post and let B2B companies book you directly.
        </p>
        <Link href="/sign-up" className="mt-4 inline-block">
          <Button size="sm">Create a creator account</Button>
        </Link>
      </div>
      <div className="rounded-[16px] border border-line bg-ground p-5">
        <span className="micro-label">For companies</span>
        <h3 className="mt-2 text-[15px] font-semibold text-ink">Find creators your buyers trust</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          Search the marketplace by audience fit and book at a fixed price per post.
        </p>
        <Link href="/marketplace" className="mt-4 inline-block">
          <Button size="sm" variant="secondary">
            Browse the marketplace
          </Button>
        </Link>
      </div>
    </div>
  );
}
