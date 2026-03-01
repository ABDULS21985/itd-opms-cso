"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { useRosters } from "@/hooks/use-people";
import type { Roster } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROSTER_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  published: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  archived: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
};

/* ------------------------------------------------------------------ */
/*  Shift Table Component                                               */
/* ------------------------------------------------------------------ */

function ShiftTable({ shifts }: { shifts: unknown[] }) {
  if (!shifts || shifts.length === 0) {
    return (
      <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
        No shifts defined for this roster.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Day / Date
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Shift
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Staff
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {shifts.map((shift, index) => {
            const s = shift as Record<string, unknown>;
            return (
              <tr key={index} className="hover:bg-[var(--surface-2)] transition-colors">
                <td className="px-3 py-2 text-xs text-[var(--text-primary)]">
                  {String(s.day ?? s.date ?? `Shift ${index + 1}`)}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--text-primary)]">
                  {String(s.shift ?? s.name ?? "--")}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                  {String(s.staff ?? s.userId ?? s.assignee ?? "--")}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--text-secondary)] tabular-nums">
                  {s.startTime && s.endTime
                    ? `${String(s.startTime)} - ${String(s.endTime)}`
                    : String(s.time ?? "--")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Roster Card Component                                               */
/* ------------------------------------------------------------------ */

function RosterCard({
  roster,
  expanded,
  onToggle,
}: {
  roster: Roster;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusStyle = STATUS_STYLES[roster.status] ?? STATUS_STYLES.draft;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left transition-colors hover:bg-[var(--surface-1)]"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
                style={{
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.text,
                }}
              >
                {roster.status === "published" ? (
                  <CheckCircle size={12} />
                ) : roster.status === "draft" ? (
                  <FileText size={12} />
                ) : (
                  <Clock size={12} />
                )}
                {roster.status}
              </span>
              {roster.teamId && (
                <span className="text-xs text-[var(--text-secondary)]">
                  Team: {roster.teamId.slice(0, 8)}...
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {roster.name}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
              {new Date(roster.periodStart).toLocaleDateString()} -{" "}
              {new Date(roster.periodEnd).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xs text-[var(--text-secondary)] tabular-nums">
              {roster.shifts?.length ?? 0} shifts
            </span>
            {expanded ? (
              <ChevronUp size={16} className="text-[var(--text-secondary)]" />
            ) : (
              <ChevronDown size={16} className="text-[var(--text-secondary)]" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Shifts */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3">
              Shift Schedule
            </h3>
            <ShiftTable shifts={roster.shifts ?? []} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RosterPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useRosters(
    page,
    20,
    undefined,
    statusFilter || undefined,
  );

  const rosters = data?.data ?? [];
  const meta = data?.meta;

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
            style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
          >
            <CalendarDays size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Team Rosters
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage shift schedules, team rosters, and staffing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Create Roster
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {ROSTER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roster Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : rosters.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <CalendarDays
              size={24}
              className="mx-auto text-[var(--text-secondary)] mb-2"
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No rosters found
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Create a roster to start managing team schedules.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rosters.map((roster) => (
              <RosterCard
                key={roster.id}
                roster={roster}
                expanded={expandedId === roster.id}
                onToggle={() =>
                  setExpandedId(
                    expandedId === roster.id ? null : roster.id,
                  )
                }
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Showing page {meta.page} of {meta.totalPages} ({meta.totalItems}{" "}
              total)
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
