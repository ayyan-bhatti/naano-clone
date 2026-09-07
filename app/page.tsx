'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  FileText,
  Link2,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { CREATORS } from '@/lib/data/creators';
import { matchScoreOnly } from '@/lib/match';
import { DEMO_USER } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Counter } from '@/components/ui/counter';
import { Reveal } from '@/components/ui/reveal';
import { CreatorCard } from '@/components/creator-card';
import { SiteFooter, SiteNav } from '@/components/marketing/site-chrome';

const STEPS = [
  {
    icon: Search,
    title: 'Match on audience, not follower count',
    body: 'Describe who you sell to. Every creator is scored against your buyer profile, and the score is broken down so you can see exactly why.',
  },
  {
    icon: FileText,
    title: 'Build the brief in minutes',
    body: 'Objectives, key messages, guidelines and the tracked link, assembled from your inputs and the creators you picked. Editable before anything ships.',
  },
  {
    icon: Link2,
    title: 'Manage every collaboration',
    body: 'Draft, scheduled, live. Invitations, accepts, reviews and publishes all move through one board instead of a spreadsheet and six inboxes.',
  },
  {
    icon: BarChart3,
    title: 'Trace clicks to pipeline',
    body: 'Every post carries its own tracked link. Impressions, clicks, leads and attributed pipeline, per creator and per campaign.',
  },
  {
    icon: Wallet,
    title: 'Pay without the admin',
    body: 'Fixed price per post, agreed before booking. Approval releases the payout, and the ledger keeps contract, invoice and payment together.',
  },
];

const FAQS = [
  {
    q: 'How is this different from an influencer database?',
    a: 'A database ends at discovery — you export a list and chase people by email. This is transactional: you shortlist, brief, book and measure in one place, and the price is fixed and visible before you commit.',
  },
  {
    q: 'Why does audience fit matter more than reach?',
    a: 'A 3,000-follower engineer whose audience is 44% engineering leaders will out-convert a 40,000-follower generalist for a developer tool. The match score weights audience composition and topic overlap far above raw follower count, and smaller creators genuinely click harder.',
  },
  {
    q: 'How does attribution work?',
    a: 'Each campaign gets a short tracked link. Clicks are attributed to the specific creator and post that drove them, so campaign totals are always the sum of per-creator performance rather than a number typed into a dashboard.',
  },
  {
    q: 'What does it cost?',
    a: 'The platform is free. You pay each creator their published fixed price per post — no cost per click, no cost per lead, no retainer.',
  },
];

export default function LandingPage() {
  // Scored against the demo buyer profile so the preview shows real ranking,
  // not decorative numbers.
  const featured = useMemo(() => {
    return CREATORS.map((c) => ({ creator: c, score: matchScoreOnly(c, DEMO_USER.buyerProfile) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav tone="dark" />

      <main id="main" className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="relative -mt-16 overflow-hidden bg-[#0a0c17] pt-16">
          {/* Layered depth: two coloured glows, a masked grid, and a soft floor. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(60% 55% at 12% 0%, rgba(63,99,232,0.32) 0%, transparent 60%),' +
                'radial-gradient(55% 60% at 92% 20%, rgba(109,40,217,0.26) 0%, transparent 60%),' +
                'radial-gradient(70% 50% at 50% 108%, rgba(11,143,95,0.16) 0%, transparent 60%)',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),' +
                'linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
              maskImage: 'radial-gradient(80% 70% at 30% 20%, black 0%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(80% 70% at 30% 20%, black 0%, transparent 100%)',
            }}
          />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            {/* Copy */}
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/75 backdrop-blur">
                  <span aria-hidden className="size-1.5 rounded-full bg-money" />
                  Where B2B brands work with creators
                </span>
              </Reveal>

              <Reveal delay={60}>
                <h1 className="mt-5 text-[40px] font-extrabold leading-[1.02] tracking-[-0.04em] text-white sm:text-[58px]">
                  The creators your
                  <br />
                  buyers{' '}
                  <span className="bg-gradient-to-r from-[#9db2ff] via-[#c4b5fd] to-[#7de3b8] bg-clip-text text-transparent">
                    already trust.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={110}>
                <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-white/60 sm:text-[17px]">
                  Find them by audience fit rather than follower count, brief them in minutes, and
                  trace the clicks, leads and pipeline back to every single post.
                </p>
              </Reveal>

              <Reveal delay={160}>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link href="/sign-up">
                    <Button size="lg" className="w-full !rounded-full sm:w-auto">
                      Launch a campaign
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/marketplace">
                    <Button
                      size="lg"
                      className="w-full !rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
                    >
                      Browse the marketplace
                    </Button>
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={210}>
                <p className="mt-5 text-[13px] text-white/45">
                  Free to browse · Fixed price per post · No card required
                </p>
              </Reveal>
            </div>

            {/* Floating product fragments - depth without a screenshot */}
            <Reveal delay={140}>
              <HeroStack />
            </Reveal>
          </div>

          {/* Headline metrics, on the dark floor */}
          <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6">
            <Reveal delay={240}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-8 sm:grid-cols-4">
                {[
                  { label: 'Vetted creators', value: 2400, format: 'compact' as const, suffix: '+' },
                  { label: 'Impressions tracked', value: 5_200_000, format: 'compact' as const, suffix: '' },
                  { label: 'Leads attributed', value: 31_400, format: 'compact' as const, suffix: '' },
                  { label: 'Median cost per post', value: 180, format: 'eur' as const, suffix: '' },
                ].map((m) => (
                  <div key={m.label}>
                    <dd className="text-[26px] font-bold tracking-[-0.02em] text-white sm:text-[30px]">
                      <Counter value={m.value} format={m.format} />
                      {m.suffix}
                    </dd>
                    <dt className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
                      {m.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Marketplace preview ---------------- */}
        <section id="marketplace" className="border-t border-line bg-surface py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className="max-w-2xl">
                <span className="micro-label">The marketplace</span>
                <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[36px]">
                  Ranked by fit with your buyers.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  These three are the top matches for a revenue-operations tool selling into RevOps
                  and sales leaders. Change the buyer profile and the whole ranking changes — the
                  score is relational, not a property of the creator.
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map(({ creator, score }, i) => (
                <Reveal key={creator.id} delay={i * 70}>
                  <CreatorCard creator={creator} score={score} rank={i + 1} />
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <div className="mt-8 flex justify-center">
                <Link href="/marketplace">
                  <Button variant="secondary">
                    See all {CREATORS.length} creators
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        <section id="how" className="border-t border-line py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className="max-w-2xl">
                <span className="micro-label">How it works</span>
                <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[36px]">
                  Five steps, one loop.
                </h2>
              </div>
            </Reveal>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 60}>
                  <div className="h-full rounded-[16px] border border-line bg-surface p-6 shadow-card">
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
                        <step.icon className="size-5" />
                      </span>
                      <span className="tabular text-[13px] font-semibold text-ink-faint">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Pricing ---------------- */}
        <section id="pricing" className="border-t border-line bg-surface py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className="max-w-2xl">
                <span className="micro-label">Pricing</span>
                <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[36px]">
                  The platform is free. You pay creators.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  Every price is a flat fee per post, set by the creator and visible before you
                  book. Never a cost per click, impression or lead.
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <Reveal>
                <PlanCard
                  name="Self-serve"
                  price="€0"
                  cadence="/ month"
                  body="Everything you need to run creator campaigns in-house."
                  features={[
                    'Full marketplace access and match scoring',
                    'Assisted brief generation',
                    'Tracked links, clicks, leads and pipeline',
                    'Payout ledger and approvals',
                  ]}
                  cta={<Link href="/sign-up"><Button block>Start for free</Button></Link>}
                  highlighted
                />
              </Reveal>
              <Reveal delay={80}>
                <PlanCard
                  name="Managed"
                  price="€700"
                  cadence="/ month"
                  body="A team that sources, briefs and runs the channel for you."
                  features={[
                    'Everything in Self-serve',
                    'Creator sourcing and coordination',
                    'Brief writing and campaign launch',
                    'Reporting and optimisation',
                  ]}
                  cta={
                    <Button block variant="secondary" disabled title="Not part of this build">
                      Talk to sales
                    </Button>
                  }
                  note="Out of scope for this rebuild — the sales motion is not the product."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section id="faq" className="border-t border-line py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Reveal>
              <h2 className="text-[28px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
                Questions.
              </h2>
            </Reveal>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {FAQS.map((f, i) => (
                <Reveal key={f.q} delay={i * 50}>
                  <Faq question={f.q} answer={f.a} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="aurora border-t border-line py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <Reveal>
              <h2 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[40px]">
                Your next campaign starts here.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
                Create an account and land on an empty dashboard, or jump straight into a seeded
                demo workspace with campaigns already in flight.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/sign-up">
                  <Button size="lg" className="w-full sm:w-auto">
                    Create an account
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Open the demo workspace
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * The floating fragments beside the hero.
 *
 * Three real pieces of the product - a ranked creator, an attributed-pipeline
 * tile, and a tracked link - arranged with depth rather than one flat
 * screenshot. Each says something the headline cannot: fit is scored, pipeline
 * is attributed, every post carries its own link.
 */
function HeroStack() {
  return (
    <div className="relative mx-auto hidden h-[380px] w-full max-w-[420px] lg:block">
      {/* Creator match card */}
      <div className="absolute left-0 top-2 w-[280px] rotate-[-3deg] rounded-[16px] border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md shadow-pop">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ backgroundImage: 'linear-gradient(135deg,#3f63e8,#6d28d9)' }}
          >
            MF
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-white">Marta Ferreira</p>
            <p className="truncate text-[11.5px] text-white/50">RevOps · Sales</p>
          </div>
        </div>
        <div className="mt-3.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-white/45">
            Matching
          </span>
          <span className="tabular text-[13px] font-semibold text-white">88/100</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/12">
          <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-[#3f63e8] to-[#9db2ff]" />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-white/45">
          70% of this audience is Sales leaders, RevOps and Founders
        </p>
      </div>

      {/* Pipeline tile */}
      <div className="absolute right-0 top-24 w-[230px] rotate-[2.5deg] rounded-[16px] border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md shadow-pop">
        <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-white/45">
          Attributed pipeline
        </span>
        <p className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-white">€48.2K</p>
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-[#7de3b8]">
          <TrendingUp className="size-3.5" />
          +24%
          <span className="font-normal text-white/35">vs first half</span>
        </div>
        {/* Tiny inline trend, drawn not imported */}
        <svg viewBox="0 0 120 32" className="mt-3 h-8 w-full" aria-hidden>
          <path
            d="M2 27 L18 24 L34 25 L50 17 L66 19 L82 11 L98 12 L118 4"
            fill="none"
            stroke="#7de3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Tracked link */}
      <div className="absolute bottom-2 left-8 w-[262px] rotate-[1.5deg] rounded-[16px] border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md shadow-pop">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-white/45">
          <Link2 className="size-3" />
          Tracked link
        </span>
        <p className="tabular mt-1.5 text-[13px] font-medium text-white">vouch.link/revo7k2x</p>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
          {[
            ['42.8K', 'Impr.'],
            ['312', 'Clicks'],
            ['18', 'Leads'],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="tabular text-[13px] font-semibold text-white">{v}</p>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/40">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanCard({
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
        <span className="text-[34px] font-bold tracking-[-0.03em] text-ink">{price}</span>
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

function Faq({ question, answer }: { question: string; answer: string }) {
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
          <p className="pb-5 text-[13.5px] leading-relaxed text-ink-soft">{answer}</p>
        </div>
      </div>
    </div>
  );
}
