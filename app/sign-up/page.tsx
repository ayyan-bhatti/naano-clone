'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, PenLine } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useStore } from '@/lib/store';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/feedback';
import type { Role } from '@/lib/types';

/**
 * Sign-up.
 *
 * Role comes first, exactly as on the original - it is the fork that decides
 * the entire rest of the experience, so burying it in a settings screen later
 * would be the wrong call.
 */

const ROLES: { role: Role; icon: typeof Briefcase; title: string; body: string }[] = [
  {
    role: 'brand',
    icon: Briefcase,
    title: "I'm a brand",
    body: 'Find creators, launch campaigns, and trace pipeline back to each post.',
  },
  {
    role: 'creator',
    icon: PenLine,
    title: "I'm a creator",
    body: 'Get paid to post about B2B products you actually use.',
  },
];

interface Errors {
  name?: string;
  email?: string;
  company?: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useStore();
  const { push } = useToast();

  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', email: '', company: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Enter your name';
    else if (form.name.trim().length < 2) next.name = 'That looks too short';

    if (!form.email.trim()) next.email = 'Enter your work email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) next.email = 'That is not a valid email address';

    if (role === 'brand' && !form.company.trim()) next.company = 'Enter your company name';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role || !validate()) return;
    setSubmitting(true);
    signUp({ name: form.name.trim(), email: form.email.trim(), company: form.company.trim(), role });
    push({ tone: 'success', title: 'Account created', body: 'Two quick questions and you are in.' });
    router.push('/onboarding');
  }

  return (
    <div className="aurora flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="Vouch home">
          <Logo />
        </Link>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        {!role ? (
          <div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">Create your account</h1>
            <p className="mt-2 text-[14px] text-ink-soft">First, who are you here as?</p>

            <div className="mt-6 space-y-3">
              {ROLES.map((r) => (
                <button
                  key={r.role}
                  onClick={() => setRole(r.role)}
                  className={cn(
                    'group flex w-full items-start gap-4 rounded-[14px] border border-line bg-surface p-4 text-left shadow-card',
                    'transition-[border-color,box-shadow,transform] duration-200',
                    'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift',
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
                    <r.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold text-ink">{r.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-muted">{r.body}</span>
                  </span>
                  <ArrowRight className="mt-2 size-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-[13px] text-ink-muted">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-medium text-brand-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setRole(null)}
              className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-3.5" />
              Change role
            </button>

            <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">
              {role === 'brand' ? 'Set up your brand account' : 'Set up your creator account'}
            </h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              Demo authentication — nothing is sent anywhere and no password is required.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <Field label="Full name" error={errors.name} required>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="name"
                    placeholder="Elena Fischer"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                )}
              </Field>

              <Field label="Work email" error={errors.email} required>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="email"
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                )}
              </Field>

              {role === 'brand' && (
                <Field label="Company" error={errors.company} required>
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      autoComplete="organization"
                      placeholder="Trellis"
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    />
                  )}
                </Field>
              )}

              <Button type="submit" block size="lg" loading={submitting}>
                Create account
                <ArrowRight className="size-4" />
              </Button>
            </form>

            <p className="mt-5 text-center text-[12px] leading-relaxed text-ink-faint">
              Your session lives in this browser only. Nothing leaves your device.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
