"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { SparkLine } from "@/components/dashboard/charts/spark-line";
import { ProgressRing } from "@/components/dashboard/charts/progress-ring";
import {
  generateSyntheticTrend,
  formatCurrency,
} from "@/lib/division-constants";
import {
  exportToCSV,
  exportToExcel,
  type ExportColumn,
} from "@/lib/export-utils";
import type { OfficeMetrics } from "@/lib/division-constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ComparisonTableTabProps {
  metrics: OfficeMetrics[];
  isLoading: boolean;
}

type SortKey =
  | "name"
  | "totalProjects"
  | "activeProjects"
  | "onTimePct"
  | "ragRed"
  | "overdueWorkItems"
  | "totalWorkItems"
  | "openRisks"
  | "onTimePct2"
  | "staffCount"
  | "budgetUtilization"
  | "capacity"
  | "healthScore";

type SortDir = "asc" | "desc";

/* ------------------------------------------------------------------ */
/*  Column definitions                                                 */
/* ------------------------------------------------------------------ */

const COLUMNS: {
  key: SortKey;
  label: string;
  sortable: boolean;
  width?: string;
  isPct?: boolean;
}[] = [
  { key: "name", label: "Division", sortable: true, width: "w-40" },
  { key: "totalProjects", label: "Projects", sortable: true },
  { key: "activeProjects", label: "Active", sortable: true },
  { key: "onTimePct", label: "On-Track", sortable: true, isPct: true },
  { key: "ragRed", label: "At-Risk", sortable: true },
  { key: "overdueWorkItems", label: "Overdue", sortable: true },
  { key: "totalWorkItems", label: "Tickets", sortable: true },
  { key: "openRisks", label: "Open", sortable: true },
  { key: "onTimePct2", label: "SLA %", sortable: true, isPct: true },
  { key: "staffCount", label: "Assets", sortable: true },
  {
    key: "budgetUtilization",
    label: "Budget Util",
    sortable: true,
    isPct: true,
  },
  { key: "capacity", label: "Capacity", sortable: false },
  { key: "healthScore", label: "Score", sortable: true },
];

/* ------------------------------------------------------------------ */
/*  Export column definitions                                           */
/* ------------------------------------------------------------------ */

const exportColumns: ExportColumn[] = [
  { key: "name", header: "Division" },
  { key: "totalProjects", header: "Projects" },
  { key: "activeProjects", header: "Active" },
  { key: "onTimePct", header: "On-Track %" },
  { key: "ragRed", header: "At-Risk" },
  { key: "overdueWorkItems", header: "Overdue" },
  { key: "totalWorkItems", header: "Tickets" },
  { key: "openRisks", header: "Open Risks" },
  { key: "budgetUtilization", header: "Budget Util %" },
  { key: "staffCount", header: "Staff" },
  { key: "healthScore", header: "Health Score" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pctColor(value: number): string {
  if (value >= 75) return "#22C55E";
  if (value >= 50) return "#F59E0B";
  return "#EF4444";
}

function getCapacity(m: OfficeMetrics): number {
  return m.staffCount > 0
    ? Math.round(
        (1 - m.overdueWorkItems / Math.max(m.totalWorkItems, 1)) * 100,
      )
    : 0;
}

function getSortValue(m: OfficeMetrics, key: SortKey): number | string {
  switch (key) {
    case "name":
      return m.name.toLowerCase();
    case "onTimePct2":
      return m.onTimePct;
    case "capacity":
      return getCapacity(m);
    default:
      return m[key as keyof OfficeMetrics] as number;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ComparisonTableTab({
  metrics,
  isLoading,
}: ComparisonTableTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>("healthScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  /* ---- Sort handler ---- */
  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey],
  );

  /* ---- Sorted data ---- */
  const sorted = useMemo(() => {
    const copy = [...metrics];
    copy.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      const diff = (av as number) - (bv as number);
      return sortDir === "asc" ? diff : -diff;
    });
    return copy;
  }, [metrics, sortKey, sortDir]);

  /* ---- Expand / collapse ---- */
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* ---- Export handlers ---- */
  const handleCSV = useCallback(() => {
    exportToCSV(metrics, exportColumns, "division-comparison");
  }, [metrics]);

  const handleExcel = useCallback(() => {
    exportToExcel(metrics, exportColumns, "division-comparison");
  }, [metrics]);

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg animate-pulse"
              style={{ background: "var(--surface-1)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (metrics.length === 0) {
    return (
      <div
        className="rounded-xl border overflow-hidden flex items-center justify-center py-16"
        style={{
          background: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <p className="text-sm text-[var(--text-muted)]">
          No division data available
        </p>
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-3">
      {/* Export buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <Download size={13} />
          Download CSV
        </button>
        <button
          onClick={handleExcel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <FileSpreadsheet size={13} />
          Download Excel
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            {/* ---- Header ---- */}
            <thead className="sticky top-0 z-10">
              <tr style={{ background: "var(--surface-1)" }}>
                {/* Expand chevron spacer */}
                <th className="w-6 px-1" />
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 text-left ${col.width ?? ""}`}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ArrowUp size={11} />
                          ) : (
                            <ArrowDown size={11} />
                          )
                        ) : (
                          <ArrowUpDown size={11} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {col.label}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ---- Body ---- */}
            <tbody>
              {sorted.map((m) => {
                const isExpanded = expandedIds.has(m.id);
                const capacity = getCapacity(m);

                return (
                  <RowGroup
                    key={m.id}
                    m={m}
                    isExpanded={isExpanded}
                    capacity={capacity}
                    onToggle={() => toggleExpanded(m.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row group (main row + expanded detail)                             */
/* ------------------------------------------------------------------ */

function RowGroup({
  m,
  isExpanded,
  capacity,
  onToggle,
}: {
  m: OfficeMetrics;
  isExpanded: boolean;
  capacity: number;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Main row */}
      <tr
        onClick={onToggle}
        className="hover:bg-[var(--surface-1)] cursor-pointer transition-colors"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {/* Chevron */}
        <td className="w-6 px-1 text-center text-[var(--text-muted)]">
          {isExpanded ? (
            <ChevronDown size={13} />
          ) : (
            <ChevronRight size={13} />
          )}
        </td>

        {/* Division */}
        <td className="px-3 py-2.5 w-40">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: m.color }}
            />
            <div className="min-w-0">
              <span className="font-bold text-[var(--text-primary)] block truncate">
                {m.code}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block truncate">
                {m.name}
              </span>
            </div>
          </div>
        </td>

        {/* Projects */}
        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]">
          <div className="flex items-center justify-end gap-1.5">
            <span>{m.totalProjects}</span>
            <SparkLine
              data={generateSyntheticTrend(m.totalProjects)}
              color={m.color}
              width={48}
              height={20}
            />
          </div>
        </td>

        {/* Active */}
        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]">
          <div className="flex items-center justify-end gap-1.5">
            <span>{m.activeProjects}</span>
            <SparkLine
              data={generateSyntheticTrend(m.activeProjects)}
              color={m.color}
              width={48}
              height={20}
            />
          </div>
        </td>

        {/* On-Track (%) */}
        <td className="px-3 py-2.5 text-right tabular-nums">
          <div className="flex items-center justify-end gap-1.5">
            <span style={{ color: pctColor(m.onTimePct) }}>
              {m.onTimePct}%
            </span>
            <SparkLine
              data={generateSyntheticTrend(m.onTimePct)}
              color={m.color}
              width={48}
              height={20}
            />
          </div>
        </td>

        {/* At-Risk */}
        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]">
          {m.ragRed}
        </td>

        {/* Overdue */}
        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]">
          {m.overdueWorkItems}
        </td>

        {/* Tickets */}
        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]">
          {m.totalWorkItems}
        </td>

        {/* Open Risks */}
        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]">
          {m.openRisks}
        </td>

        {/* SLA % */}
        <td className="px-3 py-2.5 text-right tabular-nums">
          <span style={{ color: pctColor(m.onTimePct) }}>
            {m.onTimePct}%
          </span>
        </td>

        {/* Assets (Staff) */}
        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]">
          {m.staffCount}
        </td>

        {/* Budget Util */}
        <td className="px-3 py-2.5 text-right tabular-nums">
          <span style={{ color: pctColor(m.budgetUtilization) }}>
            {m.budgetUtilization}%
          </span>
        </td>

        {/* Capacity bar */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 rounded-full flex-1"
              style={{ background: "var(--surface-2)", minWidth: 40 }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(capacity, 100)}%`,
                  backgroundColor: pctColor(capacity),
                }}
              />
            </div>
            <span
              className="text-[10px] tabular-nums w-7 text-right"
              style={{ color: pctColor(capacity) }}
            >
              {capacity}%
            </span>
          </div>
        </td>

        {/* Health Score */}
        <td className="px-3 py-2.5">
          <div className="flex justify-center">
            <ProgressRing
              value={m.healthScore}
              size={32}
              strokeWidth={3}
              color={m.color}
              delay={0}
              fontSize={9}
            />
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr>
          <td colSpan={COLUMNS.length + 1}>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <ExpandedContent m={m} />
            </motion.div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Expanded content                                                   */
/* ------------------------------------------------------------------ */

function ExpandedContent({ m }: { m: OfficeMetrics }) {
  const budgetPct =
    m.budgetApproved > 0
      ? Math.round((m.budgetSpent / m.budgetApproved) * 100)
      : 0;

  return (
    <div
      className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6"
      style={{ background: "var(--surface-1)" }}
    >
      {/* RAG Breakdown */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          RAG Breakdown
        </h4>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22C55E" }}
          >
            Green: {m.ragGreen}
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              backgroundColor: "rgba(245,158,11,0.15)",
              color: "#F59E0B",
            }}
          >
            Amber: {m.ragAmber}
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              backgroundColor: "rgba(239,68,68,0.15)",
              color: "#EF4444",
            }}
          >
            Red: {m.ragRed}
          </span>
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Budget
        </h4>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-secondary)]">Approved</span>
            <span className="font-medium tabular-nums text-[var(--text-primary)]">
              {formatCurrency(m.budgetApproved)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-secondary)]">Spent</span>
            <span className="font-medium tabular-nums text-[var(--text-primary)]">
              {formatCurrency(m.budgetSpent)}
            </span>
          </div>
          <div
            className="h-2 rounded-full"
            style={{ background: "var(--surface-2)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(budgetPct, 100)}%`,
                backgroundColor: pctColor(
                  budgetPct > 100 ? 100 - (budgetPct - 100) : budgetPct,
                ),
              }}
            />
          </div>
          <span
            className="text-[10px] tabular-nums"
            style={{ color: pctColor(m.budgetUtilization) }}
          >
            {budgetPct}% utilized
          </span>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Status Breakdown
        </h4>
        <div className="space-y-1">
          {Object.entries(m.statusBreakdown).map(([status, count]) => (
            <div key={status} className="flex justify-between text-[11px]">
              <span className="text-[var(--text-secondary)] capitalize">
                {status.replace(/-/g, " ")}
              </span>
              <span className="font-medium tabular-nums text-[var(--text-primary)]">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Completion */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Avg Completion
        </h4>
        <div className="flex justify-center">
          <ProgressRing
            value={m.avgCompletion}
            size={56}
            strokeWidth={5}
            color={m.color}
            delay={0}
            fontSize={13}
          />
        </div>
      </div>
    </div>
  );
}
