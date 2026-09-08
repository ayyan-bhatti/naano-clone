'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, MessagesSquare, Send } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatEur, relativeTime } from '@/lib/format';
import { getCreator } from '@/lib/data/creators';
import { lastMessage, messagesForThread, threadId, unreadForRole } from '@/lib/messages';
import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { Textarea } from '@/components/ui/field';
import { CollaborationStatusPill } from '@/components/ui/status';
import type { Campaign, Collaboration, Message, Role } from '@/lib/types';

/**
 * Brand <-> creator messaging.
 *
 * Every real marketplace has this, and its absence was the most obvious thing
 * missing next to the live product's sidebar. A thread belongs to a
 * collaboration rather than to a person, so the campaign it is about is never
 * ambiguous.
 *
 * Replies from the other side are generated locally and are labelled as such
 * in the transcript. That label is the point: the alternative is a demo that
 * quietly implies someone is at the other end.
 */

interface Thread {
  id: string;
  campaign: Campaign;
  collab: Collaboration;
  /** Whoever you are talking to, from the signed-in side. */
  name: string;
  avatarSeed: string;
  subtitle: string;
}

function useThreads(): Thread[] {
  const { campaigns, user } = useStore();

  return useMemo(() => {
    if (!user) return [];
    const mine = user.role === 'creator' ? user.creatorId : undefined;

    return campaigns.flatMap((campaign) =>
      campaign.collaborations
        .filter((collab) => (mine ? collab.creatorId === mine : true))
        .map((collab) => {
          const creator = getCreator(collab.creatorId);
          return {
            id: threadId(campaign.id, collab.creatorId),
            campaign,
            collab,
            name: user.role === 'brand' ? creator?.name ?? 'Creator' : campaign.brand,
            avatarSeed: user.role === 'brand' ? creator?.avatarSeed ?? collab.creatorId : campaign.brand,
            subtitle: campaign.name,
          };
        }),
    );
  }, [campaigns, user]);
}

export default function MessagesPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <AppShell title="Messages">
            <p className="text-[13px] text-ink-muted">Loading conversations…</p>
          </AppShell>
        }
      >
        <MessagesInner />
      </Suspense>
    </RequireAuth>
  );
}

function MessagesInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { user, messages } = useStore();
  const threads = useThreads();
  const role: Role = user?.role ?? 'brand';

  const requested = search.get('thread');
  const active = threads.find((t) => t.id === requested) ?? threads[0];

  // Most recently active first, so a reply pulls its thread to the top.
  const ordered = useMemo(() => {
    return threads.slice().sort((a, b) => {
      const at = lastMessage(messages, a.id)?.createdAt ?? a.campaign.startDate;
      const bt = lastMessage(messages, b.id)?.createdAt ?? b.campaign.startDate;
      return new Date(bt).getTime() - new Date(at).getTime();
    });
  }, [threads, messages]);

  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + unreadForRole(messages, t.id, role), 0),
    [threads, messages, role],
  );

  if (threads.length === 0) {
    return (
      <AppShell title="Messages">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={MessagesSquare}
            title="No conversations yet"
            body={
              role === 'brand'
                ? 'A thread opens when you invite a creator to a campaign — it belongs to that collaboration, so you always know which brief you are discussing.'
                : 'When a brand invites you, the conversation about that campaign starts here.'
            }
            action={
              <Link href={role === 'brand' ? '/marketplace' : '/deals'}>
                <Button>{role === 'brand' ? 'Find creators' : 'See your deals'}</Button>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Messages"
      subtitle={totalUnread ? `${totalUnread} unread` : `${threads.length} conversations`}
    >
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ---------- Thread list ---------- */}
        <aside
          className={cn(
            'overflow-hidden rounded-[16px] border border-line bg-surface shadow-card',
            // On mobile the transcript takes over rather than squeezing beside it.
            requested && 'hidden lg:block',
          )}
        >
          <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
            {ordered.map((thread) => {
              const last = lastMessage(messages, thread.id);
              const unread = unreadForRole(messages, thread.id, role);
              const isActive = active?.id === thread.id;
              return (
                <li key={thread.id}>
                  <button
                    onClick={() => router.push(`/messages?thread=${encodeURIComponent(thread.id)}`)}
                    className={cn(
                      'flex w-full items-start gap-3 p-3.5 text-left transition-colors',
                      isActive ? 'bg-brand-50' : 'hover:bg-sunken',
                    )}
                  >
                    <Avatar seed={thread.avatarSeed} name={thread.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-[13px]',
                            unread ? 'font-semibold text-ink' : 'font-medium text-ink',
                          )}
                        >
                          {thread.name}
                        </span>
                        {last && (
                          // ink-muted, not ink-faint: an active row is tinted
                          // brand-50 and the faint tier does not clear AA on it.
                          <span className="shrink-0 text-[11px] text-ink-muted">
                            {relativeTime(last.createdAt)}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink-muted">
                        {thread.subtitle}
                      </span>
                      {last && (
                        <span
                          className={cn(
                            'mt-1 block truncate text-[12px]',
                            unread ? 'text-ink-soft' : 'text-ink-muted',
                          )}
                        >
                          {last.from === role ? 'You: ' : ''}
                          {last.body}
                        </span>
                      )}
                    </span>
                    {unread > 0 && (
                      <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* ---------- Transcript ---------- */}
        {active ? (
          <Conversation key={active.id} thread={active} role={role} />
        ) : (
          <div className="rounded-[16px] border border-line bg-surface p-8 text-center text-[13px] text-ink-muted">
            Pick a conversation.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Conversation({ thread, role }: { thread: Thread; role: Role }) {
  const { messages, sendMessage, appendMessage, markThreadRead } = useStore();
  const [body, setBody] = useState('');
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const transcript = useMemo(() => messagesForThread(messages, thread.id), [messages, thread.id]);

  // Opening a thread is what marks it read - the same rule the notification
  // bell already follows.
  useEffect(() => {
    markThreadRead(thread.id);
  }, [thread.id, markThreadRead]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript.length, typing]);

  // Any pending reply is dropped if you navigate away mid-flight.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      pending.length = 0;
    };
  }, []);

  function send() {
    const text = body.trim();
    if (!text) return;
    const reply = sendMessage(thread.id, text);
    setBody('');

    if (!reply) return;
    setTyping(true);
    timers.current.push(
      window.setTimeout(() => {
        appendMessage(reply);
        markThreadRead(thread.id);
        setTyping(false);
      }, 1400),
    );
  }

  return (
    <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-[16px] border border-line bg-surface shadow-card">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <Link
          href="/messages"
          aria-label="Back to conversations"
          className="rounded-[8px] p-1.5 text-ink-faint transition-colors hover:bg-sunken hover:text-ink lg:hidden"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Avatar seed={thread.avatarSeed} name={thread.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">{thread.name}</p>
          <Link
            href={`/campaigns/${thread.campaign.id}`}
            className="truncate text-[12px] text-ink-muted hover:text-brand-600 hover:underline"
          >
            {thread.campaign.name}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CollaborationStatusPill status={thread.collab.status} />
          <span className="tabular text-[12.5px] font-semibold text-money">
            {formatEur(thread.collab.fee)}
          </span>
        </div>
      </header>

      {/* Transcript */}
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
        {transcript.map((m) => (
          <Bubble key={m.id} message={m} mine={m.from === role} />
        ))}
        {typing && (
          <div className="flex items-center gap-2 text-[12px] text-ink-faint">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-ink-faint"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
            {thread.name} is typing…
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line - the convention
              // every messaging tool uses, and the one people's hands expect.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            aria-label={`Message ${thread.name}`}
            placeholder={`Message ${thread.name.split(' ')[0]}…`}
            className="min-h-0 resize-none"
          />
          <Button onClick={send} disabled={!body.trim()} aria-label="Send message">
            <Send className="size-4" />
          </Button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-faint">
          <Bot className="size-3" />
          Replies here are written locally by the demo counterpart, not by a person or a model.
        </p>
      </div>
    </section>
  );
}

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[min(78%,34rem)]')}>
        <div
          className={cn(
            'rounded-[14px] px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap',
            mine
              ? 'rounded-br-[4px] bg-brand-600 text-white'
              : 'rounded-bl-[4px] bg-sunken text-ink-soft',
          )}
        >
          {message.body}
        </div>
        <p
          className={cn(
            'mt-1 flex items-center gap-1.5 text-[11px] text-ink-faint',
            mine ? 'justify-end' : 'justify-start',
          )}
        >
          {!mine && message.auto && <Bot className="size-3" aria-hidden />}
          {mine ? 'You' : message.authorName} · {relativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
