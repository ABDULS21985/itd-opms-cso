"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  GanttChart as GanttIcon,
  Layers,
  Milestone,
} from "lucide-react";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useProjectTimeline,
  useProject,
} from "@/hooks/use-planning";
import {
  GanttChart,
  type GanttItem,
  type GanttMilestone,
} from "@/components/planning/gantt-chart";
import type { TimelineWorkItem } from "@/types";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const WORK_ITEM_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
];

const WORK_ITEM_TYPES = ["epic", "story", "task", "subtask"];

const TYPE_ORDER: Record<string, number> = {
  epic: 0,
  story: 1,
  task: 2,
  subtask: 3,
};

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatLabel(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build a hierarchical work item tree and flatten it into a level-annotated list.
 * Epics come first, then their children (stories, tasks, subtasks) grouped underneath.
 */
function buildGanttItems(workItems: TimelineWorkItem[]): GanttItem[] {
  // Build parent-children map
  const childrenMap = new Map<string | undefined, TimelineWorkItem[]>();
  for (const wi of workItems) {
    const key = wi.parentId ?? "__root__";
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(wi);
  }

  // Sort each children group by type order then sortOrder
  for (const [, children] of childrenMap) {
    children.sort((a, b) => {
      const typeA = TYPE_ORDER[a.type] ?? 99;
      const typeB = TYPE_ORDER[b.type] ?? 99;
      if (typeA !== typeB) return typeA - typeB;
      return a.sortOrder - b.sortOrder;
    });
  }

  // Recursively flatten
  const result: GanttItem[] = [];

  function walk(parentId: string | undefined, level: number) {
    const key = parentId ?? "__root__";
    const children = childrenMap.get(key);
    if (!children) return;

    for (const wi of children) {
      // Determine progress: if completed, 100%. Otherwise estimate from hours.
      let progress = 0;
      if (
        wi.status === "done" ||
        wi.status === "completed" ||
        wi.status === "closed"
      ) {
        progress = 100;
      } else if (wi.estimatedHours && wi.actualHours) {
        progress = Math.min(
          Math.round((wi.actualHours / wi.estimatedHours) * 100),
          100,
        );
      } else if (wi.status === "in_progress" || wi.status === "in_review") {
        progress = 50; // rough estimate
      }

      // Determine dates: use dueDate as endDate, calculate startDate from estimated hours
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (wi.completedAt) {
        endDate = wi.completedAt.split("T")[0];
      }
      if (wi.dueDate) {
        endDate = wi.dueDate.split("T")[0];
      }

      // If we have endDate and estimatedHours, estimate startDate
      if (endDate && wi.estimatedHours) {
        const workDays = Math.max(Math.ceil(wi.estimatedHours / 8), 1);
        startDate = addDays(endDate, -workDays);
      } else if (endDate) {
        // Default to 3 days before endDate
        startDate = addDays(endDate, -3);
      }

      result.push({
        id: wi.id,
        name: wi.title,
        startDate,
        endDate,
        progress,
        type: wi.type as GanttItem["type"],
        status: wi.status,
        level,
        assignee: wi.assigneeName,
      });

      // Recurse into children
      walk(wi.id, level + 1);
    }
  }

  walk(undefined, 0);
  return result;
}

/* ================================================================== */
/*  Skeleton Loader                                                    */
/* ================================================================== */

function TimelineSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-48 rounded-lg bg-[var(--surface-2)]" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-lg bg-[var(--surface-2)]" />
          <div className="h-8 w-24 rounded-lg bg-[var(--surface-2)]" />
        </div>
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
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex items-center border-b border-[var(--border)] h-10 px-4 gap-3"
          >
            <div className="h-3 rounded bg-[var(--surface-2)]" style={{ width: `${60 + Math.random() * 120}px` }} />
            <div className="flex-1" />
            <div
              className="h-4 rounded bg-[var(--surface-2)]"
              style={{ width: `${80 + Math.random() * 200}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Filter Chip                                                        */
/* ================================================================== */

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
        active
          ? "bg-[var(--primary)] text-white"
          : "border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
      }`}
    >
      {label}
    </button>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export default function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  /* ---- Data fetching ---- */
  const { data: timeline, isLoading: timelineLoading } =
    useProjectTimeline(id);
  const { data: project, isLoading: projectLoading } = useProject(id);

  const isLoading = timelineLoading || projectLoading;

  /* ---- Breadcrumbs ---- */
  useBreadcrumbs([
    { label: "Planning", href: "/dashboard/planning" },
    { label: "Projects", href: "/dashboard/planning/projects" },
    {
      label: project?.title || "Project",
      href: `/dashboard/planning/projects/${id}`,
    },
    {
      label: "Timeline",
      href: `/dashboard/planning/projects/${id}/timeline`,
    },
  ]);

  /* ---- Filters ---- */
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  /* ---- Zoom: shifts the range boundaries ---- */
  const [zoomLevel, setZoomLevel] = useState(0); // negative = zoom out (wider), positive = zoom in (narrower)

  function toggleFilter(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    return next;
  }

  /* ---- Process data ---- */
  const ganttData = useMemo(() => {
    if (!timeline) return null;

    const { project: proj, milestones: msList, workItems } = timeline;

    // Build gantt items from work items
    let ganttItems = buildGanttItems(workItems);

    // Apply status filters
    if (statusFilters.size > 0) {
      ganttItems = ganttItems.filter((item) => statusFilters.has(item.status));
    }

    // Apply type filters
    if (typeFilters.size > 0) {
      ganttItems = ganttItems.filter((item) => typeFilters.has(item.type));
    }

    // Build gantt milestones
    const ganttMilestones: GanttMilestone[] = msList.map((ms) => ({
      id: ms.id,
      name: ms.title,
      date: ms.targetDate.split("T")[0],
      status: ms.status,
    }));

    // Calculate date range from project dates, work items, and milestones
    const allDates: string[] = [];

    if (proj.plannedStart) allDates.push(proj.plannedStart.split("T")[0]);
    if (proj.plannedEnd) allDates.push(proj.plannedEnd.split("T")[0]);
    if (proj.actualStart) allDates.push(proj.actualStart.split("T")[0]);
    if (proj.actualEnd) allDates.push(proj.actualEnd.split("T")[0]);

    for (const item of ganttItems) {
      if (item.startDate) allDates.push(item.startDate);
      if (item.endDate) allDates.push(item.endDate);
    }
    for (const ms of ganttMilestones) {
      allDates.push(ms.date);
    }

    if (allDates.length === 0) {
      // Fallback: 3 months from today
      const today = new Date();
      const threeMonthsLater = new Date(today);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      allDates.push(today.toISOString().split("T")[0]);
      allDates.push(threeMonthsLater.toISOString().split("T")[0]);
    }

    const sorted = allDates.sort();
    let rangeStart = sorted[0];
    let rangeEnd = sorted[sorted.length - 1];

    // Add buffer: 2 weeks before start, 2 weeks after end
    rangeStart = addDays(rangeStart, -14);
    rangeEnd = addDays(rangeEnd, 14);

    // Apply zoom: each zoom level shifts range by 2 weeks on each side
    if (zoomLevel > 0) {
      // Zoom in: narrow the range
      rangeStart = addDays(rangeStart, zoomLevel * 14);
      rangeEnd = addDays(rangeEnd, -zoomLevel * 14);
    } else if (zoomLevel < 0) {
      // Zoom out: widen the range
      rangeStart = addDays(rangeStart, zoomLevel * 14);
      rangeEnd = addDays(rangeEnd, -zoomLevel * 14);
    }

    // Ensure rangeStart is before rangeEnd
    if (rangeStart >= rangeEnd) {
      rangeEnd = addDays(rangeStart, 30);
    }

    return {
      ganttItems,
      ganttMilestones,
      rangeStart,
      rangeEnd,
      projectData: proj,
    };
  }, [timeline, statusFilters, typeFilters, zoomLevel]);

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
              router.push(`/dashboard/planning/projects/${id}`)
            }
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Back to Project
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
                Project Timeline
              </h1>
              {project && (
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  {project.title}
                  {project.code && (
                    <span className="ml-2 text-xs font-mono text-[var(--neutral-gray)]">
                      {project.code}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-0)]">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 1, -4))}
                className="flex items-center justify-center h-8 w-8 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] rounded-l-lg"
                title="Zoom out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(0)}
                className="flex items-center justify-center h-8 w-8 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] border-x border-[var(--border)]"
                title="Reset zoom"
              >
                <RotateCcw size={12} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 1, 4))}
                className="flex items-center justify-center h-8 w-8 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] rounded-r-lg"
                title="Zoom in"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((f) => !f)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                showFilters || statusFilters.size > 0 || typeFilters.size > 0
                  ? "border-[var(--primary)] bg-[rgba(27,115,64,0.05)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
              }`}
            >
              <Filter size={12} />
              Filters
              {(statusFilters.size > 0 || typeFilters.size > 0) && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-white">
                  {statusFilters.size + typeFilters.size}
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 space-y-3"
          >
            {/* Status filters */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers size={12} className="text-[var(--neutral-gray)]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Status
                </span>
                {statusFilters.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilters(new Set())}
                    className="text-[10px] text-[var(--primary)] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WORK_ITEM_STATUSES.map((s) => (
                  <FilterChip
                    key={s}
                    label={formatLabel(s)}
                    active={statusFilters.has(s)}
                    onClick={() =>
                      setStatusFilters(toggleFilter(statusFilters, s))
                    }
                  />
                ))}
              </div>
            </div>

            {/* Type filters */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Milestone size={12} className="text-[var(--neutral-gray)]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Type
                </span>
                {typeFilters.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setTypeFilters(new Set())}
                    className="text-[10px] text-[var(--primary)] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WORK_ITEM_TYPES.map((t) => (
                  <FilterChip
                    key={t}
                    label={formatLabel(t)}
                    active={typeFilters.has(t)}
                    onClick={() =>
                      setTypeFilters(toggleFilter(typeFilters, t))
                    }
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {isLoading && <TimelineSkeleton />}

        {/* Empty state */}
        {!isLoading && !timeline && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
              <Calendar size={32} className="text-[var(--neutral-gray)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              No Timeline Data
            </h2>
            <p className="text-sm text-[var(--neutral-gray)] text-center max-w-md">
              This project does not have any timeline data yet. Add work items
              and milestones to see the Gantt chart.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/planning/projects/${id}`)
              }
              className="mt-2 flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <ArrowLeft size={14} />
              Go to Project
            </button>
          </motion.div>
        )}

        {/* Timeline content */}
        {!isLoading && ganttData && (
          <>
            {/* Summary cards */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {/* Work items count */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Layers size={14} className="text-[var(--primary)]" />
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                    Work Items
                  </p>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {ganttData.ganttItems.length}
                </p>
                {(statusFilters.size > 0 || typeFilters.size > 0) && (
                  <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                    of {timeline!.workItems.length} total (filtered)
                  </p>
                )}
              </div>

              {/* Milestones count */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Milestone size={14} style={{ color: "#6366F1" }} />
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                    Milestones
                  </p>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {ganttData.ganttMilestones.length}
                </p>
                <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                  {ganttData.ganttMilestones.filter(
                    (m) =>
                      m.status === "completed" ||
                      m.status === "done" ||
                      m.status === "reached",
                  ).length}{" "}
                  completed
                </p>
              </div>

              {/* Project progress */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} style={{ color: "#F59E0B" }} />
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                    Overall Progress
                  </p>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {ganttData.projectData.completionPct}%
                </p>
                <div className="mt-2 w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${ganttData.projectData.completionPct}%`,
                      backgroundColor:
                        ganttData.projectData.completionPct >= 100
                          ? "#22C55E"
                          : "#3B82F6",
                    }}
                  />
                </div>
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
                milestones={ganttData.ganttMilestones}
                startDate={ganttData.rangeStart}
                endDate={ganttData.rangeEnd}
                onItemClick={(itemId) =>
                  router.push(`/dashboard/planning/work-items/${itemId}`)
                }
              />
            </motion.div>

            {/* Zoom indicator */}
            {zoomLevel !== 0 && (
              <div className="text-center">
                <span className="text-[10px] text-[var(--neutral-gray)]">
                  Zoom: {zoomLevel > 0 ? "+" : ""}
                  {zoomLevel} &middot;{" "}
                  {ganttData.rangeStart} to {ganttData.rangeEnd}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </PermissionGate>
  );
}
