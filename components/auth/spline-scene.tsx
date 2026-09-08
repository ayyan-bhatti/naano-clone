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
export function SplineScene({ className }: { className?: string }) {
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

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
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn(
            'pointer-events-none absolute inset-0 size-full border-0',
            'transition-opacity duration-700 ease-out',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      {/* Placeholder until the scene paints, so the panel is never empty. */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="size-6 animate-spin rounded-full border-2 border-white/15 border-t-white/50" />
        </div>
      )}
    </div>
  );
}

/** Attribution required by the scene's CC BY 4.0 licence. */
export function SplineCredit({ className }: { className?: string }) {
  return (
    <p className={cn('text-[11px] leading-relaxed text-white/35', className)}>
      3D scene{' '}
      <a
        href={SPLINE_CREDIT.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-white/60"
      >
        “{SPLINE_CREDIT.title}”
      </a>{' '}
      by{' '}
      <a
        href={SPLINE_CREDIT.authorUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-white/60"
      >
        {SPLINE_CREDIT.author}
      </a>
      , licensed under{' '}
      <a
        href={SPLINE_CREDIT.licenceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-white/60"
      >
        {SPLINE_CREDIT.licence}
      </a>
      .
    </p>
  );
}
