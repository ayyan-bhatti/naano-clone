'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';
import { isSplineEnabled } from '@/lib/spline';
import { usePrefersReducedMotion } from '@/lib/hooks/use-motion';
import { AuthRobot } from '@/components/auth/robot';
import { SplineScene } from '@/components/auth/spline-scene';

/**
 * The assistant's face: the same 3D robot as the auth pages, in a circle.
 *
 * Two problems had to be solved to put a WebGL scene in a 56px bubble on every
 * route, and both are about cost rather than looks.
 *
 * It must not compete with the page. The scene is ~1.5MB of runtime plus a
 * 1.3MB file, so it is not requested until the browser reports itself idle -
 * `requestIdleCallback` after first paint, with a timeout so it still arrives
 * on browsers that never go idle. Until then the hand-drawn SVG robot is the
 * avatar, which is a few kilobytes and renders instantly, and it stays if the
 * scene never loads at all.
 *
 * And it must be legible at 56px. A full-body robot scaled into a circle is an
 * unreadable smudge, so the canvas is rendered several times the size of its
 * container and offset upward, cropping to the head and shoulders - a portrait
 * rather than a shrunken wide shot.
 */
export function AssistantAvatar({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [idle, setIdle] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (reduced || !isSplineEnabled()) return;

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;

    if (typeof w.requestIdleCallback === 'function') {
      // The timeout matters: some browsers never fire this on a busy page.
      w.requestIdleCallback(() => setIdle(true), { timeout: 4000 });
      return;
    }
    const t = window.setTimeout(() => setIdle(true), 2500);
    return () => window.clearTimeout(t);
  }, [reduced]);

  /*
    Framing the head, solved rather than eyeballed.

    Two facts, measured off the scene rendered into a square canvas: the head
    Spline reframes the scene to whatever aspect the canvas has, so the head is
    in a different place depending on the canvas shape - which is why guessing
    from the square render kept missing. The reliable numbers come from the
    aspect already in use on the auth pages: at roughly 0.735 (a 662x900 panel)
    the head centre sits at f = 0.23 of the height and the head is h = 0.20 of
    it.

    So the canvas keeps that portrait aspect rather than matching the circle.
    For the head to fill half a 56px circle it needs to be 28px, so the canvas
    is H = 28 / 0.20 = 140px tall and W = 0.735·H = 103px wide - 250% and 184%
    of the circle. The head centre then falls 0.23·140 = 32px down the canvas,
    and pulling it to the middle of the circle means offsetting the canvas by
    28 - 32 = -4px, which is -7.5%.

    Everything is expressed in percentages of the circle so it holds at the
    header size too.
  */
  return (
    <div className={cn('relative overflow-hidden rounded-full', className)}>
      {/* Instant, and the permanent fallback if the scene never arrives. */}
      <AuthRobot
        mood="idle"
        className={cn(
          'absolute inset-0 size-full transition-opacity duration-500',
          loaded ? 'opacity-0' : 'opacity-100',
        )}
      />

      {idle && (
        <div className="absolute left-1/2 top-[-7.5%] h-[250%] w-[184%] -translate-x-1/2">
          <SplineScene className="size-full" onReady={() => setLoaded(true)} />
        </div>
      )}
    </div>
  );
}
