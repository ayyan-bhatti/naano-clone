'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowRight,
  Euro,
  Eye,
  MousePointerClick,
  Plus,
  Sparkles,
  Store,
  Target,
  UserCheck,
} from 'lucide-react';

import { ctr, formatCompact, formatEur, formatNumber } from '@/lib/format';
import { getCreator } from '@/lib/data/creators';
import { aggregateMetrics, campaignMetrics, trendDelta } from '@/lib/metrics';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { CreatorOverview } from '@/components/creator/creator-screens';
import { StatCard } from '@/components/stat-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AreaChart } from '@/components/ui/chart';
import { EmptyState } from '@/components/ui/feedback';
import { Reveal } from '@/components/ui/reveal';
import { CampaignStatusPill } from '@/components/ui/status';
import type { DailyPoint } from '@/lib/types';

/**
 * Brand dashboard.
 *
 * Every number here is summed from campaign collaborations - nothing is
 * hardcoded. Create a campaign, take it live, and these move.
 */
export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardRouter />
    </RequireAuth>
  );
}

/** The two sides get different dashboards, not one with hidden sections. */
function DashboardRouter() {
  const { user } = useStore();
  if (user?.role === 'creator') {
    const firstName = user.name.split(' ')[0];
    return (
      <AppShell title={`Welcome back, ${firstName}`} subtitle="Your collaborations and earnings">
        <CreatorOverview />
      </AppShell>
    );
  }
  return <DashboardInner />;
}

function DashboardInner() {
  const { user, campaigns, shortlist } = useStore();

  const totals = useMemo(() => aggregateMetrics(campaigns), [campaigns]);

  const activeCampaigns = campaigns.filter((c) => c.status === 'live' || c.status === 'scheduled');

  // Unique creators with an accepted-or-later collaboration.
  const engagedCreators = useMemo(() => {
    const ids = new Set<string>();
    campaigns.forEach((c) =>
      c.collaborations.forEach((col) => {
        if (col.status !== 'invited' && col.status !== 'declined') ids.add(col.creatorId);
      }),
    );
    return ids.size;
  }, [campaigns]);

  // Merge every campaign's daily series into one timeline for the chart.
  const combined = useMemo<DailyPoint[]>(() => {
    const byDate = new Map<string, DailyPoint>();
    campaigns.forEach((c) =>
      c.daily.forEach((p) => {
        const existing = byDate.get(p.date);
        if (existing) {
          existing.impressions += p.impressions;
          existing.clicks += p.clicks;
          existing.leads += p.leads;
        } else {
          byDate.set(p.date, { ...p });
        }
      }),
    );
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [campaigns]);

  const recent = [...campaigns]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const firstName = user?.name.split(' ')[0] ?? 'there';

  if (campaigns.length === 0) {
    return (
      <AppShell
        title={`Welcome, ${firstName}`}
        subtitle="Let's get your first campaign moving"
        actions={
          <Link href="/marketplace">
            <Button size="sm">
              <Store className="size-4" />
              Find creators
            </Button>
          </Link>
        }
      >
        <div className="mx-auto max-w-3xl">
          <EmptyState
            icon={Sparkles}
            title="No campaigns yet"
            body="Shortlist a few creators whose audience matches your buyers, then turn that shortlist into a campaign. Your first brief takes about two minutes."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/marketplace">
                  <Button className="w-full sm:w-auto">
                    Browse the marketplace
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/campaigns/new">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Create a campaign
                  </Button>
                </Link>
              </div>
            }
          />

          {shortlist.length > 0 && (
            <div className="mt-6 rounded-[16px] border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-ink">
                  {shortlist.length} shortlisted {shortlist.length === 1 ? 'creator' : 'creators'}
                </h2>
                <Link href="/campaigns/new" className="text-[13px] font-medium text-brand-600 hover:underline">
                  Build a campaign
                </Link>
              </div>
              <ul className="mt-4 space-y-2.5">
                {shortlist.slice(0, 4).map((id) => {
                  const c = getCreator(id);
                  if (!c) return null;
                  return (
                    <li key={id} className="flex items-center gap-3">
                      <Avatar seed={c.avatarSeed} name={c.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">{c.name}</span>
                        <span className="block truncate text-[12px] text-ink-muted">{c.category}</span>
                      </span>
                      <span className="tabular text-[13px] font-medium text-ink">{formatEur(c.pricePerPost)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Welcome back, ${firstName}`}
      subtitle={`${activeCampaigns.length} active ${activeCampaigns.length === 1 ? 'campaign' : 'campaigns'} · ${user?.company}`}
      actions={
        <Link href="/campaigns/new">
          <Button size="sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">New campaign</span>
          </Button>
        </Link>
      }
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ---------- Headline metrics ---------- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Reveal>
            <StatCard
              label="Attributed pipeline"
              value={totals.pipeline}
              format="eurCompact"
              caption="From tracked links"
              icon={Target}
              tone="money"
              delta={trendDelta(combined, 'leads')}
              spark={combined.map((p) => p.leads)}
            />
          </Reveal>
          <Reveal delay={60}>
            <StatCard
              label="Impressions"
              value={totals.impressions}
              format="compact"
              caption={`Across ${campaigns.length} campaigns`}
              icon={Eye}
              spark={combined.map((p) => p.impressions)}
            />
          </Reveal>
          <Reveal delay={120}>
            <StatCard
              label="Clicks"
              value={totals.clicks}
              format="number"
              caption={`${ctr(totals.clicks, totals.impressions)} click-through rate`}
              icon={MousePointerClick}
              spark={combined.map((p) => p.clicks)}
            />
          </Reveal>
          <Reveal delay={180}>
            <StatCard
              label="Leads"
              value={totals.leads}
              format="number"
              caption={totals.leads ? `${formatEur(Math.round(totals.spend / totals.leads))} cost per lead` : 'No leads yet'}
              icon={UserCheck}
              tone="live"
              spark={combined.map((p) => p.leads)}
            />
          </Reveal>
        </div>

        {/* ---------- Chart + secondary stats ---------- */}
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <Reveal>
            <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Impressions over time</h2>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">Last {combined.length} days, all campaigns</p>
                </div>
              </div>
              <div className="mt-4">
                {combined.length > 1 ? (
                  <AreaChart
                    data={combined}
                    series={{ key: 'impressions', label: 'Impressions', color: 'var(--color-brand-600)' }}
                  />
                ) : (
                  <p className="py-12 text-center text-[13px] text-ink-muted">
                    Not enough data yet — take a campaign live to start the series.
                  </p>
                )}
              </div>
            </section>
          </Reveal>

          <Reveal delay={80}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <StatCard
                label="Spend"
                value={totals.spend}
                format="eur"
                caption="Committed to creators"
                icon={Euro}
                tone="money"
              />
              <StatCard
                label="Creators engaged"
                value={engagedCreators}
                caption={`${shortlist.length} shortlisted`}
                icon={UserCheck}
              />
            </div>
          </Reveal>
        </div>

        {/* ---------- Recent campaigns ---------- */}
        <Reveal>
          <section className="overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line p-5">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Recent campaigns</h2>
              <Link href="/campaigns" className="text-[13px] font-medium text-brand-600 hover:underline">
                View all
              </Link>
            </div>

            {/* Table on desktop, cards on mobile - not a squeezed table */}
            <div className="hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="micro-label px-5 py-2.5 text-left font-semibold">Campaign</th>
                    <th className="micro-label px-3 py-2.5 text-left font-semibold">Status</th>
                    <th className="micro-label px-3 py-2.5 text-right font-semibold">Creators</th>
                    <th className="micro-label px-3 py-2.5 text-right font-semibold">Clicks</th>
                    <th className="micro-label px-5 py-2.5 text-right font-semibold">Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map((c) => {
                    const m = campaignMetrics(c);
                    return (
                      <tr key={c.id} className="group transition-colors hover:bg-sunken/50">
                        <td className="px-5 py-3.5">
                          <Link href={`/campaigns/${c.id}`} className="text-[13.5px] font-medium text-ink hover:underline">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3.5">
                          <CampaignStatusPill status={c.status} />
                        </td>
                        <td className="tabular px-3 py-3.5 text-right text-[13px] text-ink-soft">
                          {c.collaborations.length}
                        </td>
                        <td className="tabular px-3 py-3.5 text-right text-[13px] text-ink-soft">
                          {formatNumber(m.clicks)}
                        </td>
                        <td className="tabular px-5 py-3.5 text-right text-[13px] font-semibold text-money">
                          {m.pipeline ? formatEur(m.pipeline, { compact: true }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line sm:hidden">
              {recent.map((c) => {
                const m = campaignMetrics(c);
                return (
                  <li key={c.id}>
                    <Link href={`/campaigns/${c.id}`} className="block p-4 transition-colors active:bg-sunken">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[14px] font-medium text-ink">{c.name}</span>
                        <CampaignStatusPill status={c.status} />
                      </div>
                      <div className="mt-2 flex gap-4 text-[12px] text-ink-muted">
                        <span className="tabular">{c.collaborations.length} creators</span>
                        <span className="tabular">{formatCompact(m.clicks)} clicks</span>
                        <span className="tabular font-medium text-money">
                          {m.pipeline ? formatEur(m.pipeline, { compact: true }) : '—'}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </Reveal>
      </div>
    </AppShell>
  );
}
