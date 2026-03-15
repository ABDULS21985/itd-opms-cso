"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Filter,
  Calendar,
  User,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useGRCAudits } from "@/hooks/use-grc";
import type { GRCAudit } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "planned", label: "Planned" },
  { value: "preparing", label: "Preparing" },
  { value: "in_progress", label: "In Progress" },
  { value: "findings_review", label: "Findings Review" },
  { value: "completed", label: "Completed" },
];

const AUDIT_TYPES = [
  { value: "", label: "All Types" },
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
  { value: "regulatory", label: "Regulatory" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getReadinessColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

function getTypeBadgeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case "internal":
      return { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" };
    case "external":
      return { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" };
    case "regulatory":
      return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" };
    default:
      return { bg: "var(--surface-2)", text: "var(--text-secondary)" };
  }
}

/* ------------------------------------------------------------------ */
/*  Audit Card                                                         */
/* ------------------------------------------------------------------ */

function AuditCard({
  audit,
  onClick,
}: {
  audit: GRCAudit;
  onClick: () => void;
}) {
  const typeColor = getTypeBadgeColor(audit.auditType);
  const readinessColor = getReadinessColor(audit.readinessScore);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-all duration-200 hover:shadow-md hover:border-[var(--primary)]/30"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {audit.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
              style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
            >
              {audit.auditType}
            </span>
            <StatusBadge status={audit.status} />
          </div>
        </div>
      </div>

      {audit.scope && (
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
          {audit.scope}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-3">
        {audit.auditor && (
          <span className="flex items-center gap-1">
            <User size={12} />
            {audit.auditor}
          </span>
        )}
        {audit.scheduledStart && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {formatDate(audit.scheduledStart)}
            {audit.scheduledEnd && ` - ${formatDate(audit.scheduledEnd)}`}
          </span>
        )}
      </div>

      {/* Readiness Score */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--text-secondary)]">
            Readiness Score
          </span>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: readinessColor }}
          >
            {audit.readinessScore}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(audit.readinessScore, 100)}%`,
              backgroundColor: readinessColor,
            }}
          />
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GRCAuditsPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [auditType, setAuditType] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useGRCAudits(
    page,
    20,
    status || undefined,
    auditType || undefined,
  );

  const audits = data?.data ?? [];
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.1)]">
            <ClipboardList size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Audit Tracker
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Schedule, track, and manage audit activities
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
            onClick={() => router.push("/dashboard/grc/audits?action=new")}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Schedule Audit
          </button>
        </div>
      </motion.div>

      {/* Filters */}
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
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Type
            </label>
            <select
              value={auditType}
              onChange={(e) => {
                setAuditType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {AUDIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Audit Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-[var(--surface-1)] animate-pulse"
              />
            ))}
          </div>
        ) : audits.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
            <ClipboardList
              size={40}
              className="mx-auto text-[var(--text-secondary)] mb-3"
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              No audits found
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Schedule your first audit to begin tracking.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/grc/audits?action=new")
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              Schedule Audit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audits.map((audit) => (
              <AuditCard
                key={audit.id}
                audit={audit}
                onClick={() =>
                  router.push(`/dashboard/grc/audits/${audit.id}`)
                }
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-secondary)]">
            Showing {audits.length} of {meta.totalItems} audits
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-[var(--text-secondary)] tabular-nums">
              {page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
