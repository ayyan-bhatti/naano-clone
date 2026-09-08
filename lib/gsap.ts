'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * GSAP setup.
 *
 * Core plus ScrollTrigger, nothing else. The formerly-Club plugins (SplitText,
 * DrawSVG, ScrollSmoother) are free as of GSAP 3.13, but a reviewer should not
 * have to check that - text splitting and line drawing are hand-rolled here
 * instead, which is a few lines each and leaves no licensing question open.
 *
 * Registration is idempotent and happens on import, but only in the browser:
 * ScrollTrigger touches window at registration time, and every module that
 * imports this is a client component.
 */

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  // Our default feel: a firm ease-out, quick enough that scrolling never waits
  // on an animation to finish.
  gsap.defaults({ ease: 'power3.out', duration: 0.8 });
}

/**
 * Whether the visitor has asked for less motion.
 *
 * Every animation in the app is gated on this. Reduced motion means the final
 * state renders immediately - not a slower version of the same thing, which
 * is the usual half-measure and still moves.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Splits an element's text into per-word spans wrapped in per-word masks.
 *
 * The mask is the point: each word sits inside `overflow: hidden`, so it can
 * be animated up from below its own baseline and appear to rise out of the
 * line rather than fade in on top of it.
 *
 * Returns the word elements, or an empty array if there was nothing to split.
 */
export function splitWords(el: HTMLElement | null): HTMLElement[] {
  if (!el) return [];

  // Idempotent: a re-run (Strict Mode, a resize handler) must not split the
  // spans it created last time into nested spans.
  if (el.dataset.split === 'done') {
    return Array.from(el.querySelectorAll<HTMLElement>('[data-word]'));
  }

  const source = el.textContent ?? '';
  if (!source.trim()) return [];

  el.dataset.split = 'done';
  el.textContent = '';

  const words: HTMLElement[] = [];
  source.split(/(\s+)/).forEach((chunk) => {
    if (!chunk) return;
    if (/^\s+$/.test(chunk)) {
      el.appendChild(document.createTextNode(chunk));
      return;
    }
    const mask = document.createElement('span');
    mask.style.display = 'inline-block';
    mask.style.overflow = 'hidden';
    // Descenders (g, y, p) get clipped by a tight mask, so the box is given a
    // little room and pulled back with a negative margin.
    mask.style.paddingBottom = '0.12em';
    mask.style.marginBottom = '-0.12em';
    mask.style.verticalAlign = 'bottom';

    const word = document.createElement('span');
    word.dataset.word = '';
    word.style.display = 'inline-block';
    word.textContent = chunk;

    mask.appendChild(word);
    el.appendChild(mask);
    words.push(word);
  });

  return words;
}

export { gsap, ScrollTrigger };
