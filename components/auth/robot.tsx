'use client';

import { useEffect, useRef } from 'react';

import { usePrefersReducedMotion } from '@/lib/hooks/use-motion';
import type { CrowdMood } from '@/components/auth/watching-crowd';

/**
 * The signup robot.
 *
 * Asked for as a Spline scene. That scene is unpublished - the editor URL is
 * auth-gated and both prod.spline.design and my.spline.design return 403 for
 * its id - so there is nothing to embed. Even published, it would have meant
 * shipping the Spline runtime and fetching a remote asset at page load, which
 * this build does not do anywhere else and could not do offline.
 *
 * So it is drawn and rigged here instead: SVG geometry, one rAF loop, no
 * dependency, about 6KB. It also does something an imported scene could not,
 * which is react to the form - the visor tracks the cursor while you fill in
 * your name, the eyes squash shut and the hands come up over them the moment
 * you focus the password, and it peeks between its fingers if you stop typing.
 *
 * lib/spline.ts still governs the swap: publish the scene, paste the URL, and
 * the Spline canvas replaces this.
 */

/** Where the head/eyes should be pointing, per mood. */
interface Pose {
  /** -1..1 horizontal gaze. */
  gazeX: number;
  gazeY: number;
  /** 0 = shut, 1 = open. */
  open: number;
  /** 0 = hands down, 1 = hands fully over the eyes. */
  cover: number;
  /** Head tilt in degrees. */
  tilt: number;
}

const REST: Pose = { gazeX: 0, gazeY: 0, open: 1, cover: 0, tilt: 0 };

export function AuthRobot({
  mood,
  peekProgress = 0,
  className,
}: {
  mood: CrowdMood;
  /** Rises 0 -> 1 while the user is idle on the password field. */
  peekProgress?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);

  // Read the latest props inside the loop without restarting it.
  const moodRef = useRef(mood);
  const peekRef = useRef(peekProgress);
  moodRef.current = mood;
  peekRef.current = peekProgress;

  const els = useRef<Record<string, SVGElement | null>>({});
  const pose = useRef<Pose>({ ...REST });
  const pointer = useRef({ x: 0.5, y: 0.4 });

  useEffect(() => {
    if (reduced) return;
    const svg = svgRef.current;
    if (!svg) return;

    function onMove(e: PointerEvent) {
      const r = svg!.getBoundingClientRect();
      if (!r.width) return;
      pointer.current = {
        x: (e.clientX - r.left) / r.width,
        y: (e.clientY - r.top) / r.height,
      };
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;

    const q = (id: string) => svgRef.current?.querySelector<SVGElement>(`#${id}`) ?? null;
    els.current = {
      head: q('r-head'),
      eyes: q('r-eyes'),
      pupilL: q('r-pupil-l'),
      pupilR: q('r-pupil-r'),
      lidL: q('r-lid-l'),
      lidR: q('r-lid-r'),
      handL: q('r-hand-l'),
      handR: q('r-hand-r'),
      antenna: q('r-antenna'),
      body: q('r-body'),
      mouth: q('r-mouth'),
      glow: q('r-glow'),
    };

    let raf = 0;
    const start = performance.now();
    let blink = 0;
    let nextBlink = 1400;

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const m = moodRef.current;
      const peek = peekRef.current;

      /* ---- Target pose from the form's state ---- */
      const target: Pose = { ...REST };

      if (m === 'away') {
        // Hands up over the eyes. The peek is a gap between two fingers, so
        // "peeking" opens the eyes rather than lowering the hands.
        target.cover = 1;
        target.open = peek > 0.5 ? 0.55 : 0;
        target.gazeX = peek > 0.5 ? 0.15 : 0;
        target.gazeY = peek > 0.5 ? 0.1 : 0;
        target.tilt = -4;
      } else if (m === 'watching') {
        // Leaning in at the form, which is to the left of the panel.
        target.gazeX = -0.55;
        target.gazeY = 0.15;
        target.open = 1;
        target.tilt = 5;
      } else {
        // Idle: follow the cursor, with a slow sway so it is never still.
        target.gazeX = (pointer.current.x - 0.5) * 1.6 + Math.sin(t * 0.7) * 0.12;
        target.gazeY = (pointer.current.y - 0.5) * 1.2;
        target.tilt = Math.sin(t * 0.5) * 2.5;
        target.open = 1;
      }

      // Blink, but never while the hands are up.
      if (target.cover < 0.4) {
        if (now - blink > nextBlink) {
          blink = now;
          nextBlink = 2200 + Math.random() * 2600;
        }
        const since = now - blink;
        if (since < 130) target.open = Math.min(target.open, Math.abs(since - 65) / 65);
      }

      /* ---- Ease toward it. Cover moves faster: hands snap up. ---- */
      const p = pose.current;
      const k = 0.12;
      p.gazeX += (target.gazeX - p.gazeX) * k;
      p.gazeY += (target.gazeY - p.gazeY) * k;
      p.tilt += (target.tilt - p.tilt) * 0.08;
      p.open += (target.open - p.open) * 0.3;
      p.cover += (target.cover - p.cover) * 0.18;

      /* ---- Write to the DOM ---- */
      const e = els.current;
      const bob = Math.sin(t * 1.1) * 3;

      e.head?.setAttribute(
        'transform',
        `translate(${p.gazeX * 6} ${bob + p.gazeY * 4}) rotate(${p.tilt} 100 86)`,
      );
      e.body?.setAttribute('transform', `translate(${p.gazeX * 2} ${bob * 0.4})`);

      const px = p.gazeX * 7;
      const py = p.gazeY * 5;
      e.pupilL?.setAttribute('transform', `translate(${px} ${py})`);
      e.pupilR?.setAttribute('transform', `translate(${px} ${py})`);

      // Lids close by scaling down from the eye's centre line.
      const lid = 1 - p.open;
      e.lidL?.setAttribute('transform', `translate(0 ${-14 * (1 - lid)}) scale(1 ${lid})`);
      e.lidR?.setAttribute('transform', `translate(0 ${-14 * (1 - lid)}) scale(1 ${lid})`);

      /*
        Hands travel from beside the body to squarely over each eye. Landing
        them on the eye centres rather than at the edges of the visor is what
        makes the gesture read as "covering its eyes" instead of as two shapes
        drifting across the face. A little rotation sells the wrist.
      */
      const c = p.cover;
      // Rest (58,150) -> eye (84,88), and mirrored on the right.
      e.handL?.setAttribute(
        'transform',
        `translate(${26 * c} ${-62 * c}) rotate(${-16 * c} 58 150)`,
      );
      e.handR?.setAttribute(
        'transform',
        `translate(${-26 * c} ${-62 * c}) rotate(${16 * c} 142 150)`,
      );

      // The antenna light pulses, and goes quiet while the eyes are covered.
      const pulse = 0.55 + Math.sin(t * 2.4) * 0.35;
      e.glow?.setAttribute('opacity', String((1 - c * 0.75) * pulse));
      e.antenna?.setAttribute('transform', `rotate(${Math.sin(t * 0.9) * 6} 100 34)`);

      // A small smile when watching, a flat line when covering.
      const smile = m === 'watching' ? 6 : 2;
      e.mouth?.setAttribute('d', `M88 112 Q100 ${112 + smile * (1 - c)} 112 112`);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 210"
      className={className}
      role="img"
      aria-label="An illustrated robot that covers its eyes while you type your password"
    >
      <defs>
        <linearGradient id="r-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d9e4f7" />
        </linearGradient>
        <radialGradient id="r-lamp">
          <stop offset="0%" stopColor="#8ef0c4" />
          <stop offset="100%" stopColor="#8ef0c4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Antenna */}
      <g id="r-antenna">
        <line x1="100" y1="46" x2="100" y2="28" stroke="#c3d2ea" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="24" r="6" fill="#7de3b8" />
        <circle id="r-glow" cx="100" cy="24" r="14" fill="url(#r-lamp)" />
      </g>

      {/* Body */}
      <g id="r-body">
        <rect x="62" y="130" width="76" height="56" rx="20" fill="url(#r-shell)" />
        <rect x="82" y="146" width="36" height="6" rx="3" fill="#c3d2ea" />
        <rect x="88" y="159" width="24" height="6" rx="3" fill="#dbe6f7" />
      </g>

      {/* Head */}
      <g id="r-head">
        <rect x="52" y="46" width="96" height="86" rx="30" fill="url(#r-shell)" />
        {/* Ears */}
        <rect x="42" y="76" width="12" height="28" rx="6" fill="#c3d2ea" />
        <rect x="146" y="76" width="12" height="28" rx="6" fill="#c3d2ea" />

        {/* Visor */}
        <rect x="64" y="64" width="72" height="44" rx="20" fill="#141c33" />

        {/* Eyes */}
        <g id="r-eyes">
          <g>
            <circle cx="86" cy="86" r="9" fill="#eaf3ff" />
            <circle id="r-pupil-l" cx="86" cy="86" r="4.6" fill="#2563eb" />
            {/* Lid: a rect that scales down over the eye. */}
            <rect id="r-lid-l" x="76" y="72" width="20" height="28" fill="#141c33" />
          </g>
          <g>
            <circle cx="114" cy="86" r="9" fill="#eaf3ff" />
            <circle id="r-pupil-r" cx="114" cy="86" r="4.6" fill="#2563eb" />
            <rect id="r-lid-r" x="104" y="72" width="20" height="28" fill="#141c33" />
          </g>
        </g>

        <path
          id="r-mouth"
          d="M88 112 Q100 114 112 112"
          fill="none"
          stroke="#9fb2d0"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>

      {/*
        Hands. Mittens rather than anatomical hands, drawn last so they pass
        over the face. The two grooves are finger gaps - the same gap it peeks
        through when you stop typing.
      */}
      <g id="r-hand-l">
        <circle cx="58" cy="150" r="17" fill="#f2f6fd" />
        <circle cx="58" cy="150" r="17" fill="none" stroke="#cfdcf0" strokeWidth="1.5" />
        <path d="M52 137 V163" stroke="#d7e2f3" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M64 137 V163" stroke="#d7e2f3" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g id="r-hand-r">
        <circle cx="142" cy="150" r="17" fill="#f2f6fd" />
        <circle cx="142" cy="150" r="17" fill="none" stroke="#cfdcf0" strokeWidth="1.5" />
        <path d="M136 137 V163" stroke="#d7e2f3" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M148 137 V163" stroke="#d7e2f3" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
