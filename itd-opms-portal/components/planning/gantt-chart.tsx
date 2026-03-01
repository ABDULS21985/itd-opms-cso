"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Diamond, ChevronRight, User, Calendar, Clock } from "lucide-react";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface GanttItem {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  progress: number; // 0-100
  type: "project" | "epic" | "story" | "task" | "subtask";
  status: string;
  level: number; // indentation level
  assignee?: string;
}

export interface GanttMilestone {
  id: string;
  name: string;
  date: string;
  status: string;
}

export interface GanttChartProps {
  items: GanttItem[];
  milestones?: GanttMilestone[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onItemClick?: (id: string) => void;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const STATUS_COLORS: Record<string, string> = {
  done: "#22C55E",
  completed: "#22C55E",
  closed: "#22C55E",
  resolved: "#22C55E",
  in_progress: "#3B82F6",
  active: "#3B82F6",
  in_review: "#F59E0B",
  pending: "#F59E0B",
  pending_approval: "#F59E0B",
  todo: "#9CA3AF",
  backlog: "#9CA3AF",
  draft: "#9CA3AF",
  open: "#9CA3AF",
  logged: "#9CA3AF",
  blocked: "#EF4444",
  cancelled: "#EF4444",
  on_hold: "#F97316",
};

const TYPE_ICONS: Record<string, string> = {
  project: "P",
  epic: "E",
  story: "S",
  task: "T",
  subtask: "ST",
};

const ROW_HEIGHT = 40;
const LABEL_WIDTH = 280;
const MIN_BAR_WIDTH = 4;

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusColor(status: string): string {
  const normalized = status.toLowerCase().replace(/[\s-]/g, "_");
  return STATUS_COLORS[normalized] ?? "#9CA3AF";
}

function getMilestoneColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed" || s === "done" || s === "reached") return "#22C55E";
  if (s === "missed" || s === "overdue") return "#EF4444";
  if (s === "at_risk") return "#F59E0B";
  return "#6366F1";
}

/** Generate month labels spanning the date range. */
function getMonthLabels(
  start: Date,
  end: Date,
  totalDays: number,
): { label: string; leftPct: number; widthPct: number }[] {
  const labels: { label: string; leftPct: number; widthPct: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end) {
    const monthStart = new Date(
      Math.max(cursor.getTime(), start.getTime()),
    );
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const monthEnd = new Date(
      Math.min(nextMonth.getTime() - 86400000, end.getTime()),
    );

    const leftDays = daysBetween(start, monthStart);
    const widthDays = daysBetween(monthStart, monthEnd) + 1;

    labels.push({
      label: cursor.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      leftPct: (leftDays / totalDays) * 100,
      widthPct: (widthDays / totalDays) * 100,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return labels;
}

/** Generate week vertical lines for grid. */
function getWeekLines(
  start: Date,
  totalDays: number,
): { leftPct: number; isMonthStart: boolean }[] {
  const lines: { leftPct: number; isMonthStart: boolean }[] = [];
  const cursor = new Date(start);

  // Advance to next Monday
  const dayOfWeek = cursor.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  cursor.setDate(cursor.getDate() + daysToMonday);

  for (let i = 0; i < totalDays; i += 7) {
    const daysFromStart = daysBetween(start, cursor);
    if (daysFromStart >= 0 && daysFromStart <= totalDays) {
      lines.push({
        leftPct: (daysFromStart / totalDays) * 100,
        isMonthStart: cursor.getDate() <= 7,
      });
    }
    cursor.setDate(cursor.getDate() + 7);
  }

  return lines;
}

/* ================================================================== */
/*  Tooltip                                                            */
/* ================================================================== */

interface TooltipData {
  x: number;
  y: number;
  item?: GanttItem;
  milestone?: GanttMilestone;
}

function GanttTooltip({ data }: { data: TooltipData }) {
  const { item, milestone } = data;

  if (milestone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 shadow-lg"
        style={{
          left: data.x,
          top: data.y + 12,
          minWidth: 200,
          maxWidth: 300,
          pointerEvents: "none",
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Diamond size={12} style={{ color: getMilestoneColor(milestone.status) }} />
          <span className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
            {milestone.name}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Calendar size={10} />
            <span>Target: {formatDateFull(milestone.date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: getMilestoneColor(milestone.status) }}
            />
            <span className="text-[var(--text-secondary)] capitalize">
              {milestone.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!item) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 shadow-lg"
      style={{
        left: data.x,
        top: data.y + 12,
        minWidth: 220,
        maxWidth: 320,
        pointerEvents: "none",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white shrink-0"
          style={{ backgroundColor: getStatusColor(item.status) }}
        >
          {TYPE_ICONS[item.type] ?? "?"}
        </span>
        <span className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2">
          {item.name}
        </span>
      </div>

      <div className="space-y-1.5">
        {/* Dates */}
        {(item.startDate || item.endDate) && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Calendar size={10} className="shrink-0" />
            <span>
              {item.startDate ? formatDateShort(item.startDate) : "?"}
              {" - "}
              {item.endDate ? formatDateShort(item.endDate) : "?"}
            </span>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${item.progress}%`,
                backgroundColor: getStatusColor(item.status),
              }}
            />
          </div>
          <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
            {item.progress}%
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: getStatusColor(item.status) }}
          />
          <span className="text-[var(--text-secondary)] capitalize">
            {item.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Assignee */}
        {item.assignee && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <User size={10} className="shrink-0" />
            <span className="line-clamp-1">{item.assignee}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Today Marker                                                       */
/* ================================================================== */

function TodayMarker({ leftPct }: { leftPct: number }) {
  if (leftPct < 0 || leftPct > 100) return null;

  return (
    <div
      className="absolute top-0 bottom-0 z-10 pointer-events-none"
      style={{ left: `${leftPct}%` }}
    >
      <div className="relative w-px h-full bg-[var(--error)]">
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-b-sm px-1 py-0.5 text-[8px] font-bold text-white leading-none"
          style={{ backgroundColor: "var(--error)" }}
        >
          TODAY
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  GanttChart Component                                               */
/* ================================================================== */

export function GanttChart({
  items,
  milestones = [],
  startDate,
  endDate,
  onItemClick,
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  /* ---- Date calculations ---- */

  const rangeStart = useMemo(() => parseDate(startDate), [startDate]);
  const rangeEnd = useMemo(() => parseDate(endDate), [endDate]);
  const totalDays = useMemo(
    () => Math.max(daysBetween(rangeStart, rangeEnd), 1),
    [rangeStart, rangeEnd],
  );

  const monthLabels = useMemo(
    () => getMonthLabels(rangeStart, rangeEnd, totalDays),
    [rangeStart, rangeEnd, totalDays],
  );

  const weekLines = useMemo(
    () => getWeekLines(rangeStart, totalDays),
    [rangeStart, totalDays],
  );

  /* ---- Today marker ---- */

  const todayPct = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysFromStart = daysBetween(rangeStart, today);
    return (daysFromStart / totalDays) * 100;
  }, [rangeStart, totalDays]);

  /* ---- Item position calculation ---- */

  const getItemPosition = useCallback(
    (item: GanttItem) => {
      if (!item.startDate && !item.endDate) {
        return { leftPct: 0, widthPct: 0, hasBar: false };
      }

      const itemStart = item.startDate
        ? parseDate(item.startDate)
        : parseDate(item.endDate!);
      const itemEnd = item.endDate
        ? parseDate(item.endDate)
        : parseDate(item.startDate!);

      const leftDays = daysBetween(rangeStart, itemStart);
      const spanDays = Math.max(daysBetween(itemStart, itemEnd), 1);

      const leftPct = (leftDays / totalDays) * 100;
      const widthPct = Math.max((spanDays / totalDays) * 100, (MIN_BAR_WIDTH / 800) * 100);

      return { leftPct, widthPct, hasBar: true };
    },
    [rangeStart, totalDays],
  );

  /* ---- Milestone position ---- */

  const getMilestonePosition = useCallback(
    (ms: GanttMilestone) => {
      const msDate = parseDate(ms.date);
      const daysFromStart = daysBetween(rangeStart, msDate);
      return (daysFromStart / totalDays) * 100;
    },
    [rangeStart, totalDays],
  );

  /* ---- Event handlers ---- */

  const handleItemMouseEnter = useCallback(
    (e: React.MouseEvent, item: GanttItem) => {
      setTooltip({
        x: Math.min(e.clientX, window.innerWidth - 340),
        y: e.clientY,
        item,
      });
    },
    [],
  );

  const handleMilestoneMouseEnter = useCallback(
    (e: React.MouseEvent, ms: GanttMilestone) => {
      setTooltip({
        x: Math.min(e.clientX, window.innerWidth - 340),
        y: e.clientY,
        milestone: ms,
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  /* ---- Compute chart dimensions ---- */

  const chartHeight = (items.length + milestones.length) * ROW_HEIGHT;

  /* ---- Empty state ---- */

  if (items.length === 0 && milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Clock size={32} className="text-[var(--neutral-gray)]" />
        <p className="text-sm text-[var(--neutral-gray)]">
          No timeline data available.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Container with horizontal scroll */}
      <div
        ref={containerRef}
        className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
      >
        <div style={{ minWidth: 900 }}>
          {/* ---- Header: Month labels ---- */}
          <div className="flex border-b border-[var(--border)] bg-[var(--surface-1)]">
            {/* Label column header */}
            <div
              className="shrink-0 border-r border-[var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]"
              style={{ width: LABEL_WIDTH }}
            >
              Item
            </div>

            {/* Month labels */}
            <div className="relative flex-1 h-8">
              {monthLabels.map((ml, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex items-center border-r border-[var(--border)] px-2"
                  style={{
                    left: `${ml.leftPct}%`,
                    width: `${ml.widthPct}%`,
                  }}
                >
                  <span className="text-[10px] font-semibold text-[var(--neutral-gray)] whitespace-nowrap truncate">
                    {ml.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Chart body ---- */}
          <div className="flex" style={{ height: chartHeight }}>
            {/* Label column */}
            <div
              className="shrink-0 border-r border-[var(--border)]"
              style={{ width: LABEL_WIDTH }}
            >
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 border-b border-[var(--border)] px-3 transition-colors hover:bg-[var(--surface-1)] cursor-pointer"
                  style={{
                    height: ROW_HEIGHT,
                    paddingLeft: 12 + item.level * 16,
                  }}
                  onClick={() => onItemClick?.(item.id)}
                >
                  {/* Type indicator */}
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold text-white shrink-0"
                    style={{ backgroundColor: getStatusColor(item.status) }}
                  >
                    {TYPE_ICONS[item.type] ?? "?"}
                  </span>

                  {/* Name */}
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
                    {item.name}
                  </span>

                  {/* Assignee avatar placeholder */}
                  {item.assignee && (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] text-[8px] font-bold text-[var(--neutral-gray)] shrink-0"
                      title={item.assignee}
                    >
                      {item.assignee
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
              ))}

              {/* Milestone labels */}
              {milestones.map((ms) => (
                <div
                  key={ms.id}
                  className="flex items-center gap-2 border-b border-[var(--border)] px-3 transition-colors hover:bg-[var(--surface-1)]"
                  style={{ height: ROW_HEIGHT }}
                >
                  <Diamond
                    size={14}
                    style={{ color: getMilestoneColor(ms.status) }}
                    className="shrink-0"
                  />
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
                    {ms.name}
                  </span>
                  <span className="text-[10px] text-[var(--neutral-gray)] shrink-0">
                    {formatDateShort(ms.date)}
                  </span>
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div className="relative flex-1">
              {/* Week grid lines */}
              {weekLines.map((wl, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px"
                  style={{
                    left: `${wl.leftPct}%`,
                    backgroundColor: wl.isMonthStart
                      ? "var(--border)"
                      : "color-mix(in srgb, var(--border) 40%, transparent)",
                  }}
                />
              ))}

              {/* Today marker */}
              <TodayMarker leftPct={todayPct} />

              {/* Item bars */}
              {items.map((item, idx) => {
                const { leftPct, widthPct, hasBar } = getItemPosition(item);

                return (
                  <div
                    key={item.id}
                    className="absolute right-0 left-0 border-b border-[var(--border)]"
                    style={{
                      top: idx * ROW_HEIGHT,
                      height: ROW_HEIGHT,
                    }}
                  >
                    {hasBar && (
                      <div
                        className="absolute top-2 cursor-pointer rounded-md transition-all hover:brightness-110 hover:shadow-sm"
                        style={{
                          left: `${Math.max(leftPct, 0)}%`,
                          width: `${widthPct}%`,
                          height: ROW_HEIGHT - 16,
                          backgroundColor: `color-mix(in srgb, ${getStatusColor(item.status)} 25%, transparent)`,
                          borderLeft: `3px solid ${getStatusColor(item.status)}`,
                          minWidth: MIN_BAR_WIDTH,
                        }}
                        onMouseEnter={(e) => handleItemMouseEnter(e, item)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => onItemClick?.(item.id)}
                      >
                        {/* Progress fill */}
                        <div
                          className="absolute top-0 left-0 bottom-0 rounded-r-md"
                          style={{
                            width: `${item.progress}%`,
                            backgroundColor: `color-mix(in srgb, ${getStatusColor(item.status)} 40%, transparent)`,
                          }}
                        />

                        {/* Inline label (only show when bar is wide enough) */}
                        {widthPct > 8 && (
                          <span className="relative z-[1] flex items-center h-full px-2 text-[10px] font-medium text-[var(--text-primary)] truncate">
                            {item.progress > 0 && (
                              <span className="tabular-nums mr-1">
                                {item.progress}%
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    {/* No dates indicator */}
                    {!hasBar && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-[var(--neutral-gray)] italic">
                          No dates
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Milestone diamonds */}
              {milestones.map((ms, idx) => {
                const leftPct = getMilestonePosition(ms);
                const topOffset = items.length * ROW_HEIGHT + idx * ROW_HEIGHT;

                return (
                  <div
                    key={ms.id}
                    className="absolute right-0 left-0 border-b border-[var(--border)]"
                    style={{
                      top: topOffset,
                      height: ROW_HEIGHT,
                    }}
                  >
                    {/* Vertical guide line */}
                    <div
                      className="absolute top-0 bottom-0 w-px"
                      style={{
                        left: `${leftPct}%`,
                        backgroundColor: `color-mix(in srgb, ${getMilestoneColor(ms.status)} 30%, transparent)`,
                      }}
                    />

                    {/* Diamond marker */}
                    <div
                      className="absolute cursor-pointer"
                      style={{
                        left: `${leftPct}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                      onMouseEnter={(e) => handleMilestoneMouseEnter(e, ms)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div
                        className="h-4 w-4 rotate-45 rounded-sm shadow-sm transition-transform hover:scale-125"
                        style={{
                          backgroundColor: getMilestoneColor(ms.status),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: "#22C55E" }} />
          <span className="text-[10px] text-[var(--neutral-gray)]">Done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: "#3B82F6" }} />
          <span className="text-[10px] text-[var(--neutral-gray)]">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />
          <span className="text-[10px] text-[var(--neutral-gray)]">In Review / Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: "#9CA3AF" }} />
          <span className="text-[10px] text-[var(--neutral-gray)]">To Do</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: "#EF4444" }} />
          <span className="text-[10px] text-[var(--neutral-gray)]">Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-3 w-3 rotate-45 rounded-sm"
            style={{ backgroundColor: "#6366F1" }}
          />
          <span className="text-[10px] text-[var(--neutral-gray)]">Milestone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-px" style={{ backgroundColor: "var(--error)" }} />
          <span className="text-[10px] text-[var(--neutral-gray)]">Today</span>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && <GanttTooltip data={tooltip} />}
      </AnimatePresence>
    </div>
  );
}
