'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, Check, Link2, MonitorSmartphone, Search } from 'lucide-react';

import { getCreator } from '@/lib/data/creators';
import { campaignByCode } from '@/lib/tracking';
import { useStore } from '@/lib/store';
import { Logo } from '@/components/brand';
import { Sky } from '@/components/marketing/sky';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import type { ClickEvent } from '@/lib/types';

/**
 * Tracked link resolver — the one place in the build that records a real event.
 *
 * Resolves the short code to a campaign, attributes the click to the creator
 * whose link variant was used, writes the event to the store, and then hands
 * the visitor onward.
 *
 * Why an interstitial rather than an instant 302: the destination URLs in this
 * demo are fictional, so a silent redirect would dump a reviewer on a domain
 * that does not exist and hide the only genuinely-real mechanic in the product.
 * The interstitial shows the attribution landing, then returns to the campaign
 * so you can watch the number move. Production copy says as much on the page.
 */
export default function TrackedLinkPage() {
  return (
    <Suspense fallback={<Shell><p className="text-[13px] text-ink-muted">Resolving link…</p></Shell>}>
      <TrackedLinkInner />
    </Suspense>
  );
}

function TrackedLinkInner() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { campaigns, hydrated, recordClick } = useStore();

  const [event, setEvent] = useState<ClickEvent | null>(null);
  const [status, setStatus] = useState<'resolving' | 'recorded' | 'unknown'>('resolving');
  const recorded = useRef(false);

  const code = params.code ?? '';
  const creatorId = search.get('c');

  useEffect(() => {
    if (!hydrated || recorded.current) return;

    const campaign = campaignByCode(campaigns, code);
    if (!campaign) {
      setStatus('unknown');
      return;
    }

    // Guard against React Strict Mode double-invoking the effect in dev, which
    // would otherwise record two clicks for one visit.
    recorded.current = true;
    const created = recordClick({ campaignId: campaign.id, creatorId, code });
    setEvent(created);
    setStatus('recorded');
  }, [hydrated, campaigns, code, creatorId, recordClick]);

  const campaign = campaignByCode(campaigns, code);
  const creator = creatorId ? getCreator(creatorId) : undefined;

  // Return to the campaign so the reviewer sees the click land.
  useEffect(() => {
    if (status !== 'recorded' || !campaign) return;
    const t = window.setTimeout(() => router.push(`/campaigns/${campaign.id}?from=link`), 3200);
    return () => window.clearTimeout(t);
  }, [status, campaign, router]);

  if (!hydrated || status === 'resolving') {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-[13.5px] text-ink-soft">
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-ink-muted" />
          Resolving <code className="font-medium text-ink">{code}</code>…
        </div>
      </Shell>
    );
  }

  if (status === 'unknown' || !campaign) {
    return (
      <Shell>
        <div className="w-full max-w-md">
          <EmptyState
            icon={Search}
            title="That tracked link does not resolve"
            body={`No campaign in this browser uses the code “${code}”. Tracked links belong to campaigns, and campaigns live in local storage — one created in another browser will not resolve here.`}
            action={
              <Link href="/campaigns">
                <Button>Go to campaigns</Button>
              </Link>
            }
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2.5 text-[13px] font-medium text-money">
          <span className="flex size-7 items-center justify-center rounded-full bg-money/15">
            <Check className="size-4" />
          </span>
          Click recorded
        </div>

        <h1 className="mt-4 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[30px]">
          {creator ? (
            <>
              Attributed to
              <br />
              {creator.name}.
            </>
          ) : (
            <>
              Attributed to
              <br />
              {campaign.name}.
            </>
          )}
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          This is a real event, not a simulation — it has been written to the campaign and its
          numbers have already moved.
        </p>

        {/* What was captured */}
        <div className="mt-6 overflow-hidden rounded-[16px] border border-line bg-surface/90 backdrop-blur-md">
          {creator && (
            <div className="flex items-center gap-3 border-b border-line p-4">
              <Avatar seed={creator.avatarSeed} name={creator.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink">{creator.name}</p>
                <p className="truncate text-[12px] text-ink-muted">{creator.category}</p>
              </div>
              <span className="rounded-full bg-sunken px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                Creator variant
              </span>
            </div>
          )}

          <dl className="divide-y divide-line">
            <Row icon={Link2} label="Code" value={code} />
            <Row icon={MonitorSmartphone} label="Device" value={event?.device ?? '—'} observed />
            <Row icon={ArrowRight} label="Referrer" value={event?.referrer ?? '—'} observed />
            <Row
              icon={Building2}
              label="Visitor"
              value={event ? `${event.role}, ${event.company}` : '—'}
            />
          </dl>

          {event?.isLead && (
            <div className="border-t border-line bg-money/10 p-4">
              <p className="text-[13px] font-semibold text-ink">Qualified as a lead</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                €{event.pipeline.toLocaleString('en-GB')} added to attributed pipeline.
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-faint">
          Device and referrer are read from your browser. The visitor company and role are inferred —
          a production build resolves those from IP intelligence, which would be an external service.
          A real tracked link would redirect straight to {campaign.brief.landingUrl} rather than
          showing this page; the interstitial is here so the attribution is visible.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link href={`/campaigns/${campaign.id}?from=link`}>
            <Button className="w-full !rounded-full sm:w-auto">
              See it on the campaign
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href={`/l/${code}${creatorId ? `?c=${creatorId}` : ''}`} onClick={() => window.location.reload()}>
            <Button
              className="w-full !rounded-full border border-line bg-surface text-ink hover:bg-sunken sm:w-auto"
            >
              Record another click
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-[12px] text-ink-faint">Returning to the campaign automatically…</p>
      </div>
    </Shell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  observed,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  observed?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden />
      <dt className="text-[12.5px] text-ink-muted">{label}</dt>
      <dd className="ml-auto flex items-center gap-2 text-[13px] font-medium text-ink">
        {value}
        {observed && (
          <span className="rounded-full bg-money/15 px-1.5 py-0.5 text-[10px] font-semibold text-money">
            observed
          </span>
        )}
      </dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-ground">
      <Sky />
      <header className="px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Vouch home">
          <Logo />
        </Link>
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        {children}
      </main>
    </div>
  );
}
