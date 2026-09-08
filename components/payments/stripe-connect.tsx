'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';

import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/field';
import { useToast } from '@/components/ui/feedback';
import { useConnectStatus, type StripeAvailability } from '@/lib/stripe/use-stripe';
import type { PayoutMethod } from '@/lib/types';

/**
 * Stripe Connect onboarding, on the creator's payments screen.
 *
 * What this replaces is the point of it. The form beside it asks a creator to
 * type an IBAN into a browser and keeps four characters of it; Connect sends
 * them to a Stripe-hosted flow that collects the bank details and the identity
 * documents, and hands this build back an account id and nothing else. The
 * masked tail shown here is read back from the Stripe API rather than typed by
 * anyone.
 *
 * The account id is persisted the moment Stripe issues it, before the redirect
 * rather than after it. Onboarding is a round trip through another origin and
 * people abandon it half way; saving on the way out means a creator who comes
 * back later resumes the same account instead of silently accumulating a
 * second one.
 */

/** Stripe's own brand colour, used only on the button that leaves for Stripe. */
const STRIPE_PURPLE = '#635bff';

export function StripeConnectCard({
  availability,
  method,
  countries,
  email,
  accountName,
  onSave,
  onRemove,
}: {
  availability: StripeAvailability;
  method: PayoutMethod | undefined;
  countries: readonly string[];
  email: string;
  accountName: string;
  onSave: (method: PayoutMethod) => void;
  onRemove: () => void;
}) {
  const { push } = useToast();
  const connected = method?.type === 'stripe' ? method : undefined;
  const { status, loading, refresh } = useConnectStatus(connected?.stripeAccountId);

  const [country, setCountry] = useState(countries[0]);
  const [busy, setBusy] = useState(false);

  /*
    Coming back from Stripe.

    The return_url carries ?stripe=return, which says the creator finished the
    hosted flow - not that verification passed. The account is re-read to find
    out which, and the parameter is stripped so a refresh does not replay it.
  */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('stripe');
    if (!flag) return;

    window.history.replaceState({}, '', window.location.pathname);
    if (flag === 'return') void refresh();
  }, [refresh]);

  /*
    Keep the stored method honest about what Stripe reports.

    Onboarding completes on Stripe's side, so the local record is stale by
    definition until the account is read back. Once it is, the masked tail
    comes from the API rather than from anything anyone typed.
  */
  useEffect(() => {
    if (!connected || !status) return;
    const tail = status.bankLast4 ?? connected.last4;
    if (tail === connected.last4) return;
    onSave({ ...connected, last4: tail });
  }, [status, connected, onSave]);

  async function connect() {
    setBusy(true);
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          country,
          // Resumes an abandoned onboarding rather than creating a second one.
          accountId: connected?.stripeAccountId,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.url) {
        push({
          tone: 'error',
          title: 'Stripe could not start onboarding',
          body: data?.error ?? data?.reason ?? 'No onboarding link came back.',
        });
        return;
      }

      // Persisted before leaving - see the note at the top of this file.
      onSave({
        type: 'stripe',
        accountName: accountName || 'Stripe account',
        last4: connected?.last4 ?? '····',
        country,
        addedAt: connected?.addedAt ?? new Date().toISOString(),
        stripeAccountId: data.accountId,
      });

      window.location.href = data.url;
    } catch {
      push({ tone: 'error', title: 'Could not reach Stripe' });
    } finally {
      setBusy(false);
    }
  }

  const ready = status?.payoutsEnabled === true;
  const submitted = status?.detailsSubmitted === true;

  return (
    <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[12px] text-white"
          style={{ backgroundColor: STRIPE_PURPLE }}
          aria-hidden
        >
          <StripeGlyph />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {connected ? 'Stripe Connect' : 'Get paid through Stripe'}
            </h2>
            {availability.testMode && (
              <span className="inline-flex items-center rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn ring-1 ring-inset ring-warn/20">
                Test mode
              </span>
            )}
            {ready && (
              <span className="inline-flex items-center gap-1 rounded-full bg-money-soft px-2 py-0.5 text-[11px] font-semibold text-money ring-1 ring-inset ring-money/15">
                <ShieldCheck className="size-3" />
                Payouts enabled
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
            Stripe collects your bank details and verifies your identity. This app only ever stores
            the account reference &mdash; no IBAN is typed into, or kept by, Vouch.
          </p>
        </div>
      </div>

      {/* ---------------- Connected ---------------- */}
      {connected ? (
        <div className="mt-5 space-y-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            <Stat label="Account" value={connected.stripeAccountId ?? '—'} mono />
            <Stat
              label="Bank account"
              value={
                status?.bankLast4
                  ? `•••• ${status.bankLast4}`
                  : 'Not yet provided'
              }
            />
            <Stat label="Connected" value={relativeTime(connected.addedAt)} />
          </dl>

          {!submitted && (
            <Note>
              Onboarding is not finished, so nothing can be released to this account yet. Stripe
              keeps the progress &mdash; picking it back up resumes where you left off.
            </Note>
          )}

          {submitted && !ready && status && (
            <Note>
              Stripe has your details and is still verifying.
              {status.pendingRequirements.length > 0 && (
                <>
                  {' '}
                  Outstanding:{' '}
                  <span className="font-mono text-[11.5px]">
                    {status.pendingRequirements.join(', ')}
                  </span>
                </>
              )}
            </Note>
          )}

          <div className="flex flex-wrap gap-2">
            {!ready && (
              <Button onClick={connect} disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
                {submitted ? 'Update details on Stripe' : 'Finish onboarding'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              Refresh status
            </Button>
            <Button variant="ghost" onClick={onRemove}>
              <Trash2 className="size-4" />
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        /* ---------------- Not connected ---------------- */
        <div className="mt-5 space-y-4">
          <Field label="Country" hint="Determines which Stripe entity holds the account.">
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Button onClick={connect} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
            Connect with Stripe
          </Button>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[12px] border border-line bg-sunken px-3 py-2.5">
      <dt className="micro-label">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 truncate text-[12.5px] text-ink',
          mono && 'font-mono text-[11.5px] text-ink-soft',
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-[12px] border border-warn/25 bg-warn-soft/50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warn" />
      <span>{children}</span>
    </p>
  );
}

/** Stripe's wordmark S, drawn rather than fetched. */
function StripeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M11.4 9.6c0-.6.5-.9 1.3-.9 1.2 0 2.7.4 3.9 1V6.1c-1.3-.5-2.6-.7-3.9-.7C9.6 5.4 7.5 7 7.5 9.7c0 4.2 5.8 3.5 5.8 5.3 0 .7-.6 1-1.5 1-1.3 0-2.9-.5-4.2-1.2v3.6c1.4.6 2.9.9 4.2.9 3.3 0 5.5-1.6 5.5-4.3 0-4.5-5.9-3.7-5.9-5.4z" />
    </svg>
  );
}
