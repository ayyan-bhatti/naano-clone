'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '@/lib/hooks/use-motion';

/**
 * Shared behaviour for the free tools.
 *
 * Three jobs:
 *
 *  1. Hold the form values, restore them from localStorage, and reset cleanly.
 *  2. Debounce a very short "calculating" state. The work is instant, so this
 *     is not fake latency to look busy - it is there because a result panel
 *     that mutates on every keystroke is hard to read. It settles quickly and
 *     is skipped entirely under prefers-reduced-motion.
 *  3. Never let stored state break a clean session: anything unparseable is
 *     discarded and the defaults are used.
 */

const SETTLE_MS = 260;

export function useToolState<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T,
) {
  const [values, setValues] = useState<T>(defaults);
  const [hydrated, setHydrated] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const reduced = usePrefersReducedMotion();
  const timer = useRef<number | null>(null);
  const firstRun = useRef(true);

  // Restore. Server always renders defaults, so no hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<T>;
        // Merge over defaults so a stored shape from an older version cannot
        // leave a required key undefined.
        setValues((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* unparseable or unavailable - defaults are already in place */
    }
    setHydrated(true);
  }, [storageKey]);

  // Persist.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      /* private mode or quota - the tool still works, it just will not persist */
    }
  }, [values, hydrated, storageKey]);

  // Settle window after each change.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (reduced) {
      setCalculating(false);
      return;
    }
    setCalculating(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCalculating(false), SETTLE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [values, reduced]);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues(defaults);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* nothing to clean up */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const isDirty = JSON.stringify(values) !== JSON.stringify(defaults);

  return { values, set, setValues, reset, calculating, hydrated, isDirty };
}

/**
 * Parses a numeric input that may legitimately be empty.
 *
 * Returns 0 for empty so calculators receive a number rather than NaN, and the
 * empty string is preserved separately in form state so the field does not
 * display a stray 0 the user did not type.
 */
export function toNumber(value: string): number {
  if (value.trim() === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
