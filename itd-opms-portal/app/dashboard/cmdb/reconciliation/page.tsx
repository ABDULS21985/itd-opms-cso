"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Database,
  Clock,
} from "lucide-react";
import {
  useReconciliationRuns,
  useCreateReconciliationRun,
} from "@/hooks/use-cmdb";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(start: string, end?: string): string {
  if (!end) return "In progress...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${minutes}m ${remainingSecs}s`;
}

/* ------------------------------------------------------------------ */
/*  Report Viewer Component                                            */
/* ------------------------------------------------------------------ */

function ReportViewer({ report }: { report: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {Object.entries(report).map(([key, value]) => (
        <div key={key} className="rounded-lg bg-[var(--surface-1)] p-3">
          <p className="text-xs font-semibold text-[var(--text-primary)] capitalize mb-1">
            {key.replace(/_/g, " ")}
          </p>
          {typeof value === "object" && value !== null ? (
            <pre className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap overflow-auto max-h-40">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">{String(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReconciliationPage() {
  const [page, setPage] = useState(1);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [triggerSource, _setTriggerSource] = useState("manual");

  const { data, isLoading } = useReconciliationRuns(page, 20);
  const createRun = useCreateReconciliationRun();

  const runs = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Stats ---- */
  const totalRuns = runs.length;
  const avgDiscrepancyRate =
    totalRuns > 0
      ? (
          runs.reduce((sum, r) => {
            const total = r.matches + r.discrepancies + r.newItems;
            return sum + (total > 0 ? r.discrepancies / total : 0);
          }, 0) /
          totalRuns *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(14, 165, 233, 0.1)" }}
          >
            <RefreshCw size={20} style={{ color: "#0EA5E9" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Reconciliation
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              View discovery reconciliation runs and review discrepancies
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={createRun.isPending}
          onClick={() => createRun.mutate({ source: triggerSource })}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {createRun.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Trigger Reconciliation
        </button>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Total Runs
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {meta?.totalItems ?? totalRuns}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Avg Discrepancy Rate
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#F59E0B" }}>
            {avgDiscrepancyRate}%
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Latest Run
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {runs[0]
              ? new Date(runs[0].startedAt).toLocaleString()
              : "No runs yet"}
          </p>
        </div>
      </motion.div>

      {/* Runs List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <RefreshCw size={24} className="mx-auto text-[var(--text-secondary)] mb-2" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No reconciliation runs yet
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Trigger a reconciliation run to compare discovery data with CMDB records.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const isExpanded = expandedRunId === run.id;
              const isComplete = !!run.completedAt;
              const total = run.matches + run.discrepancies + run.newItems;
              const discrepancyPct =
                total > 0
                  ? ((run.discrepancies / total) * 100).toFixed(1)
                  : "0.0";

              return (
                <div
                  key={run.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                    className="w-full text-left p-4 flex items-center justify-between transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                        style={{
                          backgroundColor: isComplete
                            ? "rgba(16, 185, 129, 0.1)"
                            : "rgba(245, 158, 11, 0.1)",
                        }}
                      >
                        {isComplete ? (
                          <CheckCircle size={18} style={{ color: "#10B981" }} />
                        ) : (
                          <Clock size={18} style={{ color: "#F59E0B" }} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {run.source}
                          </p>
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: isComplete
                                ? "rgba(16, 185, 129, 0.1)"
                                : "rgba(245, 158, 11, 0.1)",
                              color: isComplete ? "#10B981" : "#F59E0B",
                            }}
                          >
                            {isComplete ? "Completed" : "In Progress"}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-0.5">
                          Started: {new Date(run.startedAt).toLocaleString()}
                          {run.completedAt &&
                            ` | Duration: ${formatDuration(run.startedAt, run.completedAt)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <p className="font-bold tabular-nums" style={{ color: "#10B981" }}>
                            {run.matches}
                          </p>
                          <p className="text-[var(--text-secondary)]">Matches</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold tabular-nums" style={{ color: "#F59E0B" }}>
                            {run.discrepancies}
                          </p>
                          <p className="text-[var(--text-secondary)]">Discrepancies</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold tabular-nums" style={{ color: "#3B82F6" }}>
                            {run.newItems}
                          </p>
                          <p className="text-[var(--text-secondary)]">New Items</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-[var(--text-secondary)]" />
                      ) : (
                        <ChevronDown size={16} className="text-[var(--text-secondary)]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-[var(--border)] p-4 bg-[var(--surface-1)]"
                    >
                      {/* Mobile stats */}
                      <div className="sm:hidden grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center rounded-lg bg-[var(--surface-0)] p-2">
                          <p className="text-sm font-bold tabular-nums" style={{ color: "#10B981" }}>
                            {run.matches}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)]">Matches</p>
                        </div>
                        <div className="text-center rounded-lg bg-[var(--surface-0)] p-2">
                          <p className="text-sm font-bold tabular-nums" style={{ color: "#F59E0B" }}>
                            {run.discrepancies}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)]">Discrepancies</p>
                        </div>
                        <div className="text-center rounded-lg bg-[var(--surface-0)] p-2">
                          <p className="text-sm font-bold tabular-nums" style={{ color: "#3B82F6" }}>
                            {run.newItems}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)]">New Items</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Database size={14} className="text-[var(--text-secondary)]" />
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          Discrepancy Rate: {discrepancyPct}%
                        </p>
                      </div>

                      {run.report && Object.keys(run.report).length > 0 ? (
                        <>
                          <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                            Detailed Report
                          </h3>
                          <ReportViewer report={run.report} />
                        </>
                      ) : (
                        <p className="text-xs text-[var(--text-secondary)] text-center py-4">
                          No detailed report data available for this run.
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Showing page {meta.page} of {meta.totalPages} ({meta.totalItems} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
