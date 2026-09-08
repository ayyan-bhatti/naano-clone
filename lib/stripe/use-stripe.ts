'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ConnectStatus } from '@/lib/stripe/shared';

/**
 * Whether this deployment has Stripe wired up, asked once and shared.
 *
 * The answer cannot come from the client bundle - the secret key is not there,
 * and should not be - so it comes from /api/stripe/status. It is cached in a
 * module-level promise because several surfaces ask, and the answer cannot
 * change without a redeploy.
 */
export interface StripeAvailability {
  configured: boolean;
  reason: string | null;
  testMode: boolean;
}

let availabilityPromise: Promise<StripeAvailability> | null = null;

function fetchAvailability(): Promise<StripeAvailability> {
  availabilityPromise ??= fetch('/api/stripe/status')
    .then((r) => r.json() as Promise<StripeAvailability>)
    .catch(() => ({
      // A failed probe is treated exactly like an absent key: the represented
      // flow is always a correct thing to show.
      configured: false,
      reason: 'Could not reach the Stripe status endpoint.',
      testMode: true,
    }));
  return availabilityPromise;
}

export function useStripeAvailability(): StripeAvailability | null {
  const [state, setState] = useState<StripeAvailability | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAvailability().then((v) => {
      if (alive) setState(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

/**
 * Live onboarding state for one connected account.
 *
 * Re-read on mount and on demand rather than cached, because the interesting
 * transitions - verification clearing, payouts switching on - all happen on
 * Stripe's side while nobody is looking at this tab.
 */
export function useConnectStatus(accountId: string | undefined) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!accountId) {
      setStatus(null);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/stripe/account?id=${encodeURIComponent(accountId)}`);
      const data = await res.json();
      // A slower earlier request must not overwrite a newer answer.
      if (id !== requestId.current) return;
      setStatus(data?.configured ? (data as ConnectStatus) : null);
    } catch {
      if (id === requestId.current) setStatus(null);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
