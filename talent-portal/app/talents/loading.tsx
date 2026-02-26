import { CardSkeleton, Skeleton } from "@/components/shared/loading-skeleton";

export default function TalentsLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-1)]">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl bg-white/10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-64 bg-white/10" />
              <Skeleton className="h-4 w-40 bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search bar skeleton */}
        <div className="mb-6">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar skeleton */}
          <aside className="hidden lg:block">
            <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <Skeleton className="h-4 w-16" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
              <Skeleton className="mt-4 h-px w-full" />
              <Skeleton className="h-4 w-16" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </aside>

          {/* Grid skeleton */}
          <div className="lg:col-start-2">
            <div className="mb-4">
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <CardSkeleton count={6} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
