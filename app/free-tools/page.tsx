'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  Euro,
  Activity,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { Reveal } from '@/components/ui/reveal';
import { SiteFooter, SiteNav } from '@/components/marketing/site-chrome';
import { DATASET_NOTE } from '@/lib/data/benchmarks';

const TOOLS = [
  {
    href: '/free-tools/creator-search',
    icon: Search,
    title: 'Creator Search',
    tagline: 'Get a ranked creator shortlist, instantly',
    body: 'Describe what you sell and who you want to reach. Every creator is scored against that buyer profile and ranked, with pricing, a fit score, and the reason each one is on the list.',
    differentiator: 'Ranked by audience fit, not follower count',
    meta: 'Free · Instant · No account',
  },
  {
    href: '/free-tools/creator-worth',
    icon: Euro,
    title: 'Creator Worth Calculator',
    tagline: 'What a sponsored post should actually cost',
    body: 'Enter a creator’s follower count, average reactions and comments, and their niche, and get a flat-fee estimate per post — plus their engagement rating and the full arithmetic behind the number.',
    differentiator: 'Shows every step, no black box',
    meta: 'Free · Instant · No account',
  },
  {
    href: '/free-tools/engagement-rate',
    icon: Activity,
    title: 'Engagement Rate Calculator',
    tagline: 'Your rate, against benchmarks for your size',
    body: 'Get your engagement rate two ways — by followers and by impressions — rated against B2B benchmarks for your audience size, with concrete tips to improve it.',
    differentiator: 'Benchmarks scale with audience size',
    meta: 'Free · Instant · No account',
  },
  {
    href: '/free-tools/delivery-odds',
    icon: Target,
    title: 'Delivery Odds Estimator',
    tagline: 'How often offers at your price get published',
    body: 'Enter what you plan to offer per post and see how often bookings at that price ended in a published post, how often creators never answered, and what brands actually paid at that audience size.',
    differentiator: 'Reports correlation honestly, not causation',
    meta: 'Free · Instant · No account',
  },
  {
    href: '/free-tools/campaign-budget',
    icon: Calculator,
    title: 'Campaign Budget Planner',
    tagline: 'Turn a budget into published posts, not booked ones',
    body: 'See how many posts your budget books at transacted medians, how many of those historically ended up published, and what that makes the true cost per published post.',
    differentiator: 'Plans on published posts, not booked ones',
    meta: 'Free · Instant · No account',
  },
];

const FAQS = [
  {
    q: 'Are these tools really free?',
    a: 'Yes. No account, no payment method, no email gate. Every calculation runs in your browser — nothing is sent to a server, because there is no server involved in the maths.',
  },
  {
    q: 'Where do the benchmark numbers come from?',
    a: 'They are an illustrative reference set built for this project, shaped like a real marketplace index — same tiers, same columns, same units — so the tools behave the way the real ones do. They are labelled as such on every page. They are not scraped from anyone, and they are not presented as real transactions.',
  },
  {
    q: 'Do the calculators give the same answer every time?',
    a: 'Always. There is no randomness anywhere in the pipeline: the same inputs produce byte-identical output on every run. That is deliberate — a calculator that drifts between runs is not a calculator.',
  },
  {
    q: 'Do I need an account to use them?',
    a: 'No. All five work fully signed out. Signing in only adds the ability to save a shortlist from Creator Search into a workspace, which is the one thing that needs somewhere to persist.',
  },
];

export default function FreeToolsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />

      <main id="main" className="flex-1">
        {/* Header — centred, matching the observed page structure */}
        <section className="border-b border-line">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft shadow-card">
                <Sparkles className="size-3.5 text-brand-600" aria-hidden />
                Free tools by Vouch
              </span>
              <h1 className="mt-7 text-[40px] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink sm:text-[58px]">
                Free tools for B2B creator marketing
                <span className="text-brand-600">.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-soft">
                Five working tools for teams running LinkedIn creator campaigns. No account, no
                payment method, no email gate — and every calculation runs in your browser.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Tools */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool, i) => (
              <Reveal key={tool.href} delay={i * 50}>
                <Link
                  href={tool.href}
                  className={cn(
                    'group flex h-full flex-col rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6',
                    'transition-[border-color,box-shadow,transform] duration-200',
                    'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                      <tool.icon className="size-5" />
                    </span>
                    <span className="rounded-full border border-line px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                      Free
                    </span>
                  </div>

                  <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.032em] text-ink">{tool.title}</h2>
                  <p className="mt-1.5 text-[13.5px] font-medium text-brand-600">{tool.tagline}</p>
                  <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-ink-muted">{tool.body}</p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink-soft">{tool.differentiator}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-faint">{tool.meta}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-brand-600">
                      Open the tool
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-ink sm:text-[30px]">
              Frequently asked questions.
            </h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {FAQS.map((f, i) => (
                <Reveal key={f.q} delay={i * 40}>
                  <Faq question={f.q} answer={f.a} />
                </Reveal>
              ))}
            </div>

            <p className="mt-8 text-[12px] leading-relaxed text-ink-faint">
              <span className="font-medium text-ink-muted">About the numbers.</span> {DATASET_NOTE}
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
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
