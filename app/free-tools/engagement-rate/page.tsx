'use client';

import { useMemo } from 'react';
import { Activity } from 'lucide-react';

import { calculateEngagementRate } from '@/lib/calculators/engagement-rate';
import { ENGAGEMENT_TIERS } from '@/lib/data/benchmarks';
import { formatNumber } from '@/lib/format';
import { toNumber, useToolState } from '@/lib/hooks/use-tool-state';
import { Field, Input } from '@/components/ui/field';
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
  BandMeter,
  BenchmarkBadge,
  HeadlineMetric,
  MetricCard,
  Recommendations,
} from '@/components/free-tools/metrics';

const DEFAULTS = {
  followers: '',
  reactions: '',
  comments: '',
  reposts: '',
  impressions: '',
};

export default function EngagementRatePage() {
  const { values, set, reset, calculating, isDirty } = useToolState('vouch.tool.engagement', DEFAULTS);

  const result = useMemo(
    () =>
      calculateEngagementRate({
        followers: toNumber(values.followers),
        reactions: toNumber(values.reactions),
        comments: toNumber(values.comments),
        reposts: toNumber(values.reposts),
        impressions: values.impressions.trim() === '' ? null : toNumber(values.impressions),
      }),
    [values],
  );

  const followersNum = toNumber(values.followers);
  const followerError =
    values.followers.trim() !== '' && followersNum <= 0 ? 'Enter a follower count above zero' : undefined;

  const form = (
    <ToolForm
      title="Your numbers"
      hint="Average your last ~10 posts so one viral outlier does not distort the result. Nothing is stored or sent anywhere."
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
            placeholder="5,000"
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
            placeholder="120"
            value={values.reactions}
            onChange={(e) => set('reactions', e.target.value)}
          />
        )}
      </Field>

      <Field label="Average comments per post">
        {({ id }) => (
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="18"
            value={values.comments}
            onChange={(e) => set('comments', e.target.value)}
          />
        )}
      </Field>

      <Field label="Average reposts per post">
        {({ id }) => (
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="6"
            value={values.reposts}
            onChange={(e) => set('reposts', e.target.value)}
          />
        )}
      </Field>

      <Field
        label="Average impressions per post"
        hint="Optional — from LinkedIn analytics. Left blank, we estimate it."
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Optional"
            value={values.impressions}
            onChange={(e) => set('impressions', e.target.value)}
          />
        )}
      </Field>
    </ToolForm>
  );

  const resultPanel = !result.valid ? (
    <ToolIdle
      icon={Activity}
      title="Enter your numbers to calculate"
      body="Add your follower count and per-post averages on the left. Your engagement rate appears here instantly, rated against benchmarks for your audience size."
    />
  ) : calculating ? (
    <ToolCalculating />
  ) : (
    <div className="space-y-5">
      <Reveal>
        <ResultShell eyebrow="Your engagement rate">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
            <HeadlineMetric
              label="By followers"
              value={result.byFollowers}
              format="percent"
              sub={
                <>
                  {formatNumber(result.totalEngagements)} engagements ÷{' '}
                  {formatNumber(followersNum)} followers
                </>
              }
            />
            <div className="space-y-3">
              <BenchmarkBadge
                verdict={result.verdict}
                label={result.verdictLabel}
                detail={result.tier.label}
              />
              <BandMeter
                value={result.byFollowers}
                bandMin={result.tier.goodMin}
                bandMax={result.tier.goodMax}
                label="Against your tier"
              />
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
            label="By impressions"
            value={result.byImpressions}
            format="percent"
            tone="brand"
            caption={
              result.impressionsEstimated
                ? `Estimated ${formatNumber(result.estimatedImpressions)} impressions`
                : `On ${formatNumber(result.estimatedImpressions)} impressions`
            }
          />
          <MetricCard
            label="Total engagements"
            value={result.totalEngagements}
            caption="Reactions + comments + reposts"
          />
          <MetricCard
            label="Benchmark floor"
            value={result.tier.goodMin}
            format="percent"
            caption={`Good starts here for ${result.tier.label.toLowerCase()}`}
          />
        </div>
      </Reveal>

      {result.impressionsEstimated && (
        <Reveal delay={90}>
          <p className="rounded-[12px] border border-line bg-sunken/50 p-4 text-[12.5px] leading-relaxed text-ink-muted">
            <span className="font-medium text-ink-soft">Impressions were estimated.</span> You did not
            supply them, so we modelled reach from your audience size and engagement — reach as a
            multiple of followers falls as audiences grow, and engagement lifts distribution. Add your
            real figure from LinkedIn analytics for an exact by-impressions rate.
          </p>
        </Reveal>
      )}

      <Reveal delay={120}>
        <ResultShell eyebrow="Recommendations">
          <Recommendations items={result.recommendations} />
        </ResultShell>
      </Reveal>
    </div>
  );

  const method = (
    <div className="space-y-10">
      <MethodSection
        title="Benchmarks by audience size."
        intro="“Good” is relative to audience size — rates fall as follower counts grow. A single threshold would rank every small creator first and mark every large account as failing, which is exactly the mistake this product exists to correct."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="micro-label py-2.5 pr-4 font-semibold">Follower tier</th>
                <th className="micro-label py-2.5 pr-4 font-semibold">Good rate</th>
                <th className="micro-label py-2.5 font-semibold">What it means</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ENGAGEMENT_TIERS.map((t) => {
                const active = result.valid && t.id === result.tier.id;
                return (
                  <tr key={t.id} className={active ? 'bg-brand-50/60' : undefined}>
                    <td className="py-3 pr-4 text-[13.5px] font-medium text-ink">
                      {t.label}
                      {active && (
                        <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          You
                        </span>
                      )}
                    </td>
                    <td className="tabular py-3 pr-4 text-[13.5px] text-ink-soft">
                      {t.goodMin}% – {t.goodMax}%
                    </td>
                    <td className="py-3 text-[13px] leading-relaxed text-ink-muted">{t.meaning}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MethodSection>

      <MethodSection title="How it's calculated.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-[12px] border border-line bg-ground p-5">
            <h3 className="text-[14.5px] font-semibold text-ink">Engagement rate by followers</h3>
            <code className="mt-2.5 block rounded-[8px] bg-surface px-3 py-2 text-[12.5px] text-brand-700">
              (reactions + comments + reposts) / followers × 100
            </code>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
              The comparable metric — anyone can compute it from a public profile, which is why
              sponsors quote it.
            </p>
          </div>
          <div className="rounded-[12px] border border-line bg-ground p-5">
            <h3 className="text-[14.5px] font-semibold text-ink">Engagement rate by impressions</h3>
            <code className="mt-2.5 block rounded-[8px] bg-surface px-3 py-2 text-[12.5px] text-brand-700">
              (reactions + comments + reposts) / impressions × 100
            </code>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
              The fairer metric. Follower counts include dormant accounts the algorithm never serves;
              impressions count only people who actually saw the post.
            </p>
          </div>
        </div>
      </MethodSection>

      <ToolCta />
    </div>
  );

  return (
    <ToolPage
      title="LinkedIn Engagement Rate Calculator."
      intro="Type your follower count and per-post averages, get your engagement rate instantly — by followers and by impressions — rated against B2B benchmarks for your audience size. Free, no account, nothing leaves your browser."
      form={form}
      result={resultPanel}
      method={method}
      faqs={[
        {
          q: 'What is a good engagement rate on LinkedIn?',
          a: 'It depends entirely on audience size. Under 2,000 followers, 5–8% is good; 2,000–5,000, 4–6%; 5,000–20,000, 2.5–4%; 20,000–50,000, 1.5–2.5%; above 50,000, 1–1.5%. Rates above those bands are excellent, and rates below usually signal a content or consistency problem rather than a bad audience.',
        },
        {
          q: 'Should I measure by followers or by impressions?',
          a: 'Both. By-followers is the comparable metric because anyone can compute it from a public profile. By-impressions divides the same engagements by how many people actually saw the post, so it isolates content quality from distribution luck. By-impressions is fairer; by-followers is the one sponsors can verify.',
        },
        {
          q: 'Why do smaller creators have higher engagement rates?',
          a: 'Smaller audiences are denser. A 3,000-follower creator is mostly followed by people who know their niche and interact regularly, while a 100,000-follower account accumulates passive followers who rarely see its posts. This is why B2B sponsors increasingly prefer several micro-creators over one large account for the same budget.',
        },
        {
          q: 'How is the impression estimate calculated when I leave it blank?',
          a: 'Reach as a multiple of followers falls as audiences grow — small accounts get served well beyond their network, large ones increasingly do not. The model applies that curve to your follower count, then lifts it based on your engagement, since engagement drives further distribution. Both effects are bounded so unusual inputs cannot produce absurd numbers. Supply your real figure for an exact result.',
        },
      ]}
      related={[
        {
          href: '/free-tools/creator-worth',
          title: 'Creator Worth Calculator',
          body: 'Find out what a sponsored post from any creator should cost.',
        },
        {
          href: '/free-tools/delivery-odds',
          title: 'Delivery Odds Estimator',
          body: 'See how often offers at your price actually get published.',
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
