interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--surface-2)] ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </div>
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </>
  );
}

interface TableRowSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableRowSkeleton({
  rows = 5,
  columns = 5,
}: TableRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-[var(--border)]">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3.5">
              <Skeleton
                className={`h-4 ${
                  colIdx === 0
                    ? "w-32"
                    : colIdx === columns - 1
                      ? "w-16"
                      : "w-24"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header area */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm"
          >
            <Skeleton className="mb-4 h-4 w-24" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>

      {/* Skills / Tags section */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
        <Skeleton className="mb-4 h-4 w-20" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-7 rounded-full"
              style={{ width: `${60 + Math.random() * 40}px` } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { Skeleton };
