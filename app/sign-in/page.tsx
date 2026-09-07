'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';

import { hashPassword } from '@/lib/auth';
import { DEMO_USER, useStore } from '@/lib/store';
import { AuthLayout } from '@/components/auth/auth-layout';
import { useCrowdMood } from '@/components/auth/watching-crowd';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/feedback';

/**
 * Sign-in.
 *
 * The demo workspace button sits above the form on purpose: a reviewer opening
 * the deployed link cold should reach a populated product in one click, not
 * have to invent an account and then stare at empty states.
 */
export default function SignInPage() {
  const router = useRouter();
  const { signIn, loadDemo } = useStore();
  const { push } = useToast();
  const crowd = useCrowdMood();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!email.trim()) {
      setErrors({ email: 'Enter the email you signed up with' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setErrors({ email: 'That is not a valid email address' });
      return;
    }
    if (!password) {
      setErrors({ password: 'Enter your password' });
      return;
    }

    setSubmitting(true);
    const result = signIn(email.trim(), await hashPassword(password));

    if (result === 'no-account') {
      setSubmitting(false);
      setErrors({
        email: 'No account in this browser with that email. Create one, or open the demo workspace.',
      });
      return;
    }
    if (result === 'bad-password') {
      setSubmitting(false);
      setErrors({ password: 'That password does not match this account.' });
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

  const watch = (kind: 'public' | 'secret') => ({
    onFocus: () => crowd.onFieldFocus(kind),
    onBlur: crowd.onFieldBlur,
  });

  return (
    <AuthLayout
      mood={crowd.mood}
      peekProgress={crowd.peekProgress}
      eyebrow="Welcome back"
      statement="Your creators have been busy."
      footer={
        <p className="text-[13px] text-white/50">
          No account?{' '}
          <Link href="/sign-up" className="font-medium text-white hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <p className="text-[14px] text-ink-soft">
        Demo authentication — your session is stored in this browser.
      </p>

      {/* Demo entry, deliberately above the form */}
      <button
        onClick={openDemo}
        className="group mt-5 flex w-full items-start gap-4 rounded-[14px] border border-brand-300 bg-brand-50/60 p-4 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lift active:translate-y-0"
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Email" error={errors.email} hint={`Demo account: ${DEMO_USER.email}`} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                crowd.onType();
              }}
              {...watch('public')}
            />
          )}
        </Field>

        <Field label="Password" error={errors.password} required>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <Input
                id={id}
                type={showPassword ? 'text' : 'password'}
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-10"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  crowd.onType();
                }}
                {...watch('secret')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[8px] p-2 text-ink-faint transition-colors hover:text-ink"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>

        <Button type="submit" block size="lg" variant="secondary" loading={submitting} className="!rounded-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
