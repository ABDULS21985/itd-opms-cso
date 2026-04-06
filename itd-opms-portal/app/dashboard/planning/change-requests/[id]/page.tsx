"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  GitPullRequest,
  Loader2,
  Calendar,
  User,
  ArrowRight,
  FileText,
  Scale,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  Clock,
  Briefcase,
  Tag,
  Shield,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useChangeRequest,
  useUpdateChangeRequestStatus,
  useDeleteChangeRequest,
} from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WORKFLOW_ORDER: Record<string, number> = {
  submitted: 0,
  under_review: 1,
  approved: 2,
  rejected: 2,
  implemented: 3,
};

const WORKFLOW_STEPS = [
  { key: "submitted", label: "Submitted", icon: Clock },
  { key: "under_review", label: "Under Review", icon: FileText },
  { key: "approved", label: "Decision", icon: Shield },
  { key: "implemented", label: "Implemented", icon: CheckCircle },
];

const STATUS_TRANSITIONS: Record<
  string,
  { targets: { status: string; label: string; variant: "default" | "success" | "danger" }[] }
> = {
  submitted: {
    targets: [
      { status: "under_review", label: "Start Review", variant: "default" },
    ],
  },
  under_review: {
    targets: [
      { status: "approved", label: "Approve", variant: "success" },
      { status: "rejected", label: "Reject", variant: "danger" },
    ],
  },
  approved: {
    targets: [
      { status: "implemented", label: "Mark Implemented", variant: "success" },
    ],
  },
  rejected: { targets: [] },
  implemented: { targets: [] },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239,68,68,0.1)", text: "#EF4444" },
  high: { bg: "rgba(249,115,22,0.1)", text: "#F97316" },
  medium: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
  low: { bg: "rgba(16,185,129,0.1)", text: "#10B981" },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  scope: { bg: "rgba(139,92,246,0.1)", text: "#8B5CF6" },
  schedule: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" },
  budget: { bg: "rgba(16,185,129,0.1)", text: "#10B981" },
  resource: { bg: "rgba(249,115,22,0.1)", text: "#F97316" },
  technical: { bg: "rgba(236,72,153,0.1)", text: "#EC4899" },
  other: { bg: "rgba(107,114,128,0.1)", text: "#6B7280" },
};

/* ------------------------------------------------------------------ */
/*  Badge Components                                                   */
/* ------------------------------------------------------------------ */

function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority.toLowerCase()] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {priority}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category.toLowerCase()] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {category}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflow Stepper                                                    */
/* ------------------------------------------------------------------ */

function WorkflowStepper({ status }: { status: string }) {
  const currentStep = WORKFLOW_ORDER[status.toLowerCase()] ?? 0;
  const isRejected = status.toLowerCase() === "rejected";

  return (
    <div className="flex items-center justify-between w-full">
      {WORKFLOW_STEPS.map((step, idx) => {
        const isActive = idx <= currentStep;
        const isCurrent = idx === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isCurrent && isRejected
                    ? "border-[var(--error)] bg-[var(--error)] text-white"
                    : isCurrent
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25"
                      : isActive
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                }`}
              >
                {isActive && !isCurrent ? (
                  <CheckCircle size={18} strokeWidth={2.5} />
                ) : (
                  <Icon size={18} />
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  isCurrent
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--neutral-gray)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div className="flex-1 mx-2">
                <div className="h-0.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                  <motion.div
                    className={`h-full ${isRejected && idx >= currentStep ? "bg-[var(--error)]" : "bg-[var(--primary)]"}`}
                    initial={false}
                    animate={{ width: idx < currentStep ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

function DeleteConfirmModal({
  title,
  isPending,
  onConfirm,
  onCancel,
}: {
  title: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md mx-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--error)]/10">
            <AlertTriangle size={20} className="text-[var(--error)]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Delete Change Request
            </h3>
            <p className="text-sm text-[var(--neutral-gray)]">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Are you sure you want to delete <strong>&quot;{title}&quot;</strong>?
          All associated data will be permanently removed.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--error)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar Detail Row                                                 */
/* ------------------------------------------------------------------ */

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={15} className="text-[var(--neutral-gray)] mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <div className="text-sm text-[var(--text-primary)]">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChangeRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: cr, isLoading } = useChangeRequest(id);
  const updateStatus = useUpdateChangeRequestStatus();
  const deleteCR = useDeleteChangeRequest();

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={24}
            className="animate-spin text-[var(--primary)]"
          />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading change request...
          </p>
        </div>
      </div>
    );
  }

  if (!cr) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">
          Change request not found.
        </p>
      </div>
    );
  }

  const transitions =
    STATUS_TRANSITIONS[cr.status.toLowerCase()]?.targets ?? [];
  const isEditable =
    cr.status === "submitted" || cr.status === "under_review";

  function handleTransition(newStatus: string) {
    updateStatus.mutate({ id: cr!.id, status: newStatus });
  }

  function handleDelete() {
    deleteCR.mutate(cr!.id, {
      onSuccess: () => {
        router.push("/dashboard/planning/change-requests");
      },
    });
  }

  const statusColor =
    cr.status === "approved" || cr.status === "implemented"
      ? "#10B981"
      : cr.status === "rejected"
        ? "#EF4444"
        : "#8B5CF6";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/planning/change-requests")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Change Requests
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${statusColor}15` }}
          >
            <GitPullRequest size={24} style={{ color: statusColor }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {cr.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={cr.status} />
              <PriorityBadge priority={cr.priority} />
              {cr.category && <CategoryBadge category={cr.category} />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditable && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/planning/change-requests/${cr.id}/edit`,
                )
              }
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <Pencil size={16} />
              Edit
            </button>
          )}
          {transitions.map((target) => {
            const btnClass =
              target.variant === "success"
                ? "border-emerald-500 text-emerald-600 hover:bg-emerald-500/5"
                : target.variant === "danger"
                  ? "border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)]/5"
                  : "border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]";

            return (
              <button
                key={target.status}
                type="button"
                disabled={updateStatus.isPending}
                onClick={() => handleTransition(target.status)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${btnClass}`}
              >
                {updateStatus.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : target.variant === "success" ? (
                  <CheckCircle size={16} />
                ) : target.variant === "danger" ? (
                  <XCircle size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}
                {target.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Workflow Stepper */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <WorkflowStepper status={cr.status} />
      </motion.div>

      {/* Main Content + Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <FileText size={16} className="text-[var(--neutral-gray)]" />
              Description
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
              {cr.description || "No description provided."}
            </p>
          </motion.div>

          {/* Justification & Impact Assessment */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Scale size={16} className="text-[#8B5CF6]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Justification
                </h2>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                {cr.justification || "No justification provided."}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Impact Assessment
                </h2>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                {cr.impactAssessment || "No impact assessment provided."}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-4">
          {/* Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Details
            </h2>
            <div className="divide-y divide-[var(--border)]">
              <DetailRow icon={Tag} label="Status">
                <StatusBadge status={cr.status} />
              </DetailRow>
              <DetailRow icon={AlertTriangle} label="Priority">
                <PriorityBadge priority={cr.priority} />
              </DetailRow>
              {cr.category && (
                <DetailRow icon={Tag} label="Category">
                  <CategoryBadge category={cr.category} />
                </DetailRow>
              )}
              <DetailRow icon={Briefcase} label="Project">
                {cr.projectTitle || "Organization-wide"}
              </DetailRow>
              <DetailRow icon={User} label="Requested By">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[10px] font-bold text-[var(--primary)]">
                    {(cr.requestedByName || "?").charAt(0).toUpperCase()}
                  </div>
                  {cr.requestedByName || "Unknown"}
                </div>
              </DetailRow>
              <DetailRow icon={User} label="Reviewed By">
                {cr.reviewedByName ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600">
                      {cr.reviewedByName.charAt(0).toUpperCase()}
                    </div>
                    {cr.reviewedByName}
                  </div>
                ) : (
                  <span className="text-[var(--neutral-gray)] italic">
                    Pending review
                  </span>
                )}
              </DetailRow>
              <DetailRow icon={Calendar} label="Created">
                {new Date(cr.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DetailRow>
              <DetailRow icon={Clock} label="Last Updated">
                {new Date(cr.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DetailRow>
            </div>
          </motion.div>

          {/* Actions Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Actions
            </h2>
            <div className="space-y-2">
              {isEditable && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/planning/change-requests/${cr.id}/edit`,
                    )
                  }
                  className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  <Pencil size={16} className="text-[var(--neutral-gray)]" />
                  Edit Change Request
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex w-full items-center gap-2 rounded-xl border border-[var(--error)]/20 px-3.5 py-2.5 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/5"
              >
                <Trash2 size={16} />
                Delete Change Request
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteConfirmModal
            title={cr.title}
            isPending={deleteCR.isPending}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
