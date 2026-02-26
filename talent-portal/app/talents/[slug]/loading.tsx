import { Skeleton } from "@/components/shared/loading-skeleton";

export default function TalentDetailLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-1)]">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] via-[var(--secondary)] to-[#0f2d6e]">
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
          <Skeleton className="mb-10 h-4 w-40 bg-white/10" />
          <div className="flex flex-col items-center">
            <Skeleton className="h-[120px] w-[120px] rounded-full bg-white/10" />
            <Skeleton className="mt-5 h-8 w-56 bg-white/10" />
            <Skeleton className="mt-3 h-7 w-40 rounded-full bg-white/10" />
            <div className="mt-4 flex gap-4">
              <Skeleton className="h-5 w-32 bg-white/10" />
              <Skeleton className="h-5 w-36 bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating stats row skeleton */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-12 z-10 grid grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 shadow-lg"
            >
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main content */}
          <div className="space-y-8">
            {/* About section */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
              <Skeleton className="mb-4 h-5 w-16" />
              <div className="space-y-2.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>

            {/* Skills section */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
              <Skeleton className="mb-4 h-5 w-24" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Projects section */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
              <Skeleton className="mb-5 h-5 w-40" />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <Skeleton className="aspect-video w-full rounded-none" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="mt-4 h-5 w-48" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-4 h-12 w-full rounded-xl" />
              <Skeleton className="mt-3 h-3 w-48 mx-auto" />
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
              <Skeleton className="mb-4 h-4 w-16" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
