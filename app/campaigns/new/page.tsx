'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Link2, Search, Sparkles, Star } from 'lucide-react';

import { cn } from '@/lib/cn';
import { generateBrief, OBJECTIVE_OPTIONS } from '@/lib/brief';
import { CREATORS, getCreator } from '@/lib/data/creators';
import { addDays, formatDate, formatEur } from '@/lib/format';
import { matchScoreOnly } from '@/lib/match';
import { DEMO_USER, useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/feedback';
import type { Objective } from '@/lib/types';

/**
 * Campaign creation.
 *
 * Four steps rather than one long form, because the inputs fall into genuinely
 * different modes: typing, writing, choosing, reviewing. Each step validates on
 * advance, so you cannot reach the review screen with a broken campaign.
 *
 * The brief on step 4 is generated locally from everything you entered plus the
 * creators you picked - change the shortlist and the brief changes with it.
 */

const STEPS = ['Basics', 'Audience', 'Creators', 'Review'];

export default function NewCampaignPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<AppShell title="New campaign"><div className="h-64" /></AppShell>}>
        <NewCampaignInner />
      </Suspense>
    </RequireAuth>
  );
}

interface Errors {
  name?: string;
  budget?: string;
  dates?: string;
  audience?: string;
  keyMessage?: string;
  landingUrl?: string;
  creators?: string;
}

function NewCampaignInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, shortlist, createCampaign } = useStore();
  const { push } = useToast();

  const today = new Date().toISOString();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState<Objective>('pipeline');
  const [budget, setBudget] = useState('1500');
  const [startDate, setStartDate] = useState(addDays(today, 3).slice(0, 10));
  const [endDate, setEndDate] = useState(addDays(today, 31).slice(0, 10));
  const [audience, setAudience] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creatorQuery, setCreatorQuery] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // Preselect from the marketplace (?creators=a,b,c), falling back to shortlist.
  useEffect(() => {
    const param = searchParams.get('creators');
    if (param) {
      setSelected(param.split(',').filter((id) => getCreator(id)));
    } else if (shortlist.length) {
      setSelected(shortlist);
    }
    // Only on mount - later edits are the user's, not the URL's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = user?.buyerProfile.personas.length ? user.buyerProfile : DEMO_USER.buyerProfile;

  const rankedCreators = useMemo(() => {
    const q = creatorQuery.trim().toLowerCase();
    return CREATORS.map((c) => ({ creator: c, score: matchScoreOnly(c, profile) }))
      .filter(({ creator: c }) =>
        q ? `${c.name} ${c.category} ${c.topics.join(' ')}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => {
        // Shortlisted first, then by match.
        const aShort = shortlist.includes(a.creator.id) ? 1 : 0;
        const bShort = shortlist.includes(b.creator.id) ? 1 : 0;
        return bShort - aShort || b.score - a.score;
      });
  }, [creatorQuery, profile, shortlist]);

  const selectedCreators = selected.map((id) => getCreator(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const totalCost = selectedCreators.reduce((sum, c) => sum + c.pricePerPost, 0);
  const budgetNumber = Number(budget) || 0;
  const overBudget = totalCost > budgetNumber;

  const previewBrief = useMemo(
    () =>
      generateBrief({
        campaignName: name || 'Untitled campaign',
        company: user?.company ?? 'Your company',
        objective,
        audience,
        keyMessage,
        landingUrl,
        creators: selectedCreators,
      }),
    // selectedCreators is derived; depend on the ids instead to avoid a new
    // array identity re-running this every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, user?.company, objective, audience, keyMessage, landingUrl, selected.join(',')],
  );

  function validateStep(target: number): boolean {
    const next: Errors = {};

    if (target > 0) {
      if (!name.trim()) next.name = 'Give the campaign a name you will recognise later';
      if (!budgetNumber || budgetNumber < 50) next.budget = 'Enter a budget of at least €50';
      if (new Date(endDate) <= new Date(startDate)) next.dates = 'The end date must be after the start date';
    }
    if (target > 1) {
      if (audience.trim().length < 10) next.audience = 'Describe who you are targeting — a few words is enough';
      if (keyMessage.trim().length < 10) next.keyMessage = 'What is the one thing every post should land?';
      if (!landingUrl.trim()) next.landingUrl = 'Add the URL the tracked link should point to';
      else if (!/^https?:\/\/.+\..+/.test(landingUrl.trim()))
        next.landingUrl = 'Include the full URL, starting with https://';
    }
    if (target > 2) {
      if (selected.length === 0) next.creators = 'Pick at least one creator';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step + 1)) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function submit() {
    if (!validateStep(3)) return;
    setSubmitting(true);
    const campaign = createCampaign({
      name: name.trim(),
      objective,
      budget: budgetNumber,
      audience: audience.trim(),
      keyMessage: keyMessage.trim(),
      landingUrl: landingUrl.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      creatorIds: selected,
    });
    push({
      tone: 'success',
      title: 'Campaign created',
      body: `${selected.length} creator${selected.length === 1 ? '' : 's'} invited. It is in draft until you launch it.`,
    });
    router.push(`/campaigns/${campaign.id}`);
  }

  return (
    <AppShell title="New campaign" subtitle={STEPS[step]}>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/campaigns"
          className="inline-flex min-h-[24px] items-center gap-1.5 py-0.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Back to campaigns
        </Link>

        {/* Stepper */}
        <ol className="mt-5 flex gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1">
              <div
                className={cn(
                  'h-1 rounded-full transition-colors duration-300',
                  i < step ? 'bg-brand-600' : i === step ? 'bg-brand-500' : 'bg-line',
                )}
              />
              <p className={cn('mt-2 text-[11.5px] font-medium', i <= step ? 'text-ink' : 'text-ink-faint')}>
                {i + 1}. {label}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
          {/* ---------------- Step 1 ---------------- */}
          {step === 0 && (
            <div className="space-y-5">
              <Field label="Campaign name" error={errors.name} required>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="RevOps Autumn Push"
                  />
                )}
              </Field>

              <Field label="Objective" hint="Shapes the generated brief and its call to action">
                {({ id }) => (
                  <Select id={id} value={objective} onChange={(e) => setObjective(e.target.value as Objective)}>
                    {OBJECTIVE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Budget (EUR)" error={errors.budget} hint="Creator fees are fixed per post" required>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="number"
                    min={50}
                    step={50}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date">
                  {({ id }) => (
                    <Input id={id} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  )}
                </Field>
                <Field label="End date" error={errors.dates}>
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      type="date"
                      aria-describedby={describedBy}
                      invalid={invalid}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  )}
                </Field>
              </div>
            </div>
          )}

          {/* ---------------- Step 2 ---------------- */}
          {step === 1 && (
            <div className="space-y-5">
              <Field
                label="Target audience"
                error={errors.audience}
                hint="Who should be reading these posts? Roles, company size, market."
                required
              >
                {({ id, describedBy, invalid }) => (
                  <Textarea
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="RevOps leads and sales operations managers at 50-500 person B2B SaaS companies"
                  />
                )}
              </Field>

              <Field
                label="Key message"
                error={errors.keyMessage}
                hint="The one thing every post should land, in your own words"
                required
              >
                {({ id, describedBy, invalid }) => (
                  <Textarea
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={keyMessage}
                    onChange={(e) => setKeyMessage(e.target.value)}
                    placeholder="Your pipeline reporting is wrong because six tools disagree. We make them agree without a migration."
                  />
                )}
              </Field>

              <Field
                label="Destination URL"
                error={errors.landingUrl}
                hint="Where the tracked link sends readers"
                required
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="url"
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={landingUrl}
                    onChange={(e) => setLandingUrl(e.target.value)}
                    placeholder="https://yourcompany.com/product"
                  />
                )}
              </Field>
            </div>
          )}

          {/* ---------------- Step 3 ---------------- */}
          {step === 2 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">Choose creators</h2>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">
                    Ranked by fit with your buyer profile. Shortlisted creators first.
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn('tabular text-[15px] font-semibold', overBudget ? 'text-danger' : 'text-ink')}>
                    {formatEur(totalCost)}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">of {formatEur(budgetNumber)} budget</p>
                </div>
              </div>

              {overBudget && (
                <p role="alert" className="mt-3 rounded-[10px] bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
                  This selection is {formatEur(totalCost - budgetNumber)} over budget. You can still proceed —
                  the budget is a guide, not a hard limit.
                </p>
              )}

              <div className="relative mt-4">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
                <Input
                  type="search"
                  value={creatorQuery}
                  onChange={(e) => setCreatorQuery(e.target.value)}
                  placeholder="Search creators…"
                  aria-label="Search creators"
                  className="pl-9"
                />
              </div>

              {errors.creators && (
                <p role="alert" className="mt-3 text-[12px] text-danger">
                  {errors.creators}
                </p>
              )}

              <ul className="mt-4 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
                {rankedCreators.map(({ creator, score }) => {
                  const isSelected = selected.includes(creator.id);
                  return (
                    <li key={creator.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-[12px] border p-3 transition-colors',
                          isSelected ? 'border-brand-500 bg-brand-50/50' : 'border-line hover:bg-sunken',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelected((s) =>
                              s.includes(creator.id) ? s.filter((x) => x !== creator.id) : [...s, creator.id],
                            )
                          }
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={cn(
                            'flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors',
                            isSelected ? 'border-brand-600 bg-brand-600' : 'border-line-strong',
                          )}
                        >
                          {isSelected && <Check className="size-3 text-white" />}
                        </span>

                        <Avatar seed={creator.avatarSeed} name={creator.name} size="sm" />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13.5px] font-medium text-ink">{creator.name}</span>
                            {shortlist.includes(creator.id) && (
                              <Star className="size-3 shrink-0 fill-brand-600 text-brand-600" aria-label="Shortlisted" />
                            )}
                          </span>
                          <span className="block truncate text-[12px] text-ink-muted">
                            {creator.category} · {creator.country}
                          </span>
                        </span>

                        <span className="shrink-0 text-right">
                          <span className="tabular block text-[13px] font-semibold text-ink">
                            {formatEur(creator.pricePerPost)}
                          </span>
                          <span className="tabular block text-[11.5px] text-ink-muted">{score}/100 match</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ---------------- Step 4 ---------------- */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-brand-600" />
                  <h2 className="text-[15px] font-semibold text-ink">Generated brief</h2>
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                    Assisted
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                  Assembled from your inputs and the {selected.length} creator
                  {selected.length === 1 ? '' : 's'} you picked. Generated locally — no model call, so it is
                  reproducible and cannot fail.
                </p>
              </div>

              <BriefBlock title="Objectives" items={previewBrief.objectives} />
              <BriefBlock title="Key messages" items={previewBrief.keyMessages} />
              <BriefBlock title="Creator guidelines" items={previewBrief.creatorGuidelines} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="micro-label">Call to action</h3>
                  <p className="mt-1.5 text-[13.5px] text-ink">{previewBrief.callToAction}</p>
                </div>
                <div>
                  <h3 className="micro-label">Tone of voice</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{previewBrief.toneOfVoice}</p>
                </div>
              </div>

              <div className="rounded-[12px] border border-line bg-sunken/50 p-4">
                <h3 className="micro-label flex items-center gap-1.5">
                  <Link2 className="size-3.5" />
                  Tracked link
                </h3>
                <p className="tabular mt-1.5 break-all text-[13px] font-medium text-ink">
                  vouch.link/{previewBrief.trackingCode}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                  Each creator gets their own variant, so clicks attribute to the specific post that
                  drove them. Points at {previewBrief.landingUrl}
                </p>
              </div>

              <div className="rounded-[12px] border border-line p-4">
                <h3 className="micro-label">Summary</h3>
                <dl className="mt-2.5 space-y-2 text-[13px]">
                  <SummaryRow label="Campaign" value={name} />
                  <SummaryRow label="Runs" value={`${formatDate(startDate)} – ${formatDate(endDate)}`} />
                  <SummaryRow label="Creators" value={`${selected.length} selected`} />
                  <SummaryRow label="Committed" value={formatEur(totalCost)} />
                  <SummaryRow label="Budget" value={formatEur(budgetNumber)} />
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="mt-5 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <span />
          )}

          {step < STEPS.length - 1 ? (
            <Button size="lg" onClick={goNext}>
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={submit} loading={submitting}>
              Create campaign
              <Check className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function BriefBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="micro-label">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="truncate font-medium text-ink">{value}</dd>
    </div>
  );
}
