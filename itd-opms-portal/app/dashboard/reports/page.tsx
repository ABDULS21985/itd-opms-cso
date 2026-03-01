"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileBarChart,
  Plus,
  Play,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  Calendar,
  Trash2,
  FileText,
} from "lucide-react";
import {
  useReportDefinitions,
  useReportRuns,
  useTriggerReportRun,
  useDeleteReportDefinition,
  useGenerateExecutivePack,
} from "@/hooks/use-reporting";
import type { ReportDefinition, ReportRun } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const REPORT_TYPES = [
  { value: "", label: "All Types" },
  { value: "executive_pack", label: "Executive Pack" },
  { value: "sla_report", label: "SLA Report" },
  { value: "pmo_report", label: "PMO Report" },
  { value: "asset_report", label: "Asset Report" },
  { value: "grc_report", label: "GRC Report" },
  { value: "custom", label: "Custom" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  executive_pack: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  sla_report: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  pmo_report: { bg: "rgba(34, 197, 94, 0.1)", text: "#22C55E" },
  asset_report: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  grc_report: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  custom: { bg: "rgba(100, 116, 139, 0.1)", text: "#64748B" },
};

function typeStyle(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS.custom;
}

function formatType(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ------------------------------------------------------------------ */
/*  Run Status Badge                                                    */
/* ------------------------------------------------------------------ */

function RunStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
    completed: { icon: CheckCircle2, color: "#22C55E", bg: "rgba(34, 197, 94, 0.1)" },
    running: { icon: Loader2, color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
    generating: { icon: Loader2, color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
    failed: { icon: XCircle, color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" },
    pending: { icon: Clock, color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      <Icon size={12} className={status === "running" || status === "generating" ? "animate-spin" : ""} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Report Runs Expandable Section                                      */
/* ------------------------------------------------------------------ */

function ReportRunsList({ definitionId }: { definitionId: string }) {
  const { data: runsData, isLoading } = useReportRuns(definitionId, 1, 5);

  const runs = useMemo(() => {
    if (!runsData) return [];
    if (Array.isArray(runsData)) return runsData as ReportRun[];
    return (runsData as { data?: ReportRun[] }).data || [];
  }, [runsData]);

  if (isLoading) {
    return (
      <div className="px-4 py-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 rounded bg-[var(--surface-2)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-[var(--text-secondary)]">No runs yet. Trigger a report run to get started.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border)" }}>
            <th className="text-left py-1.5 pr-4 font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-1.5 px-4 font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Generated
            </th>
            <th className="text-left py-1.5 px-4 font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Completed
            </th>
            <th className="text-right py-1.5 pl-4 font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Error
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
              <td className="py-2 pr-4">
                <RunStatusBadge status={run.status} />
              </td>
              <td className="py-2 px-4 text-[var(--text-secondary)]">
                {run.generatedAt ? new Date(run.generatedAt).toLocaleString() : "--"}
              </td>
              <td className="py-2 px-4 text-[var(--text-secondary)]">
                {run.completedAt ? new Date(run.completedAt).toLocaleString() : "--"}
              </td>
              <td className="py-2 pl-4 text-right text-[var(--text-secondary)] max-w-[200px] truncate">
                {run.errorMessage || "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Report Card                                                         */
/* ------------------------------------------------------------------ */

function ReportCard({
  report,
  index,
}: {
  report: ReportDefinition;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const triggerRun = useTriggerReportRun(report.id);
  const deleteReport = useDeleteReportDefinition();
  const style = typeStyle(report.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 + index * 0.04 }}
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {report.name}
              </h3>
              <span
                className="text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap"
                style={{ backgroundColor: style.bg, color: style.text }}
              >
                {formatType(report.type)}
              </span>
              <span
                className="text-xs font-medium rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: report.isActive
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(156, 163, 175, 0.1)",
                  color: report.isActive ? "#22C55E" : "#9CA3AF",
                }}
              >
                {report.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            {report.description && (
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1">
                {report.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
              {report.scheduleCron && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  Scheduled: {report.scheduleCron}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(report.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => triggerRun.mutate()}
              disabled={triggerRun.isPending}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3B82F6" }}
              title="Trigger run"
            >
              {triggerRun.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              Run
            </button>
            <button
              onClick={() => deleteReport.mutate(report.id)}
              disabled={deleteReport.isPending}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
              title="Delete report"
            >
              <Trash2 size={14} className="text-[var(--text-secondary)]" />
            </button>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
              title={expanded ? "Collapse runs" : "Expand runs"}
            >
              {expanded ? (
                <ChevronDown size={16} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronRight size={16} className="text-[var(--text-secondary)]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable runs section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="px-5 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Recent Runs
              </h4>
            </div>
            <ReportRunsList definitionId={report.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const limit = 20;
  const generateExecutivePack = useGenerateExecutivePack();

  const { data: reportsData, isLoading } = useReportDefinitions(
    page,
    limit,
    typeFilter || undefined,
  );

  const reports = useMemo(() => {
    if (!reportsData) return [];
    if (Array.isArray(reportsData)) return reportsData as ReportDefinition[];
    return (reportsData as { data?: ReportDefinition[] }).data || [];
  }, [reportsData]);

  const totalPages = useMemo(() => {
    if (!reportsData || Array.isArray(reportsData)) return 1;
    const meta = (reportsData as { meta?: { totalPages?: number } }).meta;
    return meta?.totalPages || 1;
  }, [reportsData]);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
          >
            <FileBarChart size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Reports
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage report definitions, view run history, and generate reports on demand.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions + Filter */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            style={{ backgroundColor: "var(--primary)", color: "#fff" }}
          >
            <Plus size={16} />
            Create Report
          </button>
          <button
            onClick={() => generateExecutivePack.mutate()}
            disabled={generateExecutivePack.isPending}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border transition-colors"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {generateExecutivePack.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            Generate Executive Pack
          </button>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text-secondary)]" />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-sm rounded-lg border px-3 py-1.5 bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--surface-2)] animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-col items-center justify-center py-20 rounded-xl border"
          style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
        >
          <FileBarChart size={48} className="text-[var(--text-secondary)] mb-4 opacity-40" />
          <p className="text-[var(--text-secondary)] text-sm mb-1">No report definitions found.</p>
          <p className="text-[var(--text-secondary)] text-xs">
            {typeFilter ? "Try clearing the type filter." : "Create your first report definition to get started."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, index) => (
            <ReportCard key={report.id} report={report} index={index} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex items-center justify-center gap-2 pt-4"
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            Previous
          </button>
          <span className="text-sm text-[var(--text-secondary)] tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            Next
          </button>
        </motion.div>
      )}
    </div>
  );
}
