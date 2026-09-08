'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  Banknote,
  Check,
  CreditCard,
  Landmark,
  Lock,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatDate, formatEur, relativeTime } from '@/lib/format';
import { useCreatorDeals } from '@/components/creator/creator-screens';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, EmptyState, useToast } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';
import { PayoutStatusPill } from '@/components/ui/status';
import { StripeConnectCard } from '@/components/payments/stripe-connect';
import { useStripeAvailability } from '@/lib/stripe/use-stripe';
import type { PayoutMethod, PayoutMethodType } from '@/lib/types';

/**
 * Creator payments.
 *
 * Their creator nav has a Payments screen and ours only had Earnings, which
 * meant a creator could see money owed with no way to say where it should go.
 *
 * There are two ways to get paid here, and which one appears depends on
 * whether the deployment has a Stripe key.
 *
 * With one, Stripe Connect handles it: the creator is sent to a Stripe-hosted
 * flow, Stripe holds the bank details, and this build keeps an account id.
 * Without one - which is the state a public demo runs in unless keys are set -
 * the page falls back to the represented form, where the important decision is
 * what is *not* stored: only the last four characters of an account survive.
 * Keeping a full IBAN in localStorage to make a demo feel complete would be the
 * wrong trade, and the page says which mode it is in rather than hiding it.
 */

const COUNTRIES = [
  'Germany',
  'France',
  'Netherlands',
  'Spain',
  'Italy',
  'Portugal',
  'Belgium',
  'Ireland',
  'Poland',
  'Czechia',
  'Denmark',
  'Sweden',
  'Norway',
  'United Kingdom',
];

export default function PaymentsPage() {
  return (
    <RequireAuth>
      <PaymentsInner />
    </RequireAuth>
  );
}

function PaymentsInner() {
  const { user } = useStore();

  if (user?.role !== 'creator') {
    return (
      <AppShell title="Payments">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={Wallet}
            title="Payments are a creator surface"
            body="You are signed in as a brand. What you owe creators, and when it releases, lives in the payout ledger."
            action={
              <Link href="/payouts">
                <Button>Go to payouts</Button>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return <Payments />;
}

function Payments() {
  const { user, setPayoutMethod } = useStore();
  const { deals } = useCreatorDeals();
  const { push } = useToast();
  const method = user?.payoutMethod;

  // null until the probe answers; the represented flow renders in the meantime,
  // because it is a correct thing to show either way.
  const availability = useStripeAvailability();
  const stripeOn = availability?.configured === true;

  const [removing, setRemoving] = useState(false);

  // Stable: the Connect card syncs the masked tail from a useEffect.
  const saveMethod = useCallback(
    (m: PayoutMethod) => setPayoutMethod(m),
    [setPayoutMethod],
  );

  /** Every fee that is owed, scheduled or already cleared. */
  const ledger = useMemo(
    () =>
      deals
        .filter((d) => d.collab.status !== 'invited' && d.collab.status !== 'declined')
        .sort(
          (a, b) =>
            new Date(b.collab.publishedAt ?? b.collab.deliverBy).getTime() -
            new Date(a.collab.publishedAt ?? a.collab.deliverBy).getTime(),
        ),
    [deals],
  );

  const totals = ledger.reduce(
    (acc, { collab }) => {
      if (collab.payoutStatus === 'paid') acc.paid += collab.fee;
      else if (collab.payoutStatus === 'scheduled') acc.scheduled += collab.fee;
      else acc.pending += collab.fee;
      return acc;
    },
    { paid: 0, scheduled: 0, pending: 0 },
  );

  return (
    <AppShell title="Payments" subtitle="Where your fees go, and when">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* ---------- Payout method ---------- */}
        {stripeOn && availability ? (
          <>
            <StripeConnectCard
              availability={availability}
              method={method}
              countries={COUNTRIES}
              email={user?.email ?? ''}
              accountName={user?.name ?? ''}
              onSave={saveMethod}
              onRemove={() => setRemoving(true)}
            />
            {/* A method saved before Stripe was configured still has to be
                visible and removable, rather than orphaned behind the new
                card. */}
            {method && method.type !== 'stripe' && (
              <MethodCard method={method} onRemove={() => setRemoving(true)} />
            )}
          </>
        ) : method ? (
          <MethodCard method={method} onRemove={() => setRemoving(true)} />
        ) : (
          <MethodForm
            onSave={(m) => {
              setPayoutMethod(m);
              push({
                tone: 'success',
                title: 'Payout method added',
                body: 'Scheduled fees will release to this account when campaigns complete.',
              });
            }}
          />
        )}

        {/* ---------- Money ---------- */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Money label="Cleared" value={totals.paid} tone="money" caption="Already in your account" />
          <Money
            label="Scheduled"
            value={totals.scheduled}
            tone="warn"
            caption="Approved, releases on completion"
          />
          <Money label="Pending" value={totals.pending} caption="Waiting on approval" />
        </section>

        {totals.scheduled > 0 && !method && (
          <p className="rounded-[12px] border border-warn/25 bg-warn-soft/50 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
            <strong className="font-semibold text-ink">
              {formatEur(totals.scheduled)} is scheduled with nowhere to go.
            </strong>{' '}
            Add a payout method above and it releases when the campaign completes.
          </p>
        )}

        {/* ---------- Schedule ---------- */}
        <section className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
          <div className="border-b border-line p-5">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Payment schedule</h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
              A fee is scheduled the moment the brand approves your post, and clears when the
              campaign completes. Nothing here needs an invoice from you.
            </p>
          </div>

          {ledger.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-ink-muted">
              Nothing scheduled yet. Accept a deal and submit a draft — approval is what starts the
              clock.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {ledger.map(({ campaign, collab }) => (
                <li
                  key={`${campaign.id}-${collab.creatorId}`}
                  className="flex flex-wrap items-center gap-3 p-4 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{campaign.brand}</p>
                    <p className="truncate text-[12px] text-ink-muted">
                      {campaign.name} ·{' '}
                      {collab.publishedAt
                        ? `published ${formatDate(collab.publishedAt)}`
                        : `due ${formatDate(collab.deliverBy)}`}
                    </p>
                  </div>
                  <PayoutStatusPill status={collab.payoutStatus} />
                  <span className="tabular w-20 shrink-0 text-right text-[13.5px] font-semibold text-money">
                    {formatEur(collab.fee)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-faint">
          <Lock className="mt-0.5 size-3 shrink-0" />
          {stripeOn ? (
            <>
              Stripe Connect is wired up{availability?.testMode ? ' in test mode' : ''}. Onboarding,
              account status and fee releases are real Stripe API calls
              {availability?.testMode ? ', against test money that never leaves Stripe' : ''}. Bank
              details live at Stripe; this build stores only the account reference.
            </>
          ) : (
            <>
              Payments are represented, not processed. No payment provider is configured in this
              deployment, so nothing here moves money — and only the last four characters of
              whatever you enter are ever stored.
            </>
          )}
        </p>
      </div>

      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        onConfirm={() => {
          setPayoutMethod(null);
          push({ tone: 'info', title: 'Payout method removed' });
        }}
        title="Remove payout method?"
        body="Scheduled fees stay scheduled, but they will have nowhere to release to until you add another account."
        confirmLabel="Remove"
        tone="danger"
      />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ *
 * The method itself
 * ------------------------------------------------------------------ */

function MethodCard({ method, onRemove }: { method: PayoutMethod; onRemove: () => void }) {
  // 'stripe' only reaches this card if a key was configured when the method was
  // saved and has since gone away. Labelling it PayPal in that state would be a
  // small lie that is easy to avoid.
  const Icon = method.type === 'bank' ? Landmark : method.type === 'stripe' ? CreditCard : Banknote;
  const label =
    method.type === 'bank' ? 'Bank transfer' : method.type === 'stripe' ? 'Stripe' : 'PayPal';
  return (
    <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-money-soft text-money">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{label}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-money-soft px-2 py-0.5 text-[11px] font-semibold text-money ring-1 ring-inset ring-money/15">
              <ShieldCheck className="size-3" />
              Active
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            {method.accountName} · {method.country} ·{' '}
            <span className="tabular">•••• {method.last4}</span>
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-faint">
            Added {relativeTime(method.addedAt)}
          </p>
        </div>
        <Button variant="ghost" onClick={onRemove} aria-label="Remove payout method">
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>
    </section>
  );
}

function MethodForm({ onSave }: { onSave: (method: PayoutMethod) => void }) {
  const [type, setType] = useState<PayoutMethodType>('bank');
  const [accountName, setAccountName] = useState('');
  const [account, setAccount] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [touched, setTouched] = useState(false);

  const nameError = touched && accountName.trim().length < 2 ? 'Who is the account in?' : undefined;
  const accountError =
    touched && account.replace(/\s/g, '').length < 6
      ? type === 'bank'
        ? 'Enter an IBAN.'
        : 'Enter the PayPal email.'
      : undefined;

  function save() {
    setTouched(true);
    const cleaned = account.replace(/\s/g, '');
    if (accountName.trim().length < 2 || cleaned.length < 6) return;

    onSave({
      type,
      accountName: accountName.trim(),
      // Only the tail survives - see the note at the top of this file.
      last4: cleaned.slice(-4),
      country,
      addedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
          <CreditCard className="size-5" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Add a payout method
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            Fees release here when a campaign completes.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {(
          [
            { value: 'bank', label: 'Bank transfer', hint: 'SEPA, 2–3 working days', icon: Landmark },
            { value: 'paypal', label: 'PayPal', hint: 'Same day, higher fee', icon: Banknote },
          ] as const
        ).map((o) => (
          <button
            key={o.value}
            onClick={() => setType(o.value)}
            aria-pressed={type === o.value}
            className={cn(
              'rounded-[12px] border p-3.5 text-left transition-colors',
              type === o.value
                ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/20'
                : 'border-line hover:bg-sunken',
            )}
          >
            <span className="flex items-center gap-2">
              <o.icon className={cn('size-4', type === o.value ? 'text-brand-600' : 'text-ink-faint')} />
              <span className="text-[13.5px] font-medium text-ink">{o.label}</span>
              {type === o.value && <Check className="ml-auto size-4 text-brand-600" />}
            </span>
            <span className="mt-1 block text-[11.5px] text-ink-muted">{o.hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        <Field label="Account name" error={nameError} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="The name on the account"
              autoComplete="name"
            />
          )}
        </Field>

        <Field
          label={type === 'bank' ? 'IBAN' : 'PayPal email'}
          hint="Only the last four characters are kept. The rest is discarded the moment you save."
          error={accountError}
          required
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={type === 'bank' ? 'DE00 0000 0000 0000 0000 00' : 'you@example.com'}
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Country" hint="Determines the transfer route and clearing time.">
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Button className="mt-5" onClick={save}>
        <ShieldCheck className="size-4" />
        Save payout method
      </Button>
    </section>
  );
}

function Money({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  tone?: 'money' | 'warn';
}) {
  return (
    <div className="rounded-[16px] border border-line bg-surface p-4 shadow-card">
      <p className="micro-label">{label}</p>
      <p
        className={cn(
          'tabular mt-1.5 text-[22px] font-semibold tracking-[-0.04em]',
          tone === 'money' ? 'text-money' : tone === 'warn' ? 'text-warn' : 'text-ink',
        )}
      >
        {formatEur(value)}
      </p>
      <p className="mt-0.5 text-[11.5px] text-ink-muted">{caption}</p>
    </div>
  );
}
