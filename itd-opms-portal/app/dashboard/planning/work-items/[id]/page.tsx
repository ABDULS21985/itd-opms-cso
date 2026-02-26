"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  Play,
  Eye,
  CheckCircle,
  Ban,
  Unlock,
  Clock,
  Plus,
  User,
  Calendar,
  Tag,
  Timer,
  ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useWorkItem,
  useTransitionWorkItem,
  useLogTimeEntry,
  useTimeEntries,
  useWBSTree,
} from "@/hooks/use-planning";
import type { WorkItem } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  high: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" },
  medium: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  low: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

type TransitionAction = {
  label: string;
  target: string;
  icon: React.ReactNode;
  className: string;
};

function getTransitions(status: string): TransitionAction[] {
  const s = status.toLowerCase();
  const actions: TransitionAction[] = [];

  if (s === "todo") {
    actions.push({
      label: "Start",
      target: "in_progress",
      icon: <Play size={16} />,
      className:
        "bg-blue-600 text-white hover:opacity-90",
    });
  }

  if (s === "in_progress") {
    actions.push({
      label: "Review",
      target: "in_review",
      icon: <Eye size={16} />,
      className:
        "bg-amber-500 text-white hover:opacity-90",
    });
    actions.push({
      label: "Block",
      target: "blocked",
      icon: <Ban size={16} />,
      className:
        "border border-red-300 bg-red-50 text-red-700 hover:opacity-90",
    });
  }

  if (s === "in_review") {
    actions.push({
      label: "Complete",
      target: "done",
      icon: <CheckCircle size={16} />,
      className:
        "bg-green-600 text-white hover:opacity-90",
    });
    actions.push({
      label: "Block",
      target: "blocked",
      icon: <Ban size={16} />,
      className:
        "border border-red-300 bg-red-50 text-red-700 hover:opacity-90",
    });
  }

  if (s === "blocked") {
    actions.push({
      label: "Unblock",
      target: "in_progress",
      icon: <Unlock size={16} />,
      className:
        "bg-blue-600 text-white hover:opacity-90",
    });
  }

  if (s === "done") {
    // No forward transitions from done
  }

  return actions;
}

/* ------------------------------------------------------------------ */
/*  Priority Badge                                                     */
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

/* ------------------------------------------------------------------ */
/*  Children List                                                      */
/* ------------------------------------------------------------------ */

function ChildrenList({
  children,
  onNavigate,
}: {
  children: WorkItem[];
  onNavigate: (id: string) => void;
}) {
  if (children.length === 0) return null;

  return (
    <div className="space-y-2">
      {children.map((child) => (
        <div
          key={child.id}
          onClick={() => onNavigate(child.id)}
          className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 cursor-pointer transition-colors hover:bg-[var(--surface-1)]"
        >
          <div className="flex items-center gap-3">
            <ClipboardList
              size={16}
              className="text-[var(--neutral-gray)]"
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {child.title}
              </p>
              <span className="text-xs text-[var(--neutral-gray)] capitalize">
                {child.type}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={child.status} />
            <ChevronRight
              size={16}
              className="text-[var(--neutral-gray)]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WorkItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: workItem, isLoading } = useWorkItem(id);
  const { data: timeEntries } = useTimeEntries(id);
  const { data: wbsTree } = useWBSTree(workItem?.projectId ?? "");

  const transitionWorkItem = useTransitionWorkItem();
  const logTimeEntry = useLogTimeEntry(id);

  /* ---- Time Entry Form ---- */
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [timeHours, setTimeHours] = useState("");
  const [timeDescription, setTimeDescription] = useState("");
  const [timeDate, setTimeDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  function handleLogTime(e: React.FormEvent) {
    e.preventDefault();
    if (!timeHours || Number(timeHours) <= 0) return;

    logTimeEntry.mutate(
      {
        workItemId: id,
        hours: Number(timeHours),
        description: timeDescription.trim() || undefined,
        loggedDate: timeDate,
      },
      {
        onSuccess: () => {
          setTimeHours("");
          setTimeDescription("");
          setShowTimeForm(false);
        },
      },
    );
  }

  /* ---- Find children from WBS tree ---- */
  function findChildren(tree: WorkItem[] | undefined): WorkItem[] {
    if (!tree) return [];
    for (const node of tree) {
      if (node.id === id) return node.children ?? [];
      const found = findChildren(node.children);
      if (found.length > 0) return found;
    }
    return [];
  }

  const childrenItems = findChildren(wbsTree);

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
            Loading work item...
          </p>
        </div>
      </div>
    );
  }

  if (!workItem) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">
          Work item not found.
        </p>
      </div>
    );
  }

  const transitions = getTransitions(workItem.status);

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
          onClick={() => router.push("/dashboard/planning/work-items")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Work Items
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <ClipboardList size={24} className="text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {workItem.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={workItem.status} />
              <PriorityBadge priority={workItem.priority} />
              <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                {workItem.type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {transitions.map((action) => (
            <button
              key={action.target}
              type="button"
              disabled={transitionWorkItem.isPending}
              onClick={() =>
                transitionWorkItem.mutate({
                  id: workItem.id,
                  status: action.target,
                })
              }
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50 ${action.className}`}
            >
              {transitionWorkItem.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                action.icon
              )}
              {action.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Metadata Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            <User size={14} />
            Assignee
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {workItem.assigneeId
              ? workItem.assigneeId.slice(0, 8) + "..."
              : "Unassigned"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            <User size={14} />
            Reporter
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {workItem.reporterId
              ? workItem.reporterId.slice(0, 8) + "..."
              : "Not set"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            <Timer size={14} />
            Hours
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {workItem.actualHours ?? 0}h / {workItem.estimatedHours ?? 0}h
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            <Calendar size={14} />
            Due Date
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {workItem.dueDate
              ? new Date(workItem.dueDate).toLocaleDateString()
              : "Not set"}
          </p>
        </div>
      </motion.div>

      {/* Description */}
      {workItem.description && (
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
            {workItem.description}
          </p>
        </motion.div>
      )}

      {/* Tags */}
      {workItem.tags && workItem.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.17 }}
          className="flex flex-wrap items-center gap-2"
        >
          <Tag size={14} className="text-[var(--neutral-gray)]" />
          {workItem.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </motion.div>
      )}

      {/* Time Entries */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Time Entries
          </h2>
          <button
            type="button"
            onClick={() => setShowTimeForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Plus size={14} />
            Log Time
          </button>
        </div>

        {/* Log Time Form */}
        {showTimeForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleLogTime}
            className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-primary)]">
                  Hours <span className="text-[var(--error)]">*</span>
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={timeHours}
                  onChange={(e) => setTimeHours(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-primary)]">
                  Date
                </label>
                <input
                  type="date"
                  value={timeDate}
                  onChange={(e) => setTimeDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-primary)]">
                  Description
                </label>
                <input
                  type="text"
                  value={timeDescription}
                  onChange={(e) => setTimeDescription(e.target.value)}
                  placeholder="What did you work on?"
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTimeForm(false)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-0)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={logTimeEntry.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {logTimeEntry.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Clock size={12} />
                )}
                Save Entry
              </button>
            </div>
          </motion.form>
        )}

        {/* Time Entries List */}
        {!timeEntries || timeEntries.length === 0 ? (
          <p className="text-sm text-[var(--neutral-gray)]">
            No time entries logged yet.
          </p>
        ) : (
          <div className="space-y-2">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                    <Clock
                      size={16}
                      className="text-[var(--neutral-gray)]"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {entry.hours}h
                      {entry.description && (
                        <span className="ml-2 font-normal text-[var(--text-secondary)]">
                          — {entry.description}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      {new Date(entry.loggedDate).toLocaleDateString()} by{" "}
                      {entry.userId.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Children Work Items */}
      {childrenItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Children Work Items
          </h2>
          <ChildrenList
            children={childrenItems}
            onNavigate={(childId) =>
              router.push(`/dashboard/planning/work-items/${childId}`)
            }
          />
        </motion.div>
      )}

      {/* Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Metadata
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Project ID
            </dt>
            <dd className="text-[var(--text-primary)]">
              {workItem.projectId}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Parent ID
            </dt>
            <dd className="text-[var(--text-primary)]">
              {workItem.parentId || "None (root level)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Created At
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(workItem.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Last Updated
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(workItem.updatedAt).toLocaleString()}
            </dd>
          </div>
          {workItem.completedAt && (
            <div>
              <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                Completed At
              </dt>
              <dd className="text-[var(--text-primary)]">
                {new Date(workItem.completedAt).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </motion.div>
    </div>
  );
}
