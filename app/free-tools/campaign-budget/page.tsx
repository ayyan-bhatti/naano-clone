'use client';

import { useMemo } from 'react';
import { ArrowRight, Calculator } from 'lucide-react';

import { cn } from '@/lib/cn';
import { calculateCampaignBudget, type AllocationResult } from '@/lib/calculators/campaign-budget';
import { formatEur, formatNumber } from '@/lib/format';
import { toNumber, useToolState } from '@/lib/hooks/use-tool-state';
import { Field, Input } from '@/components/ui/field';
import { Counter } from '@/components/ui/counter';
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
import { MetricCard, Recommendations } from '@/components/free-tools/metrics';

const DEFAULTS = { budget: '', customPrice: '' };
const PRESETS = [1000, 2500, 5000, 10000, 25000];

export default function CampaignBudgetPage() {
  const { values, set, reset, calculating, isDirty } = useToolState('vouch.tool.budget', DEFAULTS);

  const result = useMemo(
    () =>
      calculateCampaignBudget({
        budget: toNumber(values.budget),
        customPrice: values.customPrice.trim() === '' ? null : toNumber(values.customPrice),
      }),
    [values],
  );

  const budgetNum = toNumber(values.budget);
  const budgetError =
    values.budget.trim() !== '' && budgetNum <= 0 ? 'Enter a budget above zero' : undefined;

  const form = (
    <ToolForm
      title="Your campaign"
      hint="Budget means creator spend only — the fees you pay for posts."
      onReset={reset}
      canReset={isDirty}
    >
      <Field label="Campaign budget (€)" error={budgetError} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="5,000"
            value={values.budget}
            onChange={(e) => set('budget', e.target.value)}
          />
        )}
      </Field>

      <div>
        <span className="micro-label">Quick amounts</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set('budget', String(p))}
              aria-pressed={budgetNum === p}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150 active:scale-[0.97]',
                budgetNum === p
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-line bg-surface text-ink-soft hover:border-brand-300 hover:text-ink',
              )}
            >
              {formatEur(p, { compact: true })}
            </button>
          ))}
        </div>
      </div>

      <Field
        label="Your own price per post (€)"
        hint="Optional — compares your price against the three standard allocations"
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Optional"
            value={values.customPrice}
            onChange={(e) => set('customPrice', e.target.value)}
          />
        )}
      </Field>
    </ToolForm>
  );

  const focus = result.custom ?? result.best;

  const resultPanel = !result.valid ? (
    <ToolIdle
      icon={Calculator}
      title="Enter a budget to plan the campaign"
      body="You will see how many posts the budget books at real transacted medians — and, more usefully, how many of those historically ended in a published post."
    />
  ) : calculating ? (
    <ToolCalculating label="Planning" />
  ) : (
    <div className="space-y-5">
      {/* The chain - the whole point of the tool */}
      {focus && focus.postsBooked > 0 && (
        <Reveal>
          <ResultShell eyebrow={`The chain — ${focus.label.toLowerCase()} at ${formatEur(focus.pricePerPost)} per post`}>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
              <ChainStep
                label="Budget"
                value={result.budget}
                format="eur"
                caption="Creator spend"
              />
              <ChainArrow caption={`÷ ${formatEur(focus.pricePerPost)}`} />
              <ChainStep
                label="Posts booked"
                value={focus.postsBooked}
                caption={`${formatEur(focus.committed)} committed`}
              />
              <ChainArrow caption={`× ${focus.deliveryPct}%`} />
              <ChainStep
                label="Posts published"
                value={focus.postsPublished}
                caption="Historical delivery rate"
                tone="money"
              />
            </div>

            {/* Booked vs published, to scale */}
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-ink-muted">Booked</span>
                <span className="tabular font-semibold text-ink">{focus.postsBooked} posts</span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-sunken">
                <div className="h-full w-full rounded-full bg-brand-200" />
              </div>

              <div className="mt-4 flex items-center justify-between text-[12.5px]">
                <span className="text-ink-muted">Expected to publish</span>
                <span className="tabular font-semibold text-money">{focus.postsPublished} posts</span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full bg-money transition-[width] duration-700 ease-out"
                  style={{ width: `${focus.deliveryPct}%` }}
                />
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
                The gap between those two bars is the entire reason this tool exists. Planning on
                booked posts has been systematically optimistic, especially at the cheap end.
              </p>
            </div>

            <div className="mt-5 rounded-[12px] bg-sunken/60 p-4">
              <span className="micro-label text-[10px]">True cost per published post</span>
              <p className="tabular mt-1.5 text-[30px] font-semibold tracking-[-0.042em] text-ink">
                <Counter value={focus.costPerPublished} format="eur" />
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                {formatEur(focus.committed)} committed ÷ {focus.postsPublished} expected published posts
                {focus.leftover > 0 && ` · ${formatEur(focus.leftover)} left unallocated`}
              </p>
            </div>
          </ResultShell>
        </Reveal>
      )}

      <Reveal delay={60}>
        <ResultShell eyebrow="Compare the three allocations">
          <div className="grid gap-4 sm:grid-cols-3">
            {result.allocations.map((a) => (
              <AllocationCard key={a.id} allocation={a} />
            ))}
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
            {result.summary}
          </p>
        </ResultShell>
      </Reveal>

      {result.custom && (
        <Reveal delay={100}>
          <ResultShell eyebrow="Your own price">
            <div className="grid gap-4 sm:grid-cols-4">
              <MetricCard label="Price per post" value={result.custom.pricePerPost} format="eur" />
              <MetricCard label="Posts booked" value={result.custom.postsBooked} />
              <MetricCard
                label="Expected published"
                value={result.custom.postsPublished}
                tone="money"
                caption={`${result.custom.deliveryPct}% delivery`}
              />
              <MetricCard
                label="Per published post"
                value={result.custom.costPerPublished}
                format="eur"
                tone="brand"
              />
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
              €{result.custom.pricePerPost} falls into the {result.custom.band.label} band, so it uses
              that band&apos;s {result.custom.deliveryPct}% delivery rate — the same rate a preset at
              this price would use.
            </p>
          </ResultShell>
        </Reveal>
      )}

      <Reveal delay={140}>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Median days to publish"
            value={result.timing.median}
            caption="From booking to live"
          />
          <MetricCard
            label="Plan for"
            value={result.timing.p90}
            caption="90th percentile, in days"
            tone="warn"
          />
          <MetricCard
            label="Median acceptance"
            value={result.timing.acceptanceMinutes}
            caption="Minutes to accept the offer"
          />
        </div>
      </Reveal>

      <Reveal delay={180}>
        <ResultShell eyebrow="Recommendations">
          <Recommendations items={result.recommendations} />
        </ResultShell>
      </Reveal>
    </div>
  );

  const method = (
    <div className="space-y-10">
      <MethodSection
        title="The three allocations."
        intro="Each allocation uses the transacted median for a real follower tier, then applies the historical delivery rate for the price band that median falls into. The band is always derived from the price, so a preset and a custom price of the same value agree — a detail that matters, because getting it wrong makes the tool contradict itself."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="micro-label py-2.5 pr-4 font-semibold">Allocation</th>
                <th className="micro-label py-2.5 pr-4 text-right font-semibold">Median price</th>
                <th className="micro-label py-2.5 pr-4 font-semibold">Band</th>
                <th className="micro-label py-2.5 text-right font-semibold">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.allocations.length > 0
                ? result.allocations.map((a) => (
                    <tr key={a.id} className={a.best ? 'bg-brand-50/60' : undefined}>
                      <td className="py-3 pr-4">
                        <span className="text-[13.5px] font-medium text-ink">{a.label}</span>
                        {a.best && (
                          <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Cheapest per published post
                          </span>
                        )}
                        <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-muted">{a.blurb}</span>
                      </td>
                      <td className="tabular py-3 pr-4 text-right text-[13.5px] text-ink-soft">
                        {formatEur(a.pricePerPost)}
                      </td>
                      <td className="py-3 pr-4 text-[13px] text-ink-soft">{a.band.label}</td>
                      <td className="tabular py-3 text-right text-[13.5px] font-semibold text-money">
                        {a.deliveryPct}%
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </MethodSection>

      <MethodSection title="What this planner does not claim.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[12px] border border-line bg-ground p-5">
            <h3 className="text-[14px] font-semibold text-ink">An average, not a forecast</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              A 30.4% delivery rate on ten bookings gives an expectation of about three published
              posts. The outcome for any single campaign varies widely, especially at small booking
              counts. Treat it as a planning correction.
            </p>
          </div>
          <div className="rounded-[12px] border border-line bg-ground p-5">
            <h3 className="text-[14px] font-semibold text-ink">Correlation, not causation</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              The planner applies observed historical rates to a budget. It does not model what would
              happen if you changed a price — paying more does not itself make a post appear.
            </p>
          </div>
          <div className="rounded-[12px] border border-line bg-ground p-5">
            <h3 className="text-[14px] font-semibold text-ink">Deliberately absent</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              No impressions, reach or cost-per-lead figure appears here. Those require tracking
              coverage this reference set does not have, and estimating them would be guesswork
              dressed as data.
            </p>
          </div>
        </div>
      </MethodSection>

      <ToolCta />
    </div>
  );

  return (
    <ToolPage
      title="Creator Campaign Budget Planner."
      intro="Enter a budget and see how many sponsored LinkedIn posts it books at real transacted medians — and, more usefully, how many of those historically ended in a published post. Free, no account, nothing leaves your browser."
      form={form}
      result={resultPanel}
      method={method}
      faqs={[
        {
          q: 'How many sponsored posts can I get for my budget?',
          a: 'Divide the budget by the transacted median for the audience size you are buying, then multiply by the historical delivery rate for that price band. A €5,000 budget books 59 posts at the €84 median for creators under 5,000 followers — but historically produced around 18 published ones. That correction is the number worth planning against.',
        },
        {
          q: 'Why plan on published posts instead of booked ones?',
          a: 'Because the two differ by a factor of three to five. Only 30.4% of bookings under €200 ended in a published post against 64.6% above €600, and 41.6% of sub-€200 offers expired without the creator ever answering. A forecast built on posts booked has been systematically optimistic at the low end.',
        },
        {
          q: 'Is it cheaper to book many small creators or a few large ones?',
          a: 'On these rates, many small creators — by a wide margin. The cheapest band costs roughly €280 per published post against four figures for the upper allocations: its weak delivery rate is more than offset by how many more posts the same budget buys. The two upper allocations land close enough that which wins depends on the exact budget, so the tool computes it rather than asserting it.',
        },
        {
          q: 'How long should I allow between booking and the post going live?',
          a: 'Plan on 14 days rather than 8. The median from booking to published post is around 8 days, but the 90th percentile is roughly 14 — and almost all of the elapsed time sits after acceptance, in drafting and approval, not in waiting for a reply. Creators typically accept within the hour.',
        },
      ]}
      related={[
        {
          href: '/free-tools/delivery-odds',
          title: 'Delivery Odds Estimator',
          body: 'See how often offers at your price actually get published.',
        },
        {
          href: '/free-tools/creator-search',
          title: 'Creator Search',
          body: 'Get a ranked shortlist of creators matched to your buyers.',
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

function ChainStep({
  label,
  value,
  format = 'number',
  caption,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  format?: 'number' | 'eur';
  caption: string;
  tone?: 'neutral' | 'money';
}) {
  return (
    <div className="rounded-[12px] border border-line bg-ground p-4 text-center sm:text-left">
      <span className="micro-label text-[10px]">{label}</span>
      <p
        className={cn(
          'tabular mt-1.5 text-[24px] font-semibold tracking-[-0.032em]',
          tone === 'money' ? 'text-money' : 'text-ink',
        )}
      >
        <Counter value={value} format={format} />
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{caption}</p>
    </div>
  );
}

function ChainArrow({ caption }: { caption: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-1 sm:py-0">
      <ArrowRight className="size-4 rotate-90 text-ink-faint sm:rotate-0" aria-hidden />
      <span className="tabular whitespace-nowrap text-[11px] font-medium text-ink-faint">{caption}</span>
    </div>
  );
}

function AllocationCard({ allocation }: { allocation: AllocationResult }) {
  return (
    <div
      className={cn(
        'rounded-[12px] border p-4',
        allocation.best ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500/20' : 'border-line bg-ground',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13.5px] font-semibold text-ink">{allocation.label}</span>
        {allocation.best && (
          <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            Best
          </span>
        )}
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{allocation.blurb}</p>

      <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12.5px]">
        <Row label="Price" value={formatEur(allocation.pricePerPost)} />
        <Row label="Booked" value={`${formatNumber(allocation.postsBooked)}`} />
        <Row label="Published" value={`${allocation.postsPublished}`} accent />
        <Row
          label="Per published"
          value={allocation.costPerPublished > 0 ? formatEur(allocation.costPerPublished) : '—'}
          accent
        />
      </dl>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={cn('tabular font-semibold', accent ? 'text-money' : 'text-ink')}>{value}</dd>
    </div>
  );
}
