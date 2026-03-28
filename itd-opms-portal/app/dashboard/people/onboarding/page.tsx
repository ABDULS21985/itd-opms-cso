"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  UserPlus,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  Clock,
  XCircle,
  Loader2,
  Search,
  MoreHorizontal,
  Trash2,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  X,
  FileText,
  ClipboardList,
  GripVertical,
  Calendar,
  User,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  useChecklists,
  useChecklistTasks,
  useCompleteChecklistTask,
  useCreateChecklist,
  useUpdateChecklistStatus,
  useDeleteChecklist,
  useChecklistTemplates,
  useCreateChecklistTemplate,
  useUpdateChecklistTemplate,
  useDeleteChecklistTemplate,
  useCreateChecklistTask,
  useDeleteChecklistTask,
} from "@/hooks/use-people";
import { UserPicker } from "@/components/shared/pickers";
import type {
  PeopleChecklist,
  ChecklistTask,
  PeopleChecklistTemplate,
} from "@/types";

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

const ONBOARDING_TAB_COPY = {
  checklists: {
    title: "Checklists",
    description:
      "Track each hire’s onboarding journey from kickoff to full completion.",
    accent: "#2563EB",
  },
  templates: {
    title: "Templates",
    description:
      "Standardize repeatable onboarding paths by role or team pattern.",
    accent: "#8B5CF6",
  },
} as const;

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; icon: typeof Circle; label: string }
> = {
  pending: {
    bg: "rgba(107, 114, 128, 0.1)",
    text: "#6B7280",
    icon: Circle,
    label: "Pending",
  },
  in_progress: {
    bg: "rgba(59, 130, 246, 0.1)",
    text: "#3B82F6",
    icon: Clock,
    label: "In Progress",
  },
  completed: {
    bg: "rgba(16, 185, 129, 0.1)",
    text: "#10B981",
    icon: CheckCircle,
    label: "Completed",
  },
  cancelled: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#EF4444",
    icon: XCircle,
    label: "Cancelled",
  },
};

const TASK_STATUSES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: {
    bg: "rgba(107, 114, 128, 0.1)",
    text: "#6B7280",
    label: "Pending",
  },
  in_progress: {
    bg: "rgba(59, 130, 246, 0.1)",
    text: "#3B82F6",
    label: "In Progress",
  },
  completed: {
    bg: "rgba(16, 185, 129, 0.1)",
    text: "#10B981",
    label: "Completed",
  },
  skipped: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", label: "Skipped" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isOverdue(task: ChecklistTask): boolean {
  if (task.status === "completed" || task.status === "skipped" || !task.dueDate)
    return false;
  return new Date(task.dueDate) < new Date();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

function shortId(value: string, size = 12): string {
  if (value.length <= size) return value;
  return `${value.slice(0, size)}...`;
}

function checklistNarrative(
  checklist: PeopleChecklist,
  template?: PeopleChecklistTemplate,
) {
  if (checklist.status === "completed") {
    return "This onboarding run is complete and ready to be archived as a clean handoff.";
  }

  if (checklist.status === "cancelled") {
    return "This onboarding run was cancelled before execution closed out every step.";
  }

  if (checklist.status === "in_progress") {
    return `Execution is live${template ? ` against ${template.name}` : ""}, so task follow-through matters right now.`;
  }

  return `This onboarding run is staged${template ? ` from ${template.name}` : ""} and waiting for kickoff.`;
}

function templateTone(template: PeopleChecklistTemplate) {
  if (!template.isActive) {
    return {
      accent: "#6B7280",
      glow: "rgba(107, 114, 128, 0.12)",
      surface: "rgba(107, 114, 128, 0.08)",
      label: "Parked",
      description:
        "This template is stored for reference and not currently launch-ready.",
    };
  }

  if (template.tasks.length >= 8) {
    return {
      accent: "#2563EB",
      glow: "rgba(37, 99, 235, 0.14)",
      surface: "rgba(37, 99, 235, 0.09)",
      label: "Deep coverage",
      description:
        "A more thorough path with enough task density for complex hires.",
    };
  }

  return {
    accent: "#8B5CF6",
    glow: "rgba(139, 92, 246, 0.14)",
    surface: "rgba(139, 92, 246, 0.09)",
    label: "Fast-start",
    description:
      "A leaner blueprint built for speed without losing the basics.",
  };
}

function onboardingPosture(
  pending: number,
  inProgress: number,
  avgCompletion: number,
) {
  if (pending >= 6 || (pending + inProgress >= 10 && avgCompletion < 55)) {
    return {
      label: "Needs acceleration",
      accent: "#DC2626",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "The onboarding queue is building faster than it is being pushed through.",
    };
  }

  if (inProgress >= 4 || avgCompletion < 80) {
    return {
      label: "In motion",
      accent: "#D97706",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "Work is moving, but completion discipline still needs active follow-through.",
    };
  }

  return {
    label: "On track",
    accent: "#1B7340",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "The onboarding pipeline is controlled and templates are supporting execution well.",
  };
}

function LoadingValue({ width = "w-16" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function HeroActionButton({
  icon: Icon,
  label,
  primary,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${primary ? "bg-[var(--primary)] text-white hover:opacity-90" : "border text-[var(--text-primary)] hover:-translate-y-0.5 hover:shadow-md"}`}
      style={
        primary
          ? undefined
          : {
              borderColor: "rgba(255,255,255,0.62)",
              backgroundColor: "rgba(255, 255, 255, 0.74)",
              backdropFilter: "blur(18px)",
            }
      }
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Stats                                                      */
/* ------------------------------------------------------------------ */

function SummaryStats({
  checklists,
  isLoading,
}: {
  checklists: PeopleChecklist[];
  isLoading: boolean;
}) {
  const stats = useMemo(() => {
    const total = checklists.length;
    const pending = checklists.filter((c) => c.status === "pending").length;
    const inProgress = checklists.filter(
      (c) => c.status === "in_progress",
    ).length;
    const completed = checklists.filter((c) => c.status === "completed").length;
    const avgCompletion =
      total > 0
        ? Math.round(
            checklists.reduce((s, c) => s + c.completionPct, 0) / total,
          )
        : 0;
    return { total, pending, inProgress, completed, avgCompletion };
  }, [checklists]);

  const cards = [
    {
      label: "Total Checklists",
      value: stats.total,
      color: "#3B82F6",
      bg: "rgba(59, 130, 246, 0.1)",
      helper: "All onboarding runs currently tracked.",
    },
    {
      label: "Pending",
      value: stats.pending,
      color: "#6B7280",
      bg: "rgba(107, 114, 128, 0.1)",
      helper: "Waiting to be kicked off by an owner.",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.1)",
      helper: "Active onboarding work that still needs follow-through.",
    },
    {
      label: "Completed",
      value: stats.completed,
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.1)",
      helper: "Successfully closed onboarding journeys.",
    },
    {
      label: "Avg Completion",
      value: `${stats.avgCompletion}%`,
      color: "#8B5CF6",
      bg: "rgba(139, 92, 246, 0.1)",
      helper: "Average completion across all onboarding checklists.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5"
          style={{
            backgroundImage: `radial-gradient(circle at 100% 0%, ${card.color}18, transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
          }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: card.bg }}
          >
            <div
              className="h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: card.color }}
            />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {card.label}
          </p>
          {isLoading ? (
            <div className="mt-3 h-8 w-16 rounded bg-[var(--surface-2)] animate-pulse" />
          ) : (
            <p
              className="mt-3 text-3xl font-bold tabular-nums"
              style={{ color: card.color }}
            >
              {card.value}
            </p>
          )}
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {card.helper}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Task Inline Form                                               */
/* ------------------------------------------------------------------ */

function AddTaskForm({
  checklistId,
  onClose,
}: {
  checklistId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const createTask = useCreateChecklistTask();

  const handleSubmit = () => {
    if (!title.trim()) return;
    createTask.mutate(
      {
        checklistId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        sortOrder: 999,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-dashed border-[var(--border)] pt-3 mt-3"
    >
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Task title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || createTask.isPending}
            className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {createTask.isPending ? "Adding..." : "Add Task"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Task List Component                                                */
/* ------------------------------------------------------------------ */

function TaskList({
  checklistId,
  checklistStatus,
}: {
  checklistId: string;
  checklistStatus: string;
}) {
  const { data: tasks, isLoading } = useChecklistTasks(checklistId);
  const completeMutation = useCompleteChecklistTask();
  const deleteMutation = useDeleteChecklistTask();
  const [addingTask, setAddingTask] = useState(false);
  const items = tasks ?? [];
  const canEdit =
    checklistStatus !== "completed" && checklistStatus !== "cancelled";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
        <span className="ml-2 text-xs text-[var(--text-secondary)]">
          Loading tasks...
        </span>
      </div>
    );
  }

  const completedCount = items.filter(
    (t) => t.status === "completed" || t.status === "skipped",
  ).length;
  const overdueCount = items.filter(isOverdue).length;

  return (
    <div>
      {/* Task summary bar */}
      {items.length > 0 && (
        <div className="flex items-center gap-4 mb-3 text-xs text-[var(--text-secondary)]">
          <span>
            <span className="font-semibold text-[var(--text-primary)]">
              {completedCount}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {items.length}
            </span>{" "}
            tasks done
          </span>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[#EF4444] font-medium">
              <AlertTriangle size={12} />
              {overdueCount} overdue
            </span>
          )}
        </div>
      )}

      {items.length === 0 && !addingTask ? (
        <div className="text-center py-4">
          <ClipboardList
            size={20}
            className="mx-auto text-[var(--text-secondary)] mb-1.5"
          />
          <p className="text-xs text-[var(--text-secondary)]">
            No tasks yet.{" "}
            {canEdit && (
              <button
                type="button"
                onClick={() => setAddingTask(true)}
                className="text-[var(--primary)] font-medium hover:underline"
              >
                Add the first task
              </button>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((task, idx) => {
            const isCompleted =
              task.status === "completed" || task.status === "skipped";
            const overdue = isOverdue(task);
            const taskStyle =
              TASK_STATUSES[task.status] ?? TASK_STATUSES.pending;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-[var(--surface-2)]"
                style={{
                  backgroundColor: overdue
                    ? "rgba(239, 68, 68, 0.04)"
                    : undefined,
                  borderLeft: overdue
                    ? "3px solid #EF4444"
                    : "3px solid transparent",
                }}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  disabled={
                    isCompleted || !canEdit || completeMutation.isPending
                  }
                  onClick={() => completeMutation.mutate({ id: task.id })}
                  className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                  title={isCompleted ? "Completed" : "Mark as complete"}
                >
                  {isCompleted ? (
                    <CheckCircle size={18} style={{ color: "#10B981" }} />
                  ) : (
                    <Circle
                      size={18}
                      className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                    />
                  )}
                </button>

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-medium leading-tight"
                      style={{
                        color: isCompleted
                          ? "var(--text-secondary)"
                          : "var(--text-primary)",
                        textDecoration: isCompleted ? "line-through" : "none",
                      }}
                    >
                      {task.title}
                    </p>
                    {overdue && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          color: "#EF4444",
                        }}
                      >
                        <AlertTriangle size={9} />
                        Overdue
                      </span>
                    )}
                    <span
                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                      style={{
                        backgroundColor: taskStyle.bg,
                        color: taskStyle.text,
                      }}
                    >
                      {taskStyle.label}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {task.dueDate && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] tabular-nums"
                        style={{
                          color: overdue ? "#EF4444" : "var(--text-secondary)",
                        }}
                      >
                        <Calendar size={10} />
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                    {task.assigneeId && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                        <User size={10} />
                        {task.assigneeId.slice(0, 8)}...
                      </span>
                    )}
                    {task.notes && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                        <MessageSquare size={10} />
                        Has notes
                      </span>
                    )}
                    {task.completedAt && (
                      <span className="text-[10px] text-[#10B981] tabular-nums">
                        Completed {formatDate(task.completedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this task?")) {
                        deleteMutation.mutate(task.id);
                      }
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--surface-2)]"
                    title="Delete task"
                  >
                    <Trash2
                      size={14}
                      className="text-[var(--text-secondary)] hover:text-[#EF4444]"
                    />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add task */}
      <AnimatePresence>
        {addingTask ? (
          <AddTaskForm
            checklistId={checklistId}
            onClose={() => setAddingTask(false)}
          />
        ) : (
          canEdit &&
          items.length > 0 && (
            <button
              type="button"
              onClick={() => setAddingTask(true)}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
            >
              <Plus size={14} />
              Add task
            </button>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Checklist Card Component                                           */
/* ------------------------------------------------------------------ */

function ChecklistCard({
  checklist,
  expanded,
  onToggle,
  templates,
}: {
  checklist: PeopleChecklist;
  expanded: boolean;
  onToggle: () => void;
  templates: PeopleChecklistTemplate[];
}) {
  const [showActions, setShowActions] = useState(false);
  const updateStatus = useUpdateChecklistStatus();
  const deleteChecklist = useDeleteChecklist();
  const statusStyle = STATUS_STYLES[checklist.status] ?? STATUS_STYLES.pending;
  const StatusIcon = statusStyle.icon;

  const template = templates.find((t) => t.id === checklist.templateId);
  const canChangeStatus =
    checklist.status !== "completed" && checklist.status !== "cancelled";
  const narrative = checklistNarrative(checklist, template);
  const checkpointLabel = checklist.completedAt
    ? `Completed ${formatDate(checklist.completedAt)}`
    : checklist.startedAt
      ? `Started ${formatDate(checklist.startedAt)}`
      : "Waiting to start";
  const laneLabel =
    checklist.status === "completed"
      ? "Journey closed"
      : checklist.status === "cancelled"
        ? "Execution halted"
        : checklist.status === "in_progress"
          ? "Tasks underway"
          : "Ready for kickoff";

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: checklist.id, status: newStatus });
    setShowActions(false);
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this checklist? This action cannot be undone.",
      )
    ) {
      deleteChecklist.mutate(checklist.id);
    }
    setShowActions(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="overflow-hidden rounded-[30px] border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-48px_rgba(15,23,42,0.5)]"
      style={{
        borderColor: `${statusStyle.text}24`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${statusStyle.text}16, transparent 32%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <div className="p-5 lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <button
            type="button"
            onClick={onToggle}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.text,
                }}
              >
                <StatusIcon size={12} />
                {statusStyle.label}
              </span>
              {template && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                  <FileText size={10} />
                  {template.name}
                </span>
              )}
              {template?.roleType && (
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                  {template.roleType}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Hire record
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {shortId(checklist.userId, 22)}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                  {narrative}
                </p>
              </div>

              <div
                className="flex items-center gap-4 self-start rounded-[24px] border px-4 py-3"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.72)",
                  borderColor: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(14px)",
                }}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Completion
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                    {checklist.completionPct}%
                  </p>
                </div>
                <div className="h-12 w-px bg-[var(--border)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Task panel
                  </p>
                  <span
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: statusStyle.text }}
                  >
                    {expanded ? "Collapse board" : "Review tasks"}
                    <ArrowRight
                      size={14}
                      className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                    />
                  </span>
                </div>
              </div>
            </div>
          </button>

          <div className="relative ml-0 flex items-center gap-2 lg:ml-3">
            <button
              type="button"
              onClick={onToggle}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-2.5 transition-colors hover:bg-[var(--surface-1)]"
            >
              {expanded ? (
                <ChevronUp size={16} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown
                  size={16}
                  className="text-[var(--text-secondary)]"
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowActions(!showActions)}
              className="p-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            >
              <MoreHorizontal
                size={16}
                className="text-[var(--text-secondary)]"
              />
            </button>

            <AnimatePresence>
              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActions(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg"
                  >
                    {canChangeStatus && checklist.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("in_progress")}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                      >
                        <PlayCircle size={14} style={{ color: "#3B82F6" }} />
                        Start Onboarding
                      </button>
                    )}
                    {canChangeStatus && checklist.status === "in_progress" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusChange("completed")}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                        >
                          <CheckCircle size={14} style={{ color: "#10B981" }} />
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange("pending")}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                        >
                          <PauseCircle size={14} style={{ color: "#6B7280" }} />
                          Pause (Back to Pending)
                        </button>
                      </>
                    )}
                    {canChangeStatus && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("cancelled")}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                      >
                        <XCircle size={14} style={{ color: "#EF4444" }} />
                        Cancel
                      </button>
                    )}
                    <div className="border-t border-[var(--border)]" />
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete Checklist
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/70 p-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[var(--text-secondary)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Timeline
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              Created {daysAgo(checklist.createdAt)}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {checkpointLabel}
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/70 p-4">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[var(--text-secondary)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Execution lane
              </p>
            </div>
            <p
              className="mt-3 text-sm font-semibold"
              style={{ color: statusStyle.text }}
            >
              {laneLabel}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {statusStyle.label} status is controlling the next available
              actions.
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/70 p-4">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[var(--text-secondary)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Template source
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              {template?.name ?? "Blank onboarding path"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {template?.roleType
                ? `${template.roleType} workflow shaping the journey.`
                : "Built without a preset blueprint so tasks are managed manually."}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">
              Progress
            </span>
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: statusStyle.text }}
            >
              {checklist.completionPct}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${checklist.completionPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: statusStyle.text }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/60 bg-[var(--surface-0)]/84 p-5 lg:p-6"
          >
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] p-4 lg:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <ClipboardList size={14} />
                    Onboarding tasks
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Use this task board to push the hire from kickoff to full
                    readiness.
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.text,
                  }}
                >
                  <StatusIcon size={12} />
                  {statusStyle.label}
                </span>
              </div>

              <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <TaskList
                  checklistId={checklist.id}
                  checklistStatus={checklist.status}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Checklist Modal                                             */
/* ------------------------------------------------------------------ */

function CreateChecklistModal({
  open,
  onClose,
  templates,
}: {
  open: boolean;
  onClose: () => void;
  templates: PeopleChecklistTemplate[];
}) {
  const [userId, setUserId] = useState("");
  const [userDisplay, setUserDisplay] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const createChecklist = useCreateChecklist();

  const handleCreate = () => {
    if (!userId.trim()) return;
    createChecklist.mutate(
      {
        userId: userId.trim(),
        type: "onboarding",
        templateId: selectedTemplateId || undefined,
      },
      {
        onSuccess: () => {
          setUserId("");
          setUserDisplay("");
          setSelectedTemplateId("");
          onClose();
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            >
              <UserPlus size={18} style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Start New Onboarding
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Create a checklist for a new team member
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          >
            <X size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <UserPicker
            label="User"
            required
            placeholder="Search for a team member..."
            value={userId}
            displayValue={userDisplay}
            onChange={(id, name) => {
              setUserId(id ?? "");
              setUserDisplay(name);
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Template (Optional)
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">No template (blank checklist)</option>
              {templates
                .filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.roleType ? ` (${t.roleType})` : ""} — {t.tasks.length}{" "}
                    tasks
                  </option>
                ))}
            </select>
            {selectedTemplateId && (
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                Tasks will be auto-created from the template.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-[var(--border)] bg-[var(--surface-1)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!userId.trim() || createChecklist.isPending}
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {createChecklist.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Creating...
              </span>
            ) : (
              "Start Onboarding"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Template Builder Modal                                             */
/* ------------------------------------------------------------------ */

interface TemplateTaskDef {
  title: string;
  description?: string;
  assigneeRole?: string;
  dueDays?: number;
  required?: boolean;
}

function TemplateModal({
  open,
  onClose,
  editTemplate,
}: {
  open: boolean;
  onClose: () => void;
  editTemplate?: PeopleChecklistTemplate;
}) {
  const [name, setName] = useState(editTemplate?.name ?? "");
  const [roleType, setRoleType] = useState(editTemplate?.roleType ?? "");
  const [tasks, setTasks] = useState<TemplateTaskDef[]>(
    editTemplate?.tasks ?? [],
  );
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const createTemplate = useCreateChecklistTemplate();
  const updateTemplate = useUpdateChecklistTemplate(editTemplate?.id);

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    setTasks([...tasks, { title: newTaskTitle.trim(), required: true }]);
    setNewTaskTitle("");
  };

  const removeTask = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const moveTask = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= tasks.length) return;
    const arr = [...tasks];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setTasks(arr);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const body = {
      name: name.trim(),
      type: "onboarding" as const,
      roleType: roleType.trim() || undefined,
      tasks,
      isActive: true,
    };

    if (editTemplate) {
      updateTemplate.mutate(body, { onSuccess: () => onClose() });
    } else {
      createTemplate.mutate(body, { onSuccess: () => onClose() });
    }
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
            >
              <FileText size={18} style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {editTemplate ? "Edit Template" : "Create Onboarding Template"}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Define reusable task checklists for onboarding workflows
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          >
            <X size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Template Name <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                placeholder='e.g., "Standard IT Onboarding"'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Role Type (Optional)
              </label>
              <input
                type="text"
                placeholder='e.g., "developer", "manager"'
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          {/* Task definitions */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
              Tasks ({tasks.length})
            </label>
            {tasks.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {tasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg bg-[var(--surface-1)] p-2.5"
                  >
                    <GripVertical
                      size={14}
                      className="text-[var(--text-secondary)] shrink-0"
                    />
                    <span className="text-xs font-bold text-[var(--text-secondary)] w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-sm text-[var(--text-primary)] flex-1 min-w-0 truncate">
                      {task.title}
                    </span>
                    {task.required && (
                      <span className="text-[10px] font-medium text-[#8B5CF6] shrink-0">
                        Required
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveTask(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 transition-all"
                      >
                        <ChevronUp
                          size={12}
                          className="text-[var(--text-secondary)]"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTask(idx, 1)}
                        disabled={idx === tasks.length - 1}
                        className="p-1 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 transition-all"
                      >
                        <ChevronDown
                          size={12}
                          className="text-[var(--text-secondary)]"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTask(idx)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <Trash2
                          size={12}
                          className="text-[var(--text-secondary)] hover:text-[#EF4444]"
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
              <button
                type="button"
                onClick={addTask}
                disabled={!newTaskTitle.trim()}
                className="rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-50 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-[var(--border)] bg-[var(--surface-1)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || isPending}
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </span>
            ) : editTemplate ? (
              "Update Template"
            ) : (
              "Create Template"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Templates Tab                                                      */
/* ------------------------------------------------------------------ */

function TemplatesTab({
  templates,
  isLoading,
}: {
  templates: PeopleChecklistTemplate[];
  isLoading: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const deleteTemplate = useDeleteChecklistTemplate();

  const editTemplate = templates.find((t) => t.id === editId);
  const templateStats = useMemo(() => {
    const active = templates.filter((template) => template.isActive).length;
    const inactive = templates.length - active;
    const totalTasks = templates.reduce(
      (sum, template) => sum + template.tasks.length,
      0,
    );
    const roleCoverage = new Set(
      templates
        .map((template) => template.roleType)
        .filter((role): role is string => Boolean(role)),
    ).size;

    return {
      total: templates.length,
      active,
      inactive,
      totalTasks,
      averageTasks: templates.length
        ? Math.round(totalTasks / templates.length)
        : 0,
      roleCoverage,
    };
  }, [templates]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div
          className="rounded-[32px] border p-6 lg:p-7"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "rgba(139, 92, 246, 0.16)",
            backgroundImage:
              "radial-gradient(circle at 14% 18%, rgba(139,92,246,0.18), transparent 30%), radial-gradient(circle at 86% 14%, rgba(37,99,235,0.12), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                <Sparkles size={14} />
                Template studio
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                Build repeatable onboarding blueprints
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] lg:text-base">
                Shape reusable launch paths by role, tune the task density, and
                keep your onboarding experience consistent before each hire ever
                lands.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New Template
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total templates",
                value: templateStats.total,
                helper: "All onboarding blueprints in the catalog.",
              },
              {
                label: "Active",
                value: templateStats.active,
                helper: "Launch-ready flows available to teams right now.",
              },
              {
                label: "Task bank",
                value: templateStats.totalTasks,
                helper: "Total reusable checklist steps across every template.",
              },
              {
                label: "Role coverage",
                value: templateStats.roleCoverage,
                helper: "Distinct role tracks with a dedicated setup path.",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/75 p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  {stat.label}
                </p>
                <p className="mt-3 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                  {isLoading ? <LoadingValue width="w-14" /> : stat.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {stat.helper}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Build posture
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Blueprint health
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {templateStats.active >=
              Math.max(1, Math.ceil(templateStats.total / 2))
                ? "Most of your catalog is launch-ready, which keeps onboarding starts from slowing down."
                : "A larger share of templates is parked, so your reusable coverage is thinner than it should be."}
            </p>
            <div className="mt-5 rounded-[24px] bg-[var(--surface-1)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">
                  Activation rate
                </span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {templateStats.total
                    ? `${Math.round((templateStats.active / templateStats.total) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{
                    width: templateStats.total
                      ? `${(templateStats.active / templateStats.total) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Catalog signal
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Task density
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Avg tasks
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    templateStats.averageTasks
                  )}
                </p>
              </div>
              <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Parked templates
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    templateStats.inactive
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-6"
            >
              <div className="h-5 w-28 animate-pulse rounded-full bg-[var(--surface-2)]" />
              <div className="mt-4 h-8 w-56 animate-pulse rounded-xl bg-[var(--surface-2)]" />
              <div className="mt-6 space-y-2">
                <div className="h-4 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                <div className="h-4 w-10/12 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                <div className="h-4 w-8/12 animate-pulse rounded-xl bg-[var(--surface-2)]" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div
          className="rounded-[32px] border p-12 text-center"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "rgba(139, 92, 246, 0.14)",
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(139,92,246,0.12), transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          }}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-violet-500/10">
            <FileText
              size={28}
              className="text-violet-600 dark:text-violet-300"
            />
          </div>
          <h3 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">
            No templates yet
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
            Stand up a template to standardize hardware setup, access
            provisioning, and first-week readiness instead of rebuilding every
            onboarding path from scratch.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {templates.map((template, idx) => {
            const tone = templateTone(template);
            const requiredCount = template.tasks.filter(
              (task) => task.required,
            ).length;

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="overflow-hidden rounded-[30px] border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)] lg:p-6"
                style={{
                  borderColor: `${tone.accent}26`,
                  backgroundImage: `radial-gradient(circle at 100% 0%, ${tone.glow}, transparent 32%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
                }}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                          style={{
                            backgroundColor: tone.surface,
                            color: tone.accent,
                          }}
                        >
                          {tone.label}
                        </span>
                        <span
                          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                          style={{
                            backgroundColor: template.isActive
                              ? "rgba(16, 185, 129, 0.1)"
                              : "rgba(107, 114, 128, 0.1)",
                            color: template.isActive ? "#10B981" : "#6B7280",
                          }}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </span>
                        {template.roleType && (
                          <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            {template.roleType}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                        {template.name}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                        {tone.description}
                      </p>
                    </div>

                    <div
                      className="self-start rounded-[24px] border px-4 py-3"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.72)",
                        borderColor: "rgba(255,255,255,0.7)",
                        backdropFilter: "blur(14px)",
                      }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Task bank
                      </p>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                        {template.tasks.length}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/75 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Updated
                      </p>
                      <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                        {daysAgo(template.updatedAt)}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/75 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Required tasks
                      </p>
                      <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                        {requiredCount} of {template.tasks.length}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/75 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Role lane
                      </p>
                      <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                        {template.roleType ?? "General"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)]/76 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          Launch sequence
                        </p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          Preview the first actions this template will stamp
                          into a new onboarding run.
                        </p>
                      </div>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Showing {Math.min(template.tasks.length, 4)} of{" "}
                        {template.tasks.length}
                      </span>
                    </div>

                    {template.tasks.length > 0 ? (
                      <div className="mt-4 space-y-2.5">
                        {template.tasks.slice(0, 4).map((task, index) => (
                          <div
                            key={`${template.id}-${task.title}-${index}`}
                            className="flex items-start gap-3 rounded-[20px] bg-[var(--surface-1)] p-3"
                          >
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-xs font-bold"
                              style={{
                                backgroundColor: tone.surface,
                                color: tone.accent,
                              }}
                            >
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  {task.title}
                                </p>
                                {task.required && (
                                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                                    Required
                                  </span>
                                )}
                              </div>
                              {(task.description ||
                                task.assigneeRole ||
                                task.dueDays) && (
                                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                                  {task.description ??
                                    `${task.assigneeRole ?? "Shared ownership"}${task.dueDays ? ` · due in ${task.dueDays} days` : ""}`}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[20px] bg-[var(--surface-1)] p-4 text-sm text-[var(--text-secondary)]">
                        No task definitions added yet. Open the template to
                        build the launch sequence.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setEditId(template.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                    >
                      Edit Template
                      <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete template "${template.name}"?`)) {
                          deleteTemplate.mutate(template.id);
                        }
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <TemplateModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
          />
        )}
        {editId && editTemplate && (
          <TemplateModal
            open={!!editId}
            onClose={() => setEditId(null)}
            editTemplate={editTemplate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"checklists" | "templates">(
    "checklists",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useChecklists(
    page,
    20,
    "onboarding",
    statusFilter || undefined,
  );

  const { data: allChecklistsData, isLoading: allLoading } = useChecklists(
    1,
    100,
    "onboarding",
  );
  const { data: templates, isLoading: templatesLoading } =
    useChecklistTemplates("onboarding");

  const checklists = data?.data ?? [];
  const allChecklists = allChecklistsData?.data ?? [];
  const meta = data?.meta;
  const templateList = templates ?? [];
  const templateCount = templateList.length;

  const onboardingStats = useMemo(() => {
    const total = allChecklists.length;
    const pending = allChecklists.filter((c) => c.status === "pending").length;
    const inProgress = allChecklists.filter(
      (c) => c.status === "in_progress",
    ).length;
    const completed = allChecklists.filter(
      (c) => c.status === "completed",
    ).length;
    const avgCompletion =
      total > 0
        ? Math.round(
            allChecklists.reduce(
              (sum, checklist) => sum + checklist.completionPct,
              0,
            ) / total,
          )
        : 0;

    return { total, pending, inProgress, completed, avgCompletion };
  }, [allChecklists]);

  const posture = onboardingPosture(
    onboardingStats.pending,
    onboardingStats.inProgress,
    onboardingStats.avgCompletion,
  );

  const filteredChecklists = useMemo(() => {
    if (!searchQuery.trim()) return checklists;
    const q = searchQuery.toLowerCase();
    return checklists.filter(
      (c) =>
        c.userId.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.templateId && c.templateId.toLowerCase().includes(q)),
    );
  }, [checklists, searchQuery]);

  const tabs = [
    {
      key: "checklists" as const,
      label: "Checklists",
      icon: ClipboardList,
      count: meta?.totalItems ?? 0,
    },
    {
      key: "templates" as const,
      label: "Templates",
      icon: FileText,
      count: templateList.length,
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(59, 130, 246, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(59,130,246,0.16), transparent 32%), radial-gradient(circle at 88% 16%, rgba(139,92,246,0.14), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(59, 130, 246, 0.3)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${posture.badgeClass}`}
              >
                <Sparkles size={14} />
                {posture.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <UserPlus size={14} className="text-[#2563EB]" />
                Onboarding command center
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                Onboarding
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                Manage onboarding checklists and templates for new team members
                with a clearer operating view, stronger completion discipline,
                and reusable setup paths.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <HeroActionButton
                icon={Plus}
                label="Start Onboarding"
                primary
                onClick={() => setShowCreateModal(true)}
              />
              <HeroActionButton
                icon={ClipboardList}
                label="Open Checklists"
                onClick={() => setActiveTab("checklists")}
              />
              <HeroActionButton
                icon={FileText}
                label="Manage Templates"
                onClick={() => setActiveTab("templates")}
              />
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
                  Workflow posture
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Onboarding pulse
                </h2>
              </div>
              <Activity size={20} className="text-[var(--primary)]" />
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {posture.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Active runs
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {allLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    onboardingStats.pending + onboardingStats.inProgress
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Avg completion
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {allLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    `${onboardingStats.avgCompletion}%`
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Completed
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {allLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    onboardingStats.completed
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Templates
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {templatesLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    templateCount
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <SummaryStats checklists={allChecklists} isLoading={allLoading} />

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const tabCopy = ONBOARDING_TAB_COPY[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="relative overflow-hidden rounded-[28px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderColor: isActive ? tabCopy.accent : "var(--border)",
                  backgroundColor: isActive
                    ? `${tabCopy.accent}10`
                    : "var(--surface-0)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: isActive
                        ? `${tabCopy.accent}18`
                        : "var(--surface-1)",
                      color: isActive
                        ? tabCopy.accent
                        : "var(--text-secondary)",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: isActive
                            ? tabCopy.accent
                            : "var(--text-primary)",
                        }}
                      >
                        {tab.label}
                      </p>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                        style={{
                          backgroundColor: isActive
                            ? `${tabCopy.accent}16`
                            : "var(--surface-2)",
                          color: isActive
                            ? tabCopy.accent
                            : "var(--text-secondary)",
                        }}
                      >
                        {tab.count}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {tabCopy.description}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="onboarding-tab"
                    className="absolute inset-x-0 top-0 h-1 rounded-t-[28px]"
                    style={{ backgroundColor: tabCopy.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "checklists" ? (
          <motion.div
            key="checklists"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Search & Filters */}
            <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Checklist board
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Active onboarding runs
                  </h2>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {meta?.totalItems ?? 0} run
                  {(meta?.totalItems ?? 0) === 1 ? "" : "s"} in scope
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full sm:max-w-sm">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                  />
                  <input
                    type="text"
                    placeholder="Search by user ID, checklist ID, or template ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {CHECKLIST_STATUSES.map((statusOption) => {
                  const active = statusOption.value === statusFilter;
                  return (
                    <button
                      key={statusOption.label}
                      type="button"
                      onClick={() => {
                        setStatusFilter(statusOption.value);
                        setPage(1);
                      }}
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
                      style={{
                        borderColor: active
                          ? "var(--primary)"
                          : "var(--border)",
                        backgroundColor: active
                          ? "rgba(59, 130, 246, 0.12)"
                          : "var(--surface-0)",
                        color: active
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {statusOption.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checklist Cards */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 animate-pulse"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-5 w-20 rounded-full bg-[var(--surface-2)]" />
                      <div className="h-4 w-16 rounded-full bg-[var(--surface-2)]" />
                    </div>
                    <div className="h-4 w-48 rounded bg-[var(--surface-2)] mb-3" />
                    <div className="h-2 w-full rounded-full bg-[var(--surface-2)]" />
                  </div>
                ))}
              </div>
            ) : filteredChecklists.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
                <UserPlus
                  size={32}
                  className="mx-auto text-[var(--text-secondary)] mb-3"
                />
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {searchQuery || statusFilter
                    ? "No checklists match your filters"
                    : "No onboarding checklists yet"}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4 max-w-sm mx-auto">
                  {searchQuery || statusFilter
                    ? "Try adjusting your search or filter criteria."
                    : "Start a new onboarding to begin tracking the setup process for new team members."}
                </p>
                {!searchQuery && !statusFilter && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    <Plus size={14} />
                    Start First Onboarding
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChecklists.map((checklist) => (
                  <ChecklistCard
                    key={checklist.id}
                    checklist={checklist}
                    expanded={expandedId === checklist.id}
                    onToggle={() =>
                      setExpandedId(
                        expandedId === checklist.id ? null : checklist.id,
                      )
                    }
                    templates={templateList}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-[var(--text-secondary)]">
                  Page {meta.page} of {meta.totalPages} ({meta.totalItems}{" "}
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
        ) : (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <TemplatesTab
              templates={templateList}
              isLoading={templatesLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Checklist Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateChecklistModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            templates={templateList}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
