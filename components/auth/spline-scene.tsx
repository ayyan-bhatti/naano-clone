'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { SPLINE_CREDIT, SPLINE_SCENE_URL } from '@/lib/spline';
import { usePrefersReducedMotion } from '@/lib/hooks/use-motion';

/**
 * Spline scene embed for the auth background.
 *
 * Loads only when it scrolls into view (it is a heavy third-party iframe, and
 * blocking first paint on it would be the worst of both worlds), fades in once
 * ready, and shows a quiet placeholder until then so the page is never blank.
 *
 * Under prefers-reduced-motion the scene is not loaded at all: it is a
 * continuously looping 3D animation with no still frame and no way to pause it
 * from outside the iframe, so the only honest way to respect that setting is
 * not to render it.
 *
 * The iframe is inert to the user (`pointer-events-none`) so it cannot steal
 * focus or scroll from the form sitting on top of it, and `aria-hidden` keeps
 * it out of the accessibility tree — it is decoration.
 */
export function SplineScene({
  className,
  onReady,
}: {
  className?: string;
  /** Fires once the scene has painted, so the fallback beneath can stand down. */
  onReady?: () => void;
}) {
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [painted, setPainted] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  /**
   * The iframe's `load` event is not the signal we need.
   *
   * It fires when the viewer document is up, after which the Spline runtime
   * still pulls ~60 chunks plus a wasm module and decodes the scene. Measured
   * cold, the robot does not appear for another twelve seconds or so - and
   * standing the fallback down on `load` left the panel blank grey for that
   * whole time.
   *
   * Cross-origin there is no readiness event to subscribe to and no way to
   * sample the iframe's pixels, so this waits out a measured delay instead and
   * deliberately errs late: revealing early shows an empty panel, revealing
   * late just means a few more seconds of the hand-built robot, which is a
   * perfectly good thing to be looking at.
   */
  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => {
      setPainted(true);
      onReady?.();
    }, 13_000);
    return () => window.clearTimeout(t);
  }, [loaded, onReady]);

  useEffect(() => {
    if (reduced) return;
    const el = hostRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  if (reduced) return null;

  return (
    <div ref={hostRef} className={cn('relative overflow-hidden', className)} aria-hidden>
      {inView && (
        <iframe
          src={SPLINE_SCENE_URL}
          title={`${SPLINE_CREDIT.title} by ${SPLINE_CREDIT.author}`}
          loading="eager"
          onLoad={() => setLoaded(true)}
          /*
            The scene is framed for a roughly square viewport; the panel is a
            tall portrait column. Stretching the iframe to fill it makes Spline
            fit the camera to that shape and crop into the robot's torso, so
            the iframe keeps a square aspect, is sized off the panel's height,
            and is centred - the sides overflow and are clipped instead of the
            subject being cut in half. Nudged up slightly so the head sits on
            the upper third rather than dead centre.
          */
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[96%] min-w-full',
            '-translate-x-1/2 -translate-y-1/2 border-0',
            'transition-opacity duration-[900ms] ease-out',
            painted ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      {/*
        No placeholder of its own: whatever this is layered over stays visible
        until the scene paints, which is the point of the arrangement. The
        hand-built robot is the placeholder, and also the permanent fallback if
        the scene never loads.
      */}
    </div>
  );
}

/** Attribution for the community scene this was remixed from. */
export function SplineCredit({ className }: { className?: string }) {
  return (
    <p className={cn('text-[11px] leading-relaxed text-white/50', className)}>
      3D scene “{SPLINE_CREDIT.title}” by {SPLINE_CREDIT.author}, remixed from{' '}
      <a
        href={SPLINE_CREDIT.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-white/80"
      >
        Spline Community
      </a>
      .
    </p>
  );
}
