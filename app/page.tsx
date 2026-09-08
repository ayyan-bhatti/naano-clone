'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  FileText,
  Link2,
  Linkedin,
  Lock,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

import { CREATORS } from '@/lib/data/creators';
import { matchScoreOnly } from '@/lib/match';
import { DEMO_USER } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Counter } from '@/components/ui/counter';
import { Reveal } from '@/components/ui/reveal';
import { CreatorCard } from '@/components/creator-card';
import { Faq, PlanCard } from '@/components/marketing/blocks';
import { SiteFooter, SiteNav } from '@/components/marketing/site-chrome';
import { Sky } from '@/components/marketing/sky';
import { AnimatedHeading } from '@/components/motion/animated-heading';
import { AttributionScene } from '@/components/motion/attribution-scene';
import { RisingWords } from '@/components/motion/rising-words';
import { ScrollProgress } from '@/components/motion/scroll-progress';
import { useScrollTriggerRefresh } from '@/lib/hooks/use-gsap';

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
  // Web fonts settle after the first paint and change every heading's height,
  // so the triggers are re-measured once they land.
  useScrollTriggerRefresh();

  // Scored against the demo buyer profile so the preview shows real ranking,
  // not decorative numbers.
  const featured = useMemo(() => {
    return CREATORS.map((c) => ({ creator: c, score: matchScoreOnly(c, DEMO_USER.buyerProfile) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollProgress />
      <SiteNav />

      <main id="main" className="flex-1">
        {/* ---------------- Hero ---------------- */}
        {/*
          Centred over the sky, not split. Naano's hero puts one very large
          heading in the middle of a cloud field with a black CTA and a plain
          text-link beside it - no boxed secondary button, no screenshot
          alongside. The product imagery comes after, in its own frame.
        */}
        <section className="relative -mt-[72px] overflow-hidden pt-[72px]">
          <Sky />

          <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft shadow-[0_1px_2px_rgb(23_24_28/0.06)] ring-1 ring-white">
                <Linkedin className="size-3.5 text-[#0a66c2]" />
                Where B2B brands work with creators
              </span>
            </Reveal>

            <AnimatedHeading
              as="h1"
              immediate
              delay={0.12}
              lines={[
                'The creators your',
                { text: 'buyers already trust.' },
              ]}
              className="mt-6 text-[42px] font-semibold leading-[1.04] tracking-[-0.042em] text-ink sm:text-[68px] lg:text-[76px]"
            />

            <RisingWords
              delay={0.4}
              text="Find them by audience fit rather than follower count, launch campaigns in days, and track the clicks, leads and pipeline generated by every post."
              className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.5] text-ink-soft sm:text-[21px]"
            />

            <Reveal delay={160}>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button size="lg" block className="sm:!w-auto">
                    Launch a campaign
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                {/* Their secondary is a text link with an arrow, not a bordered button. */}
                <Link
                  href="#how"
                  className="group inline-flex items-center gap-2 text-[16px] font-semibold text-ink transition-colors hover:text-ink-soft"
                >
                  See how it works
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={210}>
              <p className="mt-7 flex items-center justify-center gap-2 text-[13px] text-ink-muted">
                <ShieldCheck className="size-4 text-ink-faint" />
                Free to browse · Fixed price per post · No card required
              </p>
            </Reveal>
          </div>

          {/* Headline metrics, on the pale floor of the sky */}
          <div className="relative mx-auto max-w-5xl px-4 pb-20 sm:px-6">
            <Reveal delay={240}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
                {[
                  { label: 'Vetted creators', value: 2400, format: 'compact' as const, suffix: '+' },
                  { label: 'Impressions tracked', value: 5_200_000, format: 'compact' as const, suffix: '' },
                  { label: 'Leads attributed', value: 31_400, format: 'compact' as const, suffix: '' },
                  { label: 'Median cost per post', value: 180, format: 'eur' as const, suffix: '' },
                ].map((m) => (
                  <div key={m.label}>
                    <dd className="text-[28px] font-semibold tracking-[-0.035em] text-ink sm:text-[34px]">
                      <Counter value={m.value} format={m.format} />
                      {m.suffix}
                    </dd>
                    <dt className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                      {m.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Marketplace preview ---------------- */}
        {/*
          Naano present the product inside a browser chrome sitting on a sky
          panel. Ours does the same, except the cards inside it are the real
          component ranked by the real scorer rather than a screenshot.
        */}
        <section id="marketplace" className="relative pb-20 sm:pb-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[12.5px] font-medium text-ink-soft shadow-card">
                  <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
                  The Vouch creator marketplace
                </span>
                <AnimatedHeading
                  lines={['Ranked by fit', 'with your buyers.']}
                  className="mt-5 text-[32px] font-semibold leading-[1.06] tracking-[-0.042em] text-ink sm:text-[52px]"
                />
                <p className="mx-auto mt-4 max-w-xl text-[16px] leading-[1.5] text-ink-soft sm:text-[19px]">
                  These are the top matches for a revenue-operations tool selling into RevOps and
                  sales leaders. Change the buyer profile and the whole ranking changes — the score
                  is relational, not a property of the creator.
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="sky mt-12 overflow-hidden rounded-[28px] p-3 shadow-sky sm:p-5">
                <div className="overflow-hidden rounded-[20px] border border-white/70 bg-surface/95 shadow-lift backdrop-blur">
                  {/* Browser chrome, drawn rather than screenshotted */}
                  <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                    <span className="flex gap-1.5" aria-hidden>
                      {['#f0605c', '#f5bd4f', '#61c554'].map((c) => (
                        <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
                      ))}
                    </span>
                    <span className="mx-auto flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1 text-[11.5px] text-ink-muted">
                      <Lock className="size-3" />
                      vouch.so/marketplace
                    </span>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                    {featured.map(({ creator, score }, i) => (
                      <CreatorCard key={creator.id} creator={creator} score={score} rank={i + 1} />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

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

        {/* ---------------- The trace, scroll-driven ---------------- */}
        <AttributionScene />

        {/* ---------------- How it works ---------------- */}
        <section id="how" className="border-t border-line py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className="max-w-2xl">
                <span className="micro-label">How it works</span>
                <AnimatedHeading
                  lines={['Five steps, one loop.']}
                  className="mt-3 text-[28px] font-bold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[36px]"
                />
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
                <AnimatedHeading
                  lines={['The platform is free.', { text: 'You pay creators.' }]}
                  className="mt-3 text-[28px] font-bold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[36px]"
                />
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  Every price is a flat fee per post, set by the creator and visible before you
                  book. Never a cost per click, impression or lead.
                </p>
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand-600 hover:underline"
                >
                  See the full price index — what 300 bookings actually went for
                  <ArrowRight className="size-3.5" />
                </Link>
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
              <AnimatedHeading
                lines={['Questions.']}
                className="text-[28px] font-bold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[34px]"
              />
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

