import { CardSkeleton, Skeleton } from "@/components/shared/loading-skeleton";

export default function JobsLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-1)]">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <Skeleton className="h-8 w-72 bg-white/10" />
            <Skeleton className="mt-3 h-5 w-96 bg-white/10" />
            {/* Search bar skeleton */}
            <Skeleton className="mt-8 h-14 w-full max-w-2xl rounded-2xl bg-white/10" />
            {/* Quick filter pills */}
            <div className="mt-5 flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar skeleton */}
          <aside className="hidden lg:block">
            <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <Skeleton className="h-4 w-20" />
              <div className="grid grid-cols-2 gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 rounded-lg" />
                ))}
              </div>
              <Skeleton className="mt-4 h-px w-full" />
              <Skeleton className="h-4 w-20" />
              <div className="flex gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 flex-1 rounded-lg" />
                ))}
              </div>
            </div>
          </aside>

          {/* Grid skeleton */}
          <div>
            <div className="mb-5 flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-9 w-44 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <CardSkeleton count={6} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
