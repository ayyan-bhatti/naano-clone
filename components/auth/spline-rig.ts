'use client';

import { useEffect, useRef } from 'react';

import { usePrefersReducedMotion } from '@/lib/hooks/use-motion';
import type { SplineApp, SplineObject } from '@/components/auth/spline-scene';
import type { CrowdMood } from '@/components/auth/watching-crowd';

/**
 * Driving the Spline robot from the form.
 *
 * The scene is fully rigged - Head, Neck, Top part, and a Hand LEFT on each
 * arm - and `@splinetool/react-spline` hands back the runtime Application on
 * load, so the objects can be posed directly every frame. That is the whole
 * reason this build renders the scene inline instead of embedding the
 * published viewer in an iframe: a cross-origin frame can be looked at, but it
 * cannot be told which field is focused.
 *
 * So the 3D robot now reacts to the form. It tracks the cursor while you are
 * idle, turns to watch while you fill in your name and email, turns away and
 * dips its head the moment the password field takes focus, and glances back if
 * you stop typing.
 *
 * What it does NOT do is raise its hands, and that is a limit of the scene
 * rather than a choice. The arms are driven by the scene's own looping
 * timeline, which runs inside Spline's render pass and reverts any write to
 * Hand LEFT, arm or elbow before the next frame is drawn - verified by writing
 * a large offset and reading it straight back unchanged. The head, neck and
 * torso carry no such animation, so those are ours to pose. The
 * hands-over-eyes gesture stays on the hand-drawn robot, which owns every
 * joint it has.
 */

interface Pose {
  headYaw: number;
  headPitch: number;
  headRoll: number;
  bodyYaw: number;
}

const REST: Pose = { headYaw: 0, headPitch: 0, headRoll: 0, bodyYaw: 0 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function useSplineRig(
  app: SplineApp | null,
  mood: CrowdMood,
  peekProgress: number,
) {
  const reduced = usePrefersReducedMotion();

  // Read the latest props inside the loop without restarting it.
  const moodRef = useRef(mood);
  const peekRef = useRef(peekProgress);
  moodRef.current = mood;
  peekRef.current = peekProgress;

  const pointer = useRef({ x: 0.5, y: 0.45 });
  const pose = useRef<Pose>({ ...REST });

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      pointer.current = {
        x: e.clientX / Math.max(window.innerWidth, 1),
        y: e.clientY / Math.max(window.innerHeight, 1),
      };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  useEffect(() => {
    if (!app || reduced) return;

    const head: SplineObject | null = app.findObjectByName?.('Head') ?? null;
    const neck: SplineObject | null = app.findObjectByName?.('Neck') ?? null;
    const top: SplineObject | null = app.findObjectByName?.('Top part') ?? null;

    if (!head) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const m = moodRef.current;
      const peek = peekRef.current;
      const target: Pose = { ...REST };

      if (m === 'away') {
        /*
          Turned right away from the form and dipped, so it is unmistakably not
          looking. Peeking brings it most of the way back without settling —
          it is a glance, not a return.
        */
        const peeking = peek > 0.5;
        target.headYaw = peeking ? 0.18 : 0.62;
        target.headPitch = peeking ? 0.04 : 0.26;
        target.headRoll = peeking ? -0.04 : -0.12;
        target.bodyYaw = peeking ? 0.06 : 0.2;
      } else if (m === 'watching') {
        // The form is in the left column, so the robot turns that way.
        target.headYaw = -0.42;
        target.headPitch = -0.1;
        target.bodyYaw = -0.14;
      } else {
        // Idle: follow the cursor, with a slow sway so it is never quite still.
        target.headYaw = (0.5 - pointer.current.x) * 0.9 + Math.sin(t * 0.6) * 0.05;
        target.headPitch = (pointer.current.y - 0.45) * 0.55;
        target.headRoll = Math.sin(t * 0.45) * 0.03;
        target.bodyYaw = (0.5 - pointer.current.x) * 0.22;
      }

      const p = pose.current;
      // Turning away is quicker than settling back: a flinch, then a drift.
      const ease = m === 'away' ? 0.14 : 0.08;
      p.headYaw = lerp(p.headYaw, target.headYaw, ease);
      p.headPitch = lerp(p.headPitch, target.headPitch, ease);
      p.headRoll = lerp(p.headRoll, target.headRoll, 0.07);
      p.bodyYaw = lerp(p.bodyYaw, target.bodyYaw, 0.06);

      head.rotation.y = p.headYaw;
      head.rotation.x = p.headPitch;
      head.rotation.z = p.headRoll;

      // The neck takes a share of the turn so the head does not detach.
      if (neck) {
        neck.rotation.y = p.headYaw * 0.35;
        neck.rotation.x = p.headPitch * 0.3;
      }
      if (top) top.rotation.y = p.bodyYaw;

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [app, reduced]);
}
