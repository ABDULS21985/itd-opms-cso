"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  FolderOpen,
  TrendingUp,
  Briefcase,
  GanttChart as GanttIcon,
} from "lucide-react";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  usePortfolioTimeline,
  usePortfolio,
} from "@/hooks/use-planning";
import {
  GanttChart,
  type GanttItem,
} from "@/components/planning/gantt-chart";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const RAG_COLORS: Record<string, string> = {
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  grey: "#9CA3AF",
};

function ragColor(ragStatus: string): string {
  return RAG_COLORS[ragStatus?.toLowerCase()] ?? RAG_COLORS.grey;
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/* ================================================================== */
/*  Skeleton Loader                                                    */
/* ================================================================== */

function TimelineSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-56 rounded-lg bg-[var(--surface-2)]" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <div className="h-3 w-20 rounded bg-[var(--surface-2)] mb-2" />
            <div className="h-6 w-16 rounded bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
        <div className="h-8 bg-[var(--surface-1)] border-b border-[var(--border)]" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center border-b border-[var(--border)] h-10 px-4 gap-3"
          >
            <div className="h-3 rounded bg-[var(--surface-2)]" style={{ width: `${80 + Math.random() * 100}px` }} />
            <div className="flex-1" />
            <div
              className="h-4 rounded bg-[var(--surface-2)]"
              style={{ width: `${120 + Math.random() * 200}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export default function PortfolioTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  /* ---- Data fetching ---- */
  const { data: timelineItems, isLoading: timelineLoading } =
    usePortfolioTimeline(id);
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(id);

  const isLoading = timelineLoading || portfolioLoading;

  /* ---- Breadcrumbs ---- */
  useBreadcrumbs([
    { label: "Planning", href: "/dashboard/planning" },
    { label: "Portfolios", href: "/dashboard/planning/portfolios" },
    {
      label: portfolio?.name || "Portfolio",
      href: `/dashboard/planning/portfolios/${id}`,
    },
    {
      label: "Timeline",
      href: `/dashboard/planning/portfolios/${id}/timeline`,
    },
  ]);

  /* ---- Process data ---- */
  const ganttData = useMemo(() => {
    if (!timelineItems || timelineItems.length === 0) return null;

    // Convert portfolio timeline items into GanttItems
    const ganttItems: GanttItem[] = timelineItems.map((item) => {
      // Use actual dates if available, fall back to planned dates
      const startDate = (item.actualStart ?? item.plannedStart)?.split("T")[0];
      const endDate = (item.actualEnd ?? item.plannedEnd)?.split("T")[0];

      return {
        id: item.id,
        name: `${item.code} - ${item.title}`,
        startDate,
        endDate,
        progress: item.completionPct,
        type: "project" as const,
        status: item.status,
        level: 0,
      };
    });

    // Calculate date range
    const allDates: string[] = [];

    for (const item of timelineItems) {
      if (item.plannedStart) allDates.push(item.plannedStart.split("T")[0]);
      if (item.plannedEnd) allDates.push(item.plannedEnd.split("T")[0]);
      if (item.actualStart) allDates.push(item.actualStart.split("T")[0]);
      if (item.actualEnd) allDates.push(item.actualEnd.split("T")[0]);
    }

    if (allDates.length === 0) {
      const today = new Date();
      const sixMonthsLater = new Date(today);
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      allDates.push(today.toISOString().split("T")[0]);
      allDates.push(sixMonthsLater.toISOString().split("T")[0]);
    }

    const sorted = allDates.sort();
    const rangeStart = addDays(sorted[0], -14);
    const rangeEnd = addDays(sorted[sorted.length - 1], 14);

    return { ganttItems, rangeStart, rangeEnd };
  }, [timelineItems]);

  /* ---- Summary stats ---- */
  const stats = useMemo(() => {
    if (!timelineItems) return null;

    const total = timelineItems.length;
    const avgCompletion =
      total > 0
        ? Math.round(
            timelineItems.reduce((sum, p) => sum + p.completionPct, 0) / total,
          )
        : 0;

    const ragCounts: Record<string, number> = {};
    for (const item of timelineItems) {
      const rag = item.ragStatus?.toLowerCase() ?? "grey";
      ragCounts[rag] = (ragCounts[rag] ?? 0) + 1;
    }

    const activeCount = timelineItems.filter(
      (p) => p.status === "active" || p.status === "in_progress",
    ).length;

    return { total, avgCompletion, ragCounts, activeCount };
  }, [timelineItems]);

  /* ---- Render ---- */

  return (
    <PermissionGate permission="planning.view">
      <div className="mx-auto max-w-7xl space-y-6 pb-8">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/planning/portfolios/${id}`)
            }
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Back to Portfolio
          </button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
              <GanttIcon size={24} style={{ color: "#1B7340" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Portfolio Timeline
              </h1>
              {portfolio && (
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  {portfolio.name}
                  {portfolio.fiscalYear && (
                    <span className="ml-2 text-xs text-[var(--neutral-gray)]">
                      FY {portfolio.fiscalYear}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Loading state */}
        {isLoading && <TimelineSkeleton />}

        {/* Empty state */}
        {!isLoading && (!timelineItems || timelineItems.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
              <FolderOpen size={32} className="text-[var(--neutral-gray)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              No Projects in Timeline
            </h2>
            <p className="text-sm text-[var(--neutral-gray)] text-center max-w-md">
              This portfolio does not have any projects with dates configured.
              Add projects with planned dates to see the timeline view.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/planning/portfolios/${id}`)
              }
              className="mt-2 flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <ArrowLeft size={14} />
              Go to Portfolio
            </button>
          </motion.div>
        )}

        {/* Timeline content */}
        {!isLoading && ganttData && stats && (
          <>
            {/* Summary cards */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Total projects */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase size={14} className="text-[var(--primary)]" />
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                    Total Projects
                  </p>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {stats.total}
                </p>
                <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                  {stats.activeCount} active
                </p>
              </div>

              {/* Average completion */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} style={{ color: "#3B82F6" }} />
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                    Avg. Completion
                  </p>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {stats.avgCompletion}%
                </p>
                <div className="mt-2 w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.avgCompletion}%`,
                      backgroundColor:
                        stats.avgCompletion >= 100 ? "#22C55E" : "#3B82F6",
                    }}
                  />
                </div>
              </div>

              {/* RAG summary */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 sm:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} style={{ color: "#F59E0B" }} />
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                    RAG Status
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  {Object.entries(stats.ragCounts)
                    .sort(([a], [b]) => {
                      const order = ["green", "amber", "red", "grey"];
                      return order.indexOf(a) - order.indexOf(b);
                    })
                    .map(([rag, count]) => (
                      <div key={rag} className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: ragColor(rag) }}
                        />
                        <div>
                          <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                            {count}
                          </span>
                          <span className="ml-1 text-xs text-[var(--neutral-gray)] capitalize">
                            {rag}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* RAG bar */}
                {stats.total > 0 && (
                  <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full">
                    {Object.entries(stats.ragCounts)
                      .sort(([a], [b]) => {
                        const order = ["green", "amber", "red", "grey"];
                        return order.indexOf(a) - order.indexOf(b);
                      })
                      .map(([rag, count]) => (
                        <div
                          key={rag}
                          style={{
                            width: `${(count / stats.total) * 100}%`,
                            backgroundColor: ragColor(rag),
                          }}
                        />
                      ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Gantt chart */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <GanttChart
                items={ganttData.ganttItems}
                startDate={ganttData.rangeStart}
                endDate={ganttData.rangeEnd}
                onItemClick={(projectId) =>
                  router.push(
                    `/dashboard/planning/projects/${projectId}`,
                  )
                }
              />
            </motion.div>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
