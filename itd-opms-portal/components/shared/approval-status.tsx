"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  SkipForward,
  ArrowRight,
  Send,
  UserPlus,
  X,
  AlertTriangle,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useApprovalChainForEntity,
  useApproveStep,
  useRejectStep,
  useDelegateStep,
  useStartApproval,
  useWorkflowDefinitions,
} from "@/hooks/use-approvals";
import type { ApprovalStep } from "@/hooks/use-approvals";
import { StatusBadge } from "@/components/shared/status-badge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApprovalStatusProps {
  entityType: string;
  entityId: string;
}

/* ------------------------------------------------------------------ */
/*  Step Icon                                                          */
/* ------------------------------------------------------------------ */

function StepIcon({
  decision,
  isCurrent,
}: {
  decision: string;
  isCurrent: boolean;
}) {
  switch (decision) {
    case "approved":
      return <CheckCircle className="h-5 w-5 text-[var(--success)]" />;
    case "rejected":
      return <XCircle className="h-5 w-5 text-[var(--error)]" />;
    case "skipped":
      return <SkipForward className="h-5 w-5 text-[var(--neutral-gray)]" />;
    case "pending":
    default:
      return isCurrent ? (
        <Clock className="h-5 w-5 text-[var(--warning)] animate-pulse" />
      ) : (
        <div className="h-5 w-5 rounded-full border-2 border-[var(--border)]" />
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Reject Modal                                                       */
/* ------------------------------------------------------------------ */

function RejectModal({
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
          Reject Approval Step
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Please provide a reason for rejecting this approval.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="reject-comments"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Rejection Reason <span className="text-[var(--error)]">*</span>
            </label>
            <textarea
              id="reject-comments"
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
/*  Delegate Modal                                                     */
/* ------------------------------------------------------------------ */

function DelegateModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (toUserId: string, reason: string) => void;
  loading: boolean;
}) {
  const [toUserId, setToUserId] = useState("");
  const [reason, setReason] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toUserId.trim()) return;
    onConfirm(toUserId.trim(), reason.trim());
  }

  function handleClose() {
    if (loading) return;
    setToUserId("");
    setReason("");
    onClose();
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
        onClick={handleClose}
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
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-40"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--info-light)]">
          <UserPlus className="h-6 w-6 text-[var(--info)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Delegate Approval
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Transfer this approval step to another user.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="delegate-user-id"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Delegate User ID <span className="text-[var(--error)]">*</span>
            </label>
            <input
              id="delegate-user-id"
              type="text"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              placeholder="Enter the user ID to delegate to..."
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          <div>
            <label
              htmlFor="delegate-reason"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Reason
            </label>
            <textarea
              id="delegate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason for delegation..."
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !toUserId.trim()}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Delegating...
                </span>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Delegate
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
/*  Start Approval Modal                                               */
/* ------------------------------------------------------------------ */

function StartApprovalModal({
  open,
  onClose,
  onConfirm,
  loading,
  entityType,
  entityId,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (workflowDefinitionId?: string, urgency?: string) => void;
  loading: boolean;
  entityType: string;
  entityId: string;
}) {
  const [urgency, setUrgency] = useState("normal");
  const { data: workflows } = useWorkflowDefinitions(entityType);

  const [selectedWorkflow, setSelectedWorkflow] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(selectedWorkflow || undefined, urgency);
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

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
          <PlayCircle className="h-6 w-6 text-[var(--primary)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Start Approval Workflow
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Initiate an approval process for {entityType} ({entityId.slice(0, 8)}...).
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {workflows && workflows.length > 0 && (
            <div>
              <label
                htmlFor="workflow-select"
                className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
              >
                Workflow
              </label>
              <select
                id="workflow-select"
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="">Auto-select workflow</option>
                {workflows
                  .filter((w) => w.isActive)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="urgency-select"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Urgency
            </label>
            <select
              id="urgency-select"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
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
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Start Approval
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
/*  Approval Status Component                                          */
/* ------------------------------------------------------------------ */

export function ApprovalStatus({ entityType, entityId }: ApprovalStatusProps) {
  const { user } = useAuth();
  const {
    data: chain,
    isLoading,
    isError,
  } = useApprovalChainForEntity(entityType, entityId);

  const approveMutation = useApproveStep();
  const rejectMutation = useRejectStep();
  const delegateMutation = useDelegateStep();
  const startApprovalMutation = useStartApproval();

  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showDelegateModal, setShowDelegateModal] = useState<string | null>(
    null,
  );
  const [showStartModal, setShowStartModal] = useState(false);

  const handleApprove = useCallback(
    (stepId: string) => {
      approveMutation.mutate({ stepId });
    },
    [approveMutation],
  );

  const handleReject = useCallback(
    (stepId: string, comments: string) => {
      rejectMutation.mutate(
        { stepId, comments },
        {
          onSuccess: () => setShowRejectModal(null),
        },
      );
    },
    [rejectMutation],
  );

  const handleDelegate = useCallback(
    (stepId: string, toUserId: string, reason: string) => {
      delegateMutation.mutate(
        { stepId, toUserId, reason },
        {
          onSuccess: () => setShowDelegateModal(null),
        },
      );
    },
    [delegateMutation],
  );

  const handleStartApproval = useCallback(
    (workflowDefinitionId?: string, urgency?: string) => {
      startApprovalMutation.mutate(
        {
          entityType,
          entityId,
          workflowDefinitionId,
          urgency,
        },
        {
          onSuccess: () => setShowStartModal(false),
        },
      );
    },
    [startApprovalMutation, entityType, entityId],
  );

  // Group steps by step_order for visual stepper display.
  const groupedSteps: Record<number, ApprovalStep[]> = {};
  if (chain?.steps) {
    for (const step of chain.steps) {
      if (!groupedSteps[step.stepOrder]) {
        groupedSteps[step.stepOrder] = [];
      }
      groupedSteps[step.stepOrder].push(step);
    }
  }
  const stepOrders = Object.keys(groupedSteps)
    .map(Number)
    .sort((a, b) => a - b);

  // Loading state.
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--surface-2)]" />
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--surface-2)]" />
              <div className="h-3 w-48 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No chain exists — show start button.
  if (isError || !chain) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Approval Status
            </h3>
            <p className="mt-1 text-sm text-[var(--neutral-gray)]">
              No approval workflow has been started for this item.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowStartModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <PlayCircle className="h-4 w-4" />
            Start Approval
          </button>
        </div>

        <AnimatePresence>
          {showStartModal && (
            <StartApprovalModal
              open={showStartModal}
              onClose={() => setShowStartModal(false)}
              onConfirm={handleStartApproval}
              loading={startApprovalMutation.isPending}
              entityType={entityType}
              entityId={entityId}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Determine the overall step status for each step order.
  function getStepOrderStatus(steps: ApprovalStep[]): string {
    if (steps.every((s) => s.decision === "approved")) return "approved";
    if (steps.some((s) => s.decision === "rejected")) return "rejected";
    if (steps.every((s) => s.decision === "skipped")) return "skipped";
    if (steps.some((s) => s.decision === "pending")) return "pending";
    return "approved";
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Approval Status
          </h3>
          <StatusBadge status={chain.status} />
        </div>
        {chain.urgency && chain.urgency !== "normal" && (
          <StatusBadge
            status={chain.urgency}
            variant={
              chain.urgency === "critical"
                ? "error"
                : chain.urgency === "high"
                  ? "warning"
                  : "default"
            }
          />
        )}
      </div>

      {/* Visual stepper */}
      <div className="space-y-0">
        {stepOrders.map((order, index) => {
          const steps = groupedSteps[order];
          const stepStatus = getStepOrderStatus(steps);
          const isCurrent = chain.currentStep === order;
          const isLast = index === stepOrders.length - 1;

          return (
            <div key={order} className="relative">
              {/* Connector line */}
              {!isLast && (
                <div
                  className="absolute left-[9px] top-[28px] w-0.5 bg-[var(--border)]"
                  style={{ height: "calc(100% - 4px)" }}
                />
              )}

              <div className="flex items-start gap-3 pb-4">
                {/* Step icon */}
                <div className="relative z-10 mt-0.5 flex-shrink-0">
                  <StepIcon decision={stepStatus} isCurrent={isCurrent} />
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Step {order}
                    </span>
                    {isCurrent &&
                      stepStatus === "pending" &&
                      chain.status === "in_progress" && (
                        <span className="inline-flex items-center rounded-full bg-[var(--warning-light)] px-2 py-0.5 text-[10px] font-medium text-[var(--warning-dark)]">
                          Current
                        </span>
                      )}
                  </div>

                  {/* Approvers in this step order */}
                  <div className="mt-1.5 space-y-1.5">
                    {steps.map((step) => {
                      const isPendingForMe =
                        step.decision === "pending" &&
                        user?.id === step.approverId &&
                        chain.status === "in_progress";

                      return (
                        <div
                          key={step.id}
                          className="flex items-center justify-between rounded-lg bg-[var(--surface-0)] px-3 py-2 border border-[var(--border)]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <StepIcon
                              decision={step.decision}
                              isCurrent={isCurrent}
                            />
                            <div className="min-w-0">
                              <span className="text-sm text-[var(--text-primary)] truncate block">
                                {step.approverName}
                              </span>
                              {step.decision !== "pending" && step.decidedAt && (
                                <span className="text-xs text-[var(--neutral-gray)]">
                                  {new Date(step.decidedAt).toLocaleDateString()}{" "}
                                  {new Date(step.decidedAt).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              )}
                              {step.comments && (
                                <p className="text-xs text-[var(--neutral-gray)] mt-0.5 italic">
                                  &quot;{step.comments}&quot;
                                </p>
                              )}
                              {step.delegatedFrom && (
                                <span className="text-xs text-[var(--info)]">
                                  Delegated
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons for the current user */}
                          {isPendingForMe && (
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => handleApprove(step.id)}
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
                                onClick={() => setShowRejectModal(step.id)}
                                disabled={rejectMutation.isPending}
                                className="flex items-center gap-1 rounded-lg bg-[var(--error)] px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDelegateModal(step.id)}
                                disabled={delegateMutation.isPending}
                                className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-60"
                              >
                                <UserPlus className="h-3 w-3" />
                                Delegate
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chain completion info */}
      {chain.completedAt && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--surface-0)] px-3 py-2 border border-[var(--border)]">
          <ArrowRight className="h-4 w-4 text-[var(--neutral-gray)]" />
          <span className="text-xs text-[var(--neutral-gray)]">
            Completed on{" "}
            {new Date(chain.completedAt).toLocaleDateString()}{" "}
            {new Date(chain.completedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <RejectModal
            open={!!showRejectModal}
            onClose={() => setShowRejectModal(null)}
            onConfirm={(comments) =>
              handleReject(showRejectModal, comments)
            }
            loading={rejectMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Delegate Modal */}
      <AnimatePresence>
        {showDelegateModal && (
          <DelegateModal
            open={!!showDelegateModal}
            onClose={() => setShowDelegateModal(null)}
            onConfirm={(toUserId, reason) =>
              handleDelegate(showDelegateModal, toUserId, reason)
            }
            loading={delegateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
