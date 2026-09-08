'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  FileText,
  Link2,
  MessageSquareWarning,
  PenLine,
  Send,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatEur, relativeTime } from '@/lib/format';
import { checkDraft, FOLD_CHARS, latestDraft, suggestDraftCopy } from '@/lib/drafts';
import { useStore } from '@/lib/store';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { Modal, useToast } from '@/components/ui/feedback';
import { Pill } from '@/components/ui/status';
import type { Campaign, Collaboration, Creator, Draft } from '@/lib/types';

/**
 * Content review.
 *
 * Both sides of the same object: the creator writes and submits, the brand
 * reads and decides. They share the preview and the checks deliberately - the
 * creator should be looking at exactly what the reviewer will look at, so
 * nothing is a surprise at the point of approval.
 */

/* ------------------------------------------------------------------ *
 * Shared: the post as it will appear
 * ------------------------------------------------------------------ */

/**
 * A LinkedIn-shaped preview with the "see more" fold drawn in. The fold is the
 * single most consequential fact about a post's copy and it is invisible in a
 * plain textarea, so it gets drawn.
 */
export function PostPreview({
  body,
  creator,
  className,
}: {
  body: string;
  creator: Creator;
  className?: string;
}) {
  const folded = body.length > FOLD_CHARS;
  const head = folded ? body.slice(0, FOLD_CHARS) : body;
  const tail = folded ? body.slice(FOLD_CHARS) : '';

  return (
    <div className={cn('rounded-[14px] border border-line bg-surface p-4', className)}>
      <div className="flex items-center gap-2.5">
        <Avatar seed={creator.avatarSeed} name={creator.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{creator.name}</p>
          <p className="truncate text-[11.5px] text-ink-muted">{creator.headline}</p>
        </div>
      </div>

      <div className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">
        {head}
        {folded && (
          <>
            <span className="mx-0.5 select-none rounded-[4px] bg-warn-soft px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
              fold
            </span>
            <span className="text-ink-muted">{tail}</span>
          </>
        )}
      </div>

      {folded && (
        <p className="mt-2.5 text-[11.5px] text-ink-faint">
          Everything after the fold needs a click on &ldquo;see more&rdquo;. {FOLD_CHARS} characters
          is where LinkedIn cuts.
        </p>
      )}
    </div>
  );
}

/** The two things the brief calls mandatory, checked as you type. */
function BriefChecks({
  body,
  campaign,
  creatorId,
}: {
  body: string;
  campaign: Campaign;
  creatorId: string;
}) {
  const checks = useMemo(
    () => checkDraft(body, campaign, creatorId),
    [body, campaign, creatorId],
  );

  return (
    <ul className="flex flex-wrap gap-2">
      <CheckPill ok={checks.hasLink} icon={Link2} label="Tracked link" />
      <CheckPill ok={checks.hasDisclosure} icon={AlertTriangle} label="Partnership disclosed" />
      <li>
        <span className="tabular inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-[11.5px] font-medium text-ink-muted ring-1 ring-inset ring-line">
          {checks.chars} characters
        </span>
      </li>
    </ul>
  );
}

function CheckPill({
  ok,
  icon: Icon,
  label,
}: {
  ok: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <li>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ring-inset',
          ok
            ? 'bg-money-soft text-money ring-money/15'
            : 'bg-warn-soft text-warn ring-warn/15',
        )}
      >
        {ok ? <Check className="size-3" /> : <Icon className="size-3" />}
        {label}
      </span>
    </li>
  );
}

/* ------------------------------------------------------------------ *
 * Shared: revision history
 * ------------------------------------------------------------------ */

const DRAFT_TONE = {
  submitted: { label: 'Awaiting review', tone: 'warn' as const },
  changes_requested: { label: 'Changes requested', tone: 'danger' as const },
  approved: { label: 'Approved', tone: 'money' as const },
};

export function DraftHistory({ drafts }: { drafts: Draft[] }) {
  if (drafts.length <= 1) return null;

  return (
    <ol className="space-y-2">
      {drafts
        .slice()
        .reverse()
        .map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center gap-2 rounded-[10px] bg-sunken/60 px-3 py-2"
          >
            <span className="text-[12.5px] font-medium text-ink">Revision {d.revision}</span>
            <Pill tone={DRAFT_TONE[d.status].tone}>{DRAFT_TONE[d.status].label}</Pill>
            <span className="ml-auto text-[11.5px] text-ink-faint">
              {relativeTime(d.submittedAt)}
            </span>
            {d.feedback && (
              <p className="w-full text-[12px] leading-relaxed text-ink-muted">
                <span className="font-medium text-ink-soft">Feedback:</span> {d.feedback}
              </p>
            )}
          </li>
        ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ *
 * Brand side: review
 * ------------------------------------------------------------------ */

export function ReviewDraftButton({
  campaign,
  collab,
  creator,
  size = 'sm',
}: {
  campaign: Campaign;
  collab: Collaboration;
  creator: Creator;
  size?: 'sm' | 'md';
}) {
  const { reviewDraft } = useStore();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [askingChanges, setAskingChanges] = useState(false);

  const draft = latestDraft(collab);
  if (!draft) return null;

  function close() {
    setOpen(false);
    setAskingChanges(false);
    setFeedback('');
  }

  function approve() {
    reviewDraft(campaign.id, collab.creatorId, 'approve');
    push({
      tone: 'success',
      title: `${creator.name}'s post approved`,
      body: `Published, and ${formatEur(collab.fee)} is scheduled for release.`,
    });
    close();
  }

  function requestChanges() {
    if (!feedback.trim()) {
      setAskingChanges(true);
      return;
    }
    reviewDraft(campaign.id, collab.creatorId, 'changes', feedback);
    push({
      tone: 'info',
      title: 'Sent back for a revision',
      body: `${creator.name} has your notes and can resubmit.`,
    });
    close();
  }

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <FileText className="size-4" />
        Review draft
      </Button>

      <Modal
        open={open}
        onClose={close}
        size="lg"
        title={`Review — ${creator.name}`}
        description={`Revision ${draft.revision}, submitted ${relativeTime(draft.submittedAt)}. Approving publishes the post and schedules ${formatEur(collab.fee)}.`}
        footer={
          <>
            <Button variant="secondary" onClick={requestChanges}>
              <MessageSquareWarning className="size-4" />
              Request changes
            </Button>
            <Button onClick={approve}>
              <Check className="size-4" />
              Approve &amp; publish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {draft.note && (
            <div className="rounded-[12px] border border-line bg-sunken/60 p-3.5">
              <h3 className="micro-label">Note from {creator.name.split(' ')[0]}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{draft.note}</p>
            </div>
          )}

          <PostPreview body={draft.body} creator={creator} />

          <BriefChecks body={draft.body} campaign={campaign} creatorId={collab.creatorId} />

          <DraftHistory drafts={collab.drafts ?? []} />

          <Field
            label="Feedback"
            hint="Required only if you are sending it back. The creator sees this verbatim."
            error={askingChanges && !feedback.trim() ? 'Say what needs to change.' : undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="The opening works. Can you cut the third paragraph and move the link above the fold?"
                rows={3}
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Creator side: submit
 * ------------------------------------------------------------------ */

export function SubmitDraftButton({
  campaign,
  collab,
  creator,
}: {
  campaign: Campaign;
  collab: Collaboration;
  creator: Creator;
}) {
  const { submitDraft } = useStore();
  const { push } = useToast();
  const [open, setOpen] = useState(false);

  const previous = latestDraft(collab);
  const isRevision = previous?.status === 'changes_requested';

  // A revision starts from what was already written; a first draft starts from
  // the brief. Neither is presented as finished work.
  const initial = useMemo(
    () => (previous ? previous.body : suggestDraftCopy(campaign, creator, collab)),
    [previous, campaign, creator, collab],
  );

  const [body, setBody] = useState(initial);
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  function openDialog() {
    setBody(initial);
    setNote('');
    setTouched(false);
    setOpen(true);
  }

  function submit() {
    setTouched(true);
    if (body.trim().length < 40) return;
    submitDraft(campaign.id, collab.creatorId, { body, note });
    push({
      tone: 'success',
      title: isRevision ? 'Revision sent' : 'Draft sent for review',
      body: `${campaign.brand} will approve it or come back with notes. ${formatEur(collab.fee)} is released on approval.`,
    });
    setOpen(false);
  }

  return (
    <>
      <Button onClick={openDialog}>
        <PenLine className="size-4" />
        {isRevision ? 'Submit revision' : 'Submit draft'}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={isRevision ? `Revision ${(previous?.revision ?? 1) + 1}` : 'Submit your draft'}
        description={`${campaign.brand} reviews this before it goes live. Approval is what releases ${formatEur(collab.fee)}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>
              <Send className="size-4" />
              Send for review
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {isRevision && previous?.feedback && (
            <div className="rounded-[12px] border border-danger/20 bg-danger-soft/60 p-3.5">
              <h3 className="micro-label text-danger">What they asked for</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{previous.feedback}</p>
            </div>
          )}

          <details className="group rounded-[12px] border border-line bg-sunken/50 p-3.5">
            <summary className="cursor-pointer list-none text-[13px] font-medium text-ink">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="size-3.5 text-ink-faint" />
                The brief, in case you want it here
              </span>
            </summary>
            <div className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-ink-muted">
              <p>
                <span className="font-medium text-ink-soft">Land this:</span> {campaign.keyMessage}
              </p>
              <p>
                <span className="font-medium text-ink-soft">Tone:</span> {campaign.brief.toneOfVoice}
              </p>
              <ul className="list-disc space-y-1 pl-4">
                {campaign.brief.creatorGuidelines.slice(0, 3).map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          </details>

          <Field
            label="Post copy"
            hint={
              isRevision
                ? 'Your previous revision, ready to edit.'
                : 'Pre-filled from the brief as a starting point — rewrite it in your voice, that is the whole reason they booked you.'
            }
            error={touched && body.trim().length < 40 ? 'A post needs more than a line.' : undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="font-[inherit]"
              />
            )}
          </Field>

          <BriefChecks body={body} campaign={campaign} creatorId={collab.creatorId} />

          {!isRevision && (
            <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-faint">
              <Sparkles className="mt-0.5 size-3 shrink-0" />
              The starting copy is assembled from the brief by template, not written by a model. It
              is a scaffold, and it reads like one.
            </p>
          )}

          <Field label="Note to the brand" hint="Optional. Explain a choice before they ask about it.">
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Kept the link after paragraph two — it gets clicked more there than at the bottom."
              />
            )}
          </Field>

          <div className="rounded-[12px] bg-sunken/60 p-3.5">
            <h3 className="micro-label">How it will look</h3>
            <PostPreview body={body} creator={creator} className="mt-2.5 bg-ground" />
          </div>
        </div>
      </Modal>
    </>
  );
}
