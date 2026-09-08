'use client';

import Link from 'next/link';

import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand';
import { AuthRobot } from '@/components/auth/robot';
import { WatchingCrowd, type CrowdMood } from '@/components/auth/watching-crowd';
import { SplineCredit, SplineScene } from '@/components/auth/spline-scene';
import { isSplineEnabled } from '@/lib/spline';

/**
 * Auth shell, on naano's split.
 *
 * Their register page is a two-column layout: an off-white column carrying the
 * form and nothing else, and a solid blue panel carrying the promise. That
 * structure is reproduced here rather than invented.
 *
 * What is ours is what lives in the blue panel. The crowd stands in it and
 * every gaze converges on the statement in the middle, which is the clearing
 * the layout already leaves free of faces. When the password field is focused
 * they all look away, and when you stop typing the nosier ones peek back.
 *
 * The panel is hidden below `lg`, exactly as theirs is - a 120-face SVG next to
 * a phone-width form helps nobody.
 */
export function AuthLayout({
  mood,
  peekProgress,
  eyebrow,
  statement,
  children,
  footer,
  /** Signup leads with the robot; sign-in keeps the statement. */
  robot = false,
}: {
  mood: CrowdMood;
  peekProgress: number;
  eyebrow: string;
  statement: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  robot?: boolean;
}) {
  const splineEnabled = isSplineEnabled();

  return (
    <div className="flex min-h-dvh bg-ground">
      {/* ---------------- Form column ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Link href="/" aria-label="Vouch home">
            <Logo />
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex min-h-[24px] items-center py-0.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            Browse creators
          </Link>
        </header>

        <main
          id="main"
          className="flex flex-1 flex-col justify-center px-6 pb-12 sm:px-10 lg:px-16"
        >
          <div className="mx-auto w-full max-w-[420px]">
            <p className="text-[13px] font-semibold text-brand-600">{eyebrow}</p>
            <h1 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.042em] text-ink sm:text-[34px]">
              {statement}
            </h1>

            <div className="mt-7">{children}</div>

            {footer && <div className="mt-6">{footer}</div>}
            {splineEnabled && <SplineCredit className="mt-5" />}
          </div>
        </main>
      </div>

      {/* ---------------- The panel ---------------- */}
      <aside className="relative hidden w-[46%] max-w-[720px] shrink-0 overflow-hidden bg-brand-600 lg:block">
        {/* Depth, so the flat blue does not read as a colour swatch */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(70% 55% at 50% 12%, rgba(255,255,255,0.20) 0%, transparent 62%),' +
              'radial-gradient(60% 50% at 20% 95%, rgba(10,20,70,0.35) 0%, transparent 60%)',
          }}
        />

        {splineEnabled ? (
          <SplineScene className="absolute inset-0 size-full" />
        ) : (
          <WatchingCrowd
            mood={mood}
            peekProgress={peekProgress}
            layout="panel"
            className="absolute inset-0 size-full"
          />
        )}

        {/*
          The clearing the crowd layout keeps free is where the content goes,
          so every face in the panel is looking at it. On signup that content
          is the robot, which reacts to the form the same way the crowd does.
        */}
        <div className="relative flex h-full items-center justify-center px-14">
          <div className="max-w-sm text-center">
            {robot && (
              // The crowd stands behind the robot, and a face with headwear
              // landing just above its antenna read as part of the robot. The
              // vignette clears a pocket of space for it to stand in.
              <div className="relative mx-auto mb-5 w-fit">
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 -z-10 size-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(20,44,120,0.55) 0%, rgba(20,44,120,0.28) 45%, transparent 70%)',
                  }}
                />
                <AuthRobot
                  mood={mood}
                  peekProgress={peekProgress}
                  className="h-[230px] w-[220px] drop-shadow-[0_20px_34px_rgba(8,20,60,0.45)]"
                />
              </div>
            )}
            <p className="text-[26px] font-semibold leading-[1.14] tracking-[-0.035em] text-white">
              Creators. Brands. Results.
            </p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-white/75">
              Run LinkedIn creator campaigns that drive real business — find the voices your buyers
              trust, track every post, pay in one click.
            </p>
            {!robot && (
              <p className="mt-8 text-[12px] font-medium uppercase tracking-[0.12em] text-white/50">
                Built for B2B marketing teams
              </p>
            )}
          </div>
        </div>
      </aside>
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
