'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/cn';
import { ALL_TOPICS, COUNTRIES, CREATORS } from '@/lib/data/creators';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ConfirmDialog, useToast } from '@/components/ui/feedback';

/**
 * Settings.
 *
 * The buyer profile lives here rather than being write-once at onboarding,
 * because editing it visibly re-ranks the marketplace - which is the clearest
 * way to demonstrate that the match score is real and relational.
 */
export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsInner />
    </RequireAuth>
  );
}

const ALL_PERSONAS = Array.from(new Set(CREATORS.flatMap((c) => c.audience.map((a) => a.label)))).sort();

function SettingsInner() {
  const router = useRouter();
  const { user, completeOnboarding, resetDemo } = useStore();
  const { push } = useToast();

  const [company, setCompany] = useState(user?.company ?? '');
  const [personas, setPersonas] = useState<string[]>(user?.buyerProfile.personas ?? []);
  const [topics, setTopics] = useState<string[]>(user?.buyerProfile.topics ?? []);
  const [markets, setMarkets] = useState<string[]>(user?.buyerProfile.markets ?? []);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
    setSaved(false);
  }

  function save() {
    completeOnboarding({ company, personas, topics, markets });
    setSaved(true);
    push({
      tone: 'success',
      title: 'Buyer profile updated',
      body: 'The marketplace has been re-ranked against your new profile.',
    });
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <AppShell title="Settings" subtitle="Account and buyer profile">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Account */}
        <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Account</h2>
          <div className="mt-4 flex items-center gap-4">
            <Avatar seed={user.avatarSeed} name={user.name} size="lg" />
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
              <p className="mt-1 text-[12px] text-ink-faint">
                Signed in as a {user.role === 'brand' ? 'brand' : 'creator'} · demo session
              </p>
            </div>
          </div>

          <div className="mt-5 max-w-sm">
            <Field label="Company">
              {({ id }) => (
                <Input
                  id={id}
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    setSaved(false);
                  }}
                />
              )}
            </Field>
          </div>
        </section>

        {/* Buyer profile */}
        <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Buyer profile</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            This drives the match score. Change it and the marketplace ranking changes with it —
            audience overlap is weighted highest, then topic relevance, then market and engagement
            quality.
          </p>

          <div className="mt-5 space-y-5">
            <ChipGroup label="Buyer personas" options={ALL_PERSONAS} selected={personas} onToggle={(v) => toggle(personas, setPersonas, v)} />
            <ChipGroup label="Topics" options={ALL_TOPICS} selected={topics} onToggle={(v) => toggle(topics, setTopics, v)} />
            <ChipGroup label="Markets" options={COUNTRIES} selected={markets} onToggle={(v) => toggle(markets, setMarkets, v)} />
          </div>

          <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
            <Button onClick={save}>
              {saved ? (
                <>
                  <Check className="size-4" />
                  Saved
                </>
              ) : (
                'Save changes'
              )}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/marketplace')}>
              See the re-ranked marketplace
            </Button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Demo data</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            Everything in this workspace — your account, campaigns, shortlist — lives in this
            browser&apos;s local storage. Resetting clears it and signs you out.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="size-4" />
            Reset demo data
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo();
          push({ tone: 'success', title: 'Demo data cleared' });
          router.push('/');
        }}
        title="Reset all demo data?"
        body="Your account, campaigns and shortlist will be deleted from this browser. This cannot be undone."
        confirmLabel="Reset everything"
        tone="danger"
      />
    </AppShell>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <span className="micro-label">{label}</span>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150 active:scale-[0.97]',
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-line bg-surface text-ink-soft hover:border-brand-300 hover:text-ink',
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
