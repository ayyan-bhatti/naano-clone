import { displayLink } from '@/lib/tracking';
import type { Campaign, Collaboration, Creator, Draft } from '@/lib/types';

/**
 * Content review.
 *
 * The gap this closes: a creator could be accepted onto a campaign and then
 * jump straight to published, which meant "approval" was a status flip with
 * nothing to approve. Here the creator submits copy, the brand reads it and
 * either approves - which is what publishes the post and schedules the fee -
 * or sends it back with written feedback and the creator submits a revision.
 *
 * Revisions are append-only so the history of what was asked for survives.
 */

export function latestDraft(collab: Collaboration): Draft | undefined {
  const drafts = collab.drafts ?? [];
  return drafts[drafts.length - 1];
}

export function draftCount(collab: Collaboration): number {
  return (collab.drafts ?? []).length;
}

/** True when the brand is the one holding things up. */
export function awaitingReview(collab: Collaboration): boolean {
  return collab.status === 'in_review' && latestDraft(collab)?.status === 'submitted';
}

/** True when the ball is back in the creator's court. */
export function awaitingRevision(collab: Collaboration): boolean {
  return latestDraft(collab)?.status === 'changes_requested';
}

export function createDraft(input: {
  revision: number;
  body: string;
  note?: string;
}): Draft {
  return {
    id: `draft-${Math.random().toString(36).slice(2, 10)}`,
    revision: input.revision,
    body: input.body.trim(),
    note: input.note?.trim() || undefined,
    submittedAt: new Date().toISOString(),
    status: 'submitted',
  };
}

/**
 * A starting point for the post, assembled from the brief the brand already
 * wrote. Deterministic template assembly, same as lib/brief - it is a
 * scaffold the creator is expected to rewrite, and the UI says so rather than
 * presenting it as generated content.
 */
export function suggestDraftCopy(
  campaign: Campaign,
  creator: Creator,
  collab: Collaboration,
): string {
  const topic = creator.topics[0] ?? campaign.objective;
  const link = displayLink(campaign, collab.creatorId);

  return [
    `Most teams I talk to about ${topic.toLowerCase()} have the same problem and do not name it.`,
    '',
    campaign.keyMessage,
    '',
    `I have been looking at how ${campaign.brand} handle this. What stood out is that it does not need you to rip anything out first — which is usually where these projects die.`,
    '',
    `Worth a look if this is your week: ${link}`,
    '',
    `Paid partnership with ${campaign.brand}.`,
  ].join('\n');
}

/** LinkedIn's "see more" fold sits around here — copy above it does the work. */
export const FOLD_CHARS = 210;

export interface DraftChecks {
  chars: number;
  /** Whether the tracked link appears at all - the brief requires it. */
  hasLink: boolean;
  /** Whether the partnership is disclosed, which the brief also requires. */
  hasDisclosure: boolean;
  aboveFold: string;
}

/**
 * Checks run against the copy as it is typed, straight from the brief's own
 * guidelines. Not a score - just the two things the brief says are mandatory,
 * shown before submission rather than caught in review.
 */
export function checkDraft(body: string, campaign: Campaign, creatorId: string): DraftChecks {
  const code = campaign.brief.trackingCode;
  const lower = body.toLowerCase();
  return {
    chars: body.length,
    hasLink: body.includes(code) || lower.includes(displayLink(campaign, creatorId).toLowerCase()),
    // No leading \b: "#ad" opens on a non-word character, so a word boundary
    // there never matches and the most common disclosure would slip through.
    hasDisclosure: /paid partnership|sponsored|in partnership with|#ad\b/i.test(body),
    aboveFold: body.slice(0, FOLD_CHARS),
  };
}
