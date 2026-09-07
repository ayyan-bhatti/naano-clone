import { cn } from '@/lib/cn';
import type { CampaignStatus, CollaborationStatus, PayoutStatus } from '@/lib/types';

/**
 * Status vocabulary.
 *
 * Naano surfaces campaign state as Draft / Scheduled / Live. We keep those and
 * add Completed, because without it a finished campaign has to masquerade as
 * live and the dashboard's "active campaigns" count becomes meaningless.
 */

type Tone = 'neutral' | 'info' | 'live' | 'money' | 'warn' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-soft ring-line',
  info: 'bg-brand-50 text-brand-700 ring-brand-100',
  live: 'bg-live-soft text-live ring-live/15',
  money: 'bg-money-soft text-money ring-money/15',
  warn: 'bg-warn-soft text-warn ring-warn/15',
  danger: 'bg-danger-soft text-danger ring-danger/15',
};

export function Pill({
  tone = 'neutral',
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  live: { label: 'Live', tone: 'live' },
  completed: { label: 'Completed', tone: 'money' },
};

export function CampaignStatusPill({ status, className }: { status: CampaignStatus; className?: string }) {
  const s = CAMPAIGN_STATUS[status];
  return (
    <Pill tone={s.tone} dot className={className}>
      {s.label}
    </Pill>
  );
}

const COLLAB_STATUS: Record<CollaborationStatus, { label: string; tone: Tone }> = {
  invited: { label: 'Invited', tone: 'neutral' },
  accepted: { label: 'Accepted', tone: 'info' },
  declined: { label: 'Declined', tone: 'danger' },
  in_review: { label: 'In review', tone: 'warn' },
  published: { label: 'Published', tone: 'money' },
};

export function CollaborationStatusPill({
  status,
  className,
}: {
  status: CollaborationStatus;
  className?: string;
}) {
  const s = COLLAB_STATUS[status];
  return (
    <Pill tone={s.tone} dot className={className}>
      {s.label}
    </Pill>
  );
}

const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'warn' },
  paid: { label: 'Paid', tone: 'money' },
};

export function PayoutStatusPill({ status, className }: { status: PayoutStatus; className?: string }) {
  const s = PAYOUT_STATUS[status];
  return (
    <Pill tone={s.tone} dot className={className}>
      {s.label}
    </Pill>
  );
}

export const CAMPAIGN_STATUS_LABELS = CAMPAIGN_STATUS;
