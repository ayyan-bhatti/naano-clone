'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { cn } from '@/lib/cn';
import { ALL_TOPICS, COUNTRIES, CREATORS } from '@/lib/data/creators';
import { useStore } from '@/lib/store';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/feedback';

/**
 * Brand onboarding.
 *
 * This is not a formality screen: every answer feeds the match function, so a
 * different buyer profile genuinely reorders the marketplace. That is the whole
 * premise of the product ("audience fit before follower count"), and it would
 * be hollow if onboarding just collected a company name.
 */

const VERTICALS = [
  'B2B SaaS · Revenue operations',
  'B2B SaaS · Developer tools',
  'B2B SaaS · Fintech',
  'B2B SaaS · HR tech',
  'B2B SaaS · Product & design',
  'Agency or consultancy',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, hydrated, completeOnboarding } = useStore();
  const { push } = useToast();

  const [step, setStep] = useState(0);
  const [company, setCompany] = useState('');
  const [vertical, setVertical] = useState(VERTICALS[0]);
  const [personas, setPersonas] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  // Personas come from the actual audience labels in the marketplace, so a
  // brand can never pick a persona no creator reaches.
  const ALL_PERSONAS = useMemo(
    () => Array.from(new Set(CREATORS.flatMap((c) => c.audience.map((a) => a.label)))).sort(),
    [],
  );

  useEffect(() => {
    if (hydrated && !user) router.replace('/sign-up');
    if (user && user.onboarded) router.replace('/dashboard');
    if (user) setCompany((c) => c || user.company);
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ground">
        <span className="size-5 animate-spin rounded-full border-2 border-line border-t-brand-600" />
      </div>
    );
  }

  const isCreator = user.role === 'creator';

  function toggle(list: string[], setList: (v: string[]) => void, value: string, max = 99) {
    setError(undefined);
    if (list.includes(value)) setList(list.filter((x) => x !== value));
    else if (list.length < max) setList([...list, value]);
  }

  function finish() {
    completeOnboarding({ company, vertical, personas, topics, markets });
    push({
      tone: 'success',
      title: 'Workspace ready',
      body: isCreator ? 'Your creator profile is live.' : `${personas.length} personas set — the marketplace is ranked for you.`,
    });
    router.push('/dashboard');
  }

  function next() {
    if (step === 0) {
      if (!company.trim()) {
        setError('Enter your company name');
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (personas.length === 0) {
        setError('Pick at least one buyer persona — this is what ranks the marketplace');
        return;
      }
      setStep(2);
      return;
    }
    finish();
  }

  const steps = isCreator ? ['Your profile', 'Your topics'] : ['Your company', 'Your buyers', 'Topics & markets'];

  return (
    <div className="aurora flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>

      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className="flex-1">
                <div
                  className={cn(
                    'h-1 rounded-full transition-colors duration-300',
                    i <= step ? 'bg-brand-600' : 'bg-line',
                  )}
                />
                <p className={cn('mt-2 text-[11.5px] font-medium', i <= step ? 'text-ink' : 'text-ink-faint')}>
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.042em] text-ink">
              {isCreator ? 'Tell us about you' : 'Tell us about your company'}
            </h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              {isCreator
                ? 'This is what brands see when they find you in the marketplace.'
                : 'We use this to rank creators by how well their audience matches your buyers.'}
            </p>

            <div className="mt-6 space-y-4">
              <Field label={isCreator ? 'Display name' : 'Company name'} error={error} required>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      setError(undefined);
                    }}
                    placeholder="Trellis"
                  />
                )}
              </Field>

              <div className="space-y-1.5">
                <span className="block text-[13px] font-medium text-ink">
                  {isCreator ? 'Your niche' : 'What do you sell?'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {VERTICALS.map((v) => (
                    <Chip key={v} selected={vertical === v} onClick={() => setVertical(v)}>
                      {v}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.042em] text-ink">
              {isCreator ? 'Who reads you?' : 'Who are your buyers?'}
            </h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              Pick the roles you sell to. Creators whose audience contains these people score higher —
              this is the single biggest input to the match score.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {ALL_PERSONAS.map((p) => (
                <Chip key={p} selected={personas.includes(p)} onClick={() => toggle(personas, setPersonas, p)}>
                  {p}
                </Chip>
              ))}
            </div>
            {error && (
              <p role="alert" className="mt-4 text-[12px] text-danger">
                {error}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.042em] text-ink">Topics and markets</h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              Optional, but they sharpen the ranking. Topics affect relevance; markets give a small boost
              to creators based where you sell.
            </p>

            <div className="mt-6 space-y-6">
              <div>
                <span className="micro-label">Topics</span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {ALL_TOPICS.map((t) => (
                    <Chip key={t} selected={topics.includes(t)} onClick={() => toggle(topics, setTopics, t)} size="sm">
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <span className="micro-label">Markets</span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {COUNTRIES.map((c) => (
                    <Chip key={c} selected={markets.includes(c)} onClick={() => toggle(markets, setMarkets, c)} size="sm">
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button size="lg" onClick={next}>
            {step === steps.length - 1 ? (
              <>
                Finish
                <Check className="size-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
  size = 'md',
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full border font-medium transition-all duration-150 active:scale-[0.97]',
        size === 'sm' ? 'px-3 py-1.5 text-[12.5px]' : 'px-3.5 py-2 text-[13px]',
        selected
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-line bg-surface text-ink-soft hover:border-brand-300 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
