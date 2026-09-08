'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Calculator, Check, Info, TrendingDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatEur, formatNumber, formatPercent } from '@/lib/format';
import { AUDIENCE_BANDS, PRICE_BANDS } from '@/lib/data/benchmarks';
import { CREATORS } from '@/lib/data/creators';
import { Button } from '@/components/ui/button';
import { Counter } from '@/components/ui/counter';
import { Reveal } from '@/components/ui/reveal';
import { Faq, PlanCard } from '@/components/marketing/blocks';
import { SiteFooter, SiteNav } from '@/components/marketing/site-chrome';

/**
 * Pricing.
 *
 * The live product has a dedicated pricing page and we only had a landing
 * section, so this closes a structural gap. The decision worth noting is what
 * fills it: rather than a second plan grid, this page publishes the transacted
 * price index and the delivery rate by price band, because the honest answer to
 * "what does this cost" is a distribution, not a number.
 *
 * The counterintuitive finding is left in rather than smoothed over: paying
 * more does not reliably get the post published. That is the sort of thing a
 * marketplace has an interest in hiding, and publishing it is the point.
 */

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What does the platform cost?',
    a: 'Nothing. Sourcing, match scoring, briefs, tracked links, approvals and the payout ledger are all free. The money you spend goes to creators.',
  },
  {
    q: 'How is a creator’s fee decided?',
    a: 'The creator sets it, as a flat fee per post, and it is visible on their card before you open anything. There is no auction, no CPM and no negotiation round-trip — the price you see is the price you pay.',
  },
  {
    q: 'Is there a cost per click or per lead?',
    a: 'No. Clicks, leads and attributed pipeline are measured because you should know what you got, not because they are billed. A post that goes viral costs the same as one that does not.',
  },
  {
    q: 'When is a creator actually paid?',
    a: 'The fee is committed when they accept, scheduled when you approve their draft, and released when the campaign completes. Approval is the gate — nothing is owed for a post you never signed off.',
  },
  {
    q: 'Does paying more get a better post?',
    a: 'Not reliably, and the table above is why. Across the bookings in our reference set the €200–€399 band had the weakest publication rate of any band, worse than the one below it. Fit predicts delivery better than price does.',
  },
  {
    q: 'Is any of this real money?',
    a: 'No. This is a rebuild of a B2B creator marketplace as a technical assessment, with no payment provider connected. Fees, ledgers and payouts are represented end to end, and nothing charges anyone.',
  },
];

export function PricingScreen() {
  const [followers, setFollowers] = useState(12000);

  const band = useMemo(
    () =>
      AUDIENCE_BANDS.find((b) => followers >= b.min && followers < b.max) ??
      AUDIENCE_BANDS[AUDIENCE_BANDS.length - 1],
    [followers],
  );

  const totalBookings = AUDIENCE_BANDS.reduce((s, b) => s + b.n, 0);
  const cheapest = Math.min(...CREATORS.map((c) => c.pricePerPost));
  const dearest = Math.max(...CREATORS.map((c) => c.pricePerPost));

  /** The band where paying more bought less. Called out rather than buried. */
  const worstBand = PRICE_BANDS.reduce((worst, b) =>
    b.publishedRate < worst.publishedRate ? b : worst,
  );

  return (
    <>
      <SiteNav />
      <main id="main">
        {/* ---------------- Hero ---------------- */}
        <section className="aurora border-b border-line py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1 text-[12px] font-medium text-ink-soft backdrop-blur">
              <Check className="size-3.5 text-money" />
              No platform fee, no CPM, no lock-in
            </span>
            <h1 className="mt-5 text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[52px]">
              The platform is free.
              <br />
              You pay creators<span className="text-brand-600">.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-[16.5px]">
              Every price is a flat fee per post, set by the creator and visible before you book.
              Never a cost per click, impression or lead.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button size="lg" className="w-full !rounded-full sm:w-auto">
                  Start free
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button size="lg" variant="secondary" className="w-full !rounded-full sm:w-auto">
                  See live prices
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-[12.5px] text-ink-muted">
              Creators on the marketplace today: {formatEur(cheapest)} – {formatEur(dearest)} per
              post.
            </p>
          </div>
        </section>

        {/* ---------------- Plans ---------------- */}
        <section className="border-b border-line py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-5 lg:grid-cols-2">
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
                    'Draft review and approvals',
                    'Messaging with every creator you book',
                    'Payout ledger',
                  ]}
                  cta={
                    <Link href="/sign-up">
                      <Button block>Start for free</Button>
                    </Link>
                  }
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
                  note="Out of scope for this rebuild — a sales motion is not the product."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------- What a post costs ---------------- */}
        <section className="border-b border-line bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Reveal>
              <div className="max-w-2xl">
                <span className="micro-label">The price index</span>
                <h2 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
                  What a sponsored post actually costs.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  Transacted prices across{' '}
                  <Counter value={totalBookings} className="font-semibold text-ink" /> bookings in
                  our reference set, by audience size. The spread inside a band is wider than the
                  gap between bands — which is the whole argument for pricing on fit rather than
                  followers.
                </p>
              </div>
            </Reveal>

            {/* Band picker */}
            <Reveal>
              <div className="mt-8 rounded-[16px] border border-line bg-ground p-5 sm:p-6">
                <label
                  htmlFor="followers"
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <span className="text-[13px] font-medium text-ink">Audience size</span>
                  <span className="tabular text-[13px] text-ink-muted">
                    {formatNumber(followers)} followers
                  </span>
                </label>
                <input
                  id="followers"
                  type="range"
                  min={500}
                  max={80000}
                  step={500}
                  value={followers}
                  onChange={(e) => setFollowers(Number(e.target.value))}
                  className="mt-3 w-full accent-[var(--color-brand-600)]"
                />
                <div className="mt-5 grid gap-px overflow-hidden rounded-[12px] border border-line bg-line sm:grid-cols-3">
                  <Cell label="25th percentile" value={formatEur(band.p25)} />
                  <Cell label="Median" value={formatEur(band.median)} accent />
                  <Cell label="75th percentile" value={formatEur(band.p75)} />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
                  <strong className="font-semibold text-ink">{band.label}</strong> — {band.n}{' '}
                  bookings. Half sat between {formatEur(band.p25)} and {formatEur(band.p75)}; a
                  quarter went for less than {formatEur(band.p25)}.
                </p>
              </div>
            </Reveal>

            {/* Full table */}
            <Reveal>
              <div className="mt-6 overflow-x-auto rounded-[16px] border border-line">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-sunken/50">
                      <Th>Audience</Th>
                      <Th align="right">Bookings</Th>
                      <Th align="right">P25</Th>
                      <Th align="right">Median</Th>
                      <Th align="right">P75</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {AUDIENCE_BANDS.map((b) => (
                      <tr
                        key={b.id}
                        className={cn(
                          'border-b border-line last:border-0 transition-colors',
                          b.id === band.id ? 'bg-brand-50' : 'bg-surface',
                        )}
                      >
                        <Td>{b.label}</Td>
                        <Td align="right" muted>
                          {b.n}
                        </Td>
                        <Td align="right" muted>
                          {formatEur(b.p25)}
                        </Td>
                        <Td align="right" strong>
                          {formatEur(b.median)}
                        </Td>
                        <Td align="right" muted>
                          {formatEur(b.p75)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Delivery by price ---------------- */}
        <section className="border-b border-line py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Reveal>
              <div className="max-w-2xl">
                <span className="micro-label flex items-center gap-1.5">
                  <TrendingDown className="size-3.5" />
                  The uncomfortable table
                </span>
                <h2 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
                  Paying more does not get the post published.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  Publication rate by what was offered. The{' '}
                  <strong className="font-semibold text-ink">{worstBand.label}</strong> band has the
                  weakest delivery of any band — worse than the one beneath it. Price is not the
                  lever; matching the brief to an audience the creator actually has is.
                </p>
              </div>
            </Reveal>

            <div className="mt-8 space-y-3">
              {PRICE_BANDS.map((b, i) => (
                <Reveal key={b.id} delay={i * 50}>
                  <div className="rounded-[14px] border border-line bg-surface p-4 sm:p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[14px] font-semibold text-ink">{b.label}</p>
                      <p className="tabular text-[13px] text-ink-muted">
                        {b.bookings} offers ·{' '}
                        <span
                          className={cn(
                            'font-semibold',
                            b.id === worstBand.id ? 'text-danger' : 'text-ink',
                          )}
                        >
                          {formatPercent(b.publishedRate * 100, 1)} published
                        </span>
                      </p>
                    </div>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-sunken">
                      <div
                        className={cn(
                          'h-full rounded-full transition-[width] duration-700 ease-out',
                          b.id === worstBand.id ? 'bg-danger' : 'bg-brand-600',
                        )}
                        style={{ width: `${b.publishedRate * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{b.note}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[16px] border border-line bg-surface p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
                  <Calculator className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">
                    Work out what a budget buys before you spend it
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                    The budget planner allocates a number across audience bands and applies these
                    delivery rates, so the output is posts that land — not posts you paid for.
                  </p>
                </div>
                <Link href="/free-tools/campaign-budget">
                  <Button variant="secondary">
                    Open the planner
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section className="border-b border-line bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Reveal>
              <h2 className="text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
                Questions about money.
              </h2>
            </Reveal>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {FAQS.map((f, i) => (
                <Reveal key={f.q} delay={i * 40}>
                  <Faq question={f.q} answer={f.a} />
                </Reveal>
              ))}
            </div>
            <p className="mt-6 flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-faint">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              The price and delivery figures on this page are our own reference set, used
              consistently across the free tools and this page. They are documented in{' '}
              <code className="rounded bg-sunken px-1 py-0.5 text-[11px]">
                lib/data/benchmarks.ts
              </code>
              .
            </p>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="aurora py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <Reveal>
              <h2 className="text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[38px]">
                Spend nothing to find out what it costs.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
                The marketplace is open without an account. Every fee is on the card.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/marketplace">
                  <Button size="lg" className="w-full !rounded-full sm:w-auto">
                    Browse the marketplace
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="lg" variant="secondary" className="w-full !rounded-full sm:w-auto">
                    Create an account
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-surface p-4 text-center">
      <p className="micro-label text-[10px]">{label}</p>
      <p
        className={cn(
          'tabular mt-1 text-[22px] font-bold tracking-[-0.025em]',
          accent ? 'text-brand-600' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'micro-label px-4 py-3 text-[10px]',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  muted,
  strong,
}: {
  children: React.ReactNode;
  align?: 'right';
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-[13px]',
        align === 'right' && 'tabular text-right',
        strong ? 'font-semibold text-ink' : muted ? 'text-ink-muted' : 'text-ink-soft',
      )}
    >
      {children}
    </td>
  );
}
