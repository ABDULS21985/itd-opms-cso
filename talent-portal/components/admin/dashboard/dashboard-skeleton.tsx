import { cn } from "@/lib/utils";

function ShimmerBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("rounded-lg bg-[var(--surface-2)] skeleton-shimmer", className)} style={style} />
  );
}

export function HeroMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-[140px] rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] p-5 space-y-3"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center justify-between">
            <ShimmerBlock className="w-11 h-11 rounded-xl" />
            <ShimmerBlock className="w-14 h-5 rounded-full" />
          </div>
          <ShimmerBlock className="w-20 h-8 rounded" />
          <div className="space-y-1.5">
            <ShimmerBlock className="w-28 h-3 rounded" />
            <ShimmerBlock className="w-20 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] p-4 flex items-center gap-4"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <ShimmerBlock className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="w-48 h-4 rounded" />
            <ShimmerBlock className="w-32 h-3 rounded" />
          </div>
          <ShimmerBlock className="w-20 h-8 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function FunnelSkeleton() {
  return (
    <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 space-y-5">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="w-9 h-9 rounded-xl" />
        <div className="space-y-1.5">
          <ShimmerBlock className="w-36 h-4 rounded" />
          <ShimmerBlock className="w-52 h-3 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            className="h-20 rounded-xl"
            style={{ flex: `${5 - i}`, animationDelay: `${i * 80}ms` } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3 pt-4 border-t border-[var(--border)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <ShimmerBlock className="w-12 h-6 rounded mx-auto" />
            <ShimmerBlock className="w-20 h-3 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="w-9 h-9 rounded-xl" />
        <ShimmerBlock className="w-28 h-4 rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <ShimmerBlock className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <ShimmerBlock className="w-full h-3 rounded" />
              <ShimmerBlock className="w-16 h-3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="w-9 h-9 rounded-xl" />
        <div className="space-y-1.5">
          <ShimmerBlock className="w-40 h-4 rounded" />
          <ShimmerBlock className="w-56 h-3 rounded" />
        </div>
      </div>
      <div className="flex gap-[3px] overflow-hidden">
        {Array.from({ length: 13 }).map((_, col) => (
          <div key={col} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, row) => (
              <ShimmerBlock
                key={row}
                className="w-3 h-3 rounded-[2px]"
                style={{ animationDelay: `${(col * 7 + row) * 10}ms` } as React.CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ShimmerBlock className="w-9 h-9 rounded-xl" />
            <ShimmerBlock className="w-32 h-4 rounded" />
          </div>
          <div className="flex items-center justify-center h-[240px]">
            <ShimmerBlock className="w-[170px] h-[170px] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <ShimmerBlock className="w-56 h-7 rounded-lg" />
          <ShimmerBlock className="w-80 h-4 rounded" />
        </div>
        <ShimmerBlock className="w-36 h-10 rounded-xl" />
      </div>

      {/* Alerts */}
      <AlertsSkeleton />

      {/* Hero metrics */}
      <HeroMetricsSkeleton />

      {/* Funnel + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FunnelSkeleton />
        </div>
        <ActivityFeedSkeleton />
      </div>

      {/* Heatmap */}
      <HeatmapSkeleton />

      {/* Pipeline charts */}
      <PipelineChartsSkeleton />
    </div>
  );
}
