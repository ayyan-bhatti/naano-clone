'use client';

import { cn } from '@/lib/cn';
import { gsap } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks/use-gsap';

/**
 * A heading whose lines rise out of their own baseline.
 *
 * Line-level masks rather than character-level splitting: each line sits in an
 * `overflow: hidden` box and is translated up from below it, so the text
 * arrives from behind the line above instead of fading in on top of the page.
 * It reads as typesetting rather than as an animation, which is the difference
 * between this and the fade-up every template ships with.
 *
 * Lines are passed as data instead of children so the mask boxes can wrap each
 * one exactly - splitting `children` on `textContent` would destroy any nested
 * markup, which the hero needs for its gradient span.
 *
 * Reduced motion: useGsap never runs the setup, and the markup below is already
 * in its final state, so the heading simply renders.
 */

export interface HeadingLine {
  /** Also the React key, so it stays stable when `node` is used. */
  text: string;
  /** Applied to this line only - used for the accent word in a headline. */
  className?: string;
  /**
   * Rendered instead of `text` when a line needs markup inside it, such as a
   * single character in the accent colour. The mask still wraps the whole line,
   * so the reveal is unaffected.
   */
  node?: React.ReactNode;
}

export function AnimatedHeading({
  lines,
  as: Tag = 'h2',
  className,
  lineClassName,
  /** Play on mount instead of on scroll. Use for above-the-fold headings. */
  immediate = false,
  delay = 0,
}: {
  lines: (string | HeadingLine)[];
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  lineClassName?: string;
  immediate?: boolean;
  delay?: number;
}) {
  const scope = useGsap<HTMLDivElement>(
    (self) => {
      const items = self.selector?.('[data-line]') ?? [];
      if (!items.length) return;

      gsap.set(items, { yPercent: 115, opacity: 0 });
      gsap.to(items, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power4.out',
        stagger: 0.08,
        delay,
        // Above the fold there is nothing to scroll to, so waiting for a
        // trigger would leave the headline invisible on arrival.
        scrollTrigger: immediate
          ? undefined
          : { trigger: scope.current, start: 'top 82%', once: true },
      });
    },
    [immediate, delay],
  );

  const normalised = lines.map((l) => (typeof l === 'string' ? { text: l } : l));

  return (
    <div ref={scope}>
      <Tag className={className}>
        {normalised.map((line, i) => (
          <span
            key={`${line.text}-${i}`}
            className="block overflow-hidden pb-[0.14em] [margin-bottom:-0.14em]"
          >
            <span data-line className={cn('block', lineClassName, line.className)}>
              {line.node ?? line.text}
            </span>
          </span>
        ))}
      </Tag>
    </div>
  );
}
