'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bell,
  ChevronDown,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  Store,
  Target,
  Wallet,
  X,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { Logo } from '@/components/brand';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

/**
 * Signed-in application chrome.
 *
 * Sidebar structure mirrors what the teardown showed on Naano: a persistent
 * left rail with the primary surfaces, a greeting header, and a notification
 * affordance. Collapses to a slide-over on mobile rather than shrinking - a
 * squeezed desktop sidebar is the thing the brief explicitly warns against.
 */

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/campaigns', label: 'Campaigns', icon: Target },
  { href: '/payouts', label: 'Payouts', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, signOut, markAllNotificationsRead, hydrated } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-dvh bg-ground">
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" aria-label="Vouch dashboard">
            <Logo />
          </Link>
        </div>
        <SidebarNav pathname={pathname} />
        <UserBlock onSignOut={() => { signOut(); router.push('/'); }} />
      </aside>

      {/* ---------- Sidebar (mobile slide-over) ---------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative flex h-full w-[262px] flex-col border-r border-line bg-surface animate-[slide-in_200ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-[8px] p-1.5 text-ink-faint hover:bg-sunken hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarNav pathname={pathname} />
            <UserBlock onSignOut={() => { signOut(); router.push('/'); }} />
          </aside>
          <style>{`@keyframes slide-in{from{transform:translateX(-100%)}to{transform:none}}`}</style>
        </div>
      )}

      {/* ---------- Main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[236px]">
        <header className="sticky top-0 z-30 border-b border-line bg-ground/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-[8px] p-2 text-ink-soft hover:bg-sunken lg:hidden"
            >
              <Menu className="size-5" />
            </button>

            <div className="min-w-0 flex-1">
              {title && (
                <h1 className="truncate text-[17px] font-bold tracking-[-0.02em] text-ink sm:text-[19px]">
                  {title}
                </h1>
              )}
              {subtitle && <p className="truncate text-[12.5px] text-ink-muted">{subtitle}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {actions}

              <div className="relative">
                <button
                  onClick={() => {
                    setBellOpen((v) => !v);
                    if (!bellOpen && unread) markAllNotificationsRead();
                  }}
                  aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                  aria-expanded={bellOpen}
                  className="relative rounded-[10px] border border-line bg-surface p-2 text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
                >
                  <Bell className="size-4" />
                  {hydrated && unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} aria-hidden />
                    <div className="absolute right-0 z-20 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-[14px] border border-line bg-surface shadow-pop">
                      <div className="border-b border-line px-4 py-3">
                        <p className="text-[13px] font-semibold text-ink">Notifications</p>
                      </div>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[13px] text-ink-muted">
                          Nothing yet. Activity from your campaigns will land here.
                        </p>
                      ) : (
                        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                          {notifications.map((n) => (
                            <li key={n.id}>
                              <Link
                                href={n.href ?? '/dashboard'}
                                onClick={() => setBellOpen(false)}
                                className="block px-4 py-3 transition-colors hover:bg-sunken"
                              >
                                <p className="text-[13px] font-medium text-ink">{n.title}</p>
                                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{n.body}</p>
                                <p className="mt-1 text-[11px] text-ink-faint">{relativeTime(n.createdAt)}</p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Primary" className="flex-1 space-y-0.5 px-3 py-2">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150',
              active ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-sunken hover:text-ink',
            )}
          >
            <item.icon className={cn('size-[18px] shrink-0', active ? 'text-brand-600' : 'text-ink-faint')} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <div className="relative border-t border-line p-3">
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute bottom-full left-3 right-3 z-20 mb-1 overflow-hidden rounded-[12px] border border-line bg-surface shadow-pop">
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[10px] p-2 text-left transition-colors hover:bg-sunken"
      >
        <Avatar seed={user.avatarSeed} name={user.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block truncate text-[11.5px] text-ink-muted">{user.company}</span>
        </span>
        <ChevronDown className={cn('size-3.5 shrink-0 text-ink-faint transition-transform', open && 'rotate-180')} />
      </button>
    </div>
  );
}

/**
 * Client-side route guard. Waits for hydration before deciding, otherwise it
 * would bounce a signed-in user on every hard refresh.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace('/sign-in');
    else if (!user.onboarded) router.replace('/onboarding');
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ground">
        <div className="flex items-center gap-3 text-[13px] text-ink-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-brand-600" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  if (!user || !user.onboarded) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ground px-6 text-center">
        <p className="text-[14px] text-ink-soft">You need to be signed in to see this.</p>
        <Link href="/sign-in">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

export { NAV as APP_NAV };
