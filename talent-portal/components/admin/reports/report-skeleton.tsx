import { cn } from "@/lib/utils";

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("rounded-lg bg-[var(--surface-2)] skeleton-shimmer", className)} style={style} />
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-7 w-52 rounded-xl" />
          <Shimmer className="h-4 w-72 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Shimmer className="h-9 w-24 rounded-xl" />
          <Shimmer className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Tabs */}
      <Shimmer className="h-12 w-full rounded-2xl" />

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Shimmer className="w-11 h-11 rounded-xl mb-3" />
            <Shimmer className="h-8 w-16 rounded-lg mb-2" />
            <Shimmer className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-5">
            <Shimmer className="w-9 h-9 rounded-xl" />
            <div className="space-y-1.5">
              <Shimmer className="h-4 w-32 rounded" />
              <Shimmer className="h-3 w-48 rounded" />
            </div>
          </div>
          <Shimmer className="h-[260px] w-full rounded-xl" />
        </div>
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-5">
            <Shimmer className="w-9 h-9 rounded-xl" />
            <div className="space-y-1.5">
              <Shimmer className="h-4 w-32 rounded" />
              <Shimmer className="h-3 w-48 rounded" />
            </div>
          </div>
          <Shimmer className="h-[260px] w-full rounded-xl" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-5">
              <Shimmer className="w-9 h-9 rounded-xl" />
              <Shimmer className="h-4 w-28 rounded" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Shimmer key={j} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
