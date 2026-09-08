'use client';

import { useEffect, useLayoutEffect, useRef, type DependencyList, type RefObject } from 'react';

import { gsap, prefersReducedMotion, ScrollTrigger } from '@/lib/gsap';

/**
 * GSAP inside React, done properly.
 *
 * Every animation is created inside a `gsap.context()` scoped to a container
 * ref, and the context is reverted on cleanup. That is what makes this safe
 * under Strict Mode's double-invoked effects and under route changes: reverting
 * kills the tweens, kills their ScrollTriggers, and restores every inline style
 * GSAP wrote. Without it you get duplicated triggers and elements stuck at
 * whatever opacity they happened to be mid-tween.
 *
 * The callback receives the context's `self`, so `self.selector('.thing')`
 * only ever matches inside the container - a selector cannot leak into another
 * section of the page.
 *
 * If the visitor prefers reduced motion the callback never runs at all, so the
 * markup renders in its final state. Anything animated from an invisible
 * starting point therefore has to start visible in CSS and be hidden by GSAP,
 * never the other way round.
 */

// useLayoutEffect warns during SSR; these only ever run in the browser, but the
// component tree is still rendered on the server.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useGsap<T extends HTMLElement = HTMLDivElement>(
  setup: (self: gsap.Context) => void,
  deps: DependencyList = [],
): RefObject<T | null> {
  const scope = useRef<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!scope.current) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(setup, scope);
    return () => ctx.revert();
    // `setup` is intentionally excluded from the dependency list: it is
    // redefined on every render, and depending on it would tear down and
    // rebuild every ScrollTrigger on the page after each state change.
  }, deps);

  return scope;
}

/**
 * Recalculates ScrollTrigger positions once the page has actually settled.
 *
 * Web fonts and images change element heights after the first paint, which
 * leaves every trigger measuring against a layout that no longer exists - the
 * classic symptom being animations that fire too early halfway down a page.
 */
export function useScrollTriggerRefresh() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts?.status === 'loaded') refresh();
    else document.fonts?.ready.then(refresh).catch(() => {});

    window.addEventListener('load', refresh);
    return () => window.removeEventListener('load', refresh);
  }, []);
}
