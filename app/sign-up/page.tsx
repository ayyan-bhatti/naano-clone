'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, Eye, EyeOff, PenLine } from 'lucide-react';

import { cn } from '@/lib/cn';
import { checkPasswordStrength, hashPassword, passwordScore } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { AuthLayout, StrengthMeter } from '@/components/auth/auth-layout';
import { useCrowdMood } from '@/components/auth/watching-crowd';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/feedback';
import type { Role } from '@/lib/types';

/**
 * Sign-up.
 *
 * Role comes first, exactly as on the original - it is the fork that decides the
 * whole rest of the experience, so burying it in settings later would be wrong.
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
  password?: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useStore();
  const { push } = useToast();
  const crowd = useCrowdMood();

  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', email: '', company: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const score = passwordScore(form.password);

  function validate(): boolean {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Enter your name';
    else if (form.name.trim().length < 2) next.name = 'That looks too short';

    if (!form.email.trim()) next.email = 'Enter your work email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email))
      next.email = 'That is not a valid email address';

    if (role === 'brand' && !form.company.trim()) next.company = 'Enter your company name';

    const strength = checkPasswordStrength(form.password);
    if (!strength.ok) next.password = strength.message;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role || !validate()) return;

    setSubmitting(true);
    const passwordHash = await hashPassword(form.password);
    signUp({
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      role,
      passwordHash,
    });
    push({ tone: 'success', title: 'Account created', body: 'Two quick questions and you are in.' });
    router.push('/onboarding');
  }

  /** Shared focus wiring - this is what drives the crowd. */
  const watch = (kind: 'public' | 'secret') => ({
    onFocus: () => crowd.onFieldFocus(kind),
    onBlur: crowd.onFieldBlur,
  });

  return (
    <AuthLayout
      mood={crowd.mood}
      peekProgress={crowd.peekProgress}
      eyebrow="2,400 creators are watching"
      statement={
        role === null
          ? 'Create your account'
          : role === 'brand'
            ? 'Set up your brand account'
            : 'Set up your creator account'
      }
      footer={
        role === null ? (
          <p className="text-[13px] text-ink-muted">
            Already have an account?{' '}
            <Link href="/sign-in" className="font-semibold text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>
        ) : (
          <p className="max-w-[380px] text-[12px] leading-relaxed text-ink-faint">
            Your password is hashed with SHA-256 before it is stored, and never leaves this browser.
            It is still a demo, not real authentication.
          </p>
        )
      }
    >
      {!role ? (
        <div>
          <p className="text-[14px] text-ink-soft">First, who are you here as?</p>

          <div className="mt-5 space-y-3">
            {ROLES.map((r) => (
              <button
                key={r.role}
                onClick={() => setRole(r.role)}
                className={cn(
                  'group flex w-full items-start gap-4 rounded-[14px] border border-line bg-surface p-4 text-left shadow-card',
                  'transition-[border-color,box-shadow,transform] duration-200',
                  'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift active:translate-y-0',
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
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

        </div>
      ) : (
        <div>
          <button
            onClick={() => setRole(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            Change role
          </button>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="Full name" error={errors.name} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  autoComplete="name"
                  placeholder="Ayyan Bhatti"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    crowd.onType();
                  }}
                  {...watch('public')}
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
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    crowd.onType();
                  }}
                  {...watch('public')}
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
                    onChange={(e) => {
                      setForm((f) => ({ ...f, company: e.target.value }));
                      crowd.onType();
                    }}
                    {...watch('public')}
                  />
                )}
              </Field>
            )}

            <Field
              label="Password"
              error={errors.password}
              hint="At least 8 characters, with a letter and a number"
              required
            >
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type={showPassword ? 'text' : 'password'}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="pr-10"
                    value={form.password}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, password: e.target.value }));
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

            {form.password.length > 0 && <StrengthMeter score={score} />}

            <Button type="submit" block size="lg" loading={submitting} className="!rounded-full">
              Create account
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}
