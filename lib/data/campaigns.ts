import { generateBrief } from '@/lib/brief';
import { getCreator } from '@/lib/data/creators';
import { buildDailySeries, simulateCollaboration } from '@/lib/metrics';
import type { Campaign, Collaboration, CollaborationStatus, PayoutStatus } from '@/lib/types';

/**
 * Seeded campaigns for the demo brand.
 *
 * These exist so a reviewer landing on the dashboard sees a product in flight
 * rather than an empty shell - covering every status (completed, live,
 * scheduled, draft) so each state is reachable without having to create one
 * first. Anything the user creates is added alongside these.
 */

export const DEMO_COMPANY = 'Trellis';
export const DEMO_DOMAIN = 'trellis.io';

interface CollabSeed {
  creatorId: string;
  status: CollaborationStatus;
  /** Days after campaign start that this creator published. */
  publishDay?: number;
  payoutStatus?: PayoutStatus;
  deliverables?: string;
  /** Submitted post copy. Only meaningful when status is 'in_review'. */
  draft?: string;
  draftNote?: string;
}

interface CampaignSeed {
  id: string;
  name: string;
  objective: Campaign['objective'];
  status: Campaign['status'];
  budget: number;
  audience: string;
  keyMessage: string;
  landingUrl: string;
  /** Days before the fixed reference date that the campaign started. */
  startedDaysAgo: number;
  lengthDays: number;
  collaborators: CollabSeed[];
}

const REFERENCE = new Date('2026-09-07T12:00:00Z');

function isoDaysAgo(days: number): string {
  return new Date(REFERENCE.getTime() - days * 86_400_000).toISOString();
}

function isoDaysFrom(startIso: string, days: number): string {
  return new Date(new Date(startIso).getTime() + days * 86_400_000).toISOString();
}

const SEEDS: CampaignSeed[] = [
  {
    id: 'cmp-revops-q3',
    name: 'RevOps Autumn Push',
    objective: 'pipeline',
    status: 'live',
    budget: 2400,
    audience: 'RevOps leads and sales operations managers at 50-500 person B2B SaaS companies',
    keyMessage:
      'Your pipeline reporting is wrong because six tools disagree. Trellis makes them agree without a migration.',
    landingUrl: 'https://trellis.io/revops',
    startedDaysAgo: 24,
    lengthDays: 30,
    collaborators: [
      { creatorId: 'marta-ferreira', status: 'published', publishDay: 3, payoutStatus: 'paid' },
      { creatorId: 'lukas-brenner', status: 'published', publishDay: 8, payoutStatus: 'paid' },
      { creatorId: 'joseph-rudd', status: 'published', publishDay: 14, payoutStatus: 'scheduled' },
      {
        creatorId: 'yonathan-levy',
        status: 'in_review',
        payoutStatus: 'pending',
        draft: [
          'Your pipeline number is wrong. Not slightly — structurally.',
          '',
          'Six tools each hold a piece of the deal, none of them agree on what stage it is in, and the number you take into the board meeting is whichever one you exported last. I have watched RevOps teams spend a full week a quarter reconciling that by hand.',
          '',
          'The usual fix is a migration: pick one system of record, move everything into it, lose two quarters. Trellis takes the other route — it leaves the six tools where they are and makes them agree.',
          '',
          'I am not going to tell you it is magic. If your data is bad going in, it is bad coming out. But the reconciliation week is gone, and that week was never the job.',
          '',
          'Worth twenty minutes if this is your quarter: trellis.io/revops',
          '',
          'Paid partnership with Trellis.',
        ].join('\n'),
        draftNote:
          'Kept it problem-first — the product does not show up until paragraph three, which is what my audience actually reads. Happy to move the link higher if you want more clicks and fewer reads.',
      },
    ],
  },
  {
    id: 'cmp-automation-launch',
    name: 'Automation Playbook Launch',
    objective: 'launch',
    status: 'live',
    budget: 1600,
    audience: 'Business ops and automation leads at scale-ups',
    keyMessage:
      'We shipped multi-step workflows. The thing you were doing in three tools is now one.',
    landingUrl: 'https://trellis.io/workflows',
    startedDaysAgo: 12,
    lengthDays: 21,
    collaborators: [
      { creatorId: 'clara-nowak', status: 'published', publishDay: 2, payoutStatus: 'paid' },
      { creatorId: 'ingrid-halvorsen', status: 'published', publishDay: 6, payoutStatus: 'scheduled' },
      { creatorId: 'elitsa-raynova', status: 'accepted', payoutStatus: 'pending' },
    ],
  },
  {
    id: 'cmp-summer-signups',
    name: 'Summer Signups Sprint',
    objective: 'signups',
    status: 'completed',
    budget: 1800,
    audience: 'Growth and product teams evaluating workflow tooling',
    keyMessage: 'Start free, connect two tools, see the gap in your funnel in ten minutes.',
    landingUrl: 'https://trellis.io/start',
    startedDaysAgo: 74,
    lengthDays: 28,
    collaborators: [
      { creatorId: 'diego-salvatierra', status: 'published', publishDay: 4, payoutStatus: 'paid' },
      { creatorId: 'raghav-jerath', status: 'published', publishDay: 9, payoutStatus: 'paid' },
      { creatorId: 'guillaume-deramchi', status: 'published', publishDay: 15, payoutStatus: 'paid' },
      { creatorId: 'clara-nowak', status: 'published', publishDay: 20, payoutStatus: 'paid' },
    ],
  },
  {
    id: 'cmp-founder-series',
    name: 'Founder Series — Autumn',
    objective: 'awareness',
    status: 'scheduled',
    budget: 1500,
    audience: 'Bootstrapped and seed-stage SaaS founders in Europe',
    keyMessage: 'The ops stack you pick at 10 people decides how much it hurts at 100.',
    landingUrl: 'https://trellis.io/founders',
    startedDaysAgo: -9,
    lengthDays: 24,
    collaborators: [
      { creatorId: 'mikkel-sorensen', status: 'accepted', payoutStatus: 'pending' },
      { creatorId: 'sofia-marchetti', status: 'accepted', payoutStatus: 'pending' },
      { creatorId: 'augustin-rudigoz', status: 'invited', payoutStatus: 'pending' },
    ],
  },
  {
    id: 'cmp-devtools-test',
    name: 'DevTools Audience Test',
    objective: 'awareness',
    status: 'draft',
    budget: 900,
    audience: 'Backend and platform engineers evaluating internal tooling',
    keyMessage: 'An honest look at what our API does badly, and what we fixed.',
    landingUrl: 'https://trellis.io/api',
    startedDaysAgo: -21,
    lengthDays: 18,
    collaborators: [{ creatorId: 'tomas-loucky', status: 'invited', payoutStatus: 'pending' }],
  },
];

function buildCampaign(seed: CampaignSeed): Campaign {
  const startDate = isoDaysAgo(seed.startedDaysAgo);
  const endDate = isoDaysFrom(startDate, seed.lengthDays);

  const collaborations: Collaboration[] = seed.collaborators.map((cs) => {
    const creator = getCreator(cs.creatorId);
    const fee = creator?.pricePerPost ?? 150;
    const publishedAt =
      cs.publishDay !== undefined ? isoDaysFrom(startDate, cs.publishDay) : undefined;

    const collab: Collaboration = {
      creatorId: cs.creatorId,
      status: cs.status,
      fee,
      deliverables: cs.deliverables ?? '1 sponsored post + 1 repost',
      deliverBy: isoDaysFrom(startDate, (cs.publishDay ?? 10) + 2),
      payoutStatus: cs.payoutStatus ?? 'pending',
      publishedAt,
    };

    // Only published collaborations have performance.
    if (cs.status === 'published') {
      collab.metrics = simulateCollaboration(seed.id, collab);
    }

    // A collaboration cannot be in review without something to review, so the
    // seeded copy is attached here rather than left implied by the status.
    if (cs.status === 'in_review' && cs.draft) {
      collab.drafts = [
        {
          id: `draft-${seed.id}-${cs.creatorId}`,
          revision: 1,
          body: cs.draft,
          note: cs.draftNote,
          submittedAt: isoDaysFrom(startDate, seed.lengthDays - 8),
          status: 'submitted',
        },
      ];
    }

    return collab;
  });

  const creators = seed.collaborators
    .map((c) => getCreator(c.creatorId))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const campaign: Campaign = {
    id: seed.id,
    name: seed.name,
    brand: DEMO_COMPANY,
    objective: seed.objective,
    budget: seed.budget,
    status: seed.status,
    audience: seed.audience,
    keyMessage: seed.keyMessage,
    collaborations,
    brief: generateBrief({
      campaignName: seed.name,
      company: DEMO_COMPANY,
      objective: seed.objective,
      audience: seed.audience,
      keyMessage: seed.keyMessage,
      landingUrl: seed.landingUrl,
      creators,
    }),
    startDate,
    endDate,
    createdAt: isoDaysFrom(startDate, -5),
    daily: [],
  };

  campaign.daily = buildDailySeries(campaign, Math.min(seed.lengthDays, 30));
  return campaign;
}

export const SEED_CAMPAIGNS: Campaign[] = SEEDS.map(buildCampaign);
