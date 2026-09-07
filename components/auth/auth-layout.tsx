'use client';

import Link from 'next/link';

import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand';
import { WatchingCrowd, type CrowdMood } from '@/components/auth/watching-crowd';

/**
 * Split-screen auth shell.
 *
 * Dark atmospheric panel on the left carrying the crowd and the statement, light
 * form panel on the right. The contrast is deliberate: the marketing and auth
 * surfaces run dark, the signed-in product stays light, so the handoff into the
 * dashboard is a step into the workspace rather than a change of product.
 *
 * On mobile the panel becomes a short band above the form instead of being
 * dropped - the crowd is the thing worth keeping, and a 160px band still reads.
 */
export function AuthLayout({
  mood,
  peekProgress,
  eyebrow,
  statement,
  substatement,
  children,
}: {
  mood: CrowdMood;
  peekProgress: number;
  eyebrow: string;
  statement: React.ReactNode;
  substatement: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.02fr_1fr]">
      {/* ---------------- Left: the crowd ---------------- */}
      <aside className="relative isolate flex h-40 flex-col justify-end overflow-hidden bg-[#0a0c17] sm:h-52 lg:h-auto lg:min-h-dvh">
        {/* Depth: warm glow top-left, cool glow bottom-right, faint grid over both */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(70% 55% at 18% 8%, rgba(63,99,232,0.30) 0%, transparent 62%),' +
              'radial-gradient(65% 60% at 88% 92%, rgba(109,40,217,0.26) 0%, transparent 60%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(75% 65% at 40% 35%, black 0%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(75% 65% at 40% 35%, black 0%, transparent 100%)',
          }}
        />

        <WatchingCrowd
          mood={mood}
          peekProgress={peekProgress}
          className="absolute inset-0 -z-10 size-full opacity-90"
        />

        {/* Keeps the statement readable over the crowd */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-[#0a0c17] via-[#0a0c17]/85 to-transparent"
        />

        <Link
          href="/"
          aria-label="Vouch home"
          className="absolute left-6 top-6 z-10 rounded-[10px] sm:left-8 sm:top-7"
        >
          <Logo className="[&>span:last-child]:text-white" />
        </Link>

        <div className="relative z-10 hidden p-8 lg:block lg:p-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-md text-[34px] font-extrabold leading-[1.08] tracking-[-0.035em] text-white xl:text-[40px]">
            {statement}
          </h2>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-white/55">{substatement}</p>
        </div>
      </aside>

      {/* ---------------- Right: the form ---------------- */}
      <main id="main" className="flex flex-col justify-center bg-ground px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}

/**
 * Password field with a visibility toggle and a strength meter.
 *
 * Split out because both auth pages need identical focus wiring - the crowd's
 * whole behaviour depends on knowing this field is the secret one.
 */
export function StrengthMeter({ score, className }: { score: number; className?: string }) {
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const tones = [
    'bg-line-strong',
    'bg-danger',
    'bg-warn',
    'bg-brand-500',
    'bg-money',
  ];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex flex-1 gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              i < score ? tones[score] : 'bg-line',
            )}
          />
        ))}
      </div>
      <span className="w-14 text-right text-[11.5px] font-medium text-ink-muted">{labels[score]}</span>
    </div>
  );
}
