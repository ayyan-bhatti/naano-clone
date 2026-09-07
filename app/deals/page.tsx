'use client';

import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { CreatorDeals } from '@/components/creator/creator-screens';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Handshake } from 'lucide-react';
import Link from 'next/link';
import { useCreatorDeals } from '@/components/creator/creator-screens';

export default function DealsPage() {
  return (
    <RequireAuth>
      <DealsInner />
    </RequireAuth>
  );
}

function DealsInner() {
  const { user } = useStore();
  const { deals } = useCreatorDeals();

  // Brands do not receive deals - they send them. Point them at campaigns
  // rather than showing an empty screen that does not apply to them.
  if (user?.role !== 'creator') {
    return (
      <AppShell title="Deals">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={Handshake}
            title="Deals are a creator surface"
            body="You are signed in as a brand. Your side of this is campaigns — invite creators and track their responses there."
            action={
              <Link href="/campaigns">
                <Button>Go to campaigns</Button>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  const pending = deals.filter((d) => d.collab.status === 'invited').length;

  return (
    <AppShell
      title="Deals"
      subtitle={pending ? `${pending} waiting on your answer` : `${deals.length} total`}
    >
      <CreatorDeals />
    </AppShell>
  );
}
