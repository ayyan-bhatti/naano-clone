'use client';

import { cn } from '@/lib/cn';
import { useReveal } from '@/lib/hooks/use-motion';

/**
 * Scroll-triggered entrance. Fast (default 260ms) and small (8px), because the
 * point is to make a section feel like it arrived rather than to draw attention
 * to itself. `delay` staggers grids; keep the step small or the last card in a
 * row lands noticeably late.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const { ref, visible } = useReveal<HTMLElement>();
  // Widened so one component can render as div/li/article without TS trying to
  // reconcile four different ref element types.
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-[260ms] ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        className,
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
}
