"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
  Filter,
} from "lucide-react";
import {
  useMyPendingApprovals,
  useMyPendingApprovalCount,
  useApproveStep,
  useRejectStep,
} from "@/hooks/use-approvals";
import type { PendingApprovalItem } from "@/hooks/use-approvals";
import { DataTable } from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";

/* ------------------------------------------------------------------ */
/*  Reject Comment Modal                                                */
/* ------------------------------------------------------------------ */

function RejectCommentModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (comments: string) => void;
  loading: boolean;
}) {
  const [comments, setComments] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comments.trim()) return;
    onConfirm(comments.trim());
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-40"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--error-light)]">
          <AlertTriangle className="h-6 w-6 text-[var(--error)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Reject Approval
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Please provide a reason for rejecting this approval step.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="reject-reason"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Reason <span className="text-[var(--error)]">*</span>
            </label>
            <textarea
              id="reject-reason"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter your reason for rejecting..."
              rows={4}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !comments.trim()}
              className="flex items-center gap-2 rounded-lg bg-[var(--error)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--error-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--error)]/20 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rejecting...
                </span>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Reject
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Card                                                        */
/* ------------------------------------------------------------------ */

function SummaryCard({
  title,
  count,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string;
  count: number;
  icon: typeof Clock;
  color: string;
  bgColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--neutral-gray)]">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            {count}
          </p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Urgency Badge                                                       */
/* ------------------------------------------------------------------ */

function UrgencyBadge({ urgency }: { urgency: string }) {
  const variants: Record<
    string,
    { bg: string; text: string; dot: string }
  > = {
    critical: {
      bg: "bg-[var(--error-light)]",
      text: "text-[var(--error-dark)]",
      dot: "bg-[var(--error)]",
    },
    high: {
      bg: "bg-[var(--warning-light)]",
      text: "text-[var(--warning-dark)]",
      dot: "bg-[var(--warning)]",
    },
    normal: {
      bg: "bg-[var(--info-light)]",
      text: "text-[var(--info-dark)]",
      dot: "bg-[var(--info)]",
    },
    low: {
      bg: "bg-[var(--surface-2)]",
      text: "text-[var(--neutral-gray)]",
      dot: "bg-[var(--neutral-gray)]",
    },
  };

  const v = variants[urgency] || variants.normal;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${v.bg} ${v.text} border-transparent`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${v.dot} ${urgency === "critical" ? "animate-pulse" : ""}`}
        aria-hidden="true"
      />
      {urgency}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ApprovalsPage() {
  const [page, setPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const { data: pendingData, isLoading } = useMyPendingApprovals(page, 20);
  const { data: countData } = useMyPendingApprovalCount();

  const approveMutation = useApproveStep();
  const rejectMutation = useRejectStep();

  // Extract items and meta from paginated response.
  const rawItems: PendingApprovalItem[] = Array.isArray(pendingData)
    ? pendingData
    : (pendingData as { data?: PendingApprovalItem[] })?.data ?? [];

  const meta = !Array.isArray(pendingData)
    ? (
        pendingData as {
          meta?: {
            page: number;
            totalPages: number;
            totalItems: number;
            pageSize: number;
          };
        }
      )?.meta
    : undefined;

  // Apply client-side filters.
  const filteredItems = rawItems.filter((item) => {
    if (entityTypeFilter && item.entityType !== entityTypeFilter) return false;
    if (urgencyFilter && item.urgency !== urgencyFilter) return false;
    return true;
  });

  const pendingCount = countData?.count ?? 0;
  const overdueCount = filteredItems.filter(
    (item) => item.deadline && new Date(item.deadline) < new Date(),
  ).length;

  // Get unique entity types for the filter dropdown.
  const entityTypes = Array.from(new Set(rawItems.map((i) => i.entityType)));

  const handleApprove = useCallback(
    (stepId: string) => {
      approveMutation.mutate({ stepId });
    },
    [approveMutation],
  );

  const handleRejectConfirm = useCallback(
    (comments: string) => {
      if (!rejectTarget) return;
      rejectMutation.mutate(
        { stepId: rejectTarget, comments },
        {
          onSuccess: () => setRejectTarget(null),
        },
      );
    },
    [rejectTarget, rejectMutation],
  );

  // Table columns.
  const columns: Column<PendingApprovalItem>[] = [
    {
      key: "entityType",
      header: "Entity Type",
      render: (item) => (
        <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
          {item.entityType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (item) => (
        <span className="text-sm text-[var(--text-primary)]">
          {item.entityType} - {item.entityId.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "requestedBy",
      header: "Requested By",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.requestedBy}
        </span>
      ),
    },
    {
      key: "step",
      header: "Step",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.stepName}
        </span>
      ),
    },
    {
      key: "urgency",
      header: "Urgency",
      render: (item) => <UrgencyBadge urgency={item.urgency} />,
    },
    {
      key: "deadline",
      header: "Deadline",
      render: (item) => {
        if (!item.deadline) {
          return (
            <span className="text-sm text-[var(--neutral-gray)]">--</span>
          );
        }
        const d = new Date(item.deadline);
        const isOverdue = d < new Date();
        return (
          <span
            className={`text-sm ${isOverdue ? "text-[var(--error)] font-medium" : "text-[var(--text-secondary)]"}`}
          >
            {d.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleApprove(item.stepId);
            }}
            disabled={approveMutation.isPending}
            className="flex items-center gap-1 rounded-lg bg-[var(--success)] px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {approveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle className="h-3 w-3" />
            )}
            Approve
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRejectTarget(item.stepId);
            }}
            disabled={rejectMutation.isPending}
            className="flex items-center gap-1 rounded-lg bg-[var(--error)] px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <XCircle className="h-3 w-3" />
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <PermissionGate permission="approval.view">
      <div className="space-y-6 pb-8">
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
              style={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
            >
              <ClipboardCheck size={20} style={{ color: "#6366F1" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                My Approvals
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Review and process your pending approval requests
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Pending Approvals"
            count={pendingCount}
            icon={Clock}
            color="#F59E0B"
            bgColor="rgba(245, 158, 11, 0.1)"
          />
          <SummaryCard
            title="Approved Today"
            count={0}
            icon={CheckCircle}
            color="#10B981"
            bgColor="rgba(16, 185, 129, 0.1)"
          />
          <SummaryCard
            title="Overdue"
            count={overdueCount}
            icon={AlertTriangle}
            color="#EF4444"
            bgColor="rgba(239, 68, 68, 0.1)"
          />
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--neutral-gray)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Filters:
            </span>
          </div>

          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">All Entity Types</option>
            {entityTypes.map((et) => (
              <option key={et} value={et}>
                {et.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">All Urgencies</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {(entityTypeFilter || urgencyFilter) && (
            <button
              type="button"
              onClick={() => {
                setEntityTypeFilter("");
                setUrgencyFilter("");
              }}
              className="flex items-center gap-1 text-sm text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </motion.div>

        {/* Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <DataTable
            columns={columns}
            data={filteredItems}
            keyExtractor={(item) => item.stepId}
            loading={isLoading}
            emptyTitle="No pending approvals"
            emptyDescription="You have no approval requests awaiting your review."
            pagination={
              meta
                ? {
                    currentPage: meta.page,
                    totalPages: meta.totalPages,
                    totalItems: meta.totalItems,
                    pageSize: meta.pageSize,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        </motion.div>

        {/* Reject Modal */}
        <AnimatePresence>
          {rejectTarget && (
            <RejectCommentModal
              open={!!rejectTarget}
              onClose={() => setRejectTarget(null)}
              onConfirm={handleRejectConfirm}
              loading={rejectMutation.isPending}
            />
          )}
        </AnimatePresence>
      </div>
    </PermissionGate>
  );
}
