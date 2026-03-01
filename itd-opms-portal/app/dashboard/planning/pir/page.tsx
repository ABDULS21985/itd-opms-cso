"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Plus,
  Star,
  Calendar,
  Loader2,
  Filter,
  Trash2,
  ChevronRight,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  usePIRs,
  usePIRStats,
  useCreatePIR,
  useDeletePIR,
  useProjects,
} from "@/hooks/use-planning";
import type { PIR } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const REVIEW_TYPES = [
  { value: "", label: "All Types" },
  { value: "project", label: "Project" },
  { value: "major_incident", label: "Major Incident" },
  { value: "change_request", label: "Change Request" },
];

const REVIEW_TYPE_LABELS: Record<string, string> = {
  project: "Project",
  major_incident: "Major Incident",
  change_request: "Change Request",
};

/* ------------------------------------------------------------------ */
/*  Star Rating (display only)                                         */
/* ------------------------------------------------------------------ */

function StarRating({ score }: { score?: number }) {
  if (score == null) {
    return (
      <span className="text-xs text-[var(--neutral-gray)]">--</span>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          size={14}
          className={
            v <= score
              ? "fill-amber-400 text-amber-400"
              : "text-[var(--surface-2)]"
          }
        />
      ))}
      <span className="ml-1 text-xs font-medium text-[var(--text-secondary)]">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15` }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 h-12 animate-pulse rounded-xl bg-[var(--surface-1)]"
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create PIR Dialog                                                  */
/* ------------------------------------------------------------------ */

function CreatePIRDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [reviewType, setReviewType] = useState("project");
  const [scheduledDate, setScheduledDate] = useState("");

  const { data: projectsData } = useProjects(1, 100);
  const projects = projectsData?.data ?? [];

  const createPIR = useCreatePIR();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!projectId) {
      toast.error("Please select a project");
      return;
    }

    createPIR.mutate(
      {
        title: title.trim(),
        projectId,
        reviewType,
        scheduledDate: scheduledDate || undefined,
        status: "draft",
        successes: [],
        challenges: [],
        lessonsLearned: [],
        recommendations: [],
        participants: [],
      } as Partial<PIR>,
      {
        onSuccess: () => {
          setTitle("");
          setProjectId("");
          setReviewType("project");
          setScheduledDate("");
          onClose();
        },
      },
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
          >
            <ClipboardCheck size={20} style={{ color: "#10B981" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Create Post-Implementation Review
            </h2>
            <p className="text-sm text-[var(--neutral-gray)]">
              Set up a new PIR for a completed project
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Title <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Network Upgrade PIR"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              required
            />
          </div>

          {/* Project */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Project <span className="text-[var(--error)]">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              required
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Review Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Review Type
            </label>
            <select
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="project">Project</option>
              <option value="major_incident">Major Incident</option>
              <option value="change_request">Change Request</option>
            </select>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Scheduled Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPIR.isPending}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {createPIR.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Create PIR
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PIRListPage() {
  const router = useRouter();

  useBreadcrumbs([
    { label: "Planning", href: "/dashboard/planning" },
    { label: "PIR Reviews", href: "/dashboard/planning/pir" },
  ]);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [reviewType, setReviewType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PIR | null>(null);

  const { data, isLoading } = usePIRs(
    page,
    20,
    undefined,
    status || undefined,
  );
  const { data: stats, isLoading: statsLoading } = usePIRStats();
  const deletePIR = useDeletePIR();

  const pirs = data?.data ?? [];
  const meta = data?.meta;

  // Client-side filter for review type (the API may not support it as a param)
  const filteredPirs = reviewType
    ? pirs.filter((p) => p.reviewType === reviewType)
    : pirs;

  function handleDelete() {
    if (!deleteTarget) return;
    deletePIR.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  function formatDate(dateStr?: string): string {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /* ---- Loading state ---- */

  if (isLoading && statsLoading) {
    return (
      <PermissionGate permission="planning.pir.read">
        <LoadingSkeleton />
      </PermissionGate>
    );
  }

  const totalPages = meta?.totalPages ?? 1;

  return (
    <PermissionGate permission="planning.pir.read">
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
              style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
            >
              <ClipboardCheck size={20} style={{ color: "#10B981" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Post-Implementation Reviews
              </h1>
              <p className="text-sm text-[var(--neutral-gray)]">
                Review completed projects to capture lessons learned and improve
                future outcomes
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
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New PIR
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total PIRs"
              value={stats.totalPirs}
              icon={<FileText size={20} style={{ color: "#6366F1" }} />}
              color="#6366F1"
              delay={0.05}
            />
            <StatCard
              label="Completed"
              value={stats.completedPirs}
              icon={<ClipboardCheck size={20} style={{ color: "#10B981" }} />}
              color="#10B981"
              delay={0.1}
            />
            <StatCard
              label="Pending"
              value={stats.pendingPirs}
              icon={<Calendar size={20} style={{ color: "#F59E0B" }} />}
              color="#F59E0B"
              delay={0.15}
            />
            <StatCard
              label="Avg Score"
              value={
                stats.avgScore > 0 ? stats.avgScore.toFixed(1) : "--"
              }
              icon={<Star size={20} style={{ color: "#F59E0B" }} />}
              color="#F59E0B"
              delay={0.2}
            />
          </div>
        )}

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
                <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
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
                <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                  Review Type
                </label>
                <select
                  value={reviewType}
                  onChange={(e) => {
                    setReviewType(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  {REVIEW_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2
                  size={24}
                  className="animate-spin text-[var(--primary)]"
                />
                <p className="text-sm text-[var(--neutral-gray)]">
                  Loading reviews...
                </p>
              </div>
            </div>
          ) : filteredPirs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
              >
                <ClipboardCheck size={28} style={{ color: "#10B981" }} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No reviews found
              </h3>
              <p className="mt-1 text-sm text-[var(--neutral-gray)]">
                Create your first Post-Implementation Review to start capturing
                lessons learned.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                New PIR
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Scheduled
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Facilitator
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredPirs.map((pir, idx) => (
                    <motion.tr
                      key={pir.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.03 }}
                      className="cursor-pointer transition-colors hover:bg-[var(--surface-1)]"
                      onClick={() =>
                        router.push(`/dashboard/planning/pir/${pir.id}`)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: "rgba(16, 185, 129, 0.1)",
                            }}
                          >
                            <ClipboardCheck
                              size={16}
                              style={{ color: "#10B981" }}
                            />
                          </div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {pir.title}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {pir.projectTitle || "--"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                          {REVIEW_TYPE_LABELS[pir.reviewType] ??
                            pir.reviewType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {formatDate(pir.scheduledDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={pir.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StarRating score={pir.overallScore} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {pir.facilitatorName || "--"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/dashboard/planning/pir/${pir.id}`,
                              );
                            }}
                            className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                            title="View"
                          >
                            <ChevronRight size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(pir);
                            }}
                            className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--error)]"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
              <p className="text-xs text-[var(--neutral-gray)]">
                Showing{" "}
                {Math.min((page - 1) * meta.pageSize + 1, meta.totalItems)}
                {" - "}
                {Math.min(page * meta.pageSize, meta.totalItems)} of{" "}
                {meta.totalItems} reviews
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - page) <= 1,
                  )
                  .map((p, i, arr) => {
                    const showEllipsis =
                      i > 0 && p - (arr[i - 1] ?? 0) > 1;
                    return (
                      <span key={p} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-1 text-xs text-[var(--neutral-gray)]">
                            ...
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setPage(p)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            p === page
                              ? "bg-[var(--primary)] text-white"
                              : "text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Create Dialog */}
        <AnimatePresence>
          {showCreate && (
            <CreatePIRDialog
              open={showCreate}
              onClose={() => setShowCreate(false)}
            />
          )}
        </AnimatePresence>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Post-Implementation Review"
          message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
          confirmLabel="Delete PIR"
          variant="danger"
          loading={deletePIR.isPending}
        />
      </div>
    </PermissionGate>
  );
}
