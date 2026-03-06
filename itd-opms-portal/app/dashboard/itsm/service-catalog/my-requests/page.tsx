"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  ArrowLeft,
  Check,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  useMyServiceRequests,
  type ServiceRequest,
} from "@/hooks/use-itsm";
import { formatRelativeTime } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In Progress" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const STEPS = [
  { label: "Submitted", key: "submitted" },
  { label: "Approval", key: "approval" },
  { label: "Fulfillment", key: "fulfillment" },
  { label: "Completed", key: "completed" },
] as const;

/**
 * Maps a service-request status to the active step index (0-based).
 * Returns -1 for cancelled (all steps gray).
 */
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
/*  Step Progress Indicator                                            */
/* ------------------------------------------------------------------ */

function StepProgress({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  const isCancelled = status === "cancelled";
  const isRejected = status === "rejected";
  const activeStep = getActiveStep(status);

  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, idx) => {
        const isCompleted = !isCancelled && !isRejected && idx < activeStep;
        const isCurrent =
          !isCancelled && !isRejected && idx === activeStep;
        const isFuture =
          isCancelled || isRejected || idx > activeStep;

        // For rejected: step 0 is current (submitted ok), step 1 shows X
        const showRejectedX = isRejected && idx === 1;

        return (
          <div
            key={step.key}
            className="flex items-center flex-1 last:flex-initial"
          >
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className="relative flex items-center justify-center rounded-full transition-all duration-300"
                style={{
                  width: compact ? 24 : 28,
                  height: compact ? 24 : 28,
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
                  <X
                    size={compact ? 10 : 12}
                    className="text-[var(--neutral-gray)]"
                  />
                ) : showRejectedX ? (
                  <X size={compact ? 10 : 12} style={{ color: "#EF4444" }} />
                ) : isCompleted ? (
                  <Check
                    size={compact ? 10 : 12}
                    style={{ color: "#10B981" }}
                  />
                ) : isCurrent ? (
                  <div
                    className="rounded-full animate-pulse"
                    style={{
                      width: compact ? 6 : 8,
                      height: compact ? 6 : 8,
                      backgroundColor: "#3B82F6",
                    }}
                  />
                ) : (
                  <div
                    className="rounded-full"
                    style={{
                      width: compact ? 6 : 8,
                      height: compact ? 6 : 8,
                      backgroundColor: "var(--border)",
                    }}
                  />
                )}
              </div>
              {!compact && (
                <span
                  className="mt-1.5 text-[10px] font-medium whitespace-nowrap"
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
              )}
            </div>

            {/* Connecting line */}
            {idx < STEPS.length - 1 && (
              <div
                className="flex-1 mx-1.5"
                style={{
                  height: 2,
                  marginTop: compact ? 0 : -16,
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
/*  Request Card                                                       */
/* ------------------------------------------------------------------ */

function RequestCard({
  request,
  index,
  onClick,
}: {
  request: ServiceRequest;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <button
        type="button"
        onClick={onClick}
        className="group block w-full text-left rounded-xl border p-5 transition-all duration-200 hover:shadow-md"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        {/* Top row: badge + status */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-semibold"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              color: "#3B82F6",
            }}
          >
            {request.requestNumber}
          </span>
          <StatusBadge status={request.status} />
        </div>

        {/* Catalog item name */}
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 line-clamp-1">
          {request.catalogItemName || "Service Request"}
        </h3>

        {/* Submission date */}
        <p className="text-xs text-[var(--neutral-gray)] mb-4 flex items-center gap-1">
          <Clock size={12} />
          Submitted {formatRelativeTime(request.createdAt)}
        </p>

        {/* Step progress */}
        <StepProgress status={request.status} compact />
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function RequestCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-[var(--surface-2)] animate-pulse" />
          </div>
          <div className="h-4 w-3/4 rounded bg-[var(--surface-2)] animate-pulse mb-2" />
          <div className="h-3 w-1/3 rounded bg-[var(--surface-2)] animate-pulse mb-4" />
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex items-center flex-1 last:flex-initial">
                <div className="h-6 w-6 rounded-full bg-[var(--surface-2)] animate-pulse" />
                {j < 4 && (
                  <div className="flex-1 h-0.5 mx-1.5 bg-[var(--surface-2)] animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MyServiceRequestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useMyServiceRequests(
    page,
    20,
    statusFilter || undefined,
  );

  const requests = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 pb-8">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/itsm/service-catalog")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Service Catalog
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
          >
            <FileText size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              My Service Requests
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Track and manage your submitted service requests.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status filter tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap gap-1.5"
      >
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
              style={{
                backgroundColor: isActive
                  ? "var(--primary)"
                  : "var(--surface-1)",
                color: isActive ? "#fff" : "var(--text-secondary)",
                border: isActive
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Cards grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <RequestCardSkeleton count={6} />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No service requests found"
            description={
              statusFilter
                ? "No requests match the selected status filter."
                : "You haven't submitted any service requests yet."
            }
            action={
              !statusFilter ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push("/dashboard/itsm/service-catalog")
                  }
                  className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Browse Service Catalog
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {requests.map((req, idx) => (
              <RequestCard
                key={req.id}
                request={req}
                index={idx}
                onClick={() =>
                  router.push(
                    `/dashboard/itsm/service-catalog/my-requests/${req.id}`,
                  )
                }
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex items-center justify-between"
        >
          <p className="text-xs text-[var(--neutral-gray)]">
            Showing {(meta.page - 1) * meta.pageSize + 1} -{" "}
            {Math.min(meta.page * meta.pageSize, meta.totalItems)} of{" "}
            {meta.totalItems} requests
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === meta.totalPages ||
                  Math.abs(p - meta.page) <= 1,
              )
              .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                  acc.push("ellipsis");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-xs text-[var(--neutral-gray)]"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item as number)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor:
                        meta.page === item
                          ? "var(--primary)"
                          : "transparent",
                      color:
                        meta.page === item
                          ? "#fff"
                          : "var(--text-secondary)",
                      border:
                        meta.page === item
                          ? "1px solid var(--primary)"
                          : "1px solid var(--border)",
                    }}
                  >
                    {item}
                  </button>
                ),
              )}
            <button
              type="button"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
