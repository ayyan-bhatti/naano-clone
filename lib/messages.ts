import type { Campaign, Collaboration, Message, Role } from '@/lib/types';

/**
 * Brand <-> creator messaging.
 *
 * A thread belongs to a collaboration, not to a person: the same brand and
 * creator can be running two campaigns at once, and merging those into one
 * conversation is how real tools become unusable. So the thread key is
 * `campaignId:creatorId`, which also means a thread cannot exist without a
 * collaboration behind it.
 *
 * Replies from the counterpart are generated here, locally and
 * deterministically. They are marked `auto` on the message and labelled in the
 * UI - a scripted reply that presents itself as a person typing would be
 * exactly the kind of dishonesty the rest of this build avoids.
 */

export function threadId(campaignId: string, creatorId: string): string {
  return `${campaignId}:${creatorId}`;
}

export function parseThreadId(id: string): { campaignId: string; creatorId: string } | null {
  const idx = id.indexOf(':');
  if (idx < 0) return null;
  return { campaignId: id.slice(0, idx), creatorId: id.slice(idx + 1) };
}

function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(items: readonly T[], seed: string): T {
  return items[hash(seed) % items.length];
}

/* ------------------------------------------------------------------ *
 * Reading
 * ------------------------------------------------------------------ */

export function messagesForThread(messages: Message[], id: string): Message[] {
  return messages
    .filter((m) => m.threadId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function lastMessage(messages: Message[], id: string): Message | undefined {
  const thread = messagesForThread(messages, id);
  return thread[thread.length - 1];
}

/** Unread count for the side currently signed in - your own messages never count. */
export function unreadForRole(messages: Message[], id: string, role: Role): number {
  return messages.filter((m) => m.threadId === id && m.from !== role && !m.read).length;
}

export function totalUnreadForRole(messages: Message[], role: Role): number {
  return messages.filter((m) => m.from !== role && !m.read).length;
}

/* ------------------------------------------------------------------ *
 * Composing
 * ------------------------------------------------------------------ */

export function createMessage(input: {
  threadId: string;
  from: Role;
  authorName: string;
  body: string;
  auto?: boolean;
  /** Offset in ms, so a seeded backlog can be laid out in the past. */
  at?: string;
}): Message {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 10)}`,
    threadId: input.threadId,
    from: input.from,
    authorName: input.authorName,
    body: input.body,
    createdAt: input.at ?? new Date().toISOString(),
    read: false,
    auto: input.auto,
  };
}

/* ------------------------------------------------------------------ *
 * The demo counterpart
 * ------------------------------------------------------------------ */

/**
 * Replies are chosen by what the message is *about* rather than at random, so
 * asking about the deadline gets an answer about the deadline. Within a
 * category the specific line is picked deterministically from the message text,
 * which means the same question always gets the same answer - a reviewer
 * pressing send twice sees a consistent counterpart, not a slot machine.
 */
const REPLIES = {
  timing: [
    'That timing works. I have a slot on the Tuesday, which usually lands better than a Friday for this audience.',
    'I can hit that date. If it slips it will be by a day, and I will tell you before it does rather than after.',
  ],
  money: [
    'The fee as offered is fine. I do not price by follower count, so it stays the same whether the post does well or badly.',
    'Happy with the fee. If you want a second post in the same campaign I would do the pair for slightly less.',
  ],
  brief: [
    'Read the brief. The angle is clear — I would want to open with the problem rather than the product, that is what my audience stops for.',
    'Brief looks good. One thing: I will not claim a number I cannot source, so I will keep the framing qualitative unless you can point me at the data.',
  ],
  draft: [
    'Draft is with you. I kept the tracked link at the end of the second paragraph rather than the very bottom — it gets clicked more there.',
    'Sent the draft over. Tell me plainly if the tone is off, I would rather rewrite it than have you post something you are lukewarm about.',
  ],
  edits: [
    'Fair feedback. I will rework that section and resubmit today.',
    'Understood — I will tighten it and send a second revision. The change you asked for is a small one.',
  ],
  thanks: [
    'Thanks — good working with you on this one.',
    'Appreciated. Ping me when the next campaign is being planned.',
  ],
  general: [
    'Got it, thanks for the detail. Anything else you want reflected in the post, tell me before I draft rather than after.',
    'Makes sense. I will factor that in — my audience is mostly practitioners, so specifics land better than positioning.',
    'Noted. Let me know if the landing page changes before it goes out, the link is in the post copy.',
  ],
} as const;

function categorise(body: string): keyof typeof REPLIES {
  const t = body.toLowerCase();
  if (/\b(revis|change|rework|edit|tweak|feedback|instead)\b/.test(t)) return 'edits';
  if (/\b(draft|copy|wrote|writing|post copy)\b/.test(t)) return 'draft';
  if (/\b(fee|price|pay|paid|payout|budget|invoice|€|eur)\b/.test(t)) return 'money';
  if (/\b(when|date|deadline|timing|schedule|deliver|friday|monday|week)\b/.test(t)) return 'timing';
  if (/\b(brief|angle|message|audience|tone|guideline)\b/.test(t)) return 'brief';
  if (/\b(thanks|thank you|great|perfect|nice work|appreciate)\b/.test(t)) return 'thanks';
  return 'general';
}

/**
 * The reply the other side would send. Returns null when no reply is
 * warranted, which keeps the counterpart from talking over itself.
 */
export function counterpartReply(input: {
  threadId: string;
  body: string;
  from: Role;
  counterpartName: string;
}): Message | null {
  if (!input.body.trim()) return null;
  const bucket = REPLIES[categorise(input.body)];
  return createMessage({
    threadId: input.threadId,
    from: input.from === 'brand' ? 'creator' : 'brand',
    authorName: input.counterpartName,
    body: pick(bucket, `${input.threadId}:${input.body}`),
    auto: true,
  });
}

/* ------------------------------------------------------------------ *
 * Seeded history
 * ------------------------------------------------------------------ */

/**
 * A brand new thread with no history reads as broken rather than empty, so
 * every seeded collaboration starts with the conversation that would plausibly
 * have produced its current state: an invite that was never answered looks
 * different from one that is already published.
 */
export function seedThread(
  campaign: Campaign,
  collab: Collaboration,
  creatorName: string,
): Message[] {
  const id = threadId(campaign.id, collab.creatorId);
  const start = new Date(campaign.startDate).getTime();
  const at = (dayOffset: number) => new Date(start + dayOffset * 86_400_000).toISOString();

  const opening = createMessage({
    threadId: id,
    from: 'brand',
    authorName: campaign.brand,
    body: `Hi ${creatorName.split(' ')[0]} — we would like you on ${campaign.name}. The brief is attached to the deal; the short version is "${campaign.keyMessage}". Fee is fixed at the amount in the offer.`,
    at: at(-2),
    auto: true,
  });
  opening.read = true;

  if (collab.status === 'invited') return [opening];

  if (collab.status === 'declined') {
    const decline = createMessage({
      threadId: id,
      from: 'creator',
      authorName: creatorName,
      body: 'Thanks for thinking of me — I am going to pass on this one. The angle is not close enough to what my audience follows me for, and a post that does not fit is bad for both of us.',
      at: at(-1),
      auto: true,
    });
    decline.read = true;
    return [opening, decline];
  }

  const accept = createMessage({
    threadId: id,
    from: 'creator',
    authorName: creatorName,
    body: 'In. The framing works for my audience — I will open on the problem rather than the product, that is what gets read. Drafting this week.',
    at: at(-1),
    auto: true,
  });
  accept.read = true;
  const thread = [opening, accept];

  if (collab.status === 'in_review') {
    const submitted = createMessage({
      threadId: id,
      from: 'creator',
      authorName: creatorName,
      body: 'Draft is in for review. I put the tracked link after the second paragraph rather than at the very bottom — it gets clicked more there.',
      at: at(1),
      auto: true,
    });
    thread.push(submitted);
  }

  if (collab.status === 'published' && collab.publishedAt) {
    const live = createMessage({
      threadId: id,
      from: 'creator',
      authorName: creatorName,
      body: 'Live. Early comments are from the right sort of people — a couple of RevOps leads asking how the reporting side works.',
      at: at(2),
      auto: true,
    });
    live.read = true;
    const thanks = createMessage({
      threadId: id,
      from: 'brand',
      authorName: campaign.brand,
      body: 'Saw it — the tracked link is already collecting. Payout is scheduled on our side.',
      at: at(3),
      auto: true,
    });
    thanks.read = true;
    thread.push(live, thanks);
  }

  return thread;
}

/** Every seeded conversation across the demo campaigns. */
export function seedMessages(
  campaigns: Campaign[],
  nameOf: (creatorId: string) => string | undefined,
): Message[] {
  return campaigns.flatMap((campaign) =>
    campaign.collaborations.flatMap((collab) => {
      const name = nameOf(collab.creatorId);
      return name ? seedThread(campaign, collab, name) : [];
    }),
  );
}
