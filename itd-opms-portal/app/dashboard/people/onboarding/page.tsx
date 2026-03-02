"use client";

import { useState, useMemo } from "react";
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

const TASK_STATUSES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280", label: "Pending" },
  in_progress: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", label: "In Progress" },
  completed: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", label: "Completed" },
  skipped: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", label: "Skipped" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isOverdue(task: ChecklistTask): boolean {
  if (task.status === "completed" || task.status === "skipped" || !task.dueDate) return false;
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
    const inProgress = checklists.filter((c) => c.status === "in_progress").length;
    const completed = checklists.filter((c) => c.status === "completed").length;
    const avgCompletion =
      total > 0
        ? Math.round(checklists.reduce((s, c) => s + c.completionPct, 0) / total)
        : 0;
    return { total, pending, inProgress, completed, avgCompletion };
  }, [checklists]);

  const cards = [
    {
      label: "Total Checklists",
      value: stats.total,
      color: "#3B82F6",
      bg: "rgba(59, 130, 246, 0.1)",
    },
    {
      label: "Pending",
      value: stats.pending,
      color: "#6B7280",
      bg: "rgba(107, 114, 128, 0.1)",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.1)",
    },
    {
      label: "Completed",
      value: stats.completed,
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.1)",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
        >
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
            {card.label}
          </p>
          {isLoading ? (
            <div className="h-7 w-12 rounded bg-[var(--surface-2)] animate-pulse" />
          ) : (
            <p className="text-2xl font-bold tabular-nums" style={{ color: card.color }}>
              {card.value}
            </p>
          )}
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

function TaskList({ checklistId, checklistStatus }: { checklistId: string; checklistStatus: string }) {
  const { data: tasks, isLoading } = useChecklistTasks(checklistId);
  const completeMutation = useCompleteChecklistTask();
  const deleteMutation = useDeleteChecklistTask();
  const [addingTask, setAddingTask] = useState(false);
  const items = tasks ?? [];
  const canEdit = checklistStatus !== "completed" && checklistStatus !== "cancelled";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
        <span className="ml-2 text-xs text-[var(--text-secondary)]">Loading tasks...</span>
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
            <span className="font-semibold text-[var(--text-primary)]">{completedCount}</span> of{" "}
            <span className="font-semibold text-[var(--text-primary)]">{items.length}</span> tasks
            done
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
          <ClipboardList size={20} className="mx-auto text-[var(--text-secondary)] mb-1.5" />
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
            const isCompleted = task.status === "completed" || task.status === "skipped";
            const overdue = isOverdue(task);
            const taskStyle = TASK_STATUSES[task.status] ?? TASK_STATUSES.pending;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-[var(--surface-2)]"
                style={{
                  backgroundColor: overdue ? "rgba(239, 68, 68, 0.04)" : undefined,
                  borderLeft: overdue
                    ? "3px solid #EF4444"
                    : "3px solid transparent",
                }}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  disabled={isCompleted || !canEdit || completeMutation.isPending}
                  onClick={() => completeMutation.mutate(task.id)}
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
                        color: isCompleted ? "var(--text-secondary)" : "var(--text-primary)",
                        textDecoration: isCompleted ? "line-through" : "none",
                      }}
                    >
                      {task.title}
                    </p>
                    {overdue && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }}
                      >
                        <AlertTriangle size={9} />
                        Overdue
                      </span>
                    )}
                    <span
                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                      style={{ backgroundColor: taskStyle.bg, color: taskStyle.text }}
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
                        style={{ color: overdue ? "#EF4444" : "var(--text-secondary)" }}
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
                    <Trash2 size={14} className="text-[var(--text-secondary)] hover:text-[#EF4444]" />
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
          <AddTaskForm checklistId={checklistId} onClose={() => setAddingTask(false)} />
        ) : (
          canEdit && items.length > 0 && (
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
  const canChangeStatus = checklist.status !== "completed" && checklist.status !== "cancelled";

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: checklist.id, status: newStatus });
    setShowActions(false);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this checklist? This action cannot be undone.")) {
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
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden transition-shadow hover:shadow-sm"
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <button
            type="button"
            onClick={onToggle}
            className="flex-1 text-left min-w-0"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
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
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              User: {checklist.userId.slice(0, 12)}...
            </p>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-3 relative">
            <button type="button" onClick={onToggle}>
              {expanded ? (
                <ChevronUp size={16} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown size={16} className="text-[var(--text-secondary)]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowActions(!showActions)}
              className="p-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            >
              <MoreHorizontal size={16} className="text-[var(--text-secondary)]" />
            </button>

            {/* Dropdown menu */}
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
                    className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg overflow-hidden"
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

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-secondary)]">Progress</span>
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: statusStyle.text }}
            >
              {checklist.completionPct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${checklist.completionPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: statusStyle.text }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="flex flex-wrap items-center gap-3 mt-2.5">
          <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
            Created {daysAgo(checklist.createdAt)}
          </span>
          {checklist.startedAt && (
            <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
              Started {formatDate(checklist.startedAt)}
            </span>
          )}
          {checklist.completedAt && (
            <span className="text-[10px] text-[#10B981] font-medium tabular-nums">
              Completed {formatDate(checklist.completedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Tasks */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
              <ClipboardList size={12} />
              Onboarding Tasks
            </h3>
            <TaskList checklistId={checklist.id} checklistStatus={checklist.status} />
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
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              User ID <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter user UUID or employee ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

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
                    {t.roleType ? ` (${t.roleType})` : ""} — {t.tasks.length} tasks
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
  const [tasks, setTasks] = useState<TemplateTaskDef[]>(editTemplate?.tasks ?? []);
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
                    <GripVertical size={14} className="text-[var(--text-secondary)] shrink-0" />
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
                        <ChevronUp size={12} className="text-[var(--text-secondary)]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTask(idx, 1)}
                        disabled={idx === tasks.length - 1}
                        className="p-1 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 transition-all"
                      >
                        <ChevronDown size={12} className="text-[var(--text-secondary)]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTask(idx)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <Trash2 size={12} className="text-[var(--text-secondary)] hover:text-[#EF4444]" />
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

function TemplatesTab({ templates, isLoading }: { templates: PeopleChecklistTemplate[]; isLoading: boolean }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const deleteTemplate = useDeleteChecklistTemplate();

  const editTemplate = templates.find((t) => t.id === editId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          New Template
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
          <FileText size={24} className="mx-auto text-[var(--text-secondary)] mb-2" />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No templates yet
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
            Create templates to standardize your onboarding process.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((template, idx) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {template.name}
                    </h3>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: template.isActive
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(107, 114, 128, 0.1)",
                        color: template.isActive ? "#10B981" : "#6B7280",
                      }}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {template.roleType && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Role: {template.roleType}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-[var(--text-secondary)]">
                  {template.tasks.length} task{template.tasks.length !== 1 ? "s" : ""}
                </span>
                <span className="text-[var(--border)]">|</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  Updated {daysAgo(template.updatedAt)}
                </span>
              </div>

              {/* Task preview */}
              {template.tasks.length > 0 && (
                <div className="mb-3 space-y-1">
                  {template.tasks.slice(0, 3).map((task, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Circle size={10} className="shrink-0" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {template.tasks.length > 3 && (
                    <p className="text-[10px] text-[var(--text-secondary)] pl-5">
                      +{template.tasks.length - 3} more tasks
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditId(template.id)}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete template "${template.name}"?`)) {
                      deleteTemplate.mutate(template.id);
                    }
                  }}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <TemplateModal open={showCreate} onClose={() => setShowCreate(false)} />
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
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"checklists" | "templates">("checklists");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useChecklists(
    page,
    20,
    "onboarding",
    statusFilter || undefined,
  );

  const { data: allChecklistsData, isLoading: allLoading } = useChecklists(1, 100, "onboarding");
  const { data: templates, isLoading: templatesLoading } = useChecklistTemplates("onboarding");

  const checklists = data?.data ?? [];
  const allChecklists = allChecklistsData?.data ?? [];
  const meta = data?.meta;
  const templateList = templates ?? [];

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
              Onboarding
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage onboarding checklists and templates for new team members
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 self-start sm:self-auto"
        >
          <Plus size={16} />
          Start Onboarding
        </button>
      </motion.div>

      {/* Summary Stats */}
      <SummaryStats checklists={allChecklists} isLoading={allLoading} />

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex items-center gap-1 border-b border-[var(--border)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: isActive ? "var(--primary)" : "var(--text-secondary)",
                }}
              >
                <Icon size={15} />
                {tab.label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                  style={{
                    backgroundColor: isActive
                      ? "rgba(59, 130, 246, 0.1)"
                      : "var(--surface-2)",
                    color: isActive ? "var(--primary)" : "var(--text-secondary)",
                  }}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="onboarding-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full"
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
          >
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <input
                  type="text"
                  placeholder="Search by user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((f) => !f)}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                <Filter size={15} />
                Filters
                {statusFilter && (
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                )}
              </button>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
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
                  {statusFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("");
                        setPage(1);
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-1)] transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

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
                      setExpandedId(expandedId === checklist.id ? null : checklist.id)
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
                  Page {meta.page} of {meta.totalPages} ({meta.totalItems} total)
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
            <TemplatesTab templates={templateList} isLoading={templatesLoading} />
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
