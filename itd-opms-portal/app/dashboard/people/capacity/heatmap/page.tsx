"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Users,
  FolderKanban,
  CalendarDays,
  CalendarRange,
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  X,
  Info,
} from "lucide-react";
import {
  useCapacityHeatmap,
  type HeatmapRow,
  type HeatmapCell,
  type HeatmapProject,
} from "@/hooks/use-heatmap";

/* ================================================================== */
/*  Helper Functions                                                    */
/* ================================================================== */

/**
 * Returns a background color based on allocation percentage.
 */
function getCellColor(pct: number): string {
  if (pct <= 0) return "transparent";
  if (pct <= 50) return "#DCFCE7";
  if (pct <= 80) return "#86EFAC";
  if (pct <= 100) return "#93C5FD";
  if (pct <= 120) return "#FED7AA";
  return "#FCA5A5";
}

/**
 * Returns a text color appropriate for readability on the cell background.
 */
function getCellTextColor(pct: number): string {
  if (pct <= 0) return "var(--text-secondary)";
  if (pct <= 50) return "#166534";
  if (pct <= 80) return "#14532D";
  if (pct <= 100) return "#1E3A8A";
  if (pct <= 120) return "#9A3412";
  return "#991B1B";
}

/**
 * Formats a period label for display.
 */
function formatPeriod(period: string, granularity: "week" | "month"): string {
  if (granularity === "week") {
    // "2026-W09" -> "W09"
    const parts = period.split("-");
    return parts.length > 1 ? parts[1] : period;
  }
  // "2026-02" -> "Feb 2026"
  const parts = period.split("-");
  if (parts.length < 2) return period;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return period;
  return `${monthNames[monthIdx]} ${parts[0]}`;
}

/**
 * Returns a color for the average load indicator badge.
 */
function getLoadColor(avg: number): string {
  if (avg <= 0) return "var(--text-secondary)";
  if (avg <= 50) return "#16A34A";
  if (avg <= 80) return "#059669";
  if (avg <= 100) return "#2563EB";
  if (avg <= 120) return "#EA580C";
  return "#DC2626";
}

/**
 * Returns an appropriate background for the average load badge.
 */
function getLoadBgColor(avg: number): string {
  if (avg <= 0) return "rgba(107,114,128,0.1)";
  if (avg <= 50) return "rgba(22,163,74,0.1)";
  if (avg <= 80) return "rgba(5,150,105,0.1)";
  if (avg <= 100) return "rgba(37,99,235,0.1)";
  if (avg <= 120) return "rgba(234,88,12,0.1)";
  return "rgba(220,38,38,0.1)";
}

/**
 * Returns date string in YYYY-MM-DD format.
 */
function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Computes column averages for each period.
 */
function computeColumnAverages(
  rows: HeatmapRow[],
  periods: string[],
): number[] {
  return periods.map((_, colIdx) => {
    if (rows.length === 0) return 0;
    const sum = rows.reduce((acc, row) => {
      const cell = row.cells[colIdx];
      return acc + (cell?.allocationPct ?? 0);
    }, 0);
    return Math.round((sum / rows.length) * 100) / 100;
  });
}

/* ================================================================== */
/*  Tooltip Component                                                   */
/* ================================================================== */

function CellTooltip({
  cell,
  groupBy,
  position,
  onClose,
}: {
  cell: HeatmapCell;
  groupBy: "user" | "project";
  position: { top: number; left: number };
  onClose: () => void;
}) {
  const label = groupBy === "user" ? "Projects" : "Users";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 min-w-[220px] max-w-[320px] rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 shadow-lg"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[var(--text-primary)]">
          {cell.period}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-md hover:bg-[var(--surface-1)] text-[var(--text-secondary)]"
        >
          <X size={12} />
        </button>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--text-secondary)]">
          Total Allocation
        </span>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: getCellTextColor(cell.allocationPct) }}
        >
          {cell.allocationPct}%
        </span>
      </div>
      {cell.projects.length > 0 && (
        <>
          <div className="h-px bg-[var(--border)] my-2" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            {label} ({cell.projectCount})
          </p>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
            {cell.projects.map((proj: HeatmapProject) => (
              <div
                key={proj.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-xs text-[var(--text-primary)] truncate flex-1">
                  {proj.title}
                </span>
                <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                  {proj.pct}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/*  Cell Detail Panel                                                   */
/* ================================================================== */

function CellDetailPanel({
  row,
  cell,
  groupBy,
  onClose,
}: {
  row: HeatmapRow;
  cell: HeatmapCell;
  groupBy: "user" | "project";
  onClose: () => void;
}) {
  const label = groupBy === "user" ? "Project" : "User";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="col-span-full overflow-hidden"
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 mx-2 mb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[var(--text-secondary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {row.label} - {cell.period}
            </h3>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: getLoadBgColor(cell.allocationPct),
                color: getLoadColor(cell.allocationPct),
              }}
            >
              {cell.allocationPct}% allocated
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-[var(--surface-1)] text-[var(--text-secondary)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {cell.projects.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)]">
            No allocations for this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    {label}
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Allocation %
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Visual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {cell.projects.map((proj: HeatmapProject) => (
                  <tr key={proj.id}>
                    <td className="px-3 py-2 text-xs text-[var(--text-primary)]">
                      {proj.title}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: getLoadColor(proj.pct) }}
                      >
                        {proj.pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <div className="h-2 w-24 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(proj.pct, 100)}%`,
                              backgroundColor: getCellColor(proj.pct),
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Summary Cards                                                       */
/* ================================================================== */

function SummaryCards({
  totalUsers,
  overAllocatedUsers,
  underUtilizedUsers,
  averageUtilization,
}: {
  totalUsers: number;
  overAllocatedUsers: number;
  underUtilizedUsers: number;
  averageUtilization: number;
}) {
  const cards = [
    {
      label: "Total Resources",
      value: totalUsers,
      icon: Users,
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.1)",
    },
    {
      label: "Over-Allocated",
      value: overAllocatedUsers,
      icon: TrendingUp,
      color: "#EF4444",
      bg: "rgba(239,68,68,0.1)",
    },
    {
      label: "Under-Utilized",
      value: underUtilizedUsers,
      icon: TrendingDown,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
    },
    {
      label: "Avg Utilization",
      value: `${averageUtilization}%`,
      icon: BarChart3,
      color: "#10B981",
      bg: "rgba(16,185,129,0.1)",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: card.bg }}
            >
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {card.label}
              </p>
              <p
                className="text-lg font-bold tabular-nums"
                style={{ color: card.color }}
              >
                {card.value}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Legend                                                               */
/* ================================================================== */

function HeatmapLegend() {
  const items = [
    { label: "0%", color: "transparent", border: true },
    { label: "1-50%", color: "#DCFCE7", border: false },
    { label: "51-80%", color: "#86EFAC", border: false },
    { label: "81-100%", color: "#93C5FD", border: false },
    { label: "101-120%", color: "#FED7AA", border: false },
    { label: "121%+", color: "#FCA5A5", border: false },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        Legend
      </span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div
            className="h-3 w-6 rounded"
            style={{
              backgroundColor: item.color,
              border: item.border ? "1px solid var(--border)" : "none",
            }}
          />
          <span className="text-[10px] text-[var(--text-secondary)]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Toggle Button Group                                                 */
/* ================================================================== */

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-0.5">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: isActive ? "var(--surface-0)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: isActive
                ? "0 1px 2px rgba(0,0,0,0.05)"
                : "none",
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Main Heatmap Page                                                   */
/* ================================================================== */

export default function HeatmapPage() {
  // Default date range: current quarter
  const now = new Date();
  const quarterStart = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1,
  );
  const quarterEnd = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3 + 3,
    0,
  );

  const [startDate, setStartDate] = useState(toDateString(quarterStart));
  const [endDate, setEndDate] = useState(toDateString(quarterEnd));
  const [groupBy, setGroupBy] = useState<"user" | "project">("user");
  const [granularity, setGranularity] = useState<"week" | "month">("month");

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    cell: HeatmapCell;
    position: { top: number; left: number };
  } | null>(null);

  // Expanded cell detail state
  const [expandedCell, setExpandedCell] = useState<{
    rowId: string;
    periodIdx: number;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const { data: heatmap, isLoading } = useCapacityHeatmap(
    startDate,
    endDate,
    groupBy,
    granularity,
  );

  const periods = heatmap?.periods ?? [];
  const rows = heatmap?.rows ?? [];
  const summary = heatmap?.summary ?? {
    totalUsers: 0,
    overAllocatedUsers: 0,
    underUtilizedUsers: 0,
    averageUtilization: 0,
  };

  const columnAverages = useMemo(
    () => computeColumnAverages(rows, periods),
    [rows, periods],
  );

  const hasOverAllocated = summary.overAllocatedUsers > 0;

  const handleCellHover = useCallback(
    (cell: HeatmapCell, event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltip({
        cell,
        position: {
          top: rect.top - 4,
          left: rect.right + 8,
        },
      });
    },
    [],
  );

  const handleCellLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleCellClick = useCallback(
    (rowId: string, periodIdx: number) => {
      if (
        expandedCell &&
        expandedCell.rowId === rowId &&
        expandedCell.periodIdx === periodIdx
      ) {
        setExpandedCell(null);
      } else {
        setExpandedCell({ rowId, periodIdx });
      }
    },
    [expandedCell],
  );

  // Grid template: sticky label column + period columns + average column
  const gridTemplateColumns = `200px repeat(${periods.length}, minmax(72px, 1fr)) 100px`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
          >
            <LayoutGrid size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Resource Heatmap
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Visualize team capacity and allocation across time periods
            </p>
          </div>
        </div>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3"
      >
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>

        <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />

        {/* Group By */}
        <ToggleGroup
          value={groupBy}
          onChange={setGroupBy}
          options={[
            {
              value: "user",
              label: "User",
              icon: <Users size={12} />,
            },
            {
              value: "project",
              label: "Project",
              icon: <FolderKanban size={12} />,
            },
          ]}
        />

        <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />

        {/* Granularity */}
        <ToggleGroup
          value={granularity}
          onChange={setGranularity}
          options={[
            {
              value: "week",
              label: "Week",
              icon: <CalendarDays size={12} />,
            },
            {
              value: "month",
              label: "Month",
              icon: <CalendarRange size={12} />,
            },
          ]}
        />
      </motion.div>

      {/* Over-allocation Alert Banner */}
      <AnimatePresence>
        {hasOverAllocated && !isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border px-4 py-3 flex items-center gap-3"
            style={{
              borderColor: "rgba(239, 68, 68, 0.3)",
              backgroundColor: "rgba(239, 68, 68, 0.05)",
            }}
          >
            <AlertTriangle size={16} style={{ color: "#EF4444" }} />
            <p className="text-xs font-medium" style={{ color: "#DC2626" }}>
              {summary.overAllocatedUsers} resource
              {summary.overAllocatedUsers > 1 ? "s" : ""} over-allocated (
              {">"} 100% average). Review assignments to prevent burnout.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      {!isLoading && rows.length > 0 && (
        <SummaryCards
          totalUsers={summary.totalUsers}
          overAllocatedUsers={summary.overAllocatedUsers}
          underUtilizedUsers={summary.underUtilizedUsers}
          averageUtilization={summary.averageUtilization}
        />
      )}

      {/* Heatmap Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={28}
              className="animate-spin text-[var(--primary)]"
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-16 text-center">
            <LayoutGrid
              size={28}
              className="mx-auto text-[var(--text-secondary)] mb-3"
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No allocation data found
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
              Adjust the date range or add capacity allocations to see the
              resource heatmap.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            {/* Legend */}
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)]">
              <HeatmapLegend />
            </div>

            {/* Scrollable Grid */}
            <div className="overflow-x-auto" ref={gridRef}>
              <div
                className="min-w-max"
                style={{
                  display: "grid",
                  gridTemplateColumns,
                }}
              >
                {/* Header Row */}
                <div
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border)] bg-[var(--surface-1)]"
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 20,
                  }}
                >
                  {groupBy === "user" ? "Resource" : "Project"}
                </div>
                {periods.map((period) => (
                  <div
                    key={`header-${period}`}
                    className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] border-b border-l border-[var(--border)] bg-[var(--surface-1)]"
                  >
                    {formatPeriod(period, granularity)}
                  </div>
                ))}
                <div className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] border-b border-l border-[var(--border)] bg-[var(--surface-1)]">
                  Avg
                </div>

                {/* Data Rows */}
                {rows.map((row) => {
                  const isExpanded =
                    expandedCell !== null &&
                    expandedCell.rowId === row.id;
                  const expandedCellData = isExpanded
                    ? row.cells[expandedCell!.periodIdx]
                    : null;

                  return (
                    <div
                      key={row.id}
                      className="contents"
                    >
                      {/* Entity Name (sticky) */}
                      <div
                        className="px-4 py-2.5 flex items-center border-b border-[var(--border)] bg-[var(--surface-0)]"
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 10,
                        }}
                      >
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {row.label}
                        </span>
                      </div>

                      {/* Period Cells */}
                      {row.cells.map((cell, cellIdx) => {
                        const isSelected =
                          expandedCell?.rowId === row.id &&
                          expandedCell?.periodIdx === cellIdx;

                        return (
                          <div
                            key={`${row.id}-${cell.period}`}
                            className="border-b border-l border-[var(--border)] flex items-center justify-center cursor-pointer transition-all duration-150"
                            style={{
                              backgroundColor: getCellColor(
                                cell.allocationPct,
                              ),
                              outline: isSelected
                                ? "2px solid var(--primary)"
                                : "none",
                              outlineOffset: "-1px",
                            }}
                            onMouseEnter={(e) => handleCellHover(cell, e)}
                            onMouseLeave={handleCellLeave}
                            onClick={() =>
                              handleCellClick(row.id, cellIdx)
                            }
                          >
                            <span
                              className="text-xs font-semibold tabular-nums select-none"
                              style={{
                                color: getCellTextColor(cell.allocationPct),
                              }}
                            >
                              {cell.allocationPct > 0
                                ? `${cell.allocationPct}%`
                                : "-"}
                            </span>
                          </div>
                        );
                      })}

                      {/* Average Column */}
                      <div className="px-3 py-2.5 border-b border-l border-[var(--border)] flex items-center justify-center bg-[var(--surface-0)]">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                          style={{
                            backgroundColor: getLoadBgColor(row.averageLoad),
                            color: getLoadColor(row.averageLoad),
                          }}
                        >
                          {row.averageLoad}%
                        </span>
                      </div>

                      {/* Expanded Detail Panel */}
                      {isExpanded && expandedCellData && (
                        <CellDetailPanel
                          row={row}
                          cell={expandedCellData}
                          groupBy={groupBy}
                          onClose={() => setExpandedCell(null)}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Column Summary Row (team averages) */}
                <div
                  className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--surface-1)]"
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 10,
                  }}
                >
                  Team Avg
                </div>
                {columnAverages.map((avg, idx) => (
                  <div
                    key={`avg-${periods[idx]}`}
                    className="border-l border-[var(--border)] flex items-center justify-center bg-[var(--surface-1)]"
                  >
                    <span
                      className="text-[10px] font-bold tabular-nums"
                      style={{ color: getLoadColor(avg) }}
                    >
                      {avg > 0 ? `${avg}%` : "-"}
                    </span>
                  </div>
                ))}
                <div className="border-l border-[var(--border)] flex items-center justify-center bg-[var(--surface-1)]">
                  <span
                    className="text-[10px] font-bold tabular-nums"
                    style={{
                      color: getLoadColor(summary.averageUtilization),
                    }}
                  >
                    {summary.averageUtilization}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <CellTooltip
            cell={tooltip.cell}
            groupBy={groupBy}
            position={tooltip.position}
            onClose={() => setTooltip(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
