'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '@/lib/hooks/use-motion';

/**
 * The watching crowd.
 *
 * An audience of ~100 faces that reacts to what you are typing:
 *
 *   - name / email focused  -> they all turn and watch the field
 *   - password focused      -> they look away and shut their eyes
 *   - password + you pause  -> a few of them sneak a peek
 *   - nothing focused       -> they idle, drifting toward the cursor
 *
 * Built by hand in SVG rather than embedded from Spline on purpose. A Spline
 * scene means a ~1.5MB runtime plus a scene fetched from their CDN at load,
 * which would break the one promise this build is staked on - that it has no
 * external runtime dependency and therefore cannot fail in front of a reviewer.
 * This is ~6KB, renders on the server, and the eyes actually track a real
 * target rather than playing a canned animation.
 *
 * Performance: React renders the faces once. Every frame after that writes
 * directly to cached DOM refs inside a single rAF loop - no re-renders, no
 * state churn, ~100 elements updated per frame. Under prefers-reduced-motion
 * the loop never starts and the crowd renders in its resting state.
 */

export type CrowdMood = 'idle' | 'watching' | 'away';

/** Headwear, so the crowd reads as individuals rather than repeated dots. */
type Accessory = 'none' | 'cap' | 'beanie' | 'headphones' | 'glasses';

interface Face {
  id: number;
  x: number;
  y: number;
  r: number;
  /** 0 = far/back, 1 = near/front. Drives size, opacity and blur. */
  depth: number;
  hue: number;
  /** Per-face animation offset so they never move in lockstep. */
  phase: number;
  /** Whether this face is one of the ones that peeks. */
  peeker: boolean;
  accessory: Accessory;
  /** Mirrors the cap brim and shifts the body, so neighbours are not clones. */
  flip: boolean;
}

/**
 * A spread of hues rather than one ramp. A crowd of a single colour reads as a
 * pattern; a mixed one reads as people.
 */
const HUES = [222, 262, 196, 158, 28, 340, 244, 178];

/** Roughly half the crowd wears something. More than that reads as costume. */
const ACCESSORIES: Accessory[] = [
  'none',
  'none',
  'none',
  'none',
  'cap',
  'cap',
  'beanie',
  'headphones',
  'glasses',
  'glasses',
];

/**
 * Two shapes of crowd.
 *
 * `wide` is the original full-bleed landscape field. `panel` is a portrait
 * version for the blue column on the auth pages - and it exists because the
 * landscape one cannot simply be cropped to fit. Slicing a 1440x900 field into
 * a 660-wide column shows only its middle, and the middle is the clearing, so
 * the panel rendered as an empty band with faces stranded at the edges.
 *
 * The clearing is smaller in the panel: the statement it makes room for is a
 * few lines of text, not a whole form.
 */
export type CrowdLayout = 'wide' | 'panel';

interface LayoutSpec {
  w: number;
  h: number;
  cols: number;
  rows: number;
  /** Radius of the face-free centre, as a fraction of the half-diagonal. */
  clearing: number;
  /** Face radius range, near to far. */
  minR: number;
  maxR: number;
}

const LAYOUTS: Record<CrowdLayout, LayoutSpec> = {
  wide: { w: 1440, h: 900, cols: 16, rows: 11, clearing: 0.42, minR: 10, maxR: 22 },
  panel: { w: 820, h: 1180, cols: 9, rows: 16, clearing: 0.3, minR: 11, maxR: 25 },
};

function hash(n: number): number {
  let h = (n + 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
}

/**
 * Deterministic layout so server and client render identically.
 *
 * A staggered grid with the middle cleared, so the crowd forms a ring around the
 * centred form rather than sitting behind it. Faces that land inside the
 * clearing are dropped instead of being shoved outward - pushing them creates a
 * visible pile-up along the boundary that reads as a rendering bug.
 */
function buildFaces(spec: LayoutSpec): Face[] {
  const faces: Face[] = [];
  let id = 0;

  const { w: VIEW_W, h: VIEW_H, cols: COLS, rows: ROWS, clearing: CLEARING } = spec;
  const focusX = VIEW_W / 2;
  const focusY = VIEW_H / 2;
  const halfDiag = Math.hypot(VIEW_W / 2, VIEW_H / 2);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const seed = row * COLS + col;
      const a = hash(seed * 3 + 1);
      const b = hash(seed * 7 + 2);
      const c = hash(seed * 11 + 3);

      // Back rows sit higher and smaller: a crowd receding into the distance.
      const depth = row / (ROWS - 1);
      const jitterX = (a - 0.5) * 46;
      const jitterY = (b - 0.5) * 30;

      // Stagger alternate rows so it reads as a crowd, not a grid.
      const offset = row % 2 === 0 ? 0 : VIEW_W / COLS / 2;

      const x = (col + 0.5) * (VIEW_W / COLS) + offset + jitterX;
      const y = 60 + row * ((VIEW_H - 120) / (ROWS - 1)) + jitterY;

      // Keep the middle clear for the form. The boundary is jittered per face so
      // the edge of the crowd is ragged rather than a perfect circle.
      const distance = Math.hypot(x - focusX, y - focusY) / halfDiag;
      if (distance < CLEARING + (c - 0.5) * 0.09) continue;

      const d = hash(seed * 13 + 5);
      const e = hash(seed * 19 + 7);

      faces.push({
        id: id++,
        x,
        y,
        r: spec.minR + depth * (spec.maxR - spec.minR),
        depth,
        hue: HUES[Math.floor(c * HUES.length) % HUES.length],
        phase: a * Math.PI * 2,
        peeker: c > 0.8,
        accessory: ACCESSORIES[Math.floor(d * ACCESSORIES.length) % ACCESSORIES.length],
        flip: e > 0.5,
      });
    }
  }

  // Draw far faces first so near ones overlap them.
  return faces.sort((f1, f2) => f1.depth - f2.depth);
}

interface FaceRefs {
  group: SVGGElement | null;
  pupils: SVGGElement | null;
  open: SVGGElement | null;
  shut: SVGGElement | null;
}

export function WatchingCrowd({
  mood,
  /** Rises 0 -> 1 while the user is idle on the password field. */
  peekProgress = 0,
  layout = 'wide',
  className,
}: {
  mood: CrowdMood;
  peekProgress?: number;
  layout?: CrowdLayout;
  className?: string;
}) {
  const spec = LAYOUTS[layout];
  const VIEW_W = spec.w;
  const VIEW_H = spec.h;
  const FOCUS_X = VIEW_W / 2;
  const FOCUS_Y = VIEW_H / 2;

  const faces = useMemo(() => buildFaces(spec), [spec]);
  const reduced = usePrefersReducedMotion();

  const refs = useRef<FaceRefs[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // Latest props read inside the rAF loop without restarting it.
  const moodRef = useRef(mood);
  const peekRef = useRef(peekProgress);
  moodRef.current = mood;
  peekRef.current = peekProgress;

  // Pointer target, in viewBox units.
  const pointer = useRef({ x: VIEW_W * 1.15, y: VIEW_H * 0.42 });

  useEffect(() => {
    if (reduced) return;

    const svg = svgRef.current;
    if (!svg) return;

    function onPointerMove(e: PointerEvent) {
      const rect = svg!.getBoundingClientRect();
      if (rect.width === 0) return;
      pointer.current = {
        x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
        y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
      };
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [reduced, VIEW_W, VIEW_H]);

  useEffect(() => {
    if (reduced) return;

    let raf = 0;
    const start = performance.now();

    // Per-face eased state, so a mood change glides instead of snapping.
    const eye = faces.map(() => ({ x: 0, y: 0, openness: 1, turn: 0 }));

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const currentMood = moodRef.current;
      const peek = peekRef.current;

      for (let i = 0; i < faces.length; i += 1) {
        const face = faces[i];
        const ref = refs.current[i];
        if (!ref?.group) continue;

        // Where this face wants to look.
        let targetX: number;
        let targetY: number;
        let targetOpen: number;
        let targetTurn: number;

        // A peeker sneaks back once the pause is long enough. The threshold is
        // staggered per face so they do not all peek on the same frame.
        const peeking =
          currentMood === 'away' && face.peeker && peek > 0.35 + hash(face.id * 17) * 0.4;

        if (currentMood === 'away' && !peeking) {
          // Turn away from the form, eyes shut.
          targetX = -1;
          targetY = 0.25;
          targetOpen = 0;
          targetTurn = -1;
        } else if (currentMood === 'watching' || peeking) {
          // Look at the form in the middle of the screen. Everyone converging on
          // one point is the whole effect - if the target drifts off-canvas the
          // gazes go parallel and it stops reading as "being watched".
          const dx = FOCUS_X - face.x;
          const dy = FOCUS_Y - face.y;
          const len = Math.hypot(dx, dy) || 1;
          targetX = dx / len;
          targetY = dy / len;
          targetOpen = peeking ? 0.55 : 1;
          targetTurn = 0;
        } else {
          // Idle: drift toward the cursor with a slow individual sway.
          const dx = pointer.current.x - face.x;
          const dy = pointer.current.y - face.y;
          const len = Math.hypot(dx, dy) || 1;
          targetX = (dx / len) * 0.75 + Math.sin(t * 0.6 + face.phase) * 0.2;
          targetY = (dy / len) * 0.75 + Math.cos(t * 0.5 + face.phase) * 0.12;
          targetOpen = 1;
          targetTurn = 0;
        }

        // Blink: brief, offset per face, skipped while eyes are already shut.
        const blinkCycle = (t + face.phase * 1.7) % 5.2;
        const blinking = blinkCycle < 0.13 && targetOpen > 0.5;
        if (blinking) targetOpen = 0;

        const s = eye[i];
        // Peeking eases faster - a sneak should feel quick and furtive.
        const ease = peeking ? 0.16 : 0.09;
        s.x += (targetX - s.x) * ease;
        s.y += (targetY - s.y) * ease;
        s.openness += (targetOpen - s.openness) * (blinking ? 0.42 : 0.13);
        s.turn += (targetTurn - s.turn) * 0.08;

        const travel = face.r * 0.22;
        if (ref.pupils) {
          ref.pupils.setAttribute(
            'transform',
            `translate(${(s.x * travel).toFixed(2)} ${(s.y * travel).toFixed(2)})`,
          );
        }

        // Cross-fade open eyes against the shut arcs.
        if (ref.open) ref.open.setAttribute('opacity', s.openness.toFixed(3));
        if (ref.shut) ref.shut.setAttribute('opacity', (1 - s.openness).toFixed(3));

        // The whole head leans away, which sells the turn far more than the
        // pupils alone do.
        const lean = s.turn * face.r * 0.3;
        const bob = Math.sin(t * 0.7 + face.phase) * (1 - face.depth * 0.5);
        ref.group.setAttribute(
          'transform',
          `translate(${(face.x + lean).toFixed(2)} ${(face.y + bob).toFixed(2)})`,
        );
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [faces, reduced, FOCUS_X, FOCUS_Y]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/*
          Donut mask: soft on the inside so the crowd dissolves as it approaches
          the form, soft on the outside so it does not end at a hard edge.
        */}
        <radialGradient id="crowd-fade" cx="50%" cy="50%" r="72%">
          <stop offset="28%" stopColor="black" />
          <stop offset="46%" stopColor="white" />
          <stop offset="86%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id="crowd-mask">
          <rect width={VIEW_W} height={VIEW_H} fill="url(#crowd-fade)" />
        </mask>
      </defs>

      <g mask="url(#crowd-mask)">
        {faces.map((face, i) => {
          const eyeOffset = face.r * 0.34;
          const eyeY = -face.r * 0.08;
          const pupil = Math.max(1.5, face.r * 0.15);
          // Nearer faces are brighter; the back of the crowd falls away.
          const bodyOpacity = 0.14 + face.depth * 0.5;

          return (
            <g
              key={face.id}
              ref={(el) => {
                refs.current[i] = { ...(refs.current[i] ?? { group: null, pupils: null, open: null, shut: null }), group: el };
              }}
              transform={`translate(${face.x} ${face.y})`}
            >
              {/* Shoulders. Drawn first so the head sits in front of them. */}
              <rect
                x={-face.r * 1.12}
                y={face.r * 0.92}
                width={face.r * 2.24}
                height={face.r * 1.7}
                rx={face.r * 0.78}
                fill={`hsl(${face.hue} 62% ${44 + face.depth * 12}%)`}
                opacity={bodyOpacity * 0.85}
              />

              {/* Head */}
              <circle
                r={face.r}
                fill={`hsl(${face.hue} 70% ${58 + face.depth * 14}%)`}
                opacity={bodyOpacity}
              />
              {/* Offset highlight - cheap volume without a per-face gradient */}
              <circle
                cx={-face.r * 0.24}
                cy={-face.r * 0.28}
                r={face.r * 0.7}
                fill="#ffffff"
                opacity={0.05 + face.depth * 0.07}
              />
              <circle
                r={face.r}
                fill="none"
                stroke={`hsl(${face.hue} 85% 78%)`}
                strokeWidth={0.7}
                opacity={0.12 + face.depth * 0.28}
              />

              {/* Headwear */}
              <Headwear face={face} opacity={bodyOpacity} />

              {/* Open eyes */}
              <g
                ref={(el) => {
                  refs.current[i] = { ...(refs.current[i] ?? { group: null, pupils: null, open: null, shut: null }), open: el };
                }}
              >
                <g
                  ref={(el) => {
                    refs.current[i] = { ...(refs.current[i] ?? { group: null, pupils: null, open: null, shut: null }), pupils: el };
                  }}
                >
                  <circle cx={-eyeOffset} cy={eyeY} r={pupil} fill="#f4f6ff" opacity={0.55 + face.depth * 0.45} />
                  <circle cx={eyeOffset} cy={eyeY} r={pupil} fill="#f4f6ff" opacity={0.55 + face.depth * 0.45} />
                </g>
              </g>

              {/* Shut eyes - two small arcs, cross-faded against the pupils */}
              <g
                opacity={0}
                ref={(el) => {
                  refs.current[i] = { ...(refs.current[i] ?? { group: null, pupils: null, open: null, shut: null }), shut: el };
                }}
              >
                <path
                  d={`M${-eyeOffset - pupil} ${eyeY} q${pupil} ${pupil * 1.1} ${pupil * 2} 0`}
                  fill="none"
                  stroke="#f4f6ff"
                  strokeWidth={Math.max(0.9, pupil * 0.55)}
                  strokeLinecap="round"
                  opacity={0.5 + face.depth * 0.4}
                />
                <path
                  d={`M${eyeOffset - pupil} ${eyeY} q${pupil} ${pupil * 1.1} ${pupil * 2} 0`}
                  fill="none"
                  stroke="#f4f6ff"
                  strokeWidth={Math.max(0.9, pupil * 0.55)}
                  strokeLinecap="round"
                  opacity={0.5 + face.depth * 0.4}
                />
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/**
 * Headwear for one face.
 *
 * Purely decorative and never animated, so it stays out of the rAF loop - only
 * the group transform, pupils and eyelids are touched per frame.
 */
function Headwear({ face, opacity }: { face: Face; opacity: number }) {
  const r = face.r;
  const dir = face.flip ? -1 : 1;
  const shade = `hsl(${face.hue} 55% ${30 + face.depth * 14}%)`;
  const light = `hsl(${face.hue} 70% ${64 + face.depth * 10}%)`;

  switch (face.accessory) {
    case 'cap':
      return (
        <g opacity={opacity * 1.05}>
          {/* Dome */}
          <path d={`M ${-r * 1.0} ${-r * 0.34} a ${r} ${r} 0 0 1 ${r * 2} 0 Z`} fill={shade} />
          {/* Brim, pointing whichever way this face is turned */}
          <rect
            x={dir > 0 ? r * 0.6 : -r * 2.05}
            y={-r * 0.46}
            width={r * 1.45}
            height={r * 0.26}
            rx={r * 0.13}
            fill={shade}
          />
        </g>
      );

    case 'beanie':
      return (
        <g opacity={opacity * 1.05}>
          <path d={`M ${-r * 0.98} ${-r * 0.4} a ${r * 0.98} ${r * 0.98} 0 0 1 ${r * 1.96} 0 Z`} fill={shade} />
          <rect
            x={-r * 1.02}
            y={-r * 0.5}
            width={r * 2.04}
            height={r * 0.26}
            rx={r * 0.13}
            fill={light}
          />
          <circle cy={-r * 1.12} r={r * 0.17} fill={light} />
        </g>
      );

    case 'headphones':
      return (
        <g opacity={opacity * 1.05}>
          <path
            d={`M ${-r * 1.02} ${-r * 0.1} a ${r * 1.02} ${r * 1.02} 0 0 1 ${r * 2.04} 0`}
            fill="none"
            stroke={shade}
            strokeWidth={r * 0.2}
            strokeLinecap="round"
          />
          <rect x={-r * 1.2} y={-r * 0.28} width={r * 0.34} height={r * 0.6} rx={r * 0.16} fill={shade} />
          <rect x={r * 0.86} y={-r * 0.28} width={r * 0.34} height={r * 0.6} rx={r * 0.16} fill={shade} />
        </g>
      );

    case 'glasses':
      // Sits over the eyes, so it stays readable whether they are open or shut.
      return (
        <g opacity={opacity * 0.9} fill="none" stroke={light} strokeWidth={r * 0.08}>
          <circle cx={-r * 0.34} cy={-r * 0.08} r={r * 0.3} />
          <circle cx={r * 0.34} cy={-r * 0.08} r={r * 0.3} />
          <path d={`M ${-r * 0.04} ${-r * 0.08} L ${r * 0.04} ${-r * 0.08}`} />
        </g>
      );

    default:
      return null;
  }
}

/**
 * Tracks which field is focused and how long the user has paused, and turns
 * that into a crowd mood. Kept separate from the visual so the auth pages only
 * have to wire `onFocus`, `onBlur` and `onChange`.
 *
 * The peek is driven by a low-frequency interval rather than a per-frame timer:
 * it only needs to know roughly how long you have been still, and polling at
 * 11Hz keeps it off the render path.
 */
export function useCrowdMood() {
  const [mood, setMood] = useState<CrowdMood>('idle');
  const [peekProgress, setPeekProgress] = useState(0);
  const lastTyped = useRef(0);

  useEffect(() => {
    if (mood !== 'away') {
      setPeekProgress(0);
      return;
    }
    const id = window.setInterval(() => {
      const idleMs = Date.now() - lastTyped.current;
      // 900ms of stillness before anyone risks it, then a 900ms ramp so they
      // sneak back in ones and twos rather than all at once.
      setPeekProgress(Math.min(1, Math.max(0, (idleMs - 900) / 900)));
    }, 90);
    return () => window.clearInterval(id);
  }, [mood]);

  const onFieldFocus = useCallback((kind: 'public' | 'secret') => {
    lastTyped.current = Date.now();
    setMood(kind === 'secret' ? 'away' : 'watching');
  }, []);

  const onFieldBlur = useCallback(() => setMood('idle'), []);

  const onType = useCallback(() => {
    lastTyped.current = Date.now();
    setPeekProgress(0);
  }, []);

  return { mood, peekProgress, onFieldFocus, onFieldBlur, onType };
}
