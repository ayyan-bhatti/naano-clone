'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bot, Send, Sparkles, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { answer as resolve, type Answer } from '@/lib/assistant/engine';
import { suggestionsFor, type AssistantContext } from '@/lib/assistant/knowledge';
import { awaitingReview } from '@/lib/drafts';
import { totalUnreadForRole } from '@/lib/messages';
import { aggregateMetricsWithClicks } from '@/lib/metrics';
import { useStore } from '@/lib/store';
import { AssistantAvatar } from '@/components/assistant/assistant-avatar';

/**
 * The site assistant.
 *
 * A small robot in the corner of every page that answers questions about the
 * product and can move you around it.
 *
 * There is no model behind it - this build ships with no external APIs and no
 * keys - so it is a retrieval engine over a hand-written knowledge base
 * (lib/assistant/). That constraint turns out to be the interesting part: it
 * has to know when it does not know, and it says so rather than generating
 * something plausible. It also reads the live store, so "what is waiting on
 * me" is answered from your actual campaigns rather than in the abstract.
 *
 * The launcher shows the same 3D robot as the auth pages, cropped to a
 * portrait so it is legible at 56px - see AssistantAvatar for how it is kept
 * off the critical path. The hand-drawn SVG robot is the instant placeholder
 * and the permanent fallback.
 */

interface Turn {
  id: number;
  role: 'you' | 'bot';
  text: string;
  answer?: Answer;
}

/** Auth pages have their own robot; a second one in the corner is noise. */
const HIDDEN_ON = ['/sign-in', '/sign-up', '/onboarding'];

export function Assistant() {
  const pathname = usePathname();
  const router = useRouter();
  const store = useStore();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  /* ---- Live workspace context, rebuilt whenever the store moves ---- */
  const ctx = useMemo<AssistantContext>(() => {
    const { user, campaigns, clicks, messages, shortlist } = store;
    const role = user?.role;
    const totals = campaigns.length
      ? aggregateMetricsWithClicks(campaigns, clicks)
      : { pipeline: 0, clicks: 0 };

    const draftsWaiting = campaigns.reduce(
      (n, c) => n + c.collaborations.filter(awaitingReview).length,
      0,
    );

    const mine = user?.creatorId;
    const openDeals = mine
      ? campaigns.reduce(
          (n, c) => n + c.collaborations.filter((x) => x.creatorId === mine && x.status === 'invited').length,
          0,
        )
      : 0;
    const creatorEarnings = mine
      ? campaigns.reduce(
          (sum, c) =>
            sum +
            c.collaborations
              .filter((x) => x.creatorId === mine && x.payoutStatus !== 'pending')
              .reduce((s, x) => s + x.fee, 0),
          0,
        )
      : 0;

    return {
      route: pathname,
      signedIn: Boolean(user),
      role,
      company: user?.company,
      firstName: user?.name.split(' ')[0],
      campaigns: campaigns.length,
      liveCampaigns: campaigns.filter((c) => c.status === 'live').length,
      pipeline: totals.pipeline,
      clicks: totals.clicks,
      draftsWaiting,
      unreadMessages: role ? totalUnreadForRole(messages, role) : 0,
      shortlisted: shortlist.length,
      creatorEarnings,
      openDeals,
    };
  }, [store, pathname]);

  const suggestions = useMemo(() => suggestionsFor(ctx), [ctx]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, thinking, open]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Escape closes, from anywhere inside the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      pending.length = 0;
    };
  }, []);

  const ask = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;

      setTurns((prev) => [...prev, { id: nextId.current++, role: 'you', text }]);
      setDraft('');
      setThinking(true);

      /*
        The pause is honest padding, not a fake latency. Retrieval returns in
        under a millisecond, and a reply that lands in the same frame as the
        question reads as a canned response rather than an answer. 420ms is
        enough to register as a reply without being a wait.
      */
      timers.current.push(
        window.setTimeout(() => {
          const a = resolve(text, ctx);
          setThinking(false);
          setTurns((prev) => [...prev, { id: nextId.current++, role: 'bot', text: a.text, answer: a }]);

          if (a.kind === 'navigate' && a.navigateTo) {
            timers.current.push(
              window.setTimeout(() => {
                router.push(a.navigateTo!);
                setOpen(false);
              }, 700),
            );
          }
        }, 420),
      );
    },
    [ctx, router],
  );

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const unanswered = ctx.draftsWaiting + ctx.unreadMessages;

  return (
    <>
      {/* ---------------- Launcher ---------------- */}
      {/*
        The avatar sits beside the button, not inside it.

        react-spline renders its own <div> around the canvas, and <button>
        takes phrasing content only - nesting one inside the other made the
        HTML parser reparent the canvas and silently collapse the launcher to a
        16x21 box. So the container carries the visuals and a transparent
        button is laid over the top, which keeps native button semantics,
        focus and keyboard behaviour intact.
      */}
      <div className="fixed bottom-5 right-5 z-[80] size-14">
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 grid place-items-center overflow-hidden rounded-full',
            'bg-ink text-white shadow-pop transition-transform duration-200',
            open && 'scale-95',
          )}
        >
          {open ? <X className="size-5" /> : <AssistantAvatar className="size-full" />}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close the assistant' : 'Open the assistant'}
          className={cn(
            'absolute inset-0 size-full rounded-full transition-transform duration-200',
            'hover:scale-105 active:scale-95',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
          )}
        />

        {/* Only badge when there is genuinely something to act on. */}
        {!open && store.hydrated && unanswered > 0 && (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white ring-2 ring-ground">
            {unanswered}
          </span>
        )}
      </div>

      {/* ---------------- Panel ---------------- */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistant"
          className={cn(
            'fixed bottom-[84px] right-5 z-[80] flex w-[min(380px,calc(100vw-2.5rem))] flex-col',
            'max-h-[min(560px,calc(100dvh-7rem))] overflow-hidden rounded-[18px]',
            'border border-line bg-surface shadow-pop',
            'animate-[assistant-in_200ms_cubic-bezier(0.16,1,0.3,1)]',
          )}
        >
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <AssistantAvatar className="size-9 shrink-0 bg-ink" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-ink">Ask about Vouch</p>
              <p className="truncate text-[11.5px] text-ink-muted">
                Answers from a local knowledge base — no model, no API
              </p>
            </div>
          </header>

          {/* Transcript */}
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
            {turns.length === 0 && (
              <div className="rounded-[14px] bg-sunken/70 p-3.5">
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  {ctx.firstName ? `Hi ${ctx.firstName}. ` : 'Hi. '}
                  I can explain how any of this works, or take you somewhere. I read your workspace
                  too, so ask me what is waiting on you.
                </p>
              </div>
            )}

            {turns.map((turn) => (
              <div key={turn.id} className={cn('flex', turn.role === 'you' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[86%]')}>
                  <div
                    className={cn(
                      'whitespace-pre-wrap rounded-[14px] px-3.5 py-2.5 text-[13px] leading-relaxed',
                      turn.role === 'you'
                        ? 'rounded-br-[4px] bg-ink text-white'
                        : 'rounded-bl-[4px] bg-sunken text-ink-soft',
                    )}
                  >
                    {turn.role === 'bot' ? <Rich text={turn.text} /> : turn.text}
                  </div>

                  {/* Links the answer offered */}
                  {turn.answer && turn.answer.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {turn.answer.links.map((link) => (
                        <button
                          key={link.href}
                          onClick={() => {
                            router.push(link.href);
                            setOpen(false);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-700"
                        >
                          {link.label}
                          <ArrowRight className="size-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
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
                Looking that up
              </div>
            )}

            {/* Openers, only before the conversation starts */}
            {turns.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-700"
                  >
                    <Sparkles className="size-3 text-ink-faint" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-line p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(draft);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Ask the assistant a question"
                placeholder="Ask anything…"
                className="h-10 min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send"
                className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-ink text-white transition-opacity disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </form>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-faint">
              <Bot className="size-3" />
              Retrieval over a written knowledge base. It will say when it does not know.
            </p>
          </div>

          <style>{`@keyframes assistant-in{from{opacity:0;transform:translateY(10px) scale(0.98)}to{opacity:1;transform:none}}`}</style>
        </div>
      )}
    </>
  );
}

/**
 * The answers use **bold** and bullet lines. Rendering them with a couple of
 * regexes rather than pulling in a markdown parser - this is the only place in
 * the app that needs it, and the syntax it needs is two rules wide.
 */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i} className="block">
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={j} className="font-semibold text-ink">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            ),
          )}
        </span>
      ))}
    </>
  );
}
