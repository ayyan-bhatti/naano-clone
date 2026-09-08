'use client';

import { useEffect, useRef } from 'react';
import { Link2, TrendingUp } from 'lucide-react';

import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks/use-gsap';

/**
 * The hero's floating product fragments.
 *
 * Three cards that assemble on load rather than appearing: they arrive
 * staggered, settle into their rotations, and then a pulse travels the rail
 * from the tracked link up to the pipeline tile on a slow loop. That pulse is
 * the entire pitch of the product rendered as motion - a click leaving a post
 * and landing in a number - which is worth more here than a screenshot of a
 * dashboard nobody can read at this size.
 *
 * The cards also lean toward the pointer. That is done with `gsap.quickTo`,
 * which writes to a pre-compiled setter rather than creating a tween per mouse
 * event; a naive `gsap.to()` inside a mousemove handler allocates a tween ~60
 * times a second and is the usual reason these effects feel sticky.
 */
export function HeroStack() {
  const stage = useRef<HTMLDivElement>(null);

  const scope = useGsap<HTMLDivElement>((self) => {
    // gsap types `selector` loosely; everything it can match here is an
    // HTMLElement, and saying so keeps the callbacks below typed.
    const q = self.selector as (s: string) => HTMLElement[];
    const cards = q('[data-card]');
    if (!cards.length) return;

    /* ---- Assemble ---- */
    gsap
      .timeline({ delay: 0.35 })
      .from(cards, {
        y: 34,
        opacity: 0,
        rotate: 0,
        scale: 0.96,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.13,
      })
      // The rail draws only once the cards it connects have landed.
      .from(q('[data-rail]'), { scaleY: 0, transformOrigin: 'bottom center', duration: 0.7 }, '-=0.4');

    /* ---- The pulse: a click travelling from the link up to pipeline ---- */
    const pulse = q('[data-pulse]')[0];
    if (pulse) {
      gsap
        .timeline({ repeat: -1, repeatDelay: 2, delay: 1.6 })
        .set(pulse, { yPercent: 0, opacity: 0 })
        .to(pulse, { opacity: 1, duration: 0.28 }, 0)
        .to(pulse, { yPercent: -100, duration: 1.45, ease: 'power1.inOut' }, 0)
        // Fades over the last third so it arrives at the tile rather than
        // blinking out at the end of the rail.
        .to(pulse, { opacity: 0, duration: 0.4 }, 1.05);
    }

    /* ---- Ambient float, so the stack is never completely still ---- */
    cards.forEach((card, i) => {
      gsap.to(card, {
        y: i % 2 === 0 ? -8 : 8,
        duration: 3.4 + i * 0.45,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1.4 + i * 0.2,
      });
    });
  }, []);

  /* ---- Pointer parallax ---- */
  useEffect(() => {
    const el = stage.current;
    if (!el || prefersReducedMotion()) return;
    // Coarse pointers have no hover position to follow.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-card]'));
    // One compiled setter per card per axis, reused for the life of the effect.
    const setters = cards.map((card, i) => {
      const depth = 1 + i * 0.55;
      return {
        x: gsap.quickTo(card, 'xPercent', { duration: 0.7, ease: 'power3.out' }),
        y: gsap.quickTo(card, 'yPercent', { duration: 0.7, ease: 'power3.out' }),
        depth,
      };
    });

    function onMove(e: PointerEvent) {
      const r = el!.getBoundingClientRect();
      // -1..1 from the centre of the stage.
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      setters.forEach((s) => {
        s.x(nx * s.depth * 1.6);
        s.y(ny * s.depth * 1.1);
      });
    }

    function onLeave() {
      setters.forEach((s) => {
        s.x(0);
        s.y(0);
      });
    }

    // Listening on the section, not the cards: tracking only while the pointer
    // is literally over a card makes the effect stutter between them.
    const section = el.closest('section') ?? el;
    section.addEventListener('pointermove', onMove as EventListener);
    section.addEventListener('pointerleave', onLeave);
    return () => {
      section.removeEventListener('pointermove', onMove as EventListener);
      section.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={scope}>
      <div ref={stage} className="relative mx-auto hidden h-[430px] w-full max-w-[460px] lg:block">
        {/*
          The rail runs between the tracked link and the pipeline tile, which
          are stacked in the right-hand column precisely so this connection is
          legible. The pulse travels up it: a click leaving the link and
          arriving as pipeline.
        */}
        <div
          aria-hidden
          data-rail
          className="absolute left-[348px] top-[158px] h-[110px] w-px overflow-hidden bg-gradient-to-t from-white/30 to-white/5"
        >
          <span
            data-pulse
            className="absolute bottom-0 left-1/2 block h-10 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-t from-transparent via-[#7de3b8] to-transparent"
          />
        </div>

        {/* Creator match card */}
        <div
          data-card
          className="absolute left-0 top-[72px] z-10 w-[272px] rotate-[-3deg] rounded-[16px] border border-white/12 bg-white/[0.07] p-4 shadow-pop backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
              style={{ backgroundImage: 'linear-gradient(135deg,#3f63e8,#6d28d9)' }}
            >
              MF
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-white">Marta Ferreira</p>
              <p className="truncate text-[11.5px] text-white/50">RevOps · Sales</p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-white/45">
              Matching
            </span>
            <span className="tabular text-[13px] font-semibold text-white">88/100</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/12">
            <div
              data-bar
              className="h-full w-[88%] rounded-full bg-gradient-to-r from-[#3f63e8] to-[#9db2ff]"
            />
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-white/45">
            70% of this audience is Sales leaders, RevOps and Founders
          </p>
        </div>

        {/* Pipeline tile */}
        <div
          data-card
          className="absolute right-0 top-0 w-[218px] rotate-[2.5deg] rounded-[16px] border border-white/12 bg-white/[0.07] p-4 shadow-pop backdrop-blur-md"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-white/45">
            Attributed pipeline
          </span>
          <p className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-white">€48.2K</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-[#7de3b8]">
            <TrendingUp className="size-3.5" />
            +24%
            <span className="font-normal text-white/35">vs first half</span>
          </div>
          {/* Tiny inline trend, drawn not imported */}
          <svg viewBox="0 0 120 32" className="mt-3 h-8 w-full" aria-hidden>
            <path
              data-spark
              d="M2 27 L18 24 L34 25 L50 17 L66 19 L82 11 L98 12 L118 4"
              fill="none"
              stroke="#7de3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Tracked link */}
        <div
          data-card
          className="absolute bottom-0 right-0 w-[252px] rotate-[1.5deg] rounded-[16px] border border-white/12 bg-white/[0.07] p-4 shadow-pop backdrop-blur-md"
        >
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-white/45">
            <Link2 className="size-3" />
            Tracked link
          </span>
          <p className="tabular mt-1.5 text-[13px] font-medium text-white">vouch.link/revo7k2x</p>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
            {[
              ['42.8K', 'Impr.'],
              ['312', 'Clicks'],
              ['18', 'Leads'],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="tabular text-[13px] font-semibold text-white">{v}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/40">
                  {l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
