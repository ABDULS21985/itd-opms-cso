"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Flag,
  Plus,
  Loader2,
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProjectPicker } from "@/components/shared/pickers";
import {
  useMilestones,
  useCreateMilestone,
  useDeleteMilestone,
} from "@/hooks/use-planning";
import type { PlanningMilestone } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getMilestoneProgress(milestone: PlanningMilestone): {
  label: string;
  color: string;
  pct: number;
} {
  const s = milestone.status.toLowerCase();

  if (s === "completed" || milestone.actualDate) {
    const targetDate = new Date(milestone.targetDate);
    const actualDate = milestone.actualDate
      ? new Date(milestone.actualDate)
      : new Date();
    if (actualDate <= targetDate) {
      return { label: "On Track", color: "#10B981", pct: 100 };
    }
    return { label: "Missed (Late)", color: "#EF4444", pct: 100 };
  }

  if (s === "cancelled") {
    return { label: "Cancelled", color: "#6B7280", pct: 0 };
  }

  // In progress or pending — determine if at risk based on due date proximity
  const now = new Date();
  const target = new Date(milestone.targetDate);
  const totalDays = Math.max(
    1,
    (target.getTime() - new Date(milestone.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const elapsedDays = Math.max(
    0,
    (now.getTime() - new Date(milestone.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const pct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  if (now > target) {
    return { label: "Overdue", color: "#EF4444", pct: 100 };
  }

  const daysRemaining =
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysRemaining < 7) {
    return { label: "At Risk", color: "#F59E0B", pct };
  }

  return { label: "On Track", color: "#10B981", pct };
}

function ProgressIndicator({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  const Icon =
    label === "On Track"
      ? CheckCircle
      : label === "At Risk"
        ? AlertTriangle
        : XCircle;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color }}
    >
      <Icon size={14} />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Milestone Dialog                                            */
/* ------------------------------------------------------------------ */

function CreateMilestoneForm({
  projectId,
  onClose,
}: {
  projectId?: string;
  onClose: () => void;
}) {
  const createMilestone = useCreateMilestone();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [completionCriteria, setCompletionCriteria] = useState("");
  const [formProjectId, setFormProjectId] = useState(projectId ?? "");
  const [projectDisplay, setProjectDisplay] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!targetDate) newErrors.targetDate = "Target date is required";
    if (!formProjectId.trim())
      newErrors.projectId = "Project ID is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createMilestone.mutate(
      {
        projectId: formProjectId.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: `${targetDate}T00:00:00Z`,
        completionCriteria: completionCriteria.trim() || undefined,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
    >
      <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">
        New Milestone
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Title <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Phase 1 Completion"
              className={`h-10 w-full rounded-xl border bg-[var(--surface-0)] px-3.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] ${
                errors.title
                  ? "border-[var(--error)]"
                  : "border-[var(--border)]"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-[var(--error)]">
                {errors.title}
              </p>
            )}
          </div>
          <div>
            <ProjectPicker
              label="Project"
              required
              value={formProjectId || undefined}
              displayValue={projectDisplay}
              onChange={(id, title) => { setFormProjectId(id ?? ""); setProjectDisplay(title); }}
              error={errors.projectId}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Target Date <span className="text-[var(--error)]">*</span>
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={`h-10 w-full rounded-xl border bg-[var(--surface-0)] px-3.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] ${
              errors.targetDate
                ? "border-[var(--error)]"
                : "border-[var(--border)]"
            }`}
          />
          {errors.targetDate && (
            <p className="mt-1 text-xs text-[var(--error)]">
              {errors.targetDate}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief milestone description"
            rows={2}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Completion Criteria
          </label>
          <textarea
            value={completionCriteria}
            onChange={(e) => setCompletionCriteria(e.target.value)}
            placeholder="What defines successful completion?"
            rows={2}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMilestone.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createMilestone.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Flag size={16} />
            )}
            Create Milestone
          </button>
        </div>
      </form>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MilestonesPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id") ?? undefined;

  const { data: milestones, isLoading } = useMilestones(projectId);
  const deleteMilestone = useDeleteMilestone();

  const [showCreateForm, setShowCreateForm] = useState(false);

  const items = milestones ?? [];

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(139,92,246,0.1)]">
            <Flag size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Milestones
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Track project milestones and delivery targets
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          New Milestone
        </button>
      </motion.div>

      {/* Create Form */}
      {showCreateForm && (
        <CreateMilestoneForm
          projectId={projectId}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Title
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Target Date
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Actual Date
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Status
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Progress
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2
                        size={24}
                        className="animate-spin text-[var(--primary)]"
                      />
                      <p className="text-sm text-[var(--neutral-gray)]">
                        Loading milestones...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                        <Flag
                          size={24}
                          className="text-[var(--neutral-gray)]"
                        />
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        No milestones found
                      </p>
                      <p className="text-sm text-[var(--neutral-gray)]">
                        Create your first milestone to track project delivery.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((milestone) => {
                  const progress = getMilestoneProgress(milestone);
                  return (
                    <tr
                      key={milestone.id}
                      className="border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--surface-1)]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.1)]">
                            <Flag
                              size={16}
                              style={{ color: "#8B5CF6" }}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {milestone.title}
                            </p>
                            {milestone.description && (
                              <p className="text-xs text-[var(--neutral-gray)] line-clamp-1 max-w-[250px]">
                                {milestone.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                          <Calendar size={14} />
                          {new Date(
                            milestone.targetDate,
                          ).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {milestone.actualDate
                            ? new Date(
                                milestone.actualDate,
                              ).toLocaleDateString()
                            : "--"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={milestone.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5 min-w-[140px]">
                          <ProgressIndicator
                            label={progress.label}
                            color={progress.color}
                          />
                          <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)]">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${progress.pct}%`,
                                backgroundColor: progress.color,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            deleteMilestone.mutate(milestone.id)
                          }
                          className="inline-flex items-center rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete milestone"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
