'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Motion primitives.
 *
 * Both hooks below check prefers-reduced-motion and, when it is set, jump
 * straight to the final state rather than playing a shortened animation. A
 * reduced-motion user should get the information instantly, not a faster
 * version of the effect.
 */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Reveal an element once it scrolls into view. Returns a ref and a boolean.
 * Unobserves after firing - these are one-shot entrance animations, not
 * scroll-linked effects, so there is nothing to keep watching.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
}) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (old browser, jsdom): show it rather than hide it.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: options?.threshold ?? 0.12, rootMargin: options?.rootMargin ?? '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, options?.threshold, options?.rootMargin]);

  return { ref, visible };
}

/**
 * Count a number up when it first enters view. Uses an eased rAF loop rather
 * than a fixed interval so it stays smooth regardless of frame rate, and
 * cancels cleanly on unmount.
 */
export function useCountUp(
  target: number,
  options: { duration?: number; startOnVisible?: boolean } = {},
) {
  const { duration = 900, startOnVisible = true } = options;
  const reduced = usePrefersReducedMotion();
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [value, setValue] = useState(startOnVisible ? 0 : target);
  const frame = useRef<number | null>(null);

  const shouldRun = startOnVisible ? visible : true;

  useEffect(() => {
    if (reduced || !shouldRun) {
      if (reduced) setValue(target);
      return;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutExpo - fast start, gentle settle. Reads as "counting up".
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(from + (target - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, duration, reduced, shouldRun]);

  return { ref, value: reduced ? target : value };
}
