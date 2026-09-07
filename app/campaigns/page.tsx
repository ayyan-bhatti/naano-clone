'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Plus, Target } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatDate, formatEur, formatNumber } from '@/lib/format';
import { getCreator } from '@/lib/data/creators';
import { campaignMetrics } from '@/lib/metrics';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { Reveal } from '@/components/ui/reveal';
import { CampaignStatusPill } from '@/components/ui/status';
import type { CampaignStatus } from '@/lib/types';

const TABS: { key: CampaignStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
];

export default function CampaignsPage() {
  return (
    <RequireAuth>
      <CampaignsInner />
    </RequireAuth>
  );
}

function CampaignsInner() {
  const { campaigns } = useStore();
  const [tab, setTab] = useState<CampaignStatus | 'all'>('all');

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: campaigns.length };
    campaigns.forEach((c) => {
      map[c.status] = (map[c.status] ?? 0) + 1;
    });
    return map;
  }, [campaigns]);

  const visible = tab === 'all' ? campaigns : campaigns.filter((c) => c.status === tab);

  return (
    <AppShell
      title="Campaigns"
      subtitle={`${campaigns.length} total`}
      actions={
        <Link href="/campaigns/new">
          <Button size="sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">New campaign</span>
          </Button>
        </Link>
      }
    >
      <div className="mx-auto max-w-5xl">
        {/* Tabs */}
        <div role="tablist" aria-label="Filter campaigns by status" className="flex gap-1 overflow-x-auto border-b border-line pb-px">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  'relative whitespace-nowrap px-3.5 py-2.5 text-[13.5px] font-medium transition-colors',
                  active ? 'text-ink' : 'text-ink-muted hover:text-ink',
                )}
              >
                {t.label}
                {counts[t.key] ? (
                  <span className="tabular ml-1.5 text-[12px] text-ink-faint">{counts[t.key]}</span>
                ) : null}
                <span
                  className={cn(
                    'absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors',
                    active ? 'bg-brand-600' : 'bg-transparent',
                  )}
                />
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={Target}
            title={tab === 'all' ? 'No campaigns yet' : `No ${tab} campaigns`}
            body={
              tab === 'all'
                ? 'Pick creators from the marketplace and turn them into your first brief.'
                : 'Nothing in this state right now. Try another tab, or create a campaign.'
            }
            action={
              <Link href="/campaigns/new">
                <Button>Create a campaign</Button>
              </Link>
            }
          />
        ) : (
          <ul className="mt-5 space-y-3">
            {visible.map((c, i) => {
              const m = campaignMetrics(c);
              const creators = c.collaborations.slice(0, 4);
              return (
                <Reveal as="li" key={c.id} delay={i * 40}>
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="group block rounded-[16px] border border-line bg-surface p-5 shadow-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink group-hover:underline">
                          {c.name}
                        </h2>
                        <p className="mt-1 text-[12.5px] text-ink-muted">
                          {formatDate(c.startDate)} – {formatDate(c.endDate)} · Budget {formatEur(c.budget)}
                        </p>
                      </div>
                      <CampaignStatusPill status={c.status} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                      {/* Creator avatars */}
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {creators.map((col) => {
                            const creator = getCreator(col.creatorId);
                            if (!creator) return null;
                            return (
                              <Avatar
                                key={col.creatorId}
                                seed={creator.avatarSeed}
                                name={creator.name}
                                size="xs"
                                ring
                              />
                            );
                          })}
                        </div>
                        <span className="text-[12.5px] text-ink-muted">
                          {c.collaborations.length} {c.collaborations.length === 1 ? 'creator' : 'creators'}
                        </span>
                      </div>

                      {/* Metrics */}
                      <dl className="flex gap-5 text-right">
                        <Metric label="Clicks" value={formatNumber(m.clicks)} />
                        <Metric label="Leads" value={formatNumber(m.leads)} />
                        <Metric
                          label="Pipeline"
                          value={m.pipeline ? formatEur(m.pipeline, { compact: true }) : '—'}
                          accent
                        />
                      </dl>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dd className={cn('tabular text-[14px] font-semibold', accent ? 'text-money' : 'text-ink')}>{value}</dd>
      <dt className="micro-label mt-0.5 text-[10px]">{label}</dt>
    </div>
  );
}
