'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Euro, FileText, RotateCcw, Save, UserRound } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatCompact, formatEur, relativeTime } from '@/lib/format';
import { ALL_TOPICS, getCreator } from '@/lib/data/creators';
import { audienceBandFor } from '@/lib/data/benchmarks';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState, useToast } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Pill } from '@/components/ui/status';
import type { Availability, Creator } from '@/lib/types';

/**
 * Creator profile editing.
 *
 * The gap this closes: a creator could see the profile brands were buying from
 * but could not change a word of it. What is editable here is exactly what a
 * creator legitimately controls - how they describe themselves, what they
 * cover, what they charge, whether they are taking work.
 *
 * What is deliberately not editable: followers, engagement, median views. Those
 * are measurements, and a marketplace where the seller types their own audience
 * numbers is not a marketplace. In a production build they would come from a
 * connected LinkedIn account; here they stay derived from seed data and the
 * page says so rather than quietly leaving the fields out.
 */

const AVAILABILITY_OPTIONS: { value: Availability; label: string; hint: string }[] = [
  { value: 'open', label: 'Available now', hint: 'Shown first in the marketplace default sort' },
  { value: 'limited', label: 'Limited slots', hint: 'Still bookable, flagged as tight' },
  { value: 'booked', label: 'Booked out', hint: 'Listed, but the book button is disabled' },
];

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  );
}

function ProfileInner() {
  const { user, myCreator, updateCreatorProfile } = useStore();

  if (user?.role !== 'creator' || !myCreator) {
    return (
      <AppShell title="My profile">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={UserRound}
            title="This is a creator surface"
            body="You are signed in as a brand. Your own company details live in settings, alongside the buyer profile that drives your match scores."
            action={
              <Link href="/settings">
                <Button>Go to settings</Button>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return <Editor creator={myCreator} onSave={updateCreatorProfile} />;
}

function Editor({
  creator,
  onSave,
}: {
  creator: Creator;
  onSave: ReturnType<typeof useStore>['updateCreatorProfile'];
}) {
  const { user } = useStore();
  const { push } = useToast();
  const seeded = getCreator(creator.id);

  const [headline, setHeadline] = useState(creator.headline);
  const [bio, setBio] = useState(creator.bio);
  const [why, setWhy] = useState(creator.whyWorkWithMe);
  const [topics, setTopics] = useState<string[]>(creator.topics);
  const [price, setPrice] = useState(String(creator.pricePerPost));
  const [availability, setAvailability] = useState<Availability>(creator.availability);
  const [touched, setTouched] = useState(false);

  const priceNumber = Number(price);
  const priceError =
    touched && (!Number.isFinite(priceNumber) || priceNumber < 20 || priceNumber > 5000)
      ? 'Pick a fee between €20 and €5,000.'
      : undefined;
  const headlineError = touched && headline.trim().length < 10 ? 'Say what you do.' : undefined;

  const dirty =
    headline !== creator.headline ||
    bio !== creator.bio ||
    why !== creator.whyWorkWithMe ||
    price !== String(creator.pricePerPost) ||
    availability !== creator.availability ||
    topics.join('|') !== creator.topics.join('|');

  /**
   * Where this fee sits against the published booking index, so the number is
   * decided against the market rather than in a vacuum.
   */
  const band = useMemo(() => {
    if (!Number.isFinite(priceNumber)) return null;
    const b = audienceBandFor(creator.followers);
    return { band: b, delta: Math.round(((priceNumber - b.median) / b.median) * 100) };
  }, [creator.followers, priceNumber]);

  function toggleTopic(topic: string) {
    setTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : prev.length >= 8
          ? prev
          : [...prev, topic],
    );
  }

  function save() {
    setTouched(true);
    if (headline.trim().length < 10) return;
    if (!Number.isFinite(priceNumber) || priceNumber < 20 || priceNumber > 5000) return;

    onSave({
      headline: headline.trim(),
      bio: bio.trim(),
      whyWorkWithMe: why.trim(),
      topics,
      pricePerPost: Math.round(priceNumber),
      availability,
    });
    setTouched(false);
    push({
      tone: 'success',
      title: 'Profile updated',
      body: 'Brands see this immediately — including your match score, which is computed from your topics.',
    });
  }

  function revert() {
    if (!seeded) return;
    setHeadline(seeded.headline);
    setBio(seeded.bio);
    setWhy(seeded.whyWorkWithMe);
    setTopics(seeded.topics);
    setPrice(String(seeded.pricePerPost));
    setAvailability(seeded.availability);
    setTouched(false);
  }

  return (
    <AppShell
      title="My profile"
      subtitle="What brands read before they book you"
      actions={
        <div className="flex items-center gap-2">
          <Link href="/media-kit">
            <Button size="sm" variant="secondary">
              <FileText className="size-4" />
              Media kit
            </Button>
          </Link>
          <Button size="sm" onClick={save} disabled={!dirty}>
            <Save className="size-4" />
            Save
          </Button>
        </div>
      }
    >
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {/* ---------- Identity ---------- */}
          <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-4">
              <Avatar seed={creator.avatarSeed} name={creator.name} size="lg" />
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{creator.name}</h2>
                <p className="text-[12.5px] text-ink-muted">
                  @{creator.username} · {creator.country} {creator.countryFlag}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Field
                label="Headline"
                hint="One line, shown on your card and at the top of your profile."
                error={headlineError}
                required
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    maxLength={120}
                  />
                )}
              </Field>

              <Field label="Bio" hint="What you write about, and who reads it.">
                {({ id, describedBy }) => (
                  <Textarea
                    id={id}
                    aria-describedby={describedBy}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={400}
                  />
                )}
              </Field>

              <Field
                label="Why work with me"
                hint="The part brands actually read. Be specific about the kind of brief you do well."
              >
                {({ id, describedBy }) => (
                  <Textarea
                    id={id}
                    aria-describedby={describedBy}
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    rows={4}
                    maxLength={600}
                  />
                )}
              </Field>
            </div>
          </section>

          {/* ---------- Topics ---------- */}
          <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Topics</h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
              These are matched against what a brand sells. Adding topics you do not really cover
              raises your match score and lowers your click-through — the marketplace notices the
              second one.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {ALL_TOPICS.map((topic) => {
                const on = topics.includes(topic);
                return (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[12.5px] font-medium ring-1 ring-inset transition-colors',
                      on
                        ? 'bg-brand-600 text-white ring-brand-600'
                        : 'bg-surface text-ink-soft ring-line hover:bg-sunken hover:text-ink',
                    )}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11.5px] text-ink-faint">
              {topics.length}/8 selected
            </p>
          </section>

          {/* ---------- Rate & availability ---------- */}
          <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Rate and availability
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Price per post" hint="Fixed fee. No negotiation round-trip." error={priceError} required>
                {({ id, describedBy, invalid }) => (
                  <div className="relative">
                    <Euro className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      type="number"
                      inputMode="numeric"
                      min={20}
                      max={5000}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </Field>

              <Field label="Availability" hint="Changes how you sort and whether you can be booked.">
                {({ id, describedBy }) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as Availability)}
                  >
                    {AVAILABILITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label} — {o.hint}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            {band && (
              <div className="mt-4 rounded-[12px] bg-sunken/60 p-3.5">
                <p className="text-[12.5px] leading-relaxed text-ink-soft">
                  At {formatCompact(creator.followers)} followers the median booking in our reference
                  set is <strong className="font-semibold text-ink">{formatEur(band.band.median)}</strong>{' '}
                  ({formatEur(band.band.p25)}–{formatEur(band.band.p75)} typical range). You are{' '}
                  <strong
                    className={cn(
                      'font-semibold',
                      band.delta > 0 ? 'text-warn' : band.delta < 0 ? 'text-money' : 'text-ink',
                    )}
                  >
                    {band.delta === 0
                      ? 'right on it'
                      : `${Math.abs(band.delta)}% ${band.delta > 0 ? 'above' : 'below'}`}
                  </strong>
                  .
                </p>
              </div>
            )}
          </section>

          {/* ---------- Not editable, and why ---------- */}
          <section className="rounded-[16px] border border-dashed border-line-strong bg-surface/60 p-5">
            <h2 className="text-[14px] font-semibold text-ink">What you cannot edit here</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              Followers, median views and engagement rate are measurements, not claims. A marketplace
              where the seller types their own audience numbers is not a marketplace. In production
              these come from a connected LinkedIn account; in this build they stay derived from seed
              data, which is why the field is absent rather than fake.
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
              <ReadOnly label="Followers" value={formatCompact(creator.followers)} />
              <ReadOnly label="Median views" value={formatCompact(creator.medianViews)} />
              <ReadOnly label="Engagement" value={`${creator.engagement.toFixed(1)}%`} />
            </dl>
          </section>
        </div>

        {/* ---------- Live preview ---------- */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[13px] font-semibold text-ink">How brands see you</h2>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">Updates as you type.</p>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Avatar seed={creator.avatarSeed} name={creator.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">{creator.name}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">
                    {headline || 'Your headline appears here'}
                  </p>
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-[12.5px] leading-relaxed text-ink-soft">
                {bio || 'Your bio appears here.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topics.slice(0, 4).map((t) => (
                  <span key={t} className="rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-soft">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <Pill
                  tone={availability === 'open' ? 'money' : availability === 'limited' ? 'warn' : 'neutral'}
                  dot
                >
                  {AVAILABILITY_OPTIONS.find((o) => o.value === availability)?.label}
                </Pill>
                <span className="tabular text-[14px] font-semibold text-ink">
                  {Number.isFinite(priceNumber) ? formatEur(priceNumber) : '—'}
                </span>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={!dirty} block={false}>
              <Save className="size-4" />
              Save changes
            </Button>
            <Button variant="ghost" onClick={revert}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>

          {user?.creatorEdits?.updatedAt && (
            <p className="text-[11.5px] text-ink-faint">
              Last edited {relativeTime(user.creatorEdits.updatedAt)}.
            </p>
          )}

          <Link
            href={`/creators/${creator.slug}`}
            className="block text-[12.5px] font-medium text-brand-600 hover:underline"
          >
            View your public profile →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3 text-center">
      <dd className="tabular text-[14px] font-semibold text-ink">{value}</dd>
      <dt className="micro-label mt-0.5 text-[10px]">{label}</dt>
    </div>
  );
}
