'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import { SPLINE_CREDIT, SPLINE_SCENE_URL } from '@/lib/spline';
import { usePrefersReducedMotion } from '@/lib/hooks/use-motion';

/**
 * The Spline robot.
 *
 * Rendered inline with @splinetool/react-spline against the scene's own
 * `prod.spline.design/.../scene.splinecode` file. The earlier version embedded
 * the published viewer in an iframe, because that scene was only ever
 * published as a viewer page and its `.splinecode` returned 403. This one is a
 * real 1.3MB scene file, and rendering it directly is better in every way that
 * mattered:
 *
 *  - The canvas has a transparent background, so the robot sits on our blue
 *    panel instead of bringing a grey rectangle with it.
 *  - `onLoad` is a genuine "the scene is ready" signal. The iframe's load event
 *    fired a dozen seconds before anything appeared, which is why that version
 *    needed a measured delay to avoid showing an empty panel.
 *  - No cross-origin frame, so no separate GPU surface to fight with and
 *    nothing that can steal focus from the form.
 *
 * The runtime is ~1.5MB, so it is pulled in with next/dynamic and never
 * reaches any page but the two auth screens. It is still the one external
 * runtime dependency in the build: set SPLINE_SCENE_URL to '' and the
 * hand-built robot underneath takes over permanently.
 */

/*
  The bare specifier is aliased to the package's built ESM file in
  next.config.ts - see the note there for why the exports map cannot be used.
  Loaded through next/dynamic with ssr:false so the ~1.5MB runtime stays out of
  the server bundle and off every route but these two.
*/
const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => null,
});

/**
 * The subset of Spline's Application we use. Typing it here rather than
 * importing keeps the runtime out of the server's type graph, and documents
 * exactly how much of that API this build depends on.
 */
export interface SplineApp {
  getAllObjects?: () => { name: string; visible: boolean }[];
  findObjectByName?: (name: string) => SplineObject | undefined;
  setVariable?: (name: string, value: unknown) => void;
  emitEvent?: (event: string, target: string) => void;
}

export interface SplineObject {
  name: string;
  rotation: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export function SplineScene({
  className,
  onReady,
  onApp,
}: {
  className?: string;
  /** Fires once the scene has actually loaded, so the fallback can stand down. */
  onReady?: () => void;
  /** Hands the caller the runtime, so the scene can be driven by the form. */
  onApp?: (app: SplineApp) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const reduced = usePrefersReducedMotion();

  /**
   * Under reduced motion the scene is not loaded at all. It is a continuously
   * looping 3D animation with no still frame, so the only honest way to
   * respect that setting is not to render it - the hand-built robot beneath is
   * static under the same setting and stands in.
   */
  if (reduced || !SPLINE_SCENE_URL) return null;

  /*
    A span, not a div. This is rendered inside the assistant's launcher button,
    and <button> takes phrasing content - a div in there is reparented by the
    HTML parser, which silently collapsed the launcher to a 16x21 box. `block`
    restores the layout behaviour a div would have had.
  */
  return (
    <span className={cn('pointer-events-none block', className)} aria-hidden>
      <Spline
        scene={SPLINE_SCENE_URL}
        // The runtime's own Application type is structurally wider than the
        // slice we use, so it is narrowed here rather than in the prop.
        onLoad={(runtime) => {
          const app = runtime as unknown as SplineApp;
          setLoaded(true);
          onReady?.();
          onApp?.(app);
          // Handy for probing object names from a devtools console or a
          // Playwright script; harmless, and it is how the rig below was built.
          if (typeof window !== 'undefined') {
            (window as unknown as { __splineApp?: SplineApp }).__splineApp = app;
          }
        }}
        className={cn(
          '!size-full transition-opacity duration-700 ease-out',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
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
