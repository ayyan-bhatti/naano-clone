'use client';

import { useMemo } from 'react';
import { Euro } from 'lucide-react';

import { calculateCreatorWorth } from '@/lib/calculators/creator-worth';
import { NICHES } from '@/lib/data/benchmarks';
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
import {
  BenchmarkBadge,
  HeadlineMetric,
  MetricCard,
  Recommendations,
  StepBreakdown,
} from '@/components/free-tools/metrics';

const DEFAULTS = {
  followers: '',
  reactions: '',
  comments: '',
  postsPerWeek: '3',
  nicheId: 'saas',
};

const RATING_BANDS = [
  { label: 'Excellent', range: '4% and above' },
  { label: 'Good', range: '2 – 4%' },
  { label: 'Average', range: '1 – 2%' },
  { label: 'Low', range: 'Below 1%' },
];

export default function CreatorWorthPage() {
  const { values, set, reset, calculating, isDirty } = useToolState('vouch.tool.worth', DEFAULTS);

  const result = useMemo(
    () =>
      calculateCreatorWorth({
        followers: toNumber(values.followers),
        reactions: toNumber(values.reactions),
        comments: toNumber(values.comments),
        postsPerWeek: toNumber(values.postsPerWeek),
        nicheId: values.nicheId,
      }),
    [values],
  );

  const followersNum = toNumber(values.followers);
  const followerError =
    values.followers.trim() !== '' && followersNum <= 0 ? 'Enter a follower count above zero' : undefined;

  const form = (
    <ToolForm
      title="The creator's profile"
      hint="Type the numbers as they appear on LinkedIn. Works for pricing yourself or budgeting for someone else."
      onReset={reset}
      canReset={isDirty}
    >
      <Field label="Follower count" error={followerError} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="10,000"
            value={values.followers}
            onChange={(e) => set('followers', e.target.value)}
          />
        )}
      </Field>

      <Field label="Average reactions per post" hint="Likes and all other reactions">
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="300"
            value={values.reactions}
            onChange={(e) => set('reactions', e.target.value)}
          />
        )}
      </Field>

      <Field label="Average comments per post" hint="Comments count double — they signal a real audience">
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="50"
            value={values.comments}
            onChange={(e) => set('comments', e.target.value)}
          />
        )}
      </Field>

      <Field label="Posts per week">
        {({ id }) => (
          <Select id={id} value={values.postsPerWeek} onChange={(e) => set('postsPerWeek', e.target.value)}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={String(n)}>
                {n} post{n === 1 ? '' : 's'} per week
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Niche" hint="B2B buying audiences carry a premium">
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={values.nicheId}
            onChange={(e) => set('nicheId', e.target.value)}
          >
            {NICHES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </ToolForm>
  );

  const resultPanel = !result.valid ? (
    <ToolIdle
      icon={Euro}
      title="Enter a follower count to see an estimate"
      body="Add the profile's numbers on the left. A per-post fee range in euros appears here instantly, with the engagement rating and the full arithmetic behind it."
    />
  ) : calculating ? (
    <ToolCalculating label="Pricing" />
  ) : (
    <div className="space-y-5">
      <Reveal>
        <ResultShell eyebrow="Estimated value per sponsored post">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
            <HeadlineMetric
              label="Per post"
              value={result.estimate}
              format="eur"
              sub={
                <>
                  Range {formatEur(result.low)} – {formatEur(result.high)}
                </>
              }
            />
            <div className="space-y-3">
              <BenchmarkBadge
                verdict={result.rating}
                label={`${result.ratingLabel} engagement`}
                detail={`${result.engagementRate.toFixed(2)}%`}
              />
              <div className="rounded-[12px] border border-line bg-ground p-4">
                <span className="micro-label text-[10px]">Monthly potential</span>
                <p className="tabular mt-1.5 text-[18px] font-bold text-money">
                  {formatEur(result.monthlyLow)} – {formatEur(result.monthlyHigh)}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                  At 2–4 sponsored posts a month — the ceiling before sponsored content crowds out
                  the organic voice.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 border-t border-line pt-5 text-[13.5px] leading-relaxed text-ink-soft">
            {result.summary}
          </p>
        </ResultShell>
      </Reveal>

      <Reveal delay={60}>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Engagement rate"
            value={result.engagementRate}
            format="percent"
            caption="Comments weighted ×2"
            tone="brand"
          />
          <MetricCard
            label="Base value"
            value={Math.round(result.baseValue)}
            format="eur"
            caption="€12 per 1,000 followers"
          />
          <MetricCard
            label="Niche multiplier"
            value={result.niche.multiplier}
            format="number"
            caption={result.niche.label}
          />
        </div>
      </Reveal>

      <Reveal delay={100}>
        <ResultShell eyebrow="How this number was reached">
          <StepBreakdown steps={result.steps} />
        </ResultShell>
      </Reveal>

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
        title="No black box."
        intro="The whole formula, in order. It is calibrated on flat fees in the range B2B creators actually charge — roughly €100 to €1,500 per sponsored post."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              n: '1',
              title: 'Engagement rate',
              body: '(reactions + 2 × comments) ÷ followers. Comments are weighted double because they signal an audience that actually reads and responds — the thing sponsors pay for.',
            },
            {
              n: '2',
              title: 'Base value',
              body: '€12 per 1,000 followers, with a floor of €100. This anchors the estimate to audience size before any quality adjustment.',
            },
            {
              n: '3',
              title: 'Engagement adjustment',
              body: 'Base × (0.6 + rate ÷ 2.5), capped at ×2. A creator at the 4% excellent threshold roughly doubles their base; a low-engagement profile is discounted below it.',
            },
            {
              n: '4',
              title: 'Niche multiplier',
              body: 'B2B SaaS ×1.2, Finance ×1.15, Sales/Marketing ×1.1, HR ×1.0, Other ×0.9 — reflecting what sponsors pay to reach each audience.',
            },
            {
              n: '5',
              title: 'Range',
              body: 'Shown as ±20%, rounded to the nearest €10 and never below the €100 floor.',
            },
            {
              n: '6',
              title: 'Monthly potential',
              body: 'Assumes 2 to 4 sponsored posts a month — more than that and sponsored content starts drowning out the voice that made the audience valuable.',
            },
          ].map((s) => (
            <div key={s.n} className="rounded-[12px] border border-line bg-ground p-5">
              <span className="tabular text-[12px] font-bold text-brand-600">{s.n}</span>
              <h3 className="mt-1.5 text-[14.5px] font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </MethodSection>

      <MethodSection title="Engagement bands.">
        <div className="grid gap-3 sm:grid-cols-4">
          {RATING_BANDS.map((b) => {
            const active = result.valid && result.ratingLabel === b.label;
            return (
              <div
                key={b.label}
                className={`rounded-[12px] border p-4 ${active ? 'border-brand-500 bg-brand-50/60' : 'border-line bg-ground'}`}
              >
                <p className="text-[13.5px] font-semibold text-ink">{b.label}</p>
                <p className="tabular mt-1 text-[13px] text-ink-muted">{b.range}</p>
                {active && (
                  <span className="mt-2 inline-block rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    You
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </MethodSection>

      <ToolCta />
    </div>
  );

  return (
    <ToolPage
      title="Creator Worth Calculator."
      intro="Find out what a sponsored LinkedIn post is worth, as a flat fee in euros. Type the follower count and engagement, get an instant range plus the full arithmetic behind it. Free, no account, nothing leaves your browser."
      form={form}
      result={resultPanel}
      method={method}
      faqs={[
        {
          q: 'How accurate is this calculator?',
          a: 'It is an estimate, not a quote. The model is calibrated on the flat-fee range B2B creators actually charge, but it cannot see the qualitative factors that move real rates — audience seniority, content quality, niche authority, or how badly a particular sponsor wants that specific audience. Treat the range as a defensible starting point, not a guarantee.',
        },
        {
          q: 'What makes a creator worth more?',
          a: 'Engagement quality beats follower count, and it is not close. A creator with 8,000 followers at 5% engagement is typically worth more per post than one with 50,000 at 0.5%, because sponsors are buying attention from a relevant audience rather than a number. Rates also rise with niche, comment depth, posting consistency and audience seniority.',
        },
        {
          q: 'Why are comments weighted double?',
          a: 'A reaction takes a second and is often reflexive. A comment means someone read the post, formed a view and typed it out — and it pulls the post into that person’s own network, which is how LinkedIn distributes. Comment volume is the single best public proxy for an audience that actually pays attention.',
        },
        {
          q: 'Can companies use this to budget a campaign?',
          a: 'Yes — that is half its purpose. Enter the public numbers of a creator you are considering and the range tells you what a fair flat fee looks like before you reach out. For a full campaign, the budget planner turns a total budget into an expected number of published posts.',
        },
      ]}
      related={[
        {
          href: '/free-tools/engagement-rate',
          title: 'Engagement Rate Calculator',
          body: 'Calculate your rate and compare it to benchmarks for your size.',
        },
        {
          href: '/free-tools/campaign-budget',
          title: 'Campaign Budget Planner',
          body: 'Turn a budget into published posts, not just booked ones.',
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
