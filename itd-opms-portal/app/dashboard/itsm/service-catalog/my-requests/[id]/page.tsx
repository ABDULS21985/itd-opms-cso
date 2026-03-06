"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  MessageSquare,
  PlayCircle,
  Package,
  Ban,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useServiceRequestDetail,
  useApproveRequest,
  useRejectRequest,
  useCancelServiceRequest,
  type ApprovalTask,
  type RequestTimelineEntry,
} from "@/hooks/use-itsm";
import { useAuth } from "@/providers/auth-provider";
import { formatRelativeTime, formatDate } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: "Submitted", key: "submitted" },
  { label: "Approval", key: "approval" },
  { label: "Fulfillment", key: "fulfillment" },
  { label: "Completed", key: "completed" },
] as const;

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  P1_critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", label: "P1 - Critical" },
  P2_high: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316", label: "P2 - High" },
  P3_medium: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", label: "P3 - Medium" },
  P4_low: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", label: "P4 - Low" },
};

const EVENT_ICONS: Record<string, typeof Send> = {
  submitted: Send,
  approved: CheckCircle,
  rejected: XCircle,
  comment: MessageSquare,
  in_progress: PlayCircle,
  fulfilled: Package,
  cancelled: Ban,
};

const EVENT_COLORS: Record<string, string> = {
  submitted: "#3B82F6",
  approved: "#10B981",
  rejected: "#EF4444",
  comment: "#8B5CF6",
  in_progress: "#F59E0B",
  fulfilled: "#10B981",
  cancelled: "#9CA3AF",
};

function getActiveStep(status: string): number {
  switch (status) {
    case "pending_approval":
    case "rejected":
      return 0;
    case "approved":
    case "in_progress":
      return 1;
    case "fulfilled":
      return 2;
    case "completed":
      return 3;
    default:
      return 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Step Progress Indicator (detailed)                                 */
/* ------------------------------------------------------------------ */

function StepProgressDetailed({ status }: { status: string }) {
  const isCancelled = status === "cancelled";
  const isRejected = status === "rejected";
  const activeStep = getActiveStep(status);

  return (
    <div className="flex items-center w-full py-2">
      {STEPS.map((step, idx) => {
        const isCompleted = !isCancelled && !isRejected && idx < activeStep;
        const isCurrent =
          !isCancelled && !isRejected && idx === activeStep;
        const isFuture =
          isCancelled || isRejected || idx > activeStep;
        const showRejectedX = isRejected && idx === 1;

        return (
          <div
            key={step.key}
            className="flex items-center flex-1 last:flex-initial"
          >
            <div className="flex flex-col items-center">
              <div
                className="relative flex items-center justify-center rounded-full transition-all duration-300"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: isCancelled
                    ? "var(--surface-2)"
                    : showRejectedX
                      ? "rgba(239, 68, 68, 0.15)"
                      : isCompleted
                        ? "rgba(16, 185, 129, 0.15)"
                        : isCurrent
                          ? "rgba(59, 130, 246, 0.15)"
                          : "var(--surface-2)",
                  border: `2px solid ${
                    isCancelled
                      ? "var(--border)"
                      : showRejectedX
                        ? "#EF4444"
                        : isCompleted
                          ? "#10B981"
                          : isCurrent
                            ? "#3B82F6"
                            : "var(--border)"
                  }`,
                }}
              >
                {isCancelled ? (
                  <X size={14} className="text-[var(--neutral-gray)]" />
                ) : showRejectedX ? (
                  <X size={14} style={{ color: "#EF4444" }} />
                ) : isCompleted ? (
                  <Check size={14} style={{ color: "#10B981" }} />
                ) : isCurrent ? (
                  <div
                    className="rounded-full animate-pulse"
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: "#3B82F6",
                    }}
                  />
                ) : (
                  <div
                    className="rounded-full"
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: "var(--border)",
                    }}
                  />
                )}
              </div>
              <span
                className="mt-2 text-xs font-semibold whitespace-nowrap"
                style={{
                  color:
                    isCancelled || isFuture
                      ? "var(--neutral-gray)"
                      : showRejectedX
                        ? "#EF4444"
                        : isCompleted
                          ? "#10B981"
                          : isCurrent
                            ? "#3B82F6"
                            : "var(--neutral-gray)",
                }}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className="flex-1 mx-2"
                style={{
                  height: 2,
                  marginTop: -20,
                  backgroundColor:
                    isCancelled || isFuture
                      ? "var(--border)"
                      : isCompleted
                        ? "#10B981"
                        : "var(--border)",
                  borderRadius: 1,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline Entry                                                     */
/* ------------------------------------------------------------------ */

function TimelineEntryRow({ entry }: { entry: RequestTimelineEntry }) {
  const Icon = EVENT_ICONS[entry.eventType] ?? Info;
  const color = EVENT_COLORS[entry.eventType] ?? "var(--neutral-gray)";

  return (
    <div className="flex gap-3 py-3">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        {entry.description && (
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            {entry.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-[var(--neutral-gray)]">
            {entry.actorId.slice(0, 8)}...
          </span>
          <span className="text-[10px] text-[var(--neutral-gray)] tabular-nums">
            {formatRelativeTime(entry.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Approval Task Row                                                  */
/* ------------------------------------------------------------------ */

function ApprovalTaskRow({ task }: { task: ApprovalTask }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border p-3"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-0)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <span className="text-xs font-bold text-[var(--neutral-gray)]">
            {task.sequenceOrder}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-mono text-[var(--text-primary)] truncate">
            {task.approverId.slice(0, 8)}...
          </p>
          {task.comment && (
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5 line-clamp-1 italic">
              &ldquo;{task.comment}&rdquo;
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={task.status} />
        {task.decisionAt && (
          <span className="text-[10px] text-[var(--neutral-gray)] tabular-nums whitespace-nowrap">
            {formatDate(task.decisionAt)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-36 rounded bg-[var(--surface-2)] animate-pulse" />
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-[var(--surface-2)] animate-pulse" />
        </div>
        <div className="h-6 w-2/3 rounded bg-[var(--surface-2)] animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-[var(--surface-2)] animate-pulse" />
        <div className="flex items-center gap-4 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center flex-1 last:flex-initial">
              <div className="h-9 w-9 rounded-full bg-[var(--surface-2)] animate-pulse" />
              {i < 4 && (
                <div className="flex-1 h-0.5 mx-2 bg-[var(--surface-2)] animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 space-y-3">
            <div className="h-5 w-32 rounded bg-[var(--surface-2)] animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
                <div className="h-4 w-32 rounded bg-[var(--surface-2)] animate-pulse" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 space-y-3">
            <div className="h-5 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-[var(--surface-2)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full rounded bg-[var(--surface-2)] animate-pulse" />
                  <div className="h-3 w-1/4 rounded bg-[var(--surface-2)] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-3 w-16 rounded bg-[var(--surface-2)] animate-pulse mb-1" />
                <div className="h-4 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ServiceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const { data: request, isLoading } = useServiceRequestDetail(id);
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const cancelRequest = useCancelServiceRequest();

  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24"
        >
          <AlertTriangle
            size={48}
            className="text-[var(--neutral-gray)] mb-4 opacity-40"
          />
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            Service request not found.
          </p>
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/itsm/service-catalog/my-requests",
              )
            }
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] transition-opacity hover:opacity-80"
          >
            <ArrowLeft size={16} />
            Back to My Requests
          </button>
        </motion.div>
      </div>
    );
  }

  /* ---- Derived ---- */
  const priorityInfo = PRIORITY_COLORS[request.priority] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
    label: request.priority,
  };

  const isRequester = user?.id === request.requesterId;
  const isApprover = request.approvalTasks?.some(
    (t) => t.approverId === user?.id && t.status === "pending",
  );

  const canCancel =
    isRequester &&
    ["pending_approval", "approved"].includes(request.status);

  const isActing =
    approveRequest.isPending ||
    rejectRequest.isPending ||
    cancelRequest.isPending;

  function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    approveRequest.mutate(
      { id, comment: approveComment || undefined },
      {
        onSuccess: () => {
          setShowApproveForm(false);
          setApproveComment("");
        },
      },
    );
  }

  function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    rejectRequest.mutate(
      { id, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          setShowRejectForm(false);
          setRejectReason("");
        },
      },
    );
  }

  function handleCancel() {
    if (
      !confirm(
        "Are you sure you want to cancel this service request? This action cannot be undone.",
      )
    )
      return;
    cancelRequest.mutate(id);
  }

  /* ---- Render form data as key-value pairs ---- */
  function renderFormData() {
    if (!request?.formData || Object.keys(request.formData).length === 0) {
      return (
        <p className="text-sm text-[var(--neutral-gray)] italic">
          No additional form data submitted.
        </p>
      );
    }

    return (
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {Object.entries(request!.formData).map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-medium text-[var(--neutral-gray)] capitalize">
              {key.replace(/_/g, " ").replace(/([A-Z])/g, " $1")}
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">
              {typeof value === "object"
                ? JSON.stringify(value)
                : String(value ?? "-")}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() =>
            router.push(
              "/dashboard/itsm/service-catalog/my-requests",
            )
          }
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to My Requests
        </button>
      </motion.div>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-semibold"
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  color: "#3B82F6",
                }}
              >
                {request.requestNumber}
              </span>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{
                  backgroundColor: priorityInfo.bg,
                  color: priorityInfo.text,
                }}
              >
                {priorityInfo.label}
              </span>
              <StatusBadge status={request.status} />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {request.catalogItemName || "Service Request"}
            </h1>
            <p className="mt-1 text-xs text-[var(--neutral-gray)]">
              Submitted {formatDate(request.createdAt)} ({formatRelativeTime(request.createdAt)})
            </p>
          </div>
        </div>

        {/* Step progress */}
        <StepProgressDetailed status={request.status} />
      </motion.div>

      {/* Rejection banner */}
      {request.status === "rejected" && request.rejectionReason && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border p-4 flex items-start gap-3"
          style={{
            borderColor: "rgba(239, 68, 68, 0.3)",
            backgroundColor: "rgba(239, 68, 68, 0.05)",
          }}
        >
          <XCircle
            size={18}
            className="shrink-0 mt-0.5"
            style={{ color: "#EF4444" }}
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>
              Request Rejected
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {request.rejectionReason}
            </p>
          </div>
        </motion.div>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
              Request Details
            </h2>
            {renderFormData()}

            {/* Priority and handler */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    Priority
                  </dt>
                  <dd className="mt-0.5">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{
                        backgroundColor: priorityInfo.bg,
                        color: priorityInfo.text,
                      }}
                    >
                      {priorityInfo.label}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    Assigned Handler
                  </dt>
                  <dd className="text-[var(--text-primary)] mt-0.5">
                    {request.assignedTo
                      ? request.assignedTo.slice(0, 8) + "..."
                      : "Not yet assigned"}
                  </dd>
                </div>
                {request.ticketId && (
                  <div>
                    <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                      Linked Ticket
                    </dt>
                    <dd className="text-[var(--primary)] font-mono text-xs mt-0.5">
                      {request.ticketId.slice(0, 8)}...
                    </dd>
                  </div>
                )}
                {request.fulfillmentNotes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                      Fulfillment Notes
                    </dt>
                    <dd className="text-[var(--text-primary)] mt-0.5 whitespace-pre-wrap">
                      {request.fulfillmentNotes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Timeline
            </h2>
            {!request.timeline || request.timeline.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-sm text-[var(--neutral-gray)]">
                  No activity recorded yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {request.timeline.map((entry) => (
                  <TimelineEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Approval Tasks */}
          {request.approvalTasks && request.approvalTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
            >
              <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                Approval Tasks
              </h2>
              <div className="space-y-2">
                {request.approvalTasks.map((task) => (
                  <ApprovalTaskRow key={task.id} task={task} />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
              Quick Info
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                  Status
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={request.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                  Priority
                </dt>
                <dd className="mt-1">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: priorityInfo.bg,
                      color: priorityInfo.text,
                    }}
                  >
                    {priorityInfo.label}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                  Request Number
                </dt>
                <dd className="text-[var(--text-primary)] font-mono mt-0.5">
                  {request.requestNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                  Created
                </dt>
                <dd className="text-[var(--text-primary)] mt-0.5">
                  {formatDate(request.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                  Last Updated
                </dt>
                <dd className="text-[var(--text-primary)] mt-0.5">
                  {formatRelativeTime(request.updatedAt)}
                </dd>
              </div>
              {request.fulfilledAt && (
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    Fulfilled
                  </dt>
                  <dd className="text-[var(--text-primary)] mt-0.5">
                    {formatDate(request.fulfilledAt)}
                  </dd>
                </div>
              )}
              {request.cancelledAt && (
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    Cancelled
                  </dt>
                  <dd className="text-[var(--text-primary)] mt-0.5">
                    {formatDate(request.cancelledAt)}
                  </dd>
                </div>
              )}
            </dl>
          </motion.div>

          {/* Action buttons */}
          {(isApprover || canCancel) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
            >
              <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
                Actions
              </h2>
              <div className="space-y-2">
                {/* Approver actions */}
                {isApprover && (
                  <>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => {
                        setShowApproveForm(true);
                        setShowRejectForm(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: "#10B981" }}
                    >
                      {approveRequest.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => {
                        setShowRejectForm(true);
                        setShowApproveForm(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: "#EF4444" }}
                    >
                      {rejectRequest.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <XCircle size={16} />
                      )}
                      Reject
                    </button>
                  </>
                )}

                {/* Cancel action */}
                {canCancel && (
                  <button
                    type="button"
                    disabled={isActing}
                    onClick={handleCancel}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                  >
                    {cancelRequest.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Ban size={16} />
                    )}
                    Cancel Request
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Approve form */}
          <AnimatePresence>
            {showApproveForm && (
              <motion.form
                onSubmit={handleApprove}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border bg-[var(--surface-0)] p-5 space-y-3"
                style={{ borderColor: "#10B98140" }}
              >
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Comment (optional)
                </label>
                <textarea
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  placeholder="Add a comment for the requester..."
                  rows={3}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={approveRequest.isPending}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#10B981" }}
                  >
                    {approveRequest.isPending && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    <CheckCircle size={14} />
                    Confirm Approval
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApproveForm(false)}
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Reject form */}
          <AnimatePresence>
            {showRejectForm && (
              <motion.form
                onSubmit={handleReject}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border bg-[var(--surface-0)] p-5 space-y-3"
                style={{ borderColor: "#EF444440" }}
              >
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Rejection Reason{" "}
                  <span className="text-[var(--error)]">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={3}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={
                      rejectRequest.isPending || !rejectReason.trim()
                    }
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#EF4444" }}
                  >
                    {rejectRequest.isPending && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    <XCircle size={14} />
                    Confirm Rejection
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
