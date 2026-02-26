"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  GraduationCap,
  Loader2,
} from "lucide-react";
import {
  useTrainingRecords,
  useExpiringCertifications,
} from "@/hooks/use-people";
import type { TrainingRecord } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRAINING_TYPES = [
  { value: "", label: "All Types" },
  { value: "course", label: "Course" },
  { value: "certification", label: "Certification" },
  { value: "workshop", label: "Workshop" },
  { value: "conference", label: "Conference" },
];

const TRAINING_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "expired", label: "Expired" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  planned: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280", icon: Clock },
  in_progress: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", icon: Clock },
  completed: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", icon: CheckCircle },
  expired: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", icon: XCircle },
};

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  course: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  certification: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  workshop: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  conference: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
};

/* ------------------------------------------------------------------ */
/*  Helper: days until expiry                                          */
/* ------------------------------------------------------------------ */

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */
/*  Expiring Card Component                                             */
/* ------------------------------------------------------------------ */

function ExpiringCertCard({ record }: { record: TrainingRecord }) {
  const days = record.expiryDate ? daysUntil(record.expiryDate) : 999;
  const urgencyColor =
    days <= 30 ? "#EF4444" : days <= 60 ? "#F59E0B" : "#3B82F6";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border p-4"
      style={{
        borderColor: urgencyColor,
        backgroundColor: `${urgencyColor}08`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {record.title}
          </p>
          {record.provider && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {record.provider}
            </p>
          )}
        </div>
        <AlertTriangle size={16} style={{ color: urgencyColor }} />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-xs text-[var(--text-secondary)] tabular-nums">
          Expires: {record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : "--"}
        </span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
          style={{ backgroundColor: `${urgencyColor}15`, color: urgencyColor }}
        >
          {days} days
        </span>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-1">
        User: {record.userId.slice(0, 8)}...
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TrainingPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useTrainingRecords(
    page,
    20,
    undefined,
    typeFilter || undefined,
    statusFilter || undefined,
  );
  const { data: expiringCerts, isLoading: expiringLoading } =
    useExpiringCertifications(90);

  const records = data?.data ?? [];
  const meta = data?.meta;
  const expiring = expiringCerts ?? [];

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
            style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}
          >
            <BookOpen size={20} style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Training Records
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Track training, certifications, and professional development
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
            Log Training
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
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {TRAINING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
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
                {TRAINING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expiring Certifications Section */}
      {expiring.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: "#F59E0B" }} />
            Expiring Certifications (90 days)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringLoading ? (
              <div className="col-span-full flex items-center justify-center py-6">
                <Loader2
                  size={16}
                  className="animate-spin text-[var(--primary)]"
                />
              </div>
            ) : (
              expiring.map((cert) => (
                <ExpiringCertCard key={cert.id} record={cert} />
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Training Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <GraduationCap
              size={24}
              className="mx-auto text-[var(--text-secondary)] mb-2"
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No training records found
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Log your first training to start tracking development.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Type
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Expiry
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {records.map((record) => {
                    const statusStyle =
                      STATUS_STYLES[record.status] ?? STATUS_STYLES.planned;
                    const StatusIcon = statusStyle.icon;
                    const typeStyle =
                      TYPE_STYLES[record.type] ?? {
                        bg: "var(--surface-2)",
                        text: "var(--text-secondary)",
                      };

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-[var(--surface-1)] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--text-primary)]">
                            {record.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {record.userId.slice(0, 8)}...
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {record.provider || "--"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                            style={{
                              backgroundColor: typeStyle.bg,
                              color: typeStyle.text,
                            }}
                          >
                            {record.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
                            style={{
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text,
                            }}
                          >
                            <StatusIcon size={12} />
                            {record.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-[var(--text-secondary)]">
                          {record.completedAt
                            ? new Date(record.completedAt).toLocaleDateString()
                            : "--"}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-[var(--text-secondary)]">
                          {record.expiryDate
                            ? new Date(record.expiryDate).toLocaleDateString()
                            : "--"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums text-[var(--text-primary)]">
                          {record.cost != null
                            ? `$${record.cost.toLocaleString()}`
                            : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
