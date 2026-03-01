"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useChangeRequest,
  useUpdateChangeRequestStatus,
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
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Decision" },
  { key: "implemented", label: "Implemented" },
];

const STATUS_TRANSITIONS: Record<string, { targets: { status: string; label: string; variant: "default" | "success" | "danger" }[] }> = {
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

/* ------------------------------------------------------------------ */
/*  Workflow Stepper                                                    */
/* ------------------------------------------------------------------ */

function WorkflowStepper({ status }: { status: string }) {
  const currentStep = WORKFLOW_ORDER[status.toLowerCase()] ?? 0;
  const isRejected = status.toLowerCase() === "rejected";

  return (
    <div className="flex items-center gap-3">
      {WORKFLOW_STEPS.map((step, idx) => {
        const isActive = idx <= currentStep;
        const isCurrent = idx === currentStep;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isCurrent && isRejected
                    ? "bg-[var(--error)] text-white"
                    : isCurrent
                      ? "bg-[var(--primary)] text-white"
                      : isActive
                        ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                        : "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                }`}
              >
                {idx + 1}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCurrent
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--neutral-gray)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 rounded-full ${
                  idx < currentStep
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--surface-2)]"
                }`}
              />
            )}
          </div>
        );
      })}
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

  const { data: cr, isLoading } = useChangeRequest(id);
  const updateStatus = useUpdateChangeRequestStatus();

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

  function handleTransition(newStatus: string) {
    updateStatus.mutate({ id: cr!.id, status: newStatus });
  }

  const statusColor =
    cr.status === "approved"
      ? "#10B981"
      : cr.status === "rejected"
        ? "#EF4444"
        : cr.status === "implemented"
          ? "#10B981"
          : "#8B5CF6";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${statusColor}15` }}
          >
            <GitPullRequest size={24} style={{ color: statusColor }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {cr.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={cr.status} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
        className="flex justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <WorkflowStepper status={cr.status} />
      </motion.div>

      {/* Description */}
      {cr.description && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            Description
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
            {cr.description}
          </p>
        </motion.div>
      )}

      {/* Justification & Impact Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="mb-2 flex items-center gap-2">
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
          <div className="mb-2 flex items-center gap-2">
            <FileText size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Impact Assessment
            </h2>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
            {cr.impactAssessment || "No impact assessment provided."}
          </p>
        </div>
      </motion.div>

      {/* Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Metadata
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)]">
              <User size={12} />
              Requested By
            </dt>
            <dd className="text-[var(--text-primary)]">
              {cr.requestedBy ? cr.requestedBy.slice(0, 8) + "..." : "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)]">
              <User size={12} />
              Reviewed By
            </dt>
            <dd className="text-[var(--text-primary)]">
              {cr.reviewedBy ? cr.reviewedBy.slice(0, 8) + "..." : "Pending review"}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)]">
              <Calendar size={12} />
              Project ID
            </dt>
            <dd className="text-[var(--text-primary)]">
              {cr.projectId || "Organization-wide"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Approval Chain
            </dt>
            <dd className="text-[var(--text-primary)]">
              {cr.approvalChainId ? cr.approvalChainId.slice(0, 8) + "..." : "None"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Created At
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(cr.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Last Updated
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(cr.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </motion.div>
    </div>
  );
}
