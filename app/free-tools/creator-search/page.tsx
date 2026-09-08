'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BadgeCheck, Search, SlidersHorizontal, Sparkles, Star } from 'lucide-react';

import { cn } from '@/lib/cn';
import { calculateCreatorFit, type Objective } from '@/lib/calculators/creator-matching';
import { ALL_TOPICS } from '@/lib/data/creators';
import { formatCompact, formatEur } from '@/lib/format';
import { toNumber, useToolState } from '@/lib/hooks/use-tool-state';
import { useStore } from '@/lib/store';
import { Avatar } from '@/components/ui/avatar';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/feedback';
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

type SortKey = 'match' | 'price-asc' | 'price-desc' | 'reach';

const OBJECTIVES: { id: Objective; label: string; hint: string }[] = [
  { id: 'leads', label: 'Generate leads', hint: 'Drive demos and qualified demand' },
  { id: 'awareness', label: 'Build awareness', hint: 'Reach your market repeatedly' },
  { id: 'launch', label: 'Launch a product', hint: 'Introduce a new offer or feature' },
];

const DEFAULTS = {
  product: '',
  audience: '',
  objective: 'leads' as Objective,
  budget: '5000',
  topics: [] as string[],
};

export default function CreatorSearchPage() {
  const { values, set, reset, calculating, isDirty } = useToolState('vouch.tool.search', DEFAULTS);
  const { shortlist, toggleShortlist, user } = useStore();
  const { push } = useToast();

  const [sort, setSort] = useState<SortKey>('match');
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [limit, setLimit] = useState(8);

  const searched = values.product.trim().length > 2 || values.audience.trim().length > 2;

  const result = useMemo(
    () =>
      calculateCreatorFit({
        product: values.product,
        audience: values.audience,
        objective: values.objective,
        budget: toNumber(values.budget),
        topics: values.topics,
      }),
    [values],
  );

  const visible = useMemo(() => {
    let list = result.matches;
    if (affordableOnly) list = list.filter((m) => m.postsAffordable >= 1);

    const sorted = [...list];
    switch (sort) {
      case 'price-asc':
        sorted.sort((a, b) => a.creator.pricePerPost - b.creator.pricePerPost);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.creator.pricePerPost - a.creator.pricePerPost);
        break;
      case 'reach':
        sorted.sort((a, b) => b.creator.followers - a.creator.followers);
        break;
      default:
        break; // already sorted by score
    }
    return sorted;
  }, [result.matches, sort, affordableOnly]);

  function toggleTopic(topic: string) {
    const next = values.topics.includes(topic)
      ? values.topics.filter((t) => t !== topic)
      : [...values.topics, topic];
    set('topics', next);
  }

  function onShortlist(id: string, name: string) {
    if (!user) {
      push({ tone: 'info', title: 'Sign in to save a shortlist', body: 'Your picks are saved to your workspace.' });
      return;
    }
    const wasIn = shortlist.includes(id);
    toggleShortlist(id);
    push({ tone: 'success', title: wasIn ? `${name} removed` : `${name} shortlisted` });
  }

  const form = (
    <ToolForm
      title="Describe your campaign"
      hint="The more specific the audience, the better the ranking. Results are instant."
      onReset={() => {
        reset();
        setAffordableOnly(false);
        setSort('match');
        setLimit(8);
      }}
      canReset={isDirty}
    >
      <Field label="What do you sell?" required>
        {({ id }) => (
          <Textarea
            id={id}
            rows={2}
            placeholder="RevOps automation for B2B sales teams"
            value={values.product}
            onChange={(e) => set('product', e.target.value)}
          />
        )}
      </Field>

      <Field label="Who do you want to reach?" hint="Job titles work best" required>
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            rows={2}
            placeholder="RevOps managers and sales leaders at 50–500 person SaaS companies"
            value={values.audience}
            onChange={(e) => set('audience', e.target.value)}
          />
        )}
      </Field>

      <div>
        <span className="mb-2 block text-[13px] font-medium text-ink">What&apos;s your goal?</span>
        <div className="space-y-2">
          {OBJECTIVES.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => set('objective', o.id)}
              aria-pressed={values.objective === o.id}
              className={cn(
                'flex w-full flex-col rounded-[10px] border px-3 py-2.5 text-left transition-colors',
                values.objective === o.id
                  ? 'border-brand-500 bg-brand-50/60'
                  : 'border-line bg-surface hover:border-brand-300',
              )}
            >
              <span className="text-[13.5px] font-medium text-ink">{o.label}</span>
              <span className="text-[12px] text-ink-muted">{o.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Creator budget (€)" hint="Campaign spend only — the fees you pay for posts">
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={values.budget}
            onChange={(e) => set('budget', e.target.value)}
          />
        )}
      </Field>

      <div>
        <span className="mb-2 block text-[13px] font-medium text-ink">
          Topics <span className="font-normal text-ink-muted">· optional</span>
        </span>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {ALL_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTopic(t)}
              aria-pressed={values.topics.includes(t)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-all duration-150 active:scale-[0.97]',
                values.topics.includes(t)
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-line bg-surface text-ink-soft hover:border-brand-300 hover:text-ink',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </ToolForm>
  );

  const resultPanel = !searched ? (
    <ToolIdle
      icon={Search}
      title="Describe your campaign to see matches"
      body="Tell us what you sell and who you want to reach. Every creator is scored against that buyer profile and ranked — no waiting, no email."
    />
  ) : calculating ? (
    <ToolCalculating label="Matching" />
  ) : (
    <div className="space-y-5">
      {/* What we understood - makes the scoring legible */}
      <Reveal>
        <ResultShell eyebrow="What we matched on">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[180px] flex-1">
              <span className="micro-label text-[10px]">Buyer personas detected</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.detectedPersonas.length > 0 ? (
                  result.detectedPersonas.map((p) => (
                    <span key={p} className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-700">
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-[12.5px] text-ink-muted">
                    None recognised — scoring against all audiences. Naming job titles sharpens this.
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-[180px] flex-1">
              <span className="micro-label text-[10px]">Topics</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.derivedProfile.topics.length > 0 ? (
                  result.derivedProfile.topics.slice(0, 8).map((t) => (
                    <span key={t} className="rounded-full bg-sunken px-2.5 py-1 text-[12px] text-ink-soft">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-[12.5px] text-ink-muted">None yet — pick a few on the left.</span>
                )}
              </div>
            </div>
          </div>
        </ResultShell>
      </Reveal>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">
          <span className="tabular font-semibold text-ink">{visible.length}</span> creators ranked ·{' '}
          <span className="tabular">{result.affordableCount}</span> within budget
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAffordableOnly((v) => !v)}
            aria-pressed={affordableOnly}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
              affordableOnly
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-line bg-surface text-ink-soft hover:text-ink',
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            Within budget
          </button>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort creators"
            className="h-8 w-auto text-[12.5px]"
          >
            <option value="match">Best match</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="reach">Largest audience</option>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
          <h3 className="text-[15px] font-semibold text-ink">Nothing fits that budget</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">
            The cheapest creator here is €84 per post. Raise the budget or turn off the within-budget
            filter to see the full ranking.
          </p>
          <button
            onClick={() => setAffordableOnly(false)}
            className="mt-4 text-[13px] font-medium text-brand-600 hover:underline"
          >
            Show all creators
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {visible.slice(0, limit).map((m, i) => (
              <Reveal as="li" key={m.creator.id} delay={Math.min(i, 6) * 40}>
                <article className="group rounded-[16px] border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift sm:p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <Avatar seed={m.creator.avatarSeed} name={m.creator.name} size="lg" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/creators/${m.creator.slug}`}
                          className="text-[15px] font-semibold tracking-[-0.01em] text-ink hover:underline"
                        >
                          {m.creator.name}
                        </Link>
                        {m.creator.verified && (
                          <BadgeCheck className="size-4 shrink-0 text-brand-600" aria-label="Verified" />
                        )}
                        <span className="rounded-full bg-sunken px-2 py-0.5 text-[11.5px] text-ink-soft">
                          {m.creator.category}
                        </span>
                        <span className="text-[12px] text-ink-muted">
                          {m.creator.countryFlag} {m.creator.country}
                        </span>
                      </div>

                      <p className="mt-1 text-[13px] text-ink-muted">{m.creator.headline}</p>

                      <p className="mt-2.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-soft">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden />
                        {m.reason}
                      </p>

                      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]">
                        <Stat label="Followers" value={formatCompact(m.creator.followers)} />
                        <Stat label="Engagement" value={`${m.creator.engagement.toFixed(1)}%`} />
                        <Stat label="Median views" value={formatCompact(m.creator.medianViews)} />
                        <Stat
                          label="Per post"
                          value={formatEur(m.creator.pricePerPost)}
                          accent
                        />
                      </dl>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="tabular text-[20px] font-bold leading-none text-ink">{m.score}</p>
                        <p className="micro-label mt-1 text-[10px]">Fit score</p>
                      </div>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-sunken">
                        <div
                          className="h-full rounded-full bg-brand-600 transition-[width] duration-700"
                          style={{ width: `${m.score}%` }}
                        />
                      </div>
                      <button
                        onClick={() => onShortlist(m.creator.id, m.creator.name)}
                        aria-pressed={shortlist.includes(m.creator.id)}
                        aria-label={
                          shortlist.includes(m.creator.id)
                            ? `Remove ${m.creator.name} from shortlist`
                            : `Add ${m.creator.name} to shortlist`
                        }
                        className="rounded-[8px] border border-line p-1.5 transition-colors hover:bg-sunken"
                      >
                        <Star
                          className={cn(
                            'size-3.5 transition-colors',
                            shortlist.includes(m.creator.id)
                              ? 'fill-brand-600 text-brand-600'
                              : 'text-ink-faint',
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>

          {limit < visible.length && (
            <button
              onClick={() => setLimit((l) => l + 8)}
              className="w-full rounded-[12px] border border-line bg-surface py-3 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
            >
              Show {Math.min(8, visible.length - limit)} more
            </button>
          )}
        </>
      )}
    </div>
  );

  const method = (
    <div className="space-y-10">
      <MethodSection
        title="How the ranking works."
        intro="Five factors, weighted by your objective. Nothing is random — the same brief always returns the same ranking."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              t: 'Audience match',
              b: 'How much of a creator’s audience is made up of the roles you sell to. Weighted highest, because a wrong audience produces nothing at any price.',
            },
            {
              t: 'Topic relevance',
              b: 'Overlap between what the creator writes about and your product’s topics, parsed from your description plus anything you pick explicitly.',
            },
            {
              t: 'Budget compatibility',
              b: 'Whether your budget buys a campaign rather than a single post. A creator who consumes the whole budget in one post scores lower even with perfect fit.',
            },
            {
              t: 'Engagement quality',
              b: 'Engagement normalised against what is realistic at that audience size, so this does not collapse into “smallest creator wins”.',
            },
            {
              t: 'Objective weighting',
              b: 'Lead generation weights fit highest; awareness shifts weight toward budget efficiency; a launch weights engagement quality up.',
            },
            {
              t: 'Availability',
              b: 'Creators marked booked out are excluded rather than ranked low — showing someone you cannot book is a worse result than showing fewer.',
            },
          ].map((f) => (
            <div key={f.t} className="rounded-[12px] border border-line bg-ground p-5">
              <h3 className="text-[14px] font-semibold text-ink">{f.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{f.b}</p>
            </div>
          ))}
        </div>
      </MethodSection>

      <MethodSection title="Where this differs from the original.">
        <div className="rounded-[12px] border border-line bg-ground p-5">
          <p className="text-[13.5px] leading-relaxed text-ink-soft">
            Naano&apos;s version of this tool is a form: you describe the campaign and a person on
            their team builds the shortlist by hand, searching both their marketplace and the wider
            LinkedIn ecosystem, then emails it within 48 hours. That human research is the product,
            and it is not something to reproduce.
          </p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
            So this runs instantly against{' '}
            <Link href="/marketplace" className="font-medium text-brand-600 hover:underline">
              our own demo marketplace
            </Link>{' '}
            instead — {result.totalConsidered} creators, scored with the same engine that powers the
            marketplace ranking, so the two can never disagree about fit. It is a demonstration of the
            matching, not a live view of LinkedIn.
          </p>
        </div>
      </MethodSection>

      <ToolCta />
    </div>
  );

  return (
    <ToolPage
      title="Creator Search."
      intro="Describe what you sell and who you want to reach, and get a ranked shortlist of creators whose audience actually contains your buyers — with pricing, fit score, and the reason each one is on the list. Instant, free, no account."
      form={form}
      result={resultPanel}
      method={method}
      faqs={[
        {
          q: 'Is this searching real LinkedIn data?',
          a: 'No, and it says so on the page. It searches a local demo marketplace of two dozen fictional creators built for this project. The engineering being demonstrated is the matching — how a free-text brief becomes a buyer profile, and how creators are scored and ranked against it — not access to LinkedIn.',
        },
        {
          q: 'How do you turn my description into a search?',
          a: 'Your text is matched against a closed vocabulary of known topics and buyer personas, with a few aliases so “we sell to developers” resolves to Engineers. It is deliberately simple substring matching rather than anything fuzzy: it is deterministic, explainable, and when it misses you can still pick topics by hand. The panel above the results shows exactly what was understood.',
        },
        {
          q: 'Why does a cheaper creator sometimes rank above a better-fitting one?',
          a: 'Budget compatibility is part of the score. A creator who would consume your entire budget in a single post scores lower than one your budget can book several times, because one post is not a campaign. Switch the sort to Best match and raise the budget to see fit dominate again.',
        },
        {
          q: 'Does the same brief always give the same results?',
          a: 'Yes. Every part of the scoring is deterministic — no randomness anywhere in the pipeline. The same description, objective and budget will always produce the same ranking in the same order.',
        },
      ]}
      related={[
        {
          href: '/free-tools/creator-worth',
          title: 'Creator Worth Calculator',
          body: 'Find out what a sponsored post from any creator should cost.',
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={cn('tabular font-semibold', accent ? 'text-money' : 'text-ink')}>{value}</dd>
    </div>
  );
}
