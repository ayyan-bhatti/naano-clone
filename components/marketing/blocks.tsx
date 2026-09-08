'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Marketing blocks shared between the landing page and the pricing page.
 *
 * They were local to the landing page until pricing got its own route; pulling
 * them out is what stops the two surfaces drifting apart, which is exactly how
 * a plan card ends up saying two different prices in two places.
 */

export function PlanCard({
  name,
  price,
  cadence,
  body,
  features,
  cta,
  highlighted,
  note,
}: {
  name: string;
  price: string;
  cadence: string;
  body: string;
  features: string[];
  cta: React.ReactNode;
  highlighted?: boolean;
  note?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-[16px] border bg-surface p-6 shadow-card',
        highlighted ? 'border-brand-500 ring-1 ring-brand-500/20' : 'border-line',
      )}
    >
      <span className="micro-label">{name}</span>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[34px] font-semibold tracking-[-0.042em] text-ink">{price}</span>
        <span className="text-[13px] text-ink-muted">{cadence}</span>
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
            <Check className="mt-0.5 size-4 shrink-0 text-money" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
      {note && <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">{note}</p>}
    </div>
  );
}

export function Faq({ question, answer }: { question: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{question}</span>
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
          <div className="pb-5 text-[13.5px] leading-relaxed text-ink-soft">{answer}</div>
        </div>
      </div>
    </div>
  );
}
