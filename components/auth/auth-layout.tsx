'use client';

import Link from 'next/link';

import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand';
import { WatchingCrowd, type CrowdMood } from '@/components/auth/watching-crowd';

/**
 * Centred auth shell.
 *
 * The crowd is full-bleed behind the page and the form sits in the middle of it,
 * inside a clearing kept free of faces. Every gaze converges on the centre, so
 * the form is literally the thing being watched - which only works because it is
 * centred. The earlier split-screen version had the crowd looking off toward the
 * right edge, and the effect was much weaker for it.
 */
export function AuthLayout({
  mood,
  peekProgress,
  eyebrow,
  statement,
  children,
  footer,
}: {
  mood: CrowdMood;
  peekProgress: number;
  eyebrow: string;
  statement: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#0a0c17]">
      {/* Depth behind the crowd */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage:
            'radial-gradient(60% 55% at 15% 5%, rgba(63,99,232,0.30) 0%, transparent 62%),' +
            'radial-gradient(55% 60% at 88% 90%, rgba(109,40,217,0.26) 0%, transparent 60%),' +
            'radial-gradient(45% 40% at 50% 50%, rgba(10,12,23,0.85) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(70% 60% at 50% 45%, transparent 20%, black 100%)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 45%, transparent 20%, black 100%)',
        }}
      />

      <WatchingCrowd
        mood={mood}
        peekProgress={peekProgress}
        className="absolute inset-0 -z-10 size-full"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <Link href="/" aria-label="Vouch home">
          <Logo className="[&>span:last-child]:text-white" />
        </Link>
        <Link
          href="/marketplace"
          className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12.5px] font-medium text-white/70 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          Browse creators
        </Link>
      </header>

      {/* Centred form */}
      <main
        id="main"
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6"
      >
        <div className="w-full max-w-[440px]">
          <div className="mb-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              {eyebrow}
            </p>
            <h1 className="mt-2.5 text-[26px] font-extrabold leading-[1.12] tracking-[-0.035em] text-white sm:text-[30px]">
              {statement}
            </h1>
          </div>

          <div className="rounded-[20px] border border-white/12 bg-surface/[0.97] p-6 shadow-pop backdrop-blur-xl sm:p-7">
            {children}
          </div>

          {footer && <div className="mt-5 text-center">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

/** Password strength meter. Shown only once the user has started typing. */
export function StrengthMeter({ score, className }: { score: number; className?: string }) {
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const tones = ['bg-line-strong', 'bg-danger', 'bg-warn', 'bg-brand-500', 'bg-money'];

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
