"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  useChecklists,
  useChecklistTasks,
  useCompleteChecklistTask,
} from "@/hooks/use-people";
import type { PeopleChecklist } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CHECKLIST_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Circle }> = {
  pending: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280", icon: Circle },
  in_progress: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", icon: Clock },
  completed: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", icon: CheckCircle },
  cancelled: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", icon: XCircle },
};

/* ------------------------------------------------------------------ */
/*  Task List Component                                                 */
/* ------------------------------------------------------------------ */

function TaskList({ checklistId }: { checklistId: string }) {
  const { data: tasks, isLoading } = useChecklistTasks(checklistId);
  const completeMutation = useCompleteChecklistTask();
  const items = tasks ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
        No tasks found for this checklist.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((task) => {
        const isCompleted = task.status === "completed";
        return (
          <div
            key={task.id}
            className="flex items-start gap-3 rounded-lg bg-[var(--surface-1)] p-3"
          >
            <button
              type="button"
              disabled={isCompleted || completeMutation.isPending}
              onClick={() => completeMutation.mutate(task.id)}
              className="mt-0.5 shrink-0"
            >
              {isCompleted ? (
                <CheckCircle size={16} style={{ color: "#10B981" }} />
              ) : (
                <Circle
                  size={16}
                  className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium"
                style={{
                  color: isCompleted
                    ? "var(--text-secondary)"
                    : "var(--text-primary)",
                  textDecoration: isCompleted ? "line-through" : "none",
                }}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                {task.dueDate && (
                  <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                {task.assigneeId && (
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Assignee: {task.assigneeId.slice(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Checklist Card Component                                            */
/* ------------------------------------------------------------------ */

function ChecklistCard({
  checklist,
  expanded,
  onToggle,
}: {
  checklist: PeopleChecklist;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusStyle = STATUS_STYLES[checklist.status] ?? STATUS_STYLES.pending;
  const StatusIcon = statusStyle.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left transition-colors hover:bg-[var(--surface-1)]"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
                style={{
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.text,
                }}
              >
                <StatusIcon size={12} />
                {checklist.status.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {checklist.type}
              </span>
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              User: {checklist.userId.slice(0, 8)}...
            </p>
            {checklist.templateId && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Template: {checklist.templateId.slice(0, 8)}...
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4">
            {expanded ? (
              <ChevronUp size={16} className="text-[var(--text-secondary)]" />
            ) : (
              <ChevronDown size={16} className="text-[var(--text-secondary)]" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-secondary)]">
              Completion
            </span>
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: statusStyle.text }}
            >
              {checklist.completionPct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${checklist.completionPct}%`,
                backgroundColor: statusStyle.text,
              }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-4 mt-2">
          {checklist.startedAt && (
            <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
              Started: {new Date(checklist.startedAt).toLocaleDateString()}
            </span>
          )}
          {checklist.completedAt && (
            <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
              Completed: {new Date(checklist.completedAt).toLocaleDateString()}
            </span>
          )}
          <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
            Created: {new Date(checklist.createdAt).toLocaleDateString()}
          </span>
        </div>
      </button>

      {/* Expanded Tasks */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3">
              Checklist Tasks
            </h3>
            <TaskList checklistId={checklist.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useChecklists(
    page,
    20,
    "onboarding",
    statusFilter || undefined,
  );

  const checklists = data?.data ?? [];
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
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
          >
            <UserPlus size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Onboarding Checklists
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Track onboarding progress for new team members
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
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Start Onboarding
          </button>
        </div>
      </motion.div>

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
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {CHECKLIST_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checklist Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : checklists.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <UserPlus size={24} className="mx-auto text-[var(--text-secondary)] mb-2" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No onboarding checklists found
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Start a new onboarding process to track new team member setup.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {checklists.map((checklist) => (
              <ChecklistCard
                key={checklist.id}
                checklist={checklist}
                expanded={expandedId === checklist.id}
                onToggle={() =>
                  setExpandedId(
                    expandedId === checklist.id ? null : checklist.id,
                  )
                }
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Showing page {meta.page} of {meta.totalPages} ({meta.totalItems}{" "}
              total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
