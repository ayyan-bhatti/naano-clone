'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

import { DEMO_USER, useStore } from '@/lib/store';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/feedback';

/**
 * Sign-in.
 *
 * The demo workspace button matters more than the form: a reviewer opening the
 * deployed link cold should reach a populated product in one click, not have to
 * invent an account and then stare at empty states.
 */
export default function SignInPage() {
  const router = useRouter();
  const { signIn, loadDemo } = useStore();
  const { push } = useToast();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);

    if (!email.trim()) {
      setError('Enter the email you signed up with');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError('That is not a valid email address');
      return;
    }

    setSubmitting(true);
    const ok = signIn(email.trim());
    if (!ok) {
      setSubmitting(false);
      setError('No account in this browser with that email. Create one, or open the demo workspace.');
      return;
    }
    push({ tone: 'success', title: 'Welcome back' });
    router.push('/dashboard');
  }

  function openDemo() {
    loadDemo();
    push({
      tone: 'success',
      title: 'Demo workspace loaded',
      body: 'Five campaigns, a shortlist and live attribution data.',
    });
    router.push('/dashboard');
  }

  return (
    <div className="aurora flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="Vouch home">
          <Logo />
        </Link>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">Sign in</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          Demo authentication — your session is stored in this browser.
        </p>

        {/* Demo entry, deliberately above the form */}
        <button
          onClick={openDemo}
          className="group mt-6 flex w-full items-start gap-4 rounded-[14px] border border-brand-300 bg-brand-50/60 p-4 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lift"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-600 text-white">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold text-ink">Open the demo workspace</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">
              Five campaigns already in flight, with real attribution data to click through.
            </span>
          </span>
          <ArrowRight className="mt-2 size-4 shrink-0 text-brand-600 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[12px] text-ink-faint">or sign in</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field
            label="Email"
            error={error}
            hint={`Demo account: ${DEMO_USER.email}`}
            required
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="email"
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>

          <Button type="submit" block size="lg" variant="secondary" loading={submitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-ink-muted">
          No account?{' '}
          <Link href="/sign-up" className="font-medium text-brand-600 hover:underline">
            Create one
          </Link>
        </p>
      </main>
    </div>
  );
}
