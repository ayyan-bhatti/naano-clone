'use client';

import Link from 'next/link';
import { Euro } from 'lucide-react';

import { useStore } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/app-shell';
import { CreatorEarnings } from '@/components/creator/creator-screens';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';

export default function EarningsPage() {
  return (
    <RequireAuth>
      <EarningsInner />
    </RequireAuth>
  );
}

function EarningsInner() {
  const { user } = useStore();

  if (user?.role !== 'creator') {
    return (
      <AppShell title="Earnings">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={Euro}
            title="Earnings are a creator surface"
            body="You are signed in as a brand. What you pay out to creators lives in the payout ledger."
            action={
              <Link href="/payouts">
                <Button>Go to payouts</Button>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Earnings" subtitle="Fixed fees across your collaborations">
      <CreatorEarnings />
    </AppShell>
  );
}
