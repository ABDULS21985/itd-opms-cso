import { Skeleton } from "@/components/shared/loading-skeleton";

export default function JobDetailLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-1)]">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] via-[#1843A5] to-[#0F2E78]">
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
          <Skeleton className="hidden lg:block mb-8 h-4 w-32 bg-white/10" />
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-start">
            <Skeleton className="h-16 w-16 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-32 bg-white/10" />
              <Skeleton className="h-7 w-72 bg-white/10" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
                <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
                <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
              </div>
              <Skeleton className="h-6 w-48 bg-white/10" />
              <Skeleton className="h-4 w-40 bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-12">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            {/* Main content */}
            <div className="space-y-6">
              {/* Description */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-px w-full mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>

              {/* Responsibilities */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-36" />
                </div>
                <Skeleton className="h-px w-full mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-px w-full mb-4" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-8 space-y-6">
                {/* Apply CTA */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="mt-2 h-5 w-36" />
                  <Skeleton className="mt-4 h-12 w-full rounded-xl" />
                  <Skeleton className="mt-2 h-3 w-44 mx-auto" />
                  <Skeleton className="mt-4 h-8 w-full rounded-lg" />
                </div>

                {/* Job Details */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
                  <Skeleton className="mb-4 h-5 w-24" />
                  <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
