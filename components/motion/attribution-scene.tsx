'use client';

import { Euro, Link2, MousePointerClick, PenLine, UserCheck } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatEur, formatNumber } from '@/lib/format';
import { gsap } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks/use-gsap';
import { AnimatedHeading } from '@/components/motion/animated-heading';

/**
 * The trace, animated.
 *
 * The central claim of the product is that a post can be traced to pipeline.
 * Stating that in a paragraph is cheap; this makes the reader scroll the chain
 * themselves, one link at a time, with the numbers arriving as they pass.
 *
 * Deliberately built on a sticky column and a scrubbed connector rather than a
 * pinned scroll section. Pinning hijacks the scrollbar - the page stops moving
 * while the content advances - which is the single most disliked thing about
 * scroll-driven sites and breaks the browser's own scroll position on resize.
 * A sticky column gets the same effect and never takes the scroll away.
 *
 * Every number is the same figure used in the hero, so the site never quotes
 * two different results for one campaign.
 */

interface Node {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  format: 'number' | 'eur';
  title: string;
  body: string;
  /** Drop-off from the previous stage, shown honestly. */
  rate?: string;
}

const NODES: Node[] = [
  {
    id: 'post',
    icon: PenLine,
    label: 'Impressions',
    value: 42800,
    format: 'number',
    title: 'One creator publishes',
    body: 'A single sponsored post from a creator whose audience is 70% the people you sell to. Not a campaign — one post.',
  },
  {
    id: 'click',
    icon: MousePointerClick,
    label: 'Clicks',
    value: 312,
    format: 'number',
    rate: '0.73% of impressions',
    title: 'The link is theirs, not the campaign’s',
    body: 'Every creator gets their own variant of the tracked link. That is what makes a click attributable to the specific post that caused it rather than to the campaign as a whole.',
  },
  {
    id: 'lead',
    icon: UserCheck,
    label: 'Leads',
    value: 18,
    format: 'number',
    rate: '5.8% of clicks',
    title: 'Some of them convert',
    body: 'Identified from the tracked click, tied back to the creator who sent them. Eighteen from one post — a number you can act on rather than admire.',
  },
  {
    id: 'pipeline',
    icon: Euro,
    label: 'Attributed pipeline',
    value: 48200,
    format: 'eur',
    rate: '€2,678 average deal',
    title: 'And land in the pipeline',
    body: 'The number a CFO recognises. Traced back through the lead, the click and the link to the person who posted it — which is the part every other creator tool leaves as an exercise for the reader.',
  },
];

export function AttributionScene() {
  const scope = useGsap<HTMLElement>((self) => {
    // gsap types `selector` loosely; everything it can match here is an
    // HTMLElement, and saying so keeps the callbacks below typed.
    const q = self.selector as (s: string) => HTMLElement[];

    /* ---- The connector draws downward as the section is read ---- */
    const line = q('[data-connector-fill]')[0];
    if (line) {
      gsap.set(line, { scaleY: 0, transformOrigin: 'top center' });
      gsap.to(line, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: q('[data-chain]')[0],
          start: 'top 62%',
          end: 'bottom 78%',
          scrub: 0.4,
        },
      });
    }

    /* ---- Each node lights up and counts as it arrives ---- */
    q('[data-node]').forEach((node) => {
      const card = node.querySelector('[data-card]');
      const dot = node.querySelector('[data-dot]');
      const num = node.querySelector<HTMLElement>('[data-number]');
      const target = Number(num?.dataset.value ?? 0);
      const format = num?.dataset.format ?? 'number';

      const tl = gsap.timeline({
        scrollTrigger: { trigger: node, start: 'top 72%', once: true },
      });

      tl.from(card, { y: 26, opacity: 0, duration: 0.7 })
        .from(dot, { scale: 0, duration: 0.5, ease: 'back.out(2.4)' }, '-=0.45')
        .to(dot, { boxShadow: '0 0 0 6px rgb(63 99 232 / 0.14)', duration: 0.4 }, '-=0.2');

      if (num && target) {
        // Counting the number rather than fading it in is the difference
        // between the figure being decoration and the figure being the point.
        const counter = { v: 0 };
        tl.to(
          counter,
          {
            v: target,
            duration: 1.1,
            ease: 'power2.out',
            onUpdate: () => {
              num.textContent =
                format === 'eur'
                  ? formatEur(Math.round(counter.v))
                  : formatNumber(Math.round(counter.v));
            },
          },
          '-=0.6',
        );
      }
    });
  }, []);

  return (
    <section
      ref={scope}
      id="trace"
      className="relative border-t border-line bg-surface py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          {/* ---------- Sticky thesis ---------- */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="micro-label flex items-center gap-1.5">
              <Link2 className="size-3.5" />
              Attribution
            </span>
            <AnimatedHeading
              lines={[
                'One post.',
                { text: 'Traced all the way', className: '' },
                { text: 'to pipeline.', className: 'text-brand-600' },
              ]}
              className="mt-3 text-[30px] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[40px]"
            />
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Most creator tools stop at impressions, because impressions are the last number they
              can see. Every link here is issued per creator, so the chain from a post to a booked
              deal stays unbroken — and the drop-off at every stage stays visible rather than
              rounded away.
            </p>
            <p className="mt-4 max-w-md text-[12.5px] leading-relaxed text-ink-faint">
              The figures below are one real campaign in the demo workspace. Open a tracked link
              yourself and they move.
            </p>
          </div>

          {/* ---------- The chain ---------- */}
          <ol data-chain className="relative">
            {/* Connector rail, drawn as you read */}
            <div
              aria-hidden
              className="absolute left-[19px] top-3 hidden h-[calc(100%-3rem)] w-[2px] rounded-full bg-line sm:block"
            >
              <div
                data-connector-fill
                className="h-full w-full rounded-full bg-gradient-to-b from-brand-600 via-[#7c5cff] to-money"
              />
            </div>

            {NODES.map((node, i) => (
              <li key={node.id} data-node className="relative pb-8 last:pb-0 sm:pl-14">
                {/* Node marker on the rail */}
                <span
                  data-dot
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-4 hidden size-10 place-items-center rounded-full border border-line bg-surface text-brand-600 sm:grid',
                  )}
                >
                  <node.icon className="size-4" />
                </span>

                <div
                  data-card
                  className="rounded-[16px] border border-line bg-ground p-5 shadow-card sm:p-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-[10px] bg-brand-50 text-brand-600 sm:hidden">
                        <node.icon className="size-4" />
                      </span>
                      <span className="micro-label">{node.label}</span>
                    </div>
                    <span className="tabular text-[11.5px] text-ink-faint">
                      {node.rate ?? `Step ${i + 1} of ${NODES.length}`}
                    </span>
                  </div>

                  <p
                    data-number
                    data-value={node.value}
                    data-format={node.format}
                    className="tabular mt-2 text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[40px]"
                  >
                    {/* Server-rendered final value: with reduced motion the
                        count-up never runs, and a zero here would be a lie. */}
                    {node.format === 'eur' ? formatEur(node.value) : formatNumber(node.value)}
                  </p>

                  <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                    {node.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{node.body}</p>

                  {i === NODES.length - 1 && (
                    <p className="mt-4 border-t border-line pt-4 text-[12.5px] leading-relaxed text-ink-soft">
                      <strong className="font-semibold text-ink">
                        {formatEur(Math.round(48200 / 312))} of attributed pipeline per click
                      </strong>{' '}
                      — which is the only ratio in creator marketing that a finance team has ever
                      asked us for.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
