'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Euro,
  Eye,
  Link2,
  MousePointerClick,
  Play,
  Target,
  Trash2,
  UserCheck,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { ctr, formatDate, formatEur, formatNumber, relativeTime } from '@/lib/format';
import { getCreator } from '@/lib/data/creators';
import { campaignMetricsWithClicks } from '@/lib/metrics';
import {
  absoluteLink,
  campaignLinkPath,
  creatorLinkPath,
  displayLink,
  statsForCreator,
} from '@/lib/tracking';
import { OBJECTIVE_LABELS } from '@/lib/brief';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { StatCard } from '@/components/stat-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AreaChart } from '@/components/ui/chart';
import { ConfirmDialog, EmptyState, useToast } from '@/components/ui/feedback';
import { Reveal } from '@/components/ui/reveal';
import {
  CampaignStatusPill,
  CollaborationStatusPill,
  PayoutStatusPill,
} from '@/components/ui/status';
import type { CampaignStatus, CollaborationStatus } from '@/lib/types';

export default function CampaignDetailPage() {
  return (
    <RequireAuth>
      <CampaignDetailInner />
    </RequireAuth>
  );
}

function CampaignDetailInner() {
  const params = useParams<{ id: string }>();
  const { campaigns, clicks, setCampaignStatus, setCollaborationStatus, removeCreatorFromCampaign } =
    useStore();
  const { push } = useToast();

  const [confirmLaunch, setConfirmLaunch] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const campaign = campaigns.find((c) => c.id === params.id);
  const metrics = useMemo(
    () => (campaign ? campaignMetricsWithClicks(campaign, clicks) : null),
    [campaign, clicks],
  );

  // Newest first, for the live event feed.
  const campaignClicks = useMemo(
    () => (campaign ? clicks.filter((c) => c.campaignId === campaign.id) : []),
    [clicks, campaign],
  );

  if (!campaign || !metrics) {
    return (
      <AppShell title="Campaign not found">
        <div className="mx-auto max-w-xl">
          <EmptyState
            icon={Target}
            title="We could not find that campaign"
            body="It may have been created in a different browser — demo data lives in local storage, not on a server."
            action={
              <Link href="/campaigns">
                <Button>Back to campaigns</Button>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  const trackedLink = displayLink(campaign);
  const published = campaign.collaborations.filter((c) => c.status === 'published');

  function transition(status: CampaignStatus) {
    setCampaignStatus(campaign!.id, status);
    const copy: Record<CampaignStatus, string> = {
      draft: 'Moved back to draft',
      scheduled: 'Campaign scheduled',
      live: 'Campaign is live',
      completed: 'Campaign completed',
    };
    push({
      tone: 'success',
      title: copy[status],
      body:
        status === 'live'
          ? 'Accepted creators published and the tracked links are collecting.'
          : status === 'completed'
            ? 'Remaining payouts released to creators.'
            : undefined,
    });
  }

  function updateCollab(creatorId: string, status: CollaborationStatus, name: string) {
    setCollaborationStatus(campaign!.id, creatorId, status);
    push({ tone: 'success', title: `${name} marked ${status.replace('_', ' ')}` });
  }

  async function copyLink() {
    try {
      // Copy the absolute URL, not the display form — a link that cannot be
      // pasted into a browser is not a tracked link.
      await navigator.clipboard.writeText(absoluteLink(campaign!));
      setCopied(true);
      push({ tone: 'success', title: 'Tracked link copied', body: 'Open it to record a click.' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      push({ tone: 'error', title: 'Could not copy', body: 'Your browser blocked clipboard access.' });
    }
  }

  return (
    <AppShell
      title={campaign.name}
      subtitle={`${OBJECTIVE_LABELS[campaign.objective]} · ${formatDate(campaign.startDate)} – ${formatDate(campaign.endDate)}`}
      actions={
        <div className="flex items-center gap-2">
          {campaign.status === 'draft' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => transition('scheduled')}>
                Schedule
              </Button>
              <Button size="sm" onClick={() => setConfirmLaunch(true)}>
                <Play className="size-4" />
                Launch
              </Button>
            </>
          )}
          {campaign.status === 'scheduled' && (
            <Button size="sm" onClick={() => setConfirmLaunch(true)}>
              <Play className="size-4" />
              Launch now
            </Button>
          )}
          {campaign.status === 'live' && (
            <Button size="sm" variant="secondary" onClick={() => transition('completed')}>
              <Check className="size-4" />
              Complete
            </Button>
          )}
        </div>
      }
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          All campaigns
        </Link>

        {/* ---------- Overview ---------- */}
        <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CampaignStatusPill status={campaign.status} />
                <span className="text-[12.5px] text-ink-muted">
                  Budget {formatEur(campaign.budget)} · {formatEur(metrics.spend)} committed
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-soft">{campaign.keyMessage}</p>
              <p className="mt-2 text-[12.5px] text-ink-muted">
                <span className="font-medium text-ink-soft">Audience:</span> {campaign.audience}
              </p>
            </div>

            {/* Tracked link */}
            <div className="w-full rounded-[12px] border border-line bg-sunken/50 p-3.5 sm:w-auto sm:min-w-[240px]">
              <span className="micro-label flex items-center gap-1.5">
                <Link2 className="size-3.5" />
                Tracked link
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="tabular min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{trackedLink}</code>
                <button
                  onClick={copyLink}
                  aria-label="Copy tracked link"
                  className="shrink-0 rounded-[8px] border border-line bg-surface p-1.5 text-ink-muted transition-colors hover:text-ink"
                >
                  {copied ? <Check className="size-3.5 text-money" /> : <Copy className="size-3.5" />}
                </button>
              </div>
              <Link
                href={campaignLinkPath(campaign)}
                className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-600 hover:underline"
              >
                Open it and record a click
                <ArrowRight className="size-3" />
              </Link>
              {metrics.liveClicks > 0 && (
                <p className="tabular mt-1.5 text-[11.5px] text-money">
                  {metrics.liveClicks} live click{metrics.liveClicks === 1 ? '' : 's'} recorded
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ---------- Metrics ---------- */}
        {published.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Reveal>
                <StatCard label="Impressions" value={metrics.impressions} format="compact" icon={Eye} caption={`${published.length} posts live`} />
              </Reveal>
              <Reveal delay={60}>
                <StatCard
                  label="Clicks"
                  value={metrics.clicks}
                  icon={MousePointerClick}
                  caption={`${ctr(metrics.clicks, metrics.impressions)} CTR`}
                />
              </Reveal>
              <Reveal delay={120}>
                <StatCard label="Leads" value={metrics.leads} icon={UserCheck} tone="live" caption="Identified from tracked clicks" />
              </Reveal>
              <Reveal delay={180}>
                <StatCard
                  label="Attributed pipeline"
                  value={metrics.pipeline}
                  format="eurCompact"
                  icon={Target}
                  tone="money"
                  caption={metrics.spend ? `${(metrics.pipeline / metrics.spend).toFixed(1)}x on spend` : undefined}
                />
              </Reveal>
            </div>

            {campaign.daily.length > 1 && (
              <Reveal>
                <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card">
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Performance</h2>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">
                    Each creator&apos;s post spikes on publication then decays — staggered publishing shows as
                    separate bumps.
                  </p>
                  <div className="mt-4">
                    <AreaChart
                      data={campaign.daily}
                      series={{ key: 'clicks', label: 'Clicks', color: 'var(--color-brand-600)' }}
                    />
                  </div>
                </section>
              </Reveal>
            )}
          </>
        ) : (
          <EmptyState
            icon={Eye}
            title="No performance data yet"
            body={
              campaign.status === 'draft'
                ? 'This campaign is still a draft. Launch it and the invited creators will publish, which starts the tracked links collecting.'
                : 'Once creators publish, impressions, clicks, leads and attributed pipeline will appear here.'
            }
            action={
              campaign.status !== 'live' && campaign.status !== 'completed' ? (
                <Button onClick={() => setConfirmLaunch(true)}>
                  <Play className="size-4" />
                  Launch campaign
                </Button>
              ) : undefined
            }
          />
        )}

        {/* ---------- Collaborations ---------- */}
        <section className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Creators</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                {campaign.collaborations.length} on this campaign
              </p>
            </div>
          </div>

          {campaign.collaborations.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-ink-muted">
              No creators on this campaign yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {campaign.collaborations.map((collab) => {
                const creator = getCreator(collab.creatorId);
                if (!creator) return null;
                return (
                  <li key={collab.creatorId} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <Avatar seed={creator.avatarSeed} name={creator.name} size="md" />

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/creators/${creator.slug}`}
                          className="text-[14px] font-medium text-ink hover:underline"
                        >
                          {creator.name}
                        </Link>
                        <p className="mt-0.5 text-[12.5px] text-ink-muted">
                          {creator.category} · {collab.deliverables}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <CollaborationStatusPill status={collab.status} />
                          <PayoutStatusPill status={collab.payoutStatus} />
                          <span className="tabular text-[12.5px] font-medium text-ink">{formatEur(collab.fee)}</span>
                        </div>

                        {/*
                          Each creator gets their own link variant. This is how a
                          click is attributed to the specific post that drove it,
                          rather than to the campaign as a whole.
                        */}
                        {collab.status === 'published' && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <Link
                              href={creatorLinkPath(campaign, collab.creatorId)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken/60 px-2.5 py-1 text-[11.5px] font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-700"
                            >
                              <Link2 className="size-3" />
                              {displayLink(campaign, collab.creatorId)}
                            </Link>
                            {(() => {
                              const live = statsForCreator(clicks, campaign.id, collab.creatorId);
                              if (live.clicks === 0) return null;
                              return (
                                <span className="tabular rounded-full bg-money-soft px-2 py-1 text-[11px] font-semibold text-money">
                                  +{live.clicks} live
                                  {live.leads > 0 ? ` · ${live.leads} lead${live.leads === 1 ? '' : 's'}` : ''}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Per-creator performance */}
                      {collab.metrics ? (
                        <dl className="flex shrink-0 gap-4 text-right">
                          <PerfCell label="Impr." value={formatNumber(collab.metrics.impressions)} />
                          <PerfCell label="Clicks" value={formatNumber(collab.metrics.clicks)} />
                          <PerfCell label="Leads" value={formatNumber(collab.metrics.leads)} />
                          <PerfCell
                            label="Pipeline"
                            value={formatEur(collab.metrics.pipeline, { compact: true })}
                            accent
                          />
                        </dl>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          {collab.status === 'invited' && (
                            <Button size="sm" variant="secondary" onClick={() => updateCollab(collab.creatorId, 'accepted', creator.name)}>
                              Mark accepted
                            </Button>
                          )}
                          {(collab.status === 'accepted' || collab.status === 'in_review') && (
                            <Button size="sm" onClick={() => updateCollab(collab.creatorId, 'published', creator.name)}>
                              Approve &amp; publish
                            </Button>
                          )}
                          {campaign.status === 'draft' && (
                            <button
                              onClick={() => setRemoving(collab.creatorId)}
                              aria-label={`Remove ${creator.name} from campaign`}
                              className="rounded-[8px] p-2 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------- Live tracked clicks ---------- */}
        <section className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                <Link2 className="size-4 text-brand-600" />
                Live tracked clicks
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                Real events recorded by the tracked link — not part of the simulated history.
              </p>
            </div>
            {campaignClicks.length > 0 && (
              <span className="tabular rounded-full bg-money-soft px-2.5 py-1 text-[12px] font-semibold text-money">
                {campaignClicks.length} recorded
              </span>
            )}
          </div>

          {campaignClicks.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-[13.5px] text-ink-soft">No clicks recorded yet.</p>
              <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-muted">
                Open the campaign link above, or a creator&apos;s own variant below, and the click
                lands here — with the device and referrer read from your browser, and this
                campaign&apos;s totals moving to match.
              </p>
              <Link href={campaignLinkPath(campaign)} className="mt-4 inline-block">
                <Button size="sm">
                  Open the tracked link
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {campaignClicks.slice(0, 8).map((click) => {
                const creator = click.creatorId ? getCreator(click.creatorId) : undefined;
                return (
                  <li key={click.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full',
                        click.isLead ? 'bg-money-soft text-money' : 'bg-sunken text-ink-muted',
                      )}
                    >
                      <MousePointerClick className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">
                        {click.role}, {click.company}
                      </p>
                      <p className="truncate text-[12px] text-ink-muted">
                        {creator ? `via ${creator.name}` : 'campaign link'} · {click.device} ·{' '}
                        {click.referrer} · {relativeTime(click.timestamp)}
                      </p>
                    </div>
                    {click.isLead ? (
                      <span className="tabular shrink-0 rounded-full bg-money-soft px-2.5 py-1 text-[11.5px] font-semibold text-money">
                        Lead · {formatEur(click.pipeline)}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-sunken px-2.5 py-1 text-[11.5px] text-ink-muted">
                        Click
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="border-t border-line bg-sunken/40 px-5 py-3 text-[11.5px] leading-relaxed text-ink-faint">
            Device and referrer are observed from the browser. Visitor company and role are inferred —
            a production build resolves those from IP intelligence, which would be an external service.
          </p>
        </section>

        {/* ---------- Brief ---------- */}
        <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Campaign brief</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <BriefList title="Objectives" items={campaign.brief.objectives} />
            <BriefList title="Key messages" items={campaign.brief.keyMessages} />
            <BriefList title="Creator guidelines" items={campaign.brief.creatorGuidelines} />
            <BriefList title="Must avoid" items={campaign.brief.mustAvoid} />
          </div>
          <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <div>
              <h3 className="micro-label">Call to action</h3>
              <p className="mt-1.5 text-[13.5px] text-ink">{campaign.brief.callToAction}</p>
            </div>
            <div>
              <h3 className="micro-label">Tone of voice</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{campaign.brief.toneOfVoice}</p>
            </div>
          </div>
        </section>

        {/* ---------- Payouts ---------- */}
        <section className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-line p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
              <Euro className="size-4 text-money" />
              Payouts
            </h2>
            <Link href="/payouts" className="text-[13px] font-medium text-brand-600 hover:underline">
              Full ledger
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {campaign.collaborations.map((collab) => {
              const creator = getCreator(collab.creatorId);
              if (!creator) return null;
              return (
                <li key={collab.creatorId} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{creator.name}</span>
                  <PayoutStatusPill status={collab.payoutStatus} />
                  <span className="tabular w-20 text-right text-[13.5px] font-medium text-ink">
                    {formatEur(collab.fee)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-line bg-sunken/40 px-5 py-3">
            <span className="text-[13px] font-medium text-ink">Committed total</span>
            <span className="tabular text-[14px] font-semibold text-ink">{formatEur(metrics.spend)}</span>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmLaunch}
        onClose={() => setConfirmLaunch(false)}
        onConfirm={() => transition('live')}
        title="Launch this campaign?"
        body={`Every invited and accepted creator will publish, and their tracked links start collecting immediately. This moves ${formatEur(metrics.spend || campaign.collaborations.reduce((s, c) => s + c.fee, 0))} into committed spend.`}
        confirmLabel="Launch campaign"
      />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) {
            const creator = getCreator(removing);
            removeCreatorFromCampaign(campaign.id, removing);
            push({ tone: 'success', title: `${creator?.name ?? 'Creator'} removed` });
          }
        }}
        title="Remove this creator?"
        body="They will be taken off the campaign and their fee removed from the committed total. You can add them back at any time."
        confirmLabel="Remove"
        tone="danger"
      />
    </AppShell>
  );
}

function PerfCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dd className={cn('tabular text-[13.5px] font-semibold', accent ? 'text-money' : 'text-ink')}>{value}</dd>
      <dt className="micro-label mt-0.5 text-[10px]">{label}</dt>
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="micro-label">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-soft">
            <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-brand-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
