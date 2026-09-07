'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { generateBrief, makeTrackingCode } from '@/lib/brief';
import { DEMO_COMPANY, DEMO_DOMAIN, SEED_CAMPAIGNS } from '@/lib/data/campaigns';
import { CREATORS, getCreator } from '@/lib/data/creators';
import { buildDailySeries, simulateCollaboration } from '@/lib/metrics';
import type {
  Campaign,
  CampaignStatus,
  Collaboration,
  CollaborationStatus,
  Notification,
  Objective,
  PersistedState,
  Role,
  User,
} from '@/lib/types';

/**
 * Application state.
 *
 * Single source of truth for everything the demo persists: session, campaigns,
 * shortlist, notifications. Components never read localStorage directly - they
 * go through this, which is what makes replacing it with a real API a
 * contained change rather than a rewrite.
 *
 * Hydration: the server always renders the default state. Persisted state is
 * loaded in an effect and exposed behind `hydrated`, so the server and the
 * first client paint always agree.
 */

const STORAGE_KEY = 'vouch.state.v1';
const STATE_VERSION = 1;

/* ------------------------------------------------------------------ *
 * Defaults
 * ------------------------------------------------------------------ */

const DEMO_USER: User = {
  id: 'user-demo',
  name: 'Elena Fischer',
  email: 'elena@trellis.io',
  role: 'brand',
  company: DEMO_COMPANY,
  companyDomain: DEMO_DOMAIN,
  avatarSeed: 'elena-fischer',
  onboarded: true,
  buyerProfile: {
    vertical: 'B2B SaaS · Revenue operations',
    personas: ['RevOps', 'Sales leaders', 'Founders', 'Marketing leaders'],
    topics: ['RevOps', 'Automation', 'Operations', 'GTM', 'Sales'],
    markets: ['Germany', 'France', 'United Kingdom', 'Netherlands'],
  },
};

function demoNotifications(): Notification[] {
  return [
    {
      id: 'n1',
      kind: 'collaboration',
      title: 'Yonathan Levy submitted a draft',
      body: 'RevOps Autumn Push — ready for your review before it goes live.',
      createdAt: new Date('2026-09-06T09:12:00Z').toISOString(),
      read: false,
      href: '/campaigns/cmp-revops-q3',
    },
    {
      id: 'n2',
      kind: 'campaign',
      title: 'Joseph Rudd published',
      body: 'RevOps Autumn Push — tracked link is live and collecting clicks.',
      createdAt: new Date('2026-09-04T15:40:00Z').toISOString(),
      read: false,
      href: '/campaigns/cmp-revops-q3',
    },
    {
      id: 'n3',
      kind: 'payout',
      title: 'Payout scheduled',
      body: 'Ingrid Halvorsen — €145 releases on approval.',
      createdAt: new Date('2026-09-02T11:05:00Z').toISOString(),
      read: true,
      href: '/payouts',
    },
  ];
}

/**
 * Creators who already have collaborations in the seeded campaigns. A creator
 * signing up is mapped onto one of these so their dashboard has real deals.
 */
const CREATOR_PERSONAS = Array.from(
  new Set(SEED_CAMPAIGNS.flatMap((c) => c.collaborations.map((col) => col.creatorId))),
);

function pickCreatorPersona(email: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < email.length; i += 1) {
    h ^= email.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const id = CREATOR_PERSONAS[(h >>> 0) % CREATOR_PERSONAS.length];
  return getCreator(id) ?? CREATORS[0];
}

function emptyState(): PersistedState {
  return {
    version: STATE_VERSION,
    user: null,
    campaigns: [],
    shortlist: [],
    notifications: [],
  };
}

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

function load(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== STATE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(state: PersistedState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode - the app still works, it just will not persist */
  }
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

export interface NewCampaignInput {
  name: string;
  objective: Objective;
  budget: number;
  audience: string;
  keyMessage: string;
  landingUrl: string;
  startDate: string;
  endDate: string;
  creatorIds: string[];
}

interface StoreValue extends PersistedState {
  hydrated: boolean;
  // auth
  signUp: (input: { name: string; email: string; company: string; role: Role }) => void;
  signIn: (email: string) => boolean;
  signOut: () => void;
  loadDemo: () => void;
  completeOnboarding: (profile: Partial<User['buyerProfile']> & { company?: string }) => void;
  // shortlist
  toggleShortlist: (creatorId: string) => void;
  isShortlisted: (creatorId: string) => boolean;
  clearShortlist: () => void;
  // campaigns
  createCampaign: (input: NewCampaignInput) => Campaign;
  setCampaignStatus: (campaignId: string, status: CampaignStatus) => void;
  setCollaborationStatus: (
    campaignId: string,
    creatorId: string,
    status: CollaborationStatus,
  ) => void;
  addCreatorsToCampaign: (campaignId: string, creatorIds: string[]) => void;
  removeCreatorFromCampaign: (campaignId: string, creatorId: string) => void;
  // notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persisted = load();
    if (persisted) setState(persisted);
    setHydrated(true);
  }, []);

  // Persist on every change, but only after hydration - otherwise the initial
  // empty state would overwrite what is already stored.
  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  const update = useCallback((fn: (prev: PersistedState) => PersistedState) => {
    setState(fn);
  }, []);

  /* ---------------- auth ---------------- */

  const signUp = useCallback<StoreValue['signUp']>(
    ({ name, email, company, role }) => {
      // A creator account is linked to a real marketplace profile, chosen
      // deterministically from those that already appear in seeded campaigns -
      // otherwise a new creator would land on an empty dashboard with no deals
      // to accept, which is the one screen that matters on their side.
      const creator = role === 'creator' ? pickCreatorPersona(email) : undefined;
      update(() => ({
        version: STATE_VERSION,
        user: {
          id: `user-${Date.now()}`,
          name,
          email,
          role,
          company: role === 'brand' ? company : 'Independent creator',
          companyDomain: company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
          avatarSeed: email,
          onboarded: false,
          buyerProfile: { vertical: '', personas: [], topics: [], markets: [] },
          creatorId: creator?.id,
        },
        // A brand-new brand account starts genuinely empty - the empty states
        // are part of the product and hiding them behind seed data would be a
        // lie. A creator account instead carries the campaigns that already
        // invited them, because inbound deals are not something they create.
        campaigns: creator
          ? SEED_CAMPAIGNS.filter((c) => c.collaborations.some((col) => col.creatorId === creator.id))
          : [],
        shortlist: [],
        notifications: creator
          ? [
              {
                id: 'n-invite',
                kind: 'collaboration',
                title: 'You have a new collaboration request',
                body: `${DEMO_COMPANY} invited you to a sponsored post.`,
                createdAt: new Date().toISOString(),
                read: false,
                href: '/deals',
              },
            ]
          : [],
      }));
    },
    [update],
  );

  const signIn = useCallback<StoreValue['signIn']>(
    (email) => {
      const existing = load();
      if (existing?.user && existing.user.email.toLowerCase() === email.toLowerCase()) {
        setState(existing);
        return true;
      }
      if (email.toLowerCase() === DEMO_USER.email) {
        setState({
          version: STATE_VERSION,
          user: DEMO_USER,
          campaigns: SEED_CAMPAIGNS,
          shortlist: ['marta-ferreira', 'tomas-loucky', 'clara-nowak'],
          notifications: demoNotifications(),
        });
        return true;
      }
      return false;
    },
    [],
  );

  const signOut = useCallback(() => {
    update(() => emptyState());
  }, [update]);

  const loadDemo = useCallback(() => {
    setState({
      version: STATE_VERSION,
      user: DEMO_USER,
      campaigns: SEED_CAMPAIGNS,
      shortlist: ['marta-ferreira', 'tomas-loucky', 'clara-nowak'],
      notifications: demoNotifications(),
    });
  }, []);

  const completeOnboarding = useCallback<StoreValue['completeOnboarding']>(
    (profile) => {
      update((prev) => {
        if (!prev.user) return prev;
        return {
          ...prev,
          user: {
            ...prev.user,
            company: profile.company ?? prev.user.company,
            onboarded: true,
            buyerProfile: {
              vertical: profile.vertical ?? prev.user.buyerProfile.vertical,
              personas: profile.personas ?? prev.user.buyerProfile.personas,
              topics: profile.topics ?? prev.user.buyerProfile.topics,
              markets: profile.markets ?? prev.user.buyerProfile.markets,
            },
          },
        };
      });
    },
    [update],
  );

  /* ---------------- shortlist ---------------- */

  const toggleShortlist = useCallback<StoreValue['toggleShortlist']>(
    (creatorId) => {
      update((prev) => ({
        ...prev,
        shortlist: prev.shortlist.includes(creatorId)
          ? prev.shortlist.filter((id) => id !== creatorId)
          : [...prev.shortlist, creatorId],
      }));
    },
    [update],
  );

  const clearShortlist = useCallback(() => {
    update((prev) => ({ ...prev, shortlist: [] }));
  }, [update]);

  /* ---------------- campaigns ---------------- */

  const createCampaign = useCallback<StoreValue['createCampaign']>(
    (input) => {
      const id = `cmp-${Date.now().toString(36)}`;
      const creators = input.creatorIds
        .map((cid) => getCreator(cid))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));

      const collaborations: Collaboration[] = creators.map((c) => ({
        creatorId: c.id,
        status: 'invited',
        fee: c.pricePerPost,
        deliverables: '1 sponsored post + 1 repost',
        deliverBy: input.endDate,
        payoutStatus: 'pending',
      }));

      const campaign: Campaign = {
        id,
        name: input.name,
        brand: state.user?.company ?? DEMO_COMPANY,
        objective: input.objective,
        budget: input.budget,
        status: 'draft',
        audience: input.audience,
        keyMessage: input.keyMessage,
        collaborations,
        brief: generateBrief({
          campaignName: input.name,
          company: state.user?.company ?? DEMO_COMPANY,
          objective: input.objective,
          audience: input.audience,
          keyMessage: input.keyMessage,
          landingUrl: input.landingUrl,
          creators,
        }),
        startDate: input.startDate,
        endDate: input.endDate,
        createdAt: new Date().toISOString(),
        daily: [],
      };

      update((prev) => ({
        ...prev,
        campaigns: [campaign, ...prev.campaigns],
        notifications: [
          {
            id: `n-${id}`,
            kind: 'campaign',
            title: `${input.name} created`,
            body: `${creators.length} creator${creators.length === 1 ? '' : 's'} invited. Tracked link ${makeTrackingCode(input.name, state.user?.company ?? '')} is ready.`,
            createdAt: new Date().toISOString(),
            read: false,
            href: `/campaigns/${id}`,
          },
          ...prev.notifications,
        ],
      }));

      return campaign;
    },
    [state.user, update],
  );

  /**
   * Status transitions carry side effects, because that is what makes the demo
   * behave like a product: going live publishes accepted collaborations, which
   * generates their metrics, which rebuilds the daily series, which moves every
   * dashboard number that reads from it.
   */
  const setCampaignStatus = useCallback<StoreValue['setCampaignStatus']>(
    (campaignId, status) => {
      update((prev) => ({
        ...prev,
        campaigns: prev.campaigns.map((c) => {
          if (c.id !== campaignId) return c;

          let collaborations = c.collaborations;
          if (status === 'live') {
            const startedAt = new Date().toISOString();
            collaborations = c.collaborations.map((collab, i) => {
              if (collab.status !== 'accepted' && collab.status !== 'invited') return collab;
              const published: Collaboration = {
                ...collab,
                status: 'published',
                publishedAt: new Date(Date.now() - i * 86_400_000).toISOString(),
                payoutStatus: 'scheduled',
              };
              published.metrics = simulateCollaboration(c.id, published);
              return published;
            });
            const next = { ...c, status, collaborations, startDate: c.startDate || startedAt };
            return { ...next, daily: buildDailySeries(next, 30) };
          }

          if (status === 'completed') {
            collaborations = c.collaborations.map((collab) =>
              collab.status === 'published' ? { ...collab, payoutStatus: 'paid' as const } : collab,
            );
          }

          const next = { ...c, status, collaborations };
          return { ...next, daily: buildDailySeries(next, 30) };
        }),
      }));
    },
    [update],
  );

  const setCollaborationStatus = useCallback<StoreValue['setCollaborationStatus']>(
    (campaignId, creatorId, status) => {
      update((prev) => ({
        ...prev,
        campaigns: prev.campaigns.map((c) => {
          if (c.id !== campaignId) return c;
          const collaborations = c.collaborations.map((collab) => {
            if (collab.creatorId !== creatorId) return collab;
            const next: Collaboration = { ...collab, status };
            if (status === 'published') {
              next.publishedAt = next.publishedAt ?? new Date().toISOString();
              next.metrics = simulateCollaboration(c.id, next);
              next.payoutStatus = 'scheduled';
            }
            if (status === 'declined') {
              next.metrics = undefined;
              next.payoutStatus = 'pending';
            }
            return next;
          });
          const next = { ...c, collaborations };
          return { ...next, daily: buildDailySeries(next, 30) };
        }),
      }));
    },
    [update],
  );

  const addCreatorsToCampaign = useCallback<StoreValue['addCreatorsToCampaign']>(
    (campaignId, creatorIds) => {
      update((prev) => ({
        ...prev,
        campaigns: prev.campaigns.map((c) => {
          if (c.id !== campaignId) return c;
          const existing = new Set(c.collaborations.map((x) => x.creatorId));
          const additions: Collaboration[] = creatorIds
            .filter((id) => !existing.has(id))
            .map((id) => {
              const creator = getCreator(id);
              return {
                creatorId: id,
                status: 'invited' as const,
                fee: creator?.pricePerPost ?? 150,
                deliverables: '1 sponsored post + 1 repost',
                deliverBy: c.endDate,
                payoutStatus: 'pending' as const,
              };
            });
          return { ...c, collaborations: [...c.collaborations, ...additions] };
        }),
      }));
    },
    [update],
  );

  const removeCreatorFromCampaign = useCallback<StoreValue['removeCreatorFromCampaign']>(
    (campaignId, creatorId) => {
      update((prev) => ({
        ...prev,
        campaigns: prev.campaigns.map((c) => {
          if (c.id !== campaignId) return c;
          const next = {
            ...c,
            collaborations: c.collaborations.filter((x) => x.creatorId !== creatorId),
          };
          return { ...next, daily: buildDailySeries(next, 30) };
        }),
      }));
    },
    [update],
  );

  /* ---------------- notifications ---------------- */

  const markNotificationRead = useCallback<StoreValue['markNotificationRead']>(
    (id) => {
      update((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
    },
    [update],
  );

  const markAllNotificationsRead = useCallback(() => {
    update((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, [update]);

  const resetDemo = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
    setState(emptyState());
  }, []);

  const isShortlisted = useCallback(
    (creatorId: string) => state.shortlist.includes(creatorId),
    [state.shortlist],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      hydrated,
      signUp,
      signIn,
      signOut,
      loadDemo,
      completeOnboarding,
      toggleShortlist,
      isShortlisted,
      clearShortlist,
      createCampaign,
      setCampaignStatus,
      setCollaborationStatus,
      addCreatorsToCampaign,
      removeCreatorFromCampaign,
      markNotificationRead,
      markAllNotificationsRead,
      resetDemo,
    }),
    [
      state,
      hydrated,
      signUp,
      signIn,
      signOut,
      loadDemo,
      completeOnboarding,
      toggleShortlist,
      isShortlisted,
      clearShortlist,
      createCampaign,
      setCampaignStatus,
      setCollaborationStatus,
      addCreatorsToCampaign,
      removeCreatorFromCampaign,
      markNotificationRead,
      markAllNotificationsRead,
      resetDemo,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export { DEMO_USER };
