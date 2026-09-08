'use client';

import { gsap } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks/use-gsap';

/**
 * Reading progress for the marketing pages.
 *
 * Driven by a scrubbed ScrollTrigger on the document rather than a scroll
 * listener, so the value comes from the same measurement pass as every other
 * animation on the page instead of a second one fighting it for frames.
 *
 * `transform: scaleX` on a `transform-origin: left` bar, not `width` - width
 * animates layout, scale animates on the compositor.
 */
export function ScrollProgress() {
  const scope = useGsap<HTMLDivElement>((self) => {
    const bar = self.selector?.('[data-bar]')?.[0];
    if (!bar) return;

    gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' });
    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
      },
    });
  }, []);

  return (
    <div
      ref={scope}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
    >
      <div
        data-bar
        className="h-full w-full bg-gradient-to-r from-brand-600 via-[#7c5cff] to-money"
      />
    </div>
  );
}
