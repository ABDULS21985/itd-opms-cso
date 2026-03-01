"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertOctagon,
  Loader2,
  Edit,
  Calendar,
  User,
  ArrowUpCircle,
  CheckCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useIssue, useUpdateIssue, useEscalateIssue } from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444" },
  high: { bg: "rgba(249, 115, 22, 0.15)", text: "#F97316" },
  medium: { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B" },
  low: { bg: "rgba(16, 185, 129, 0.15)", text: "#10B981" },
};

const STATUS_TRANSITIONS: Record<string, { label: string; targets: string[] }> = {
  open: { label: "Open", targets: ["investigating"] },
  investigating: { label: "Investigating", targets: ["resolved"] },
  resolved: { label: "Resolved", targets: ["closed", "open"] },
  closed: { label: "Closed", targets: [] },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: issue, isLoading } = useIssue(id);
  const updateIssue = useUpdateIssue(id);
  const escalateIssue = useEscalateIssue();

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
            Loading issue...
          </p>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">Issue not found.</p>
      </div>
    );
  }

  const sevColor = SEVERITY_COLORS[issue.severity?.toLowerCase()] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };
  const transitions =
    STATUS_TRANSITIONS[issue.status.toLowerCase()]?.targets ?? [];

  function handleTransition(newStatus: string) {
    updateIssue.mutate({ id: issue!.id, status: newStatus } as any);
  }

  function handleEscalate() {
    escalateIssue.mutate({ id: issue!.id, escalatedToId: "" });
  }

  const isOverdue =
    issue.dueDate && new Date(issue.dueDate) < new Date() && issue.status !== "closed";

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
          onClick={() => router.push("/dashboard/planning/issues")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Issues
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(249,115,22,0.1)]">
            <AlertOctagon size={24} style={{ color: "#F97316" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {issue.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={issue.status} />
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                style={{ backgroundColor: sevColor.bg, color: sevColor.text }}
              >
                {issue.severity}
              </span>
              {issue.category && (
                <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                  {issue.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {transitions.map((target) => (
            <button
              key={target}
              type="button"
              disabled={updateIssue.isPending}
              onClick={() => handleTransition(target)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium capitalize text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
            >
              {updateIssue.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Edit size={16} />
              )}
              {target.replace("_", " ")}
            </button>
          ))}
          {issue.status !== "closed" && (
            <button
              type="button"
              disabled={escalateIssue.isPending}
              onClick={handleEscalate}
              className="flex items-center gap-2 rounded-xl border border-[var(--error)] px-3.5 py-2 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/5 disabled:opacity-50"
            >
              {escalateIssue.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowUpCircle size={16} />
              )}
              Escalate
            </button>
          )}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {/* Severity */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Severity
          </p>
          <div className="mt-2 flex items-center justify-center">
            <span
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold capitalize"
              style={{ backgroundColor: sevColor.bg, color: sevColor.text }}
            >
              {issue.severity?.charAt(0).toUpperCase()}
            </span>
          </div>
          <p
            className="mt-2 text-sm font-semibold capitalize"
            style={{ color: sevColor.text }}
          >
            {issue.severity}
          </p>
        </div>

        {/* Escalation Level */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Escalation Level
          </p>
          <div className="mt-2 flex items-center gap-3">
            <ArrowUpCircle
              size={20}
              className={
                issue.escalationLevel > 0
                  ? "text-[#F97316]"
                  : "text-[var(--neutral-gray)]"
              }
            />
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              L{issue.escalationLevel}
            </span>
          </div>
          {issue.escalatedToId && (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Escalated to: {issue.escalatedToId.slice(0, 8)}...
            </p>
          )}
        </div>

        {/* Due Date */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Due Date
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Calendar size={18} className={isOverdue ? "text-[var(--error)]" : "text-[var(--primary)]"} />
            <span className={`text-sm font-semibold ${isOverdue ? "text-[var(--error)]" : "text-[var(--text-primary)]"}`}>
              {issue.dueDate
                ? new Date(issue.dueDate).toLocaleDateString()
                : "Not set"}
            </span>
          </div>
          {isOverdue && (
            <p className="mt-2 text-xs font-medium text-[var(--error)]">
              Overdue - please resolve urgently
            </p>
          )}
        </div>
      </motion.div>

      {/* Description */}
      {issue.description && (
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
            {issue.description}
          </p>
        </motion.div>
      )}

      {/* Resolution */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Resolution
          </h2>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
          {issue.resolution || "No resolution recorded yet."}
        </p>
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
              Assignee
            </dt>
            <dd className="text-[var(--text-primary)]">
              {issue.assigneeId ? issue.assigneeId.slice(0, 8) + "..." : "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)]">
              <MessageSquare size={12} />
              Category
            </dt>
            <dd className="text-[var(--text-primary)] capitalize">
              {issue.category || "Uncategorized"}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)]">
              <Clock size={12} />
              Project ID
            </dt>
            <dd className="text-[var(--text-primary)]">
              {issue.projectId || "Organization-wide"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Created At
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(issue.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Last Updated
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(issue.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </motion.div>
    </div>
  );
}
