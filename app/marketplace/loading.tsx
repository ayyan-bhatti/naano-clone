import { CreatorCardSkeleton, Skeleton } from '@/components/ui/feedback';

/**
 * Route-level loading UI.
 *
 * Next renders this while navigating into the marketplace. It is a genuine
 * loading state rather than a timed fake, and it mirrors the real layout so the
 * swap does not shift anything.
 */
export default function MarketplaceLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="mt-6 flex gap-8">
        <div className="hidden w-[212px] shrink-0 space-y-6 lg:block">
          {Array.from({ length: 4 }).map((_, group) => (
            <div key={group}>
              <Skeleton className="h-3 w-20" />
              <div className="mt-3 space-y-2.5">
                {Array.from({ length: 4 }).map((_, row) => (
                  <Skeleton key={row} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
