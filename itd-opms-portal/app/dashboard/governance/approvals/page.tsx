"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  History,
  Sparkles,
  Target,
  X,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  useMyPendingApprovals,
  useMyPendingApprovalCount,
  useApproveStep,
  useRejectStep,
  useApprovalHistory,
} from "@/hooks/use-approvals";
import type {
  PendingApprovalItem,
  ApprovalHistoryItem,
} from "@/hooks/use-approvals";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";

type WorkspaceTab = "pending" | "history";

const URGENCY_OPTIONS = [
  { value: "", label: "All Urgencies" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
] as const;

function formatEntityType(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatApprovalDate(value?: string | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getUrgencyWeight(urgency: string) {
  switch (urgency) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "normal":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function isDeadlineOverdue(deadline?: string | null) {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

function LoadingValue({ width = "w-14" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function MetricCard({
  label,
  value,
  helper,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  helper: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: `${color}1f`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${color}14, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color }}>
        {loading ? <LoadingValue /> : value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const variants: Record<string, { bg: string; text: string; dot: string }> = {
    critical: {
      bg: "rgba(239, 68, 68, 0.1)",
      text: "#EF4444",
      dot: "#EF4444",
    },
    high: {
      bg: "rgba(245, 158, 11, 0.1)",
      text: "#F59E0B",
      dot: "#F59E0B",
    },
    normal: {
      bg: "rgba(59, 130, 246, 0.1)",
      text: "#3B82F6",
      dot: "#3B82F6",
    },
    low: {
      bg: "rgba(107, 114, 128, 0.1)",
      text: "#6B7280",
      dot: "#6B7280",
    },
  };

  const tone = variants[urgency] ?? variants.normal;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
      style={{ backgroundColor: tone.bg, color: tone.text }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          urgency === "critical" ? "animate-pulse" : ""
        }`}
        style={{ backgroundColor: tone.dot }}
      />
      {urgency}
    </span>
  );
}

function HistoryStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; text: string }> = {
    approved: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
    rejected: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
    cancelled: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
    pending: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
    in_progress: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  };

  const tone = variants[status] ?? variants.pending;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
      style={{ backgroundColor: tone.bg, color: tone.text }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function getDecisionPulse(
  pendingCount: number,
  overdueCount: number,
  rejectedCount: number,
) {
  if (pendingCount === 0 && overdueCount === 0) {
    return {
      label: "Queue under control",
      badgeClass:
        "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      description:
        "Nothing urgent is waiting in the approval queue, so decision pressure is currently manageable.",
    };
  }

  if (overdueCount >= 3 || pendingCount >= 8) {
    return {
      label: "Needs intervention",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "The queue is carrying enough overdue or unresolved work that approvals need deliberate intervention rather than passive monitoring.",
    };
  }

  if (overdueCount > 0 || rejectedCount > 0) {
    return {
      label: "Watch closely",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "The approval program is moving, but overdue or rejected decisions are starting to create friction in the workflow.",
    };
  }

  return {
    label: "Steady throughput",
    badgeClass:
      "border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    description:
      "Approvals are flowing through the queue without meaningful delay, giving the decision system a stable cadence.",
  };
}

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

  useEffect(() => {
    if (!open) setComments("");
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(239,68,68,0.1)]">
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
              onChange={(event) => setComments(event.target.value)}
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
              className="flex items-center gap-2 rounded-lg bg-[var(--error)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--error)]/20 disabled:opacity-60"
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

export default function ApprovalsPage() {
  useBreadcrumbs([
    { label: "Governance", href: "/dashboard/governance" },
    { label: "Approvals", href: "/dashboard/governance/approvals" },
  ]);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("pending");
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [historyEntityTypeFilter, setHistoryEntityTypeFilter] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const { data: pendingData, isLoading: pendingLoading } =
    useMyPendingApprovals(pendingPage, 20);
  const { data: countData } = useMyPendingApprovalCount();
  const { data: historyData, isLoading: historyLoading } = useApprovalHistory(
    { entityType: historyEntityTypeFilter || undefined },
    historyPage,
    20,
  );

  const approveMutation = useApproveStep();
  const rejectMutation = useRejectStep();

  const rawPending: PendingApprovalItem[] = Array.isArray(pendingData)
    ? pendingData
    : ((pendingData as { data?: PendingApprovalItem[] })?.data ?? []);

  const pendingMeta = !Array.isArray(pendingData)
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

  const historyItems: ApprovalHistoryItem[] = Array.isArray(historyData)
    ? historyData
    : ((historyData as { data?: ApprovalHistoryItem[] })?.data ?? []);

  const historyMeta = !Array.isArray(historyData)
    ? (
        historyData as {
          meta?: {
            page: number;
            totalPages: number;
            totalItems: number;
            pageSize: number;
          };
        }
      )?.meta
    : undefined;

  const filteredPending = useMemo(
    () =>
      rawPending.filter((item) => {
        if (entityTypeFilter && item.entityType !== entityTypeFilter)
          return false;
        if (urgencyFilter && item.urgency !== urgencyFilter) return false;
        return true;
      }),
    [entityTypeFilter, rawPending, urgencyFilter],
  );

  const entityTypes = useMemo(
    () => Array.from(new Set(rawPending.map((item) => item.entityType))),
    [rawPending],
  );

  const historyEntityTypes = useMemo(
    () => Array.from(new Set(historyItems.map((item) => item.entityType))),
    [historyItems],
  );

  const pendingCount = countData?.count ?? rawPending.length;
  const overdueCount = filteredPending.filter((item) =>
    isDeadlineOverdue(item.deadline),
  ).length;
  const criticalCount = filteredPending.filter(
    (item) => item.urgency === "critical",
  ).length;
  const dueSoonCount = filteredPending.filter((item) => {
    if (!item.deadline) return false;
    const diff = new Date(item.deadline).getTime() - Date.now();
    const diffDays = diff / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  }).length;

  const historySummary = useMemo(() => {
    const approved = historyItems.filter(
      (item) => item.status === "approved",
    ).length;
    const rejected = historyItems.filter(
      (item) => item.status === "rejected",
    ).length;
    const cancelled = historyItems.filter(
      (item) => item.status === "cancelled",
    ).length;
    const inProgress = historyItems.filter(
      (item) => item.status === "pending" || item.status === "in_progress",
    ).length;

    return {
      approved,
      rejected,
      cancelled,
      inProgress,
    };
  }, [historyItems]);

  const queueSpotlight = useMemo(
    () =>
      [...filteredPending]
        .sort((a, b) => {
          const overdueDiff =
            Number(isDeadlineOverdue(b.deadline)) -
            Number(isDeadlineOverdue(a.deadline));
          if (overdueDiff !== 0) return overdueDiff;

          const urgencyDiff =
            getUrgencyWeight(b.urgency) - getUrgencyWeight(a.urgency);
          if (urgencyDiff !== 0) return urgencyDiff;

          const aDeadline = a.deadline
            ? new Date(a.deadline).getTime()
            : Number.MAX_SAFE_INTEGER;
          const bDeadline = b.deadline
            ? new Date(b.deadline).getTime()
            : Number.MAX_SAFE_INTEGER;
          return aDeadline - bDeadline;
        })
        .slice(0, 4),
    [filteredPending],
  );

  const recentHistory = useMemo(
    () =>
      [...historyItems]
        .sort((a, b) => {
          const aTime = new Date(a.completedAt ?? a.createdAt).getTime();
          const bTime = new Date(b.completedAt ?? b.createdAt).getTime();
          return bTime - aTime;
        })
        .slice(0, 4),
    [historyItems],
  );

  const pulse = getDecisionPulse(
    pendingCount,
    overdueCount,
    historySummary.rejected,
  );

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

  function resetPendingFilters() {
    setEntityTypeFilter("");
    setUrgencyFilter("");
    setPendingPage(1);
  }

  function resetHistoryFilters() {
    setHistoryEntityTypeFilter("");
    setHistoryPage(1);
  }

  const pendingColumns: Column<PendingApprovalItem>[] = [
    {
      key: "entityType",
      header: "Entity",
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
          {formatEntityType(item.entityType)}
        </span>
      ),
    },
    {
      key: "title",
      header: "Request",
      className: "min-w-[240px]",
      render: (item) => (
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatEntityType(item.entityType)} · {item.entityId.slice(0, 8)}...
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Requested {formatApprovalDate(item.requestedAt)}
          </p>
        </div>
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
      header: "Current Step",
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
      render: (item) => (
        <span
          className={`text-sm ${
            isDeadlineOverdue(item.deadline)
              ? "font-semibold text-[var(--error)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          {formatApprovalDate(item.deadline)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleApprove(item.stepId);
            }}
            disabled={approveMutation.isPending}
            className="flex items-center gap-1 rounded-lg bg-[var(--success)] px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {approveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Approve
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
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

  const historyColumns: Column<ApprovalHistoryItem>[] = [
    {
      key: "entityType",
      header: "Entity",
      render: (item) => (
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {formatEntityType(item.entityType)}
        </span>
      ),
    },
    {
      key: "chain",
      header: "Approval Chain",
      className: "min-w-[220px]",
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Chain {item.chainId.slice(0, 8)}...
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Entity {item.entityId.slice(0, 8)}...
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Outcome",
      render: (item) => <HistoryStatusBadge status={item.status} />,
    },
    {
      key: "urgency",
      header: "Urgency",
      render: (item) => <UrgencyBadge urgency={item.urgency} />,
    },
    {
      key: "progress",
      header: "Progress",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          Step {item.currentStep} / {item.totalSteps}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Started",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatApprovalDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: "completedAt",
      header: "Completed",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatApprovalDate(item.completedAt)}
        </span>
      ),
    },
  ];

  return (
    <PermissionGate permission="approval.view">
      <div className="space-y-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "rgba(99, 102, 241, 0.16)",
            backgroundImage:
              "radial-gradient(circle at 12% 18%, rgba(99,102,241,0.16), transparent 30%), radial-gradient(circle at 88% 16%, rgba(16,185,129,0.12), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
            boxShadow: "0 28px 90px -58px rgba(99, 102, 241, 0.28)",
          }}
        >
          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${pulse.badgeClass}`}
                >
                  <Sparkles size={14} />
                  {pulse.label}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                  <ClipboardCheck size={14} className="text-[#6366F1]" />
                  Decision workspace
                </span>
              </div>

              <div className="max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                  My Approvals
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                  Pending approvals, decision history, and queue pressure in a
                  stronger approval workspace so reviewers can see what needs a
                  decision now and what the workflow system has recently
                  produced.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("pending");
                    setUrgencyFilter("critical");
                    setPendingPage(1);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <AlertTriangle size={16} />
                  Show Critical
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  <History size={16} />
                  Review History
                </button>
                {activeTab === "pending" &&
                  (entityTypeFilter || urgencyFilter) && (
                    <button
                      type="button"
                      onClick={resetPendingFilters}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                    >
                      Reset Pending View
                    </button>
                  )}
              </div>
            </div>

            <div
              className="rounded-[28px] border p-5"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.74)",
                borderColor: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(18px)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Approval pulse
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Decision telemetry
                  </h2>
                </div>
                <Activity size={20} className="text-[var(--primary)]" />
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                {pulse.description}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Pending queue
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {pendingLoading ? <LoadingValue /> : pendingCount}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Overdue in view
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {pendingLoading ? <LoadingValue /> : overdueCount}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Critical in view
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {pendingLoading ? <LoadingValue /> : criticalCount}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Visible outcomes
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {historyLoading ? (
                      <LoadingValue width="w-20" />
                    ) : (
                      historySummary.approved + historySummary.rejected
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Pending approvals"
            value={pendingCount}
            helper="Approval steps currently waiting for your decision."
            color="#F59E0B"
            loading={pendingLoading}
          />
          <MetricCard
            label="Overdue in queue"
            value={overdueCount}
            helper="Visible approvals already beyond their expected deadline."
            color="#EF4444"
            loading={pendingLoading}
          />
          <MetricCard
            label="Due soon"
            value={dueSoonCount}
            helper="Visible approvals landing inside the next three days."
            color="#2563EB"
            loading={pendingLoading}
          />
          <MetricCard
            label="History approved"
            value={historySummary.approved}
            helper="Approved outcomes visible in the current approval history page."
            color="#10B981"
            loading={historyLoading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              key: "pending" as const,
              title: "Pending queue",
              description:
                "Review live approval requests, deadlines, and urgency pressure before deciding.",
              icon: Clock3,
              count: pendingCount,
            },
            {
              key: "history" as const,
              title: "Approval history",
              description:
                "Inspect recent decisions, completed chains, and workflow outcomes.",
              icon: History,
              count: historyMeta?.totalItems ?? historyItems.length,
            },
          ].map((workspace) => {
            const active = activeTab === workspace.key;
            const Icon = workspace.icon;

            return (
              <button
                key={workspace.key}
                type="button"
                onClick={() => setActiveTab(workspace.key)}
                className="rounded-[28px] border p-5 text-left transition-all duration-200"
                style={{
                  borderColor: active
                    ? "rgba(99, 102, 241, 0.28)"
                    : "var(--border)",
                  backgroundImage: active
                    ? "radial-gradient(circle at 100% 0%, rgba(99,102,241,0.12), transparent 32%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)"
                    : "linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
                  boxShadow: active
                    ? "0 20px 50px -40px rgba(99, 102, 241, 0.55)"
                    : "none",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Workspace
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                      {workspace.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      {workspace.description}
                    </p>
                  </div>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: active
                        ? "rgba(99, 102, 241, 0.1)"
                        : "var(--surface-1)",
                    }}
                  >
                    <Icon
                      size={20}
                      className={
                        active
                          ? "text-[var(--primary)]"
                          : "text-[var(--text-secondary)]"
                      }
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-3xl font-bold text-[var(--text-primary)]">
                    {workspace.count}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                      active
                        ? "bg-[rgba(99,102,241,0.1)] text-[var(--primary)]"
                        : "bg-[var(--surface-1)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {active ? "Active workspace" : "Open workspace"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="space-y-4">
            {activeTab === "pending" ? (
              <>
                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Live queue
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Pending approval board
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {pendingLoading
                          ? "Loading pending decisions..."
                          : `${filteredPending.length} visible approval${filteredPending.length !== 1 ? "s" : ""} under the current queue lens.`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {URGENCY_OPTIONS.map((option) => {
                        const active = urgencyFilter === option.value;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => {
                              setUrgencyFilter(option.value);
                              setPendingPage(1);
                            }}
                            className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
                            style={{
                              borderColor: active
                                ? "var(--primary)"
                                : "var(--border)",
                              backgroundColor: active
                                ? "rgba(99, 102, 241, 0.1)"
                                : "var(--surface-0)",
                              color: active
                                ? "var(--primary)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-[240px_auto]">
                    <div>
                      <label
                        htmlFor="pending-entity-filter"
                        className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Entity type
                      </label>
                      <select
                        id="pending-entity-filter"
                        value={entityTypeFilter}
                        onChange={(event) => {
                          setEntityTypeFilter(event.target.value);
                          setPendingPage(1);
                        }}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      >
                        <option value="">All Entity Types</option>
                        {entityTypes.map((entityType) => (
                          <option key={entityType} value={entityType}>
                            {formatEntityType(entityType)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(entityTypeFilter || urgencyFilter) && (
                      <button
                        type="button"
                        onClick={resetPendingFilters}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] lg:mt-6"
                      >
                        <Filter size={16} />
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-1"
                >
                  <DataTable
                    columns={pendingColumns}
                    data={filteredPending}
                    keyExtractor={(item) => item.stepId}
                    loading={pendingLoading}
                    emptyTitle={
                      rawPending.length === 0
                        ? "No pending approvals"
                        : "No approvals match this view"
                    }
                    emptyDescription={
                      rawPending.length === 0
                        ? "You have no approval requests awaiting your review."
                        : "Adjust the entity or urgency filters to reveal a broader approval queue."
                    }
                    pagination={
                      pendingMeta
                        ? {
                            currentPage: pendingMeta.page,
                            totalPages: pendingMeta.totalPages,
                            totalItems: pendingMeta.totalItems,
                            pageSize: pendingMeta.pageSize,
                            onPageChange: setPendingPage,
                          }
                        : undefined
                    }
                  />
                </motion.div>
              </>
            ) : (
              <>
                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Decision record
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Approval history board
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {historyLoading
                          ? "Loading recent approval history..."
                          : `${historyItems.length} visible history chain${historyItems.length !== 1 ? "s" : ""} in the current outcome view.`}
                      </p>
                    </div>

                    <div className="w-full max-w-[260px]">
                      <label
                        htmlFor="history-entity-filter"
                        className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Entity type
                      </label>
                      <select
                        id="history-entity-filter"
                        value={historyEntityTypeFilter}
                        onChange={(event) => {
                          setHistoryEntityTypeFilter(event.target.value);
                          setHistoryPage(1);
                        }}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      >
                        <option value="">All chain history</option>
                        {historyEntityTypes.map((entityType) => (
                          <option key={entityType} value={entityType}>
                            {formatEntityType(entityType)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {historyEntityTypeFilter && (
                    <button
                      type="button"
                      onClick={resetHistoryFilters}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <Filter size={16} />
                      Clear history filter
                    </button>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-1"
                >
                  <DataTable
                    columns={historyColumns}
                    data={historyItems}
                    keyExtractor={(item) => item.chainId}
                    loading={historyLoading}
                    emptyTitle="No approval history"
                    emptyDescription="Completed and in-flight approval chains will appear here."
                    pagination={
                      historyMeta
                        ? {
                            currentPage: historyMeta.page,
                            totalPages: historyMeta.totalPages,
                            totalItems: historyMeta.totalItems,
                            pageSize: historyMeta.pageSize,
                            onPageChange: setHistoryPage,
                          }
                        : undefined
                    }
                  />
                </motion.div>
              </>
            )}
          </section>

          <aside className="space-y-5">
            {activeTab === "pending" ? (
              <>
                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Queue spotlight
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Priority approvals
                      </h2>
                    </div>
                    <Target size={20} className="text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {queueSpotlight.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[var(--border)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
                        No approvals are visible in the current queue lens.
                      </div>
                    ) : (
                      queueSpotlight.map((item) => (
                        <div
                          key={item.stepId}
                          className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {formatEntityType(item.entityType)} ·{" "}
                                {item.entityId.slice(0, 8)}...
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                {item.stepName}
                              </p>
                            </div>
                            <UrgencyBadge urgency={item.urgency} />
                          </div>
                          <p className="mt-3 text-sm text-[var(--text-secondary)]">
                            Requested by {item.requestedBy}
                          </p>
                          <p className="mt-2 text-xs font-medium text-[var(--text-tertiary)]">
                            Deadline {formatApprovalDate(item.deadline)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Queue pressure
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Current focus
                      </h2>
                    </div>
                    <Clock3 size={20} className="text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Overdue approvals
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {pendingLoading
                          ? "Loading queue pressure..."
                          : `${overdueCount} approval${overdueCount !== 1 ? "s are" : " is"} already beyond deadline in the current board.`}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Critical queue
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {pendingLoading
                          ? "Loading critical pressure..."
                          : `${criticalCount} critical approval${criticalCount !== 1 ? "s are" : " is"} currently visible.`}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Due soon
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {pendingLoading
                          ? "Loading near-term queue..."
                          : `${dueSoonCount} approval${dueSoonCount !== 1 ? "s land" : " lands"} inside the next three days.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Recent outcomes
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        History pulse
                      </h2>
                    </div>
                    <History size={20} className="text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      label="Approved"
                      value={historySummary.approved}
                      helper="Visible approved chains"
                      color="#10B981"
                      loading={historyLoading}
                    />
                    <MetricCard
                      label="Rejected"
                      value={historySummary.rejected}
                      helper="Visible rejected chains"
                      color="#EF4444"
                      loading={historyLoading}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Outcome spotlight
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Recent decisions
                      </h2>
                    </div>
                    <History size={20} className="text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {recentHistory.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[var(--border)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
                        Approval history will appear here once decisions have
                        been processed.
                      </div>
                    ) : (
                      recentHistory.map((item) => (
                        <div
                          key={item.chainId}
                          className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {formatEntityType(item.entityType)} ·{" "}
                                {item.entityId.slice(0, 8)}...
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                Started {formatApprovalDate(item.createdAt)}
                              </p>
                            </div>
                            <HistoryStatusBadge status={item.status} />
                          </div>
                          <p className="mt-3 text-sm text-[var(--text-secondary)]">
                            Step {item.currentStep} of {item.totalSteps}
                          </p>
                          <p className="mt-2 text-xs font-medium text-[var(--text-tertiary)]">
                            Completed {formatApprovalDate(item.completedAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Outcome mix
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Decision cadence
                      </h2>
                    </div>
                    <Target size={20} className="text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      {
                        label: "Approved",
                        value: historySummary.approved,
                        color: "#10B981",
                      },
                      {
                        label: "Rejected",
                        value: historySummary.rejected,
                        color: "#EF4444",
                      },
                      {
                        label: "Cancelled",
                        value: historySummary.cancelled,
                        color: "#6B7280",
                      },
                      {
                        label: "In Progress",
                        value: historySummary.inProgress,
                        color: "#3B82F6",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-[22px] bg-[var(--surface-1)] px-4 py-3"
                      >
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {item.label}
                        </p>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: `${item.color}18`,
                            color: item.color,
                          }}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Current lane
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        History notes
                      </h2>
                    </div>
                    <Clock3 size={20} className="text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                    {historyLoading
                      ? "Loading recent decision notes..."
                      : `The history board is showing ${historyItems.length} visible chain${historyItems.length !== 1 ? "s" : ""} with ${historySummary.approved} approvals and ${historySummary.rejected} rejections in the current view.`}
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>

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
