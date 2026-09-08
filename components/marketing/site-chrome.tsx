'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#marketplace', label: 'Marketplace' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/free-tools', label: 'Free tools' },
];

export function SiteNav({ tone = 'light' }: { tone?: 'light' | 'dark' } = {}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, hydrated } = useStore();
  const dark = tone === 'dark' && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn('sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4', dark && 'text-white')}>
      <div
        className={cn(
          'mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-4 sm:px-5',
          'transition-[background-color,border-color,box-shadow,backdrop-filter] duration-200',
          scrolled || !dark
            ? 'border border-line bg-surface/90 shadow-card backdrop-blur-md'
            : 'border border-white/12 bg-white/5 backdrop-blur-md',
        )}
      >
        <Link href="/" aria-label="Vouch home">
          <Logo className={dark ? '[&>span:last-child]:text-white' : undefined} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const Tag = l.href.startsWith('/') ? Link : 'a';
            return (
            <Tag
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-[8px] px-3 py-2 text-[13px] font-medium transition-colors',
                dark ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-ink-soft hover:bg-sunken hover:text-ink',
              )}
            >
              {l.label}
            </Tag>
          );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {hydrated && user ? (
            <Link href="/dashboard">
              <Button size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm" className={dark ? 'text-white/80 hover:bg-white/10 hover:text-white' : undefined}>
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Start free</Button>
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className={cn('rounded-[8px] p-2 transition-colors md:hidden', dark ? 'text-white hover:bg-white/10' : 'text-ink-soft hover:bg-sunken')}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-surface px-4 py-3 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {LINKS.map((l) => {
              const Tag = l.href.startsWith('/') ? Link : 'a';
              return (
                <Tag
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-[8px] px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-sunken"
                >
                  {l.label}
                </Tag>
              );
            })}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
            {hydrated && user ? (
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                <Button block>Go to dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in" onClick={() => setOpen(false)}>
                  <Button variant="secondary" block>
                    Sign in
                  </Button>
                </Link>
                <Link href="/sign-up" onClick={() => setOpen(false)}>
                  <Button block>Start free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-ink-muted">
              Turn the creators your buyers already trust into a measurable acquisition channel.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <Link href="/marketplace" className="text-ink-soft hover:text-ink">
              Marketplace
            </Link>
            <Link href="/free-tools" className="text-ink-soft hover:text-ink">
              Free tools
            </Link>
            <Link href="/sign-up" className="text-ink-soft hover:text-ink">
              Get started
            </Link>
            <a href="#pricing" className="text-ink-soft hover:text-ink">
              Pricing
            </a>
            <a
              href="https://github.com"
              className="text-ink-soft hover:text-ink"
              rel="noreferrer noopener"
              target="_blank"
            >
              Source
            </a>
          </nav>
        </div>
        <p className="mt-8 border-t border-line pt-6 text-[12px] leading-relaxed text-ink-faint">
          Vouch is a portfolio re-engineering of a B2B creator marketplace, built as a technical
          assessment. All creators, campaigns and metrics are generated demo data. No real people,
          companies or payments are represented.
        </p>
      </div>
    </footer>
  );
}
