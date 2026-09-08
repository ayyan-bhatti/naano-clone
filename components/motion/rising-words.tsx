'use client';

import { useRef } from 'react';

import { gsap, splitWords } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks/use-gsap';

/**
 * Body copy whose words rise individually.
 *
 * Used sparingly - once in the hero. Word-level staggering on every paragraph
 * on a page is the thing that makes scroll-animated sites tiring to read; here
 * it earns its place because it is the first sentence a visitor sees and it
 * finishes before they could have started reading it.
 *
 * Takes a plain string rather than children: splitting works on `textContent`,
 * so any nested markup passed in would be flattened.
 */
export function RisingWords({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const target = useRef<HTMLParagraphElement>(null);

  const scope = useGsap<HTMLDivElement>(() => {
    const words = splitWords(target.current);
    if (!words.length) return;

    gsap.set(words, { yPercent: 110, opacity: 0 });
    gsap.to(words, {
      yPercent: 0,
      opacity: 1,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.022,
      delay,
    });
  }, [text, delay]);

  return (
    <div ref={scope}>
      <p ref={target} className={className}>
        {text}
      </p>
    </div>
  );
}
