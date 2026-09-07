'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Users, X } from 'lucide-react';

import { formatEur } from '@/lib/format';
import { CATEGORIES, COUNTRIES, CREATORS } from '@/lib/data/creators';
import { matchScoreOnly } from '@/lib/match';
import { DEMO_USER, useStore } from '@/lib/store';
import { AppShell } from '@/components/app-shell';
import { CreatorCard } from '@/components/creator-card';
import { SiteFooter, SiteNav } from '@/components/marketing/site-chrome';
import { Button } from '@/components/ui/button';
import { Checkbox, Input, Select } from '@/components/ui/field';
import { EmptyState, useToast } from '@/components/ui/feedback';
import type { Creator } from '@/lib/types';

/**
 * Creator marketplace.
 *
 * Public by design - the original exposes a browsable creator directory without
 * a login, and it is the best possible advert for the product. Signed out you
 * get the demo buyer profile's ranking; signed in you get yours, plus shortlist
 * and multi-select into a campaign.
 */

type SortKey = 'match' | 'price-asc' | 'price-desc' | 'followers' | 'engagement';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'match', label: 'Best match' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'followers', label: 'Largest audience' },
  { key: 'engagement', label: 'Highest engagement' },
];

const PRICE_BANDS = [
  { id: 'under-150', label: 'Under €150', test: (c: Creator) => c.pricePerPost < 150 },
  { id: '150-400', label: '€150 – €400', test: (c: Creator) => c.pricePerPost >= 150 && c.pricePerPost <= 400 },
  { id: '400-700', label: '€400 – €700', test: (c: Creator) => c.pricePerPost > 400 && c.pricePerPost <= 700 },
  { id: 'over-700', label: 'Over €700', test: (c: Creator) => c.pricePerPost > 700 },
];

const AUDIENCE_BANDS = [
  { id: 'nano', label: 'Under 5K', test: (c: Creator) => c.followers < 5000 },
  { id: 'micro', label: '5K – 15K', test: (c: Creator) => c.followers >= 5000 && c.followers < 15000 },
  { id: 'mid', label: '15K – 30K', test: (c: Creator) => c.followers >= 15000 && c.followers < 30000 },
  { id: 'macro', label: '30K+', test: (c: Creator) => c.followers >= 30000 },
];

export default function MarketplacePage() {
  const { user, hydrated, shortlist, toggleShortlist } = useStore();
  const profile = user?.onboarded && user.buyerProfile.personas.length ? user.buyerProfile : DEMO_USER.buyerProfile;

  const body = (
    <MarketplaceBody profile={profile} shortlist={shortlist} onToggleShortlist={toggleShortlist} signedIn={Boolean(user)} />
  );

  // Signed in: full app chrome. Signed out: marketing chrome, same content.
  if (hydrated && user) {
    return (
      <AppShell title="Marketplace" subtitle={`${CREATORS.length} vetted creators, ranked for ${user.company}`}>
        {body}
      </AppShell>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <main id="main" className="flex-1">
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink sm:text-[38px]">
              The marketplace
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              {CREATORS.length} vetted B2B creators, each with a fixed price per post shown before you
              book. Ranked here against a sample revenue-operations buyer profile —{' '}
              <Link href="/sign-up" className="font-medium text-brand-600 hover:underline">
                create an account
              </Link>{' '}
              to rank them against yours.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{body}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

function MarketplaceBody({
  profile,
  shortlist,
  onToggleShortlist,
  signedIn,
}: {
  profile: typeof DEMO_USER.buyerProfile;
  shortlist: string[];
  onToggleShortlist: (id: string) => void;
  signedIn: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('match');
  const [categories, setCategories] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [priceBands, setPriceBands] = useState<string[]>([]);
  const [audienceBands, setAudienceBands] = useState<string[]>([]);
  const [onlyShortlisted, setOnlyShortlisted] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const scored = useMemo(
    () => CREATORS.map((c) => ({ creator: c, score: matchScoreOnly(c, profile) })),
    [profile],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = scored.filter(({ creator: c }) => {
      if (q) {
        const haystack = `${c.name} ${c.headline} ${c.category} ${c.topics.join(' ')} ${c.country} ${c.bio}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (categories.length && !categories.some((cat) => c.category.includes(cat))) return false;
      if (countries.length && !countries.includes(c.country)) return false;
      if (priceBands.length && !PRICE_BANDS.filter((b) => priceBands.includes(b.id)).some((b) => b.test(c))) return false;
      if (audienceBands.length && !AUDIENCE_BANDS.filter((b) => audienceBands.includes(b.id)).some((b) => b.test(c)))
        return false;
      if (onlyShortlisted && !shortlist.includes(c.id)) return false;
      if (onlyAvailable && c.availability === 'booked') return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sort) {
      case 'price-asc':
        sorted.sort((a, b) => a.creator.pricePerPost - b.creator.pricePerPost);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.creator.pricePerPost - a.creator.pricePerPost);
        break;
      case 'followers':
        sorted.sort((a, b) => b.creator.followers - a.creator.followers);
        break;
      case 'engagement':
        sorted.sort((a, b) => b.creator.engagement - a.creator.engagement);
        break;
      default:
        sorted.sort((a, b) => b.score - a.score || a.creator.pricePerPost - b.creator.pricePerPost);
    }
    return sorted;
  }, [scored, query, categories, countries, priceBands, audienceBands, onlyShortlisted, onlyAvailable, shortlist, sort]);

  const activeFilterCount =
    categories.length + countries.length + priceBands.length + audienceBands.length + (onlyShortlisted ? 1 : 0) + (onlyAvailable ? 1 : 0);

  function clearAll() {
    setCategories([]);
    setCountries([]);
    setPriceBands([]);
    setAudienceBands([]);
    setOnlyShortlisted(false);
    setOnlyAvailable(false);
    setQuery('');
  }

  function toggleIn(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function handleShortlist(id: string) {
    if (!signedIn) {
      push({ tone: 'info', title: 'Sign in to shortlist', body: 'Your shortlist is saved to your workspace.' });
      return;
    }
    const wasIn = shortlist.includes(id);
    onToggleShortlist(id);
    push({
      tone: 'success',
      title: wasIn ? 'Removed from shortlist' : 'Added to shortlist',
    });
  }

  function handleBook(id: string) {
    if (!signedIn) {
      router.push('/sign-up');
      return;
    }
    router.push(`/campaigns/new?creators=${id}`);
  }

  const totalSelectedCost = selected.reduce(
    (sum, id) => sum + (CREATORS.find((c) => c.id === id)?.pricePerPost ?? 0),
    0,
  );

  const filterRail = (
    <FilterRail
      categories={categories}
      countries={countries}
      priceBands={priceBands}
      audienceBands={audienceBands}
      onlyShortlisted={onlyShortlisted}
      onlyAvailable={onlyAvailable}
      signedIn={signedIn}
      shortlistCount={shortlist.length}
      onToggleCategory={(v) => toggleIn(categories, setCategories, v)}
      onToggleCountry={(v) => toggleIn(countries, setCountries, v)}
      onTogglePrice={(v) => toggleIn(priceBands, setPriceBands, v)}
      onToggleAudience={(v) => toggleIn(audienceBands, setAudienceBands, v)}
      onToggleShortlistedOnly={setOnlyShortlisted}
      onToggleAvailableOnly={setOnlyAvailable}
      counts={scored}
    />
  );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, topic, niche or country…"
            aria-label="Search creators"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort creators" className="w-auto">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        {/* Filter rail (desktop) */}
        <div className="hidden w-[212px] shrink-0 lg:block">
          <div className="sticky top-24">
            <div className="mb-3 flex items-center justify-between">
              <span className="micro-label">Filters</span>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-[12px] font-medium text-brand-600 hover:underline">
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto pr-1">{filterRail}</div>
          </div>
        </div>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[13px] text-ink-muted">
              <span className="tabular font-semibold text-ink">{results.length}</span>{' '}
              {results.length === 1 ? 'creator' : 'creators'}
              {activeFilterCount > 0 && ' matching your filters'}
            </p>
            {sort === 'match' && (
              <p className="hidden text-[12px] text-ink-faint sm:block">Ranked by audience fit</p>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No creators match those filters"
              body={
                onlyShortlisted && shortlist.length === 0
                  ? 'Your shortlist is empty. Star a few creators and they will collect here.'
                  : 'Try widening the price band or clearing a filter — the marketplace has 24 creators in total.'
              }
              action={
                <Button variant="secondary" onClick={clearAll}>
                  Clear all filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map(({ creator, score }, i) => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  score={score}
                  rank={sort === 'match' ? i + 1 : undefined}
                  shortlisted={shortlist.includes(creator.id)}
                  onToggleShortlist={handleShortlist}
                  selected={selected.includes(creator.id)}
                  onToggleSelect={
                    signedIn
                      ? (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
                      : undefined
                  }
                  onBook={handleBook}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" onClick={() => setFiltersOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-[20px] border-t border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="rounded-[8px] p-1.5 text-ink-faint hover:bg-sunken">
                <X className="size-4" />
              </button>
            </div>
            {filterRail}
            <div className="sticky bottom-0 mt-5 flex gap-2 border-t border-line bg-surface pt-4">
              <Button variant="secondary" block onClick={clearAll}>
                Clear
              </Button>
              <Button block onClick={() => setFiltersOpen(false)}>
                Show {results.length} results
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Selection bar - multi-select straight into a campaign */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 backdrop-blur-md animate-[bar-in_200ms_ease-out] sm:p-4">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-600">
              <Users className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">
                {selected.length} selected
              </p>
              <p className="tabular truncate text-[12px] text-ink-muted">
                {formatEur(totalSelectedCost)} total for one post each
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
            <Button size="sm" onClick={() => router.push(`/campaigns/new?creators=${selected.join(',')}`)}>
              Create campaign
            </Button>
          </div>
          <style>{`@keyframes bar-in{from{transform:translateY(100%)}to{transform:none}}`}</style>
        </div>
      )}
    </div>
  );
}

function FilterRail({
  categories,
  countries,
  priceBands,
  audienceBands,
  onlyShortlisted,
  onlyAvailable,
  signedIn,
  shortlistCount,
  onToggleCategory,
  onToggleCountry,
  onTogglePrice,
  onToggleAudience,
  onToggleShortlistedOnly,
  onToggleAvailableOnly,
  counts,
}: {
  categories: string[];
  countries: string[];
  priceBands: string[];
  audienceBands: string[];
  onlyShortlisted: boolean;
  onlyAvailable: boolean;
  signedIn: boolean;
  shortlistCount: number;
  onToggleCategory: (v: string) => void;
  onToggleCountry: (v: string) => void;
  onTogglePrice: (v: string) => void;
  onToggleAudience: (v: string) => void;
  onToggleShortlistedOnly: (v: boolean) => void;
  onToggleAvailableOnly: (v: boolean) => void;
  counts: { creator: Creator; score: number }[];
}) {
  const countBy = (fn: (c: Creator) => boolean) => counts.filter((x) => fn(x.creator)).length;

  return (
    <div className="space-y-6">
      {signedIn && (
        <FilterGroup title="Quick filters">
          <Checkbox
            checked={onlyShortlisted}
            onChange={onToggleShortlistedOnly}
            label="Shortlisted only"
            count={shortlistCount}
          />
          <Checkbox checked={onlyAvailable} onChange={onToggleAvailableOnly} label="Available now" />
        </FilterGroup>
      )}

      <FilterGroup title="Niche">
        {CATEGORIES.map((cat) => (
          <Checkbox
            key={cat}
            checked={categories.includes(cat)}
            onChange={() => onToggleCategory(cat)}
            label={cat}
            count={countBy((c) => c.category.includes(cat))}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Price per post">
        {PRICE_BANDS.map((b) => (
          <Checkbox
            key={b.id}
            checked={priceBands.includes(b.id)}
            onChange={() => onTogglePrice(b.id)}
            label={b.label}
            count={countBy(b.test)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Audience size">
        {AUDIENCE_BANDS.map((b) => (
          <Checkbox
            key={b.id}
            checked={audienceBands.includes(b.id)}
            onChange={() => onToggleAudience(b.id)}
            label={b.label}
            count={countBy(b.test)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Country">
        {COUNTRIES.map((c) => (
          <Checkbox
            key={c}
            checked={countries.includes(c)}
            onChange={() => onToggleCountry(c)}
            label={c}
            count={countBy((x) => x.country === c)}
          />
        ))}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="micro-label mb-2">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
