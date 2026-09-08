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

import { digestsMatch } from '@/lib/auth';
import { createClickEvent } from '@/lib/tracking';
import { createDraft } from '@/lib/drafts';
import { counterpartReply, createMessage, parseThreadId, seedMessages } from '@/lib/messages';
import { generateBrief, makeTrackingCode } from '@/lib/brief';
import { DEMO_COMPANY, DEMO_DOMAIN, SEED_CAMPAIGNS } from '@/lib/data/campaigns';
import { CREATORS, getCreator } from '@/lib/data/creators';
import { buildDailySeries, simulateCollaboration } from '@/lib/metrics';
import type {
  Campaign,
  CampaignStatus,
  Collaboration,
  ClickEvent,
  CollaborationStatus,
  Creator,
  CreatorEdits,
  Message,
  Notification,
  Objective,
  PayoutMethod,
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
/**
 * Bumped to 2 when drafts, messages, payout methods and creator profile edits
 * were added. State written by an older build is discarded rather than
 * migrated - the alternative is guessing at defaults for fields that never
 * existed, and this is a demo whose seed data is one sign-in away.
 */
const STATE_VERSION = 2;

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
    clicks: [],
    messages: [],
  };
}

const creatorNameOf = (id: string) => getCreator(id)?.name;

/** The demo brand's state, used both by sign-in and by the "load demo" path. */
function demoState(): PersistedState {
  return {
    version: STATE_VERSION,
    user: DEMO_USER,
    campaigns: SEED_CAMPAIGNS,
    shortlist: ['marta-ferreira', 'tomas-loucky', 'clara-nowak'],
    notifications: demoNotifications(),
    clicks: [],
    messages: seedMessages(SEED_CAMPAIGNS, creatorNameOf),
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
  signUp: (input: { name: string; email: string; company: string; role: Role; passwordHash: string }) => void;
  /** Verifies the stored digest. Returns why it failed so the form can say so. */
  signIn: (email: string, passwordHash: string) => 'ok' | 'no-account' | 'bad-password';
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
  // content review
  submitDraft: (
    campaignId: string,
    creatorId: string,
    input: { body: string; note?: string },
  ) => void;
  reviewDraft: (
    campaignId: string,
    creatorId: string,
    decision: 'approve' | 'changes',
    feedback?: string,
  ) => void;
  // messaging
  /** Appends your message and returns the counterpart's reply for the caller to deliver. */
  sendMessage: (threadId: string, body: string) => Message | null;
  appendMessage: (message: Message) => void;
  markThreadRead: (threadId: string) => void;
  // creator profile & payouts
  updateCreatorProfile: (patch: CreatorEdits) => void;
  setPayoutMethod: (method: PayoutMethod | null) => void;
  /** The seeded profile with the signed-in creator's own edits applied. */
  applyCreatorEdits: (creator: Creator) => Creator;
  myCreator: Creator | undefined;
  // tracking
  recordClick: (input: { campaignId: string; creatorId: string | null; code: string }) => ClickEvent;
  clearClicks: () => void;
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
    ({ name, email, company, role, passwordHash }) => {
      // A creator account is linked to a real marketplace profile, chosen
      // deterministically from those that already appear in seeded campaigns -
      // otherwise a new creator would land on an empty dashboard with no deals
      // to accept, which is the one screen that matters on their side.
      const creator = role === 'creator' ? pickCreatorPersona(email) : undefined;
      const creatorCampaigns = creator
        ? SEED_CAMPAIGNS.filter((c) => c.collaborations.some((col) => col.creatorId === creator.id))
        : [];
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
          passwordHash,
          buyerProfile: { vertical: '', personas: [], topics: [], markets: [] },
          creatorId: creator?.id,
        },
        // A brand-new brand account starts genuinely empty - the empty states
        // are part of the product and hiding them behind seed data would be a
        // lie. A creator account instead carries the campaigns that already
        // invited them, because inbound deals are not something they create.
        campaigns: creatorCampaigns,
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
        clicks: [],
        // A creator arriving to an empty inbox next to campaigns that already
        // invited them would not add up - the invite had to be sent somehow.
        messages: creator
          ? seedMessages(
              creatorCampaigns.map((c) => ({
                ...c,
                collaborations: c.collaborations.filter((col) => col.creatorId === creator.id),
              })),
              creatorNameOf,
            )
          : [],
      }));
    },
    [update],
  );

  const signIn = useCallback<StoreValue['signIn']>((email, passwordHash) => {
    const existing = load();

    if (existing?.user && existing.user.email.toLowerCase() === email.toLowerCase()) {
      // Accounts created before passwords existed have no digest; let them in
      // rather than locking someone out of their own demo data.
      if (existing.user.passwordHash && !digestsMatch(existing.user.passwordHash, passwordHash)) {
        return 'bad-password';
      }
      setState(existing);
      return 'ok';
    }

    if (email.toLowerCase() === DEMO_USER.email) {
      setState(demoState());
      return 'ok';
    }

    return 'no-account';
  }, []);

  const signOut = useCallback(() => {
    update(() => emptyState());
  }, [update]);

  const loadDemo = useCallback(() => {
    setState(demoState());
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

  /* ---------------- content review ---------------- */

  /**
   * Creator submits copy for approval.
   *
   * Every submission is a new revision appended to the collaboration, so a
   * post that went back and forth twice still shows what was asked for and
   * what changed. The status moves to in_review, which is what puts it in
   * front of the brand.
   */
  const submitDraft = useCallback<StoreValue['submitDraft']>(
    (campaignId, creatorId, input) => {
      const creatorName = getCreator(creatorId)?.name ?? 'A creator';
      update((prev) => {
        const campaign = prev.campaigns.find((c) => c.id === campaignId);
        let revision = 1;

        const campaigns = prev.campaigns.map((c) => {
          if (c.id !== campaignId) return c;
          return {
            ...c,
            collaborations: c.collaborations.map((collab) => {
              if (collab.creatorId !== creatorId) return collab;
              const drafts = collab.drafts ?? [];
              revision = drafts.length + 1;
              return {
                ...collab,
                status: 'in_review' as const,
                drafts: [
                  ...drafts,
                  createDraft({ revision, body: input.body, note: input.note }),
                ],
              };
            }),
          };
        });

        return {
          ...prev,
          campaigns,
          notifications: [
            {
              id: `n-draft-${campaignId}-${creatorId}-${revision}`,
              kind: 'collaboration' as const,
              title:
                revision === 1
                  ? `${creatorName} submitted a draft`
                  : `${creatorName} submitted revision ${revision}`,
              body: `${campaign?.name ?? 'A campaign'} — ready for your review before it goes live.`,
              createdAt: new Date().toISOString(),
              read: false,
              href: `/campaigns/${campaignId}`,
            },
            ...prev.notifications,
          ],
        };
      });
    },
    [update],
  );

  /**
   * Brand reviews the latest revision.
   *
   * Approving is what publishes the post and schedules the fee - this is the
   * mechanic the status flip used to stand in for. Requesting changes hands it
   * back to the creator with the feedback attached, and the collaboration
   * returns to accepted so it reads as "with the creator" rather than "with
   * us".
   */
  const reviewDraft = useCallback<StoreValue['reviewDraft']>(
    (campaignId, creatorId, decision, feedback) => {
      const creatorName = getCreator(creatorId)?.name ?? 'A creator';
      update((prev) => {
        const campaigns = prev.campaigns.map((c) => {
          if (c.id !== campaignId) return c;

          const collaborations = c.collaborations.map((collab) => {
            if (collab.creatorId !== creatorId) return collab;
            const drafts = [...(collab.drafts ?? [])];
            if (drafts.length === 0) return collab;

            const last = drafts.length - 1;
            const reviewedAt = new Date().toISOString();

            if (decision === 'approve') {
              drafts[last] = { ...drafts[last], status: 'approved', reviewedAt };
              const next: Collaboration = {
                ...collab,
                drafts,
                status: 'published',
                publishedAt: collab.publishedAt ?? reviewedAt,
                payoutStatus: 'scheduled',
              };
              next.metrics = simulateCollaboration(c.id, next);
              return next;
            }

            drafts[last] = {
              ...drafts[last],
              status: 'changes_requested',
              feedback: feedback?.trim() || undefined,
              reviewedAt,
            };
            return { ...collab, drafts, status: 'accepted' as const };
          });

          const next = { ...c, collaborations };
          return { ...next, daily: buildDailySeries(next, 30) };
        });

        const campaign = campaigns.find((c) => c.id === campaignId);

        return {
          ...prev,
          campaigns,
          notifications: [
            {
              id: `n-review-${campaignId}-${creatorId}-${Date.now()}`,
              kind: 'collaboration' as const,
              title:
                decision === 'approve'
                  ? `Approved ${creatorName}'s post`
                  : `Changes requested from ${creatorName}`,
              body:
                decision === 'approve'
                  ? `${campaign?.name ?? 'Campaign'} — published and the fee is scheduled for release.`
                  : `${campaign?.name ?? 'Campaign'} — back with the creator for a revision.`,
              createdAt: new Date().toISOString(),
              read: false,
              href: `/campaigns/${campaignId}`,
            },
            ...prev.notifications,
          ],
        };
      });
    },
    [update],
  );

  /* ---------------- messaging ---------------- */

  /**
   * Sends a message and returns what the other side would reply, without
   * appending it. The caller decides when the reply lands, so it arrives a
   * beat later like a person typing rather than materialising in the same
   * frame - and so a component that does not want a reply simply ignores the
   * return value.
   */
  const sendMessage = useCallback<StoreValue['sendMessage']>(
    (id, body) => {
      const user = state.user;
      if (!user || !body.trim()) return null;

      const authorName = user.role === 'brand' ? user.company : user.name;
      const mine = createMessage({ threadId: id, from: user.role, authorName, body: body.trim() });
      // Your own message is never unread to you.
      mine.read = true;

      update((prev) => ({ ...prev, messages: [...prev.messages, mine] }));

      const parsed = parseThreadId(id);
      const counterpartName =
        user.role === 'brand'
          ? (parsed && getCreator(parsed.creatorId)?.name) || 'The creator'
          : state.campaigns.find((c) => c.id === parsed?.campaignId)?.brand ?? 'The brand';

      return counterpartReply({ threadId: id, body, from: user.role, counterpartName });
    },
    [state.user, state.campaigns, update],
  );

  const appendMessage = useCallback<StoreValue['appendMessage']>(
    (message) => {
      update((prev) => ({ ...prev, messages: [...prev.messages, message] }));
    },
    [update],
  );

  const markThreadRead = useCallback<StoreValue['markThreadRead']>(
    (id) => {
      update((prev) => ({
        ...prev,
        messages: prev.messages.map((m) => (m.threadId === id ? { ...m, read: true } : m)),
      }));
    },
    [update],
  );

  /* ---------------- creator profile & payouts ---------------- */

  const updateCreatorProfile = useCallback<StoreValue['updateCreatorProfile']>(
    (patch) => {
      update((prev) => {
        if (!prev.user) return prev;
        return {
          ...prev,
          user: {
            ...prev.user,
            creatorEdits: {
              ...prev.user.creatorEdits,
              ...patch,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [update],
  );

  const setPayoutMethod = useCallback<StoreValue['setPayoutMethod']>(
    (method) => {
      update((prev) => {
        if (!prev.user) return prev;
        return { ...prev, user: { ...prev.user, payoutMethod: method ?? undefined } };
      });
    },
    [update],
  );

  /* ---------------- tracking ---------------- */

  /**
   * Records a real click from the /l/[code] route.
   *
   * The event is returned as well as stored so the redirect page can show
   * exactly what was captured - seeing the attribution land is the whole point
   * of the interstitial.
   */
  const recordClick = useCallback<StoreValue['recordClick']>((input) => {
    const event = createClickEvent(input);
    update((prev) => ({ ...prev, clicks: [event, ...prev.clicks].slice(0, 500) }));
    return event;
  }, [update]);

  const clearClicks = useCallback(() => {
    update((prev) => ({ ...prev, clicks: [] }));
  }, [update]);

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

  /**
   * Overlays the signed-in creator's edits on their own profile, and returns
   * everyone else untouched. Keeping this as a function rather than mutating
   * CREATORS means the seed data stays immutable and shared, and an edit
   * cannot leak into another creator's card.
   */
  const applyCreatorEdits = useCallback(
    (creator: Creator): Creator => {
      const user = state.user;
      if (!user || user.role !== 'creator' || user.creatorId !== creator.id) return creator;
      const edits = user.creatorEdits;
      if (!edits) return creator;
      return {
        ...creator,
        headline: edits.headline ?? creator.headline,
        bio: edits.bio ?? creator.bio,
        whyWorkWithMe: edits.whyWorkWithMe ?? creator.whyWorkWithMe,
        topics: edits.topics ?? creator.topics,
        pricePerPost: edits.pricePerPost ?? creator.pricePerPost,
        availability: edits.availability ?? creator.availability,
      };
    },
    [state.user],
  );

  const myCreator = useMemo(() => {
    const id = state.user?.creatorId;
    if (!id) return undefined;
    const base = getCreator(id);
    return base ? applyCreatorEdits(base) : undefined;
  }, [state.user?.creatorId, applyCreatorEdits]);

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
      submitDraft,
      reviewDraft,
      sendMessage,
      appendMessage,
      markThreadRead,
      updateCreatorProfile,
      setPayoutMethod,
      applyCreatorEdits,
      myCreator,
      recordClick,
      clearClicks,
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
      submitDraft,
      reviewDraft,
      sendMessage,
      appendMessage,
      markThreadRead,
      updateCreatorProfile,
      setPayoutMethod,
      applyCreatorEdits,
      myCreator,
      recordClick,
      clearClicks,
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
