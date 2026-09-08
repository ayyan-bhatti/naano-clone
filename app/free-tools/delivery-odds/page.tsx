'use client';

import { useMemo } from 'react';
import { Target, TrendingUp } from 'lucide-react';

import { calculateDeliveryOdds } from '@/lib/calculators/delivery-odds';
import { AUDIENCE_BANDS, PRICE_BANDS } from '@/lib/data/benchmarks';
import { formatEur } from '@/lib/format';
import { toNumber, useToolState } from '@/lib/hooks/use-tool-state';
import { Field, Input, Select } from '@/components/ui/field';
import { Reveal } from '@/components/ui/reveal';
import {
  MethodSection,
  ResultShell,
  ToolCalculating,
  ToolCta,
  ToolForm,
  ToolIdle,
  ToolPage,
} from '@/components/free-tools/tool-shell';
import { HeadlineMetric, MetricCard, Recommendations } from '@/components/free-tools/metrics';

const DEFAULTS = { audienceBandId: '10k-25k', offer: '' };

export default function DeliveryOddsPage() {
  const { values, set, reset, calculating, isDirty } = useToolState('vouch.tool.delivery', DEFAULTS);

  const result = useMemo(
    () =>
      calculateDeliveryOdds({
        audienceBandId: values.audienceBandId,
        offer: toNumber(values.offer),
      }),
    [values],
  );

  const offerNum = toNumber(values.offer);
  const offerError = values.offer.trim() !== '' && offerNum <= 0 ? 'Enter an offer above zero' : undefined;

  const form = (
    <ToolForm
      title="Your offer"
      hint="What you plan to offer a creator per sponsored post, and roughly how big their audience is."
      onReset={reset}
      canReset={isDirty}
    >
      <Field label="Creator audience size">
        {({ id }) => (
          <Select
            id={id}
            value={values.audienceBandId}
            onChange={(e) => set('audienceBandId', e.target.value)}
          >
            {AUDIENCE_BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Your offer per post (€)"
        error={offerError}
        hint={`Median for this tier is ${formatEur(result.audience.median)}`}
        required
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="250"
            value={values.offer}
            onChange={(e) => set('offer', e.target.value)}
          />
        )}
      </Field>

      <div className="rounded-[12px] border border-line bg-ground p-4">
        <span className="micro-label text-[10px]">This tier transacted at</span>
        <div className="mt-2 flex items-baseline justify-between gap-2 text-[13px]">
          <span className="text-ink-muted">P25</span>
          <span className="tabular font-semibold text-ink">{formatEur(result.audience.p25)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2 text-[13px]">
          <span className="text-ink-muted">Median</span>
          <span className="tabular font-semibold text-ink">{formatEur(result.audience.median)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2 text-[13px]">
          <span className="text-ink-muted">P75</span>
          <span className="tabular font-semibold text-ink">{formatEur(result.audience.p75)}</span>
        </div>
      </div>
    </ToolForm>
  );

  const resultPanel = !result.valid ? (
    <ToolIdle
      icon={Target}
      title="Enter an offer to see the odds"
      body="Add what you plan to offer per post. You will see how often bookings at that price ended in a published post, how often they went unanswered, and where the offer sits against what brands actually paid."
    />
  ) : calculating ? (
    <ToolCalculating label="Looking up" />
  ) : (
    <div className="space-y-5">
      <Reveal>
        <ResultShell eyebrow="Publication odds">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
            <HeadlineMetric
              label="Ended in a published post"
              value={result.publishedPct}
              format="percent"
              sub={<>of settled bookings in the {result.band.label} band</>}
            />

            {/* Outcome split - the three states an offer can end in */}
            <div>
              <span className="micro-label">Where offers ended up</span>
              <div className="mt-2.5 flex h-3 overflow-hidden rounded-full">
                <span
                  className="bg-money transition-[width] duration-700"
                  style={{ width: `${result.publishedPct}%` }}
                  title={`Published ${result.publishedPct}%`}
                />
                <span
                  className="bg-warn/70 transition-[width] duration-700"
                  style={{ width: `${result.otherPct}%` }}
                  title={`Answered but not delivered ${result.otherPct}%`}
                />
                <span
                  className="bg-line-strong transition-[width] duration-700"
                  style={{ width: `${result.neverAnsweredPct}%` }}
                  title={`Never answered ${result.neverAnsweredPct}%`}
                />
              </div>
              <ul className="mt-3 space-y-1.5 text-[12.5px]">
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span className="size-2 rounded-full bg-money" /> Published
                  </span>
                  <span className="tabular font-semibold text-ink">{result.publishedPct}%</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span className="size-2 rounded-full bg-warn/70" /> Answered, not delivered
                  </span>
                  <span className="tabular font-semibold text-ink">{result.otherPct}%</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span className="size-2 rounded-full bg-line-strong" /> Never answered
                  </span>
                  <span className="tabular font-semibold text-ink">{result.neverAnsweredPct}%</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-5 border-t border-line pt-5 text-[13.5px] leading-relaxed text-ink-soft">
            {result.interpretation}
          </p>
        </ResultShell>
      </Reveal>

      {/* Price positioning */}
      <Reveal delay={60}>
        <ResultShell eyebrow="Your offer vs. the market">
          <div className="relative pt-8">
            <div className="relative h-2 rounded-full bg-sunken">
              <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-brand-200" />
              {/* Median marker */}
              <div
                className="absolute -top-1 h-4 w-0.5 bg-ink-faint"
                style={{
                  left: `${Math.max(0, Math.min(100, ((result.audience.median - result.audience.p25) / Math.max(1, result.audience.p75 - result.audience.p25)) * 100))}%`,
                }}
                aria-hidden
              />
              {/* Offer marker */}
              <div
                className="absolute -top-7 -translate-x-1/2 transition-[left] duration-700 ease-out"
                style={{ left: `${result.positionPct}%` }}
              >
                <span className="tabular whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">
                  {formatEur(result.offer)}
                </span>
                <span className="mx-auto mt-1 block h-4 w-0.5 bg-ink" />
              </div>
            </div>
            <div className="mt-2 flex justify-between text-[11.5px] text-ink-faint">
              <span>P25 {formatEur(result.audience.p25)}</span>
              <span>Median {formatEur(result.audience.median)}</span>
              <span>P75 {formatEur(result.audience.p75)}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Position"
              value={result.positionPct}
              format="percent"
              caption={result.positionLabel}
              tone="brand"
            />
            <MetricCard
              label="vs. median"
              value={Math.abs(result.vsMedian)}
              format="eur"
              caption={result.vsMedian >= 0 ? 'Above the tier median' : 'Below the tier median'}
              tone={result.vsMedian >= 0 ? 'money' : 'warn'}
            />
            <MetricCard
              label="Sample size"
              value={result.band.bookings}
              caption={`bookings in the ${result.band.label} band`}
            />
          </div>
        </ResultShell>
      </Reveal>

      {result.upgrade && (
        <Reveal delay={100}>
          <div className="flex flex-wrap items-center gap-3 rounded-[16px] border border-brand-300 bg-brand-50/60 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-600 text-white">
              <TrendingUp className="size-4" />
            </span>
            <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">
                +{formatEur(result.upgrade.extraPerPost)} per post
              </span>{' '}
              moves this into the {result.upgrade.band.label} band, where the observed delivery rate is{' '}
              <span className="font-semibold text-ink">
                {Math.round(result.upgrade.band.publishedRate * 100)}%
              </span>{' '}
              — {result.upgrade.gainPct} points higher.
            </p>
          </div>
        </Reveal>
      )}

      <Reveal delay={140}>
        <ResultShell eyebrow="Recommendations">
          <Recommendations items={result.recommendations} />
        </ResultShell>
      </Reveal>
    </div>
  );

  const method = (
    <div className="space-y-10">
      <MethodSection
        title="What happens to an offer, by price band."
        intro="Delivery rates are looked up per band rather than interpolated between them. The bands are discrete observations, and smoothing a curve through them would invent precision the data does not have."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="micro-label py-2.5 pr-4 font-semibold">Price per post</th>
                <th className="micro-label py-2.5 pr-4 text-right font-semibold">Bookings</th>
                <th className="micro-label py-2.5 pr-4 text-right font-semibold">Published</th>
                <th className="micro-label py-2.5 text-right font-semibold">Never answered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PRICE_BANDS.map((b) => {
                const active = result.valid && b.id === result.band.id;
                return (
                  <tr key={b.id} className={active ? 'bg-brand-50/60' : undefined}>
                    <td className="py-3 pr-4">
                      <span className="text-[13.5px] font-medium text-ink">{b.label}</span>
                      {active && (
                        <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Your offer
                        </span>
                      )}
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-muted">{b.note}</span>
                    </td>
                    <td className="tabular py-3 pr-4 text-right text-[13.5px] text-ink-soft">{b.bookings}</td>
                    <td className="tabular py-3 pr-4 text-right text-[13.5px] font-semibold text-money">
                      {(b.publishedRate * 100).toFixed(1)}%
                    </td>
                    <td className="tabular py-3 text-right text-[13.5px] text-ink-soft">
                      {(b.neverAnsweredRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MethodSection>

      <MethodSection title="What this tool does not claim.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[12px] border border-line bg-ground p-5">
            <h3 className="text-[14px] font-semibold text-ink">This is correlation, not causation</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              Paying more does not make a post appear. A brand paying well usually also has a real
              budget, a written brief, and someone internally who chases the campaign — any of which
              could be doing the work.
            </p>
          </div>
          <div className="rounded-[12px] border border-line bg-ground p-5">
            <h3 className="text-[14px] font-semibold text-ink">Thin bands are marked</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              The €400–€599 band rests on far fewer bookings than the others and is flagged as
              directional wherever it appears. Small samples move a lot.
            </p>
          </div>
          <div className="rounded-[12px] border border-line bg-ground p-5">
            <h3 className="text-[14px] font-semibold text-ink">The measurable part</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              What is directly observable is that low-priced offers go unanswered far more often. That
              is a creator-side behaviour, and it is the part worth pricing around.
            </p>
          </div>
        </div>
      </MethodSection>

      <MethodSection title="What brands actually paid, by audience size.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="micro-label py-2.5 pr-4 font-semibold">Creator audience</th>
                <th className="micro-label py-2.5 pr-4 text-right font-semibold">n</th>
                <th className="micro-label py-2.5 pr-4 text-right font-semibold">P25</th>
                <th className="micro-label py-2.5 pr-4 text-right font-semibold">Median</th>
                <th className="micro-label py-2.5 text-right font-semibold">P75</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {AUDIENCE_BANDS.map((b) => {
                const active = result.audience.id === b.id;
                return (
                  <tr key={b.id} className={active ? 'bg-brand-50/60' : undefined}>
                    <td className="py-3 pr-4 text-[13.5px] font-medium text-ink">{b.label}</td>
                    <td className="tabular py-3 pr-4 text-right text-[13px] text-ink-muted">{b.n}</td>
                    <td className="tabular py-3 pr-4 text-right text-[13.5px] text-ink-soft">{formatEur(b.p25)}</td>
                    <td className="tabular py-3 pr-4 text-right text-[13.5px] font-semibold text-ink">
                      {formatEur(b.median)}
                    </td>
                    <td className="tabular py-3 text-right text-[13.5px] text-ink-soft">{formatEur(b.p75)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MethodSection>

      <ToolCta />
    </div>
  );

  return (
    <ToolPage
      title="Sponsored Post Delivery Odds Estimator."
      intro="Enter what you plan to offer a creator per post and see how often bookings at that price actually ended in a published post, how often creators never answered at all, and what brands really paid at that audience size. Free, no account, nothing leaves your browser."
      form={form}
      result={resultPanel}
      method={method}
      faqs={[
        {
          q: 'What are the odds a sponsored post offer actually gets published?',
          a: 'It varies sharply by price band, and the relationship is correlational rather than causal. In this reference set, 64.6% of settled bookings at €600 or more ended in a published post against 30.4% of those under €200. The €200–€399 band was the weakest at 25.9%, which is a useful reminder that the relationship is not a clean straight line.',
        },
        {
          q: 'Why do cheap offers fail?',
          a: 'The data shows how, not why. What it does show is that 41.6% of offers under €200 expired without the creator responding at all, against 19.2% above €600. So the dominant failure mode at the low end is silence rather than rejection — which points at whether the offer was worth the creator’s time to even reply to.',
        },
        {
          q: 'Does paying more cause a post to be delivered?',
          a: 'Not necessarily, and this tool does not claim it does. A brand paying €600 typically also has a real budget, a properly written brief, and an internal owner who follows up — any of which could be the actual cause. The honest framing is that price is a useful risk signal, not a lever you can pull in isolation.',
        },
        {
          q: 'Should I just offer the creator’s listed rate?',
          a: 'For a first booking, usually yes. Follower tier is a weak guide — audience size explains well under half of what creators actually charge, and the spread within a single tier can be more than twenty-fold. A creator’s own published rate is a far better anchor than any tier benchmark, including this one.',
        },
      ]}
      related={[
        {
          href: '/free-tools/campaign-budget',
          title: 'Campaign Budget Planner',
          body: 'Turn a budget into published posts, not just booked ones.',
        },
        {
          href: '/free-tools/creator-worth',
          title: 'Creator Worth Calculator',
          body: 'Find out what a sponsored post from any creator should cost.',
        },
        {
          href: '/free-tools',
          title: 'All free tools',
          body: 'Every free tool for B2B creator marketing, in one place.',
        },
      ]}
    />
  );
}
