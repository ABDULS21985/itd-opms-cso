"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Flag,
  Layers3,
  Loader2,
  Plus,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProjectPicker } from "@/components/shared/pickers";
import {
  useMilestones,
  useCreateMilestone,
  useDeleteMilestone,
} from "@/hooks/use-planning";
import type { PlanningMilestone } from "@/types";

const PANEL_CLASS =
  "rounded-[1.8rem] border border-[var(--border)] bg-[var(--surface-0)] shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";
const SOFT_PANEL_CLASS =
  "rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] shadow-[0_12px_30px_rgba(15,23,42,0.05)]";
const PRIMARY_BUTTON_STYLE = {
  backgroundImage: "var(--gradient-primary)",
  borderColor: "var(--primary-light)",
  boxShadow: "var(--shadow-premium)",
};
const HERO_STYLE = {
  backgroundImage:
    "radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 38%), radial-gradient(circle at bottom left, rgba(139,111,46,0.18), transparent 34%), var(--gradient-primary)",
  borderColor: "rgba(45,155,86,0.32)",
  boxShadow: "var(--shadow-premium)",
};

type MilestoneView = "all" | "attention" | "upcoming" | "completed";

function formatDateLabel(value?: string) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCompactDate(value?: string) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysUntil(value?: string) {
  if (!value) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isSameOrBefore(a: string, b: string) {
  return new Date(a).getTime() <= new Date(b).getTime();
}

function getMilestoneProgress(milestone: PlanningMilestone): {
  label: string;
  accent: string;
  track: string;
  pct: number;
} {
  const status = milestone.status.toLowerCase();

  if (status === "completed" || milestone.actualDate) {
    if (
      milestone.actualDate &&
      isSameOrBefore(milestone.actualDate, milestone.targetDate)
    ) {
      return {
        label: "Completed On Time",
        accent: "var(--success)",
        track: "var(--success-light)",
        pct: 100,
      };
    }

    return {
      label: "Completed Late",
      accent: "var(--warning)",
      track: "var(--warning-light)",
      pct: 100,
    };
  }

  if (status === "missed") {
    return {
      label: "Missed Target",
      accent: "var(--error)",
      track: "var(--error-light)",
      pct: 100,
    };
  }

  const days = daysUntil(milestone.targetDate);
  const totalDays = Math.max(
    1,
    Math.round(
      (new Date(milestone.targetDate).getTime() -
        new Date(milestone.createdAt).getTime()) /
        86400000,
    ),
  );
  const elapsedDays = Math.max(
    0,
    Math.round(
      (Date.now() - new Date(milestone.createdAt).getTime()) / 86400000,
    ),
  );
  const pct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  if (days < 0) {
    return {
      label: "Overdue",
      accent: "var(--error)",
      track: "var(--error-light)",
      pct: 100,
    };
  }

  if (days <= 7) {
    return {
      label: "At Risk",
      accent: "var(--warning)",
      track: "var(--warning-light)",
      pct,
    };
  }

  if (days <= 30) {
    return {
      label: "Upcoming",
      accent: "var(--gold)",
      track: "var(--badge-amber-bg)",
      pct,
    };
  }

  return {
    label: "On Track",
    accent: "var(--success)",
    track: "var(--success-light)",
    pct,
  };
}

function getDueCopy(milestone: PlanningMilestone) {
  if (milestone.actualDate) {
    return `Delivered ${formatDateLabel(milestone.actualDate)}`;
  }

  const diff = daysUntil(milestone.targetDate);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `${diff}d remaining`;
}

function ProgressIndicator({
  label,
  accent,
}: {
  label: string;
  accent: string;
}) {
  const Icon =
    label === "Completed On Time"
      ? CheckCircle2
      : label === "On Track"
        ? ShieldCheck
        : label === "Upcoming"
          ? Calendar
          : label === "At Risk"
            ? AlertTriangle
            : XCircle;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold"
      style={{ color: accent }}
    >
      <Icon size={14} />
      {label}
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  copy,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  copy: string;
}) {
  return (
    <div className={`${SOFT_PANEL_CLASS} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--success-light)] text-[var(--primary)]">
          {icon}
        </span>
        <ArrowRight size={16} className="text-[var(--gold)]" />
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {copy}
      </p>
    </div>
  );
}

function MilestoneLane({
  title,
  copy,
  items,
  emptyCopy,
}: {
  title: string;
  copy: string;
  items: PlanningMilestone[];
  emptyCopy: string;
}) {
  return (
    <section className={`${PANEL_CLASS} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{copy}</p>
        </div>
        <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          {items.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className={`${SOFT_PANEL_CLASS} p-4`}>
            <p className="text-sm text-[var(--text-secondary)]">{emptyCopy}</p>
          </div>
        ) : (
          items.slice(0, 3).map((milestone) => {
            const progress = getMilestoneProgress(milestone);

            return (
              <div
                key={milestone.id}
                className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--badge-amber-bg)] text-[var(--gold-dark)]">
                    <Flag size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {milestone.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={milestone.status} />
                      <ProgressIndicator
                        label={progress.label}
                        accent={progress.accent}
                      />
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-secondary)]">
                      {getDueCopy(milestone)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

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

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "Title is required";
    if (!targetDate) nextErrors.targetDate = "Target date is required";
    if (!formProjectId.trim()) nextErrors.projectId = "Project is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    createMilestone.mutate(
      {
        projectId: formProjectId.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: `${targetDate}T00:00:00Z`,
        completionCriteria: completionCriteria.trim() || undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`${PANEL_CLASS} p-6`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--success-light)] bg-[var(--success-light)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
            <Sparkles size={12} />
            New milestone
          </div>
          <h2 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
            Capture a delivery checkpoint
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Define the checkpoint, due date, and completion criteria in one
            pass.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-2)]"
        >
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Title <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Phase 1 readiness gate"
              className={`h-11 w-full rounded-2xl border bg-[var(--surface-1)] px-3.5 text-sm text-[var(--text-primary)] transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)] ${
                errors.title ? "border-[var(--error)]" : "border-[var(--border)]"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-[var(--error)]">{errors.title}</p>
            )}
          </div>

          <div>
            <ProjectPicker
              label="Project"
              required
              value={formProjectId || undefined}
              displayValue={projectDisplay}
              onChange={(id, titleText) => {
                setFormProjectId(id ?? "");
                setProjectDisplay(titleText);
              }}
              error={errors.projectId}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Target date <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className={`h-11 w-full rounded-2xl border bg-[var(--surface-1)] px-3.5 text-sm text-[var(--text-primary)] transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)] ${
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
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the checkpoint, scope boundary, or review gate."
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Completion criteria
          </label>
          <textarea
            rows={3}
            value={completionCriteria}
            onChange={(event) => setCompletionCriteria(event.target.value)}
            placeholder="List the evidence or acceptance threshold required to close the milestone."
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-2)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMilestone.isPending}
            className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={PRIMARY_BUTTON_STYLE}
          >
            {createMilestone.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Flag size={16} />
            )}
            Create milestone
          </button>
        </div>
      </form>
    </motion.section>
  );
}

export default function MilestonesPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id") ?? undefined;
  const { data: milestones, isLoading } = useMilestones(projectId);
  const deleteMilestone = useDeleteMilestone();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [view, setView] = useState<MilestoneView>("all");

  const items = milestones ?? [];

  const analytics = useMemo(() => {
    const total = items.length;
    const completed = items.filter(
      (item) => item.status.toLowerCase() === "completed" || item.actualDate,
    );
    const missed = items.filter(
      (item) => item.status.toLowerCase() === "missed",
    );
    const overdue = items.filter((item) => {
      const status = item.status.toLowerCase();
      return (
        !item.actualDate &&
        status !== "completed" &&
        daysUntil(item.targetDate) < 0
      );
    });
    const dueSoon = items.filter((item) => {
      const status = item.status.toLowerCase();
      const diff = daysUntil(item.targetDate);
      return (
        !item.actualDate && status !== "completed" && diff >= 0 && diff <= 14
      );
    });
    const dueThisMonth = items.filter((item) => {
      const target = new Date(item.targetDate);
      const now = new Date();
      return (
        target.getMonth() === now.getMonth() &&
        target.getFullYear() === now.getFullYear()
      );
    });
    const onTime = completed.filter(
      (item) =>
        item.actualDate && isSameOrBefore(item.actualDate, item.targetDate),
    );

    return {
      total,
      completed,
      missed,
      overdue,
      dueSoon,
      dueThisMonth,
      completionRate:
        total === 0 ? 0 : Math.round((completed.length / total) * 100),
      onTimeRate:
        completed.length === 0
          ? 0
          : Math.round((onTime.length / completed.length) * 100),
      nextMilestone:
        items.find(
          (item) =>
            !item.actualDate &&
            item.status.toLowerCase() !== "completed" &&
            daysUntil(item.targetDate) >= 0,
        ) ?? null,
      recentCompleted: [...completed]
        .sort(
          (a, b) =>
            new Date(b.actualDate ?? b.updatedAt).getTime() -
            new Date(a.actualDate ?? a.updatedAt).getTime(),
        )
        .slice(0, 3),
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    switch (view) {
      case "attention":
        return items.filter((item) => {
          const status = item.status.toLowerCase();
          const diff = daysUntil(item.targetDate);
          return (
            status === "missed" ||
            (!item.actualDate && status !== "completed" && diff <= 7)
          );
        });
      case "upcoming":
        return items.filter((item) => {
          const status = item.status.toLowerCase();
          const diff = daysUntil(item.targetDate);
          return (
            !item.actualDate && status !== "completed" && diff > 7 && diff <= 30
          );
        });
      case "completed":
        return items.filter(
          (item) =>
            item.status.toLowerCase() === "completed" || item.actualDate,
        );
      default:
        return items;
    }
  }, [items, view]);

  const filterPills = [
    { key: "all" as const, label: "All milestones", count: items.length },
    {
      key: "attention" as const,
      label: "Needs attention",
      count:
        analytics.overdue.length +
        analytics.missed.length +
        analytics.dueSoon.length,
    },
    {
      key: "upcoming" as const,
      label: "Upcoming",
      count: items.filter((item) => {
        const status = item.status.toLowerCase();
        const diff = daysUntil(item.targetDate);
        return (
          !item.actualDate && status !== "completed" && diff > 7 && diff <= 30
        );
      }).length,
    },
    {
      key: "completed" as const,
      label: "Completed",
      count: analytics.completed.length,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.2rem] border px-6 py-7 text-white"
        style={HERO_STYLE}
      >
        <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(139,111,46,0.16)" }}
        />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/84 backdrop-blur-xl">
              <Sparkles size={14} />
              Planning milestone studio
            </div>

            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/16 bg-white/14 shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-xl">
                <Flag size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.2rem]">
                  Milestones
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/84 sm:text-[15px]">
                  Track delivery checkpoints, surface risk earlier, and keep
                  each project milestone framed as an operational decision
                  point.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Layers3 size={14} />
                    {analytics.total} total checkpoints
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <ShieldCheck size={14} />
                    {analytics.completionRate}% delivered
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <AlertTriangle size={14} />
                    {analytics.overdue.length + analytics.missed.length}{" "}
                    critical signals
                  </span>
                  {projectId && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <Target size={14} />
                      Project scoped
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Next checkpoint
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                {analytics.nextMilestone?.title ?? "No active milestone"}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {analytics.nextMilestone
                  ? `${getDueCopy(analytics.nextMilestone)} · target ${formatCompactDate(analytics.nextMilestone.targetDate)}`
                  : "No pending milestone is currently scheduled."}
              </p>
            </div>
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Delivery discipline
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                {analytics.onTimeRate}% on-time execution
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Based on completed milestones with actual delivery dates.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Layers3 size={18} />}
          label="Milestone load"
          value={String(analytics.total)}
          copy="Total delivery checkpoints currently being tracked across the selected scope."
        />
        <MetricCard
          icon={<CheckCircle2 size={18} />}
          label="Completion rate"
          value={`${analytics.completionRate}%`}
          copy={`${analytics.completed.length} milestone${analytics.completed.length === 1 ? "" : "s"} delivered so far.`}
        />
        <MetricCard
          icon={<Radar size={18} />}
          label="Needs attention"
          value={String(
            analytics.overdue.length +
              analytics.missed.length +
              analytics.dueSoon.length,
          )}
          copy="Overdue, missed, and near-term checkpoints that need active intervention."
        />
        <MetricCard
          icon={<Clock3 size={18} />}
          label="Due this month"
          value={String(analytics.dueThisMonth.length)}
          copy="Near-horizon milestones landing inside the current calendar month."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <MilestoneLane
          title="Attention Queue"
          copy="Missed, overdue, and near-term milestones that need governance focus."
          items={[
            ...analytics.missed,
            ...analytics.overdue,
            ...analytics.dueSoon,
          ]}
          emptyCopy="No milestone currently needs intervention. The schedule is holding."
        />
        <MilestoneLane
          title="Upcoming Windows"
          copy="Checkpoint dates approaching within the next delivery horizon."
          items={items.filter((item) => {
            const status = item.status.toLowerCase();
            const diff = daysUntil(item.targetDate);
            return (
              !item.actualDate &&
              status !== "completed" &&
              diff >= 0 &&
              diff <= 30
            );
          })}
          emptyCopy="There are no milestones due in the next 30 days."
        />
        <MilestoneLane
          title="Recently Delivered"
          copy="Latest milestones that closed and moved the plan forward."
          items={analytics.recentCompleted}
          emptyCopy="No completed milestones yet. Delivered checkpoints will surface here."
        />
      </section>

      <AnimatePresence>
        {showCreateForm && (
          <CreateMilestoneForm
            projectId={projectId}
            onClose={() => setShowCreateForm(false)}
          />
        )}
      </AnimatePresence>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={`${PANEL_CLASS} p-5`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Milestone Ledger
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Review all checkpoints, filter the queue, and manage deletions
                from one control surface.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                {filterPills.map((pill) => {
                  const active = pill.key === view;
                  return (
                    <button
                      key={pill.key}
                      type="button"
                      onClick={() => setView(pill.key)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200"
                      style={{
                        backgroundColor: active
                          ? "var(--success-light)"
                          : "var(--surface-1)",
                        color: active
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                        borderColor: active
                          ? "rgba(27,115,64,0.22)"
                          : "var(--border)",
                      }}
                    >
                      {pill.label} · {pill.count}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowCreateForm((current) => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
                style={PRIMARY_BUTTON_STYLE}
              >
                <Plus size={16} />
                {showCreateForm ? "Hide composer" : "New milestone"}
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-[var(--border)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Milestone
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Actual
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Delivery signal
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2
                            size={24}
                            className="animate-spin text-[var(--primary)]"
                          />
                          <p className="text-sm text-[var(--text-secondary)]">
                            Loading milestones...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--text-secondary)]">
                            <Flag size={22} />
                          </div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            No milestones in this view
                          </p>
                          <p className="max-w-md text-sm text-[var(--text-secondary)]">
                            Adjust the current filter or create a new milestone
                            to populate the delivery ledger.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((milestone) => {
                      const progress = getMilestoneProgress(milestone);
                      return (
                        <tr
                          key={milestone.id}
                          className="border-b border-[var(--border)] bg-[var(--surface-0)] transition-colors last:border-b-0 hover:bg-[var(--surface-1)]"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--badge-amber-bg)] text-[var(--gold-dark)]">
                                <Flag size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  {milestone.title}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  {milestone.description ||
                                    "No narrative attached to this checkpoint."}
                                </p>
                                {milestone.completionCriteria && (
                                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                                    Criteria: {milestone.completionCriteria}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                            <div className="inline-flex items-center gap-2">
                              <Calendar size={14} />
                              {formatDateLabel(milestone.targetDate)}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                            {formatDateLabel(milestone.actualDate)}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={milestone.status} />
                          </td>
                          <td className="px-4 py-4">
                            <div className="min-w-[180px]">
                              <ProgressIndicator
                                label={progress.label}
                                accent={progress.accent}
                              />
                              <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--surface-2)]">
                                <div
                                  className="h-1.5 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${progress.pct}%`,
                                    backgroundColor: progress.accent,
                                  }}
                                />
                              </div>
                              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                                {getDueCopy(milestone)}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                deleteMilestone.mutate(milestone.id)
                              }
                              className="inline-flex items-center rounded-xl border border-[var(--error)]/15 bg-[var(--error-light)] p-2 text-[var(--error-dark)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Delete milestone"
                              disabled={deleteMilestone.isPending}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Delivery Radar
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Current distribution of milestone outcomes and risk.
                </p>
              </div>
              <Radar size={18} className="text-[var(--primary)]" />
            </div>

            <div className="mt-4 space-y-4">
              <div className={`${SOFT_PANEL_CLASS} p-4`}>
                <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                  <span>Delivered</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {analytics.completed.length}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-2 rounded-full bg-[var(--success)]"
                    style={{
                      width: `${analytics.total === 0 ? 0 : (analytics.completed.length / analytics.total) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className={`${SOFT_PANEL_CLASS} p-4`}>
                <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                  <span>Overdue or missed</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {analytics.overdue.length + analytics.missed.length}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-2 rounded-full bg-[var(--error)]"
                    style={{
                      width: `${analytics.total === 0 ? 0 : ((analytics.overdue.length + analytics.missed.length) / analytics.total) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className={`${SOFT_PANEL_CLASS} p-4`}>
                <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                  <span>Due within 14 days</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {analytics.dueSoon.length}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-2 rounded-full bg-[var(--warning)]"
                    style={{
                      width: `${analytics.total === 0 ? 0 : (analytics.dueSoon.length / analytics.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Upcoming cadence
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  The next milestone windows on deck.
                </p>
              </div>
              <Clock3 size={18} className="text-[var(--gold)]" />
            </div>

            <div className="mt-4 space-y-3">
              {items
                .filter((item) => {
                  const status = item.status.toLowerCase();
                  return (
                    !item.actualDate &&
                    status !== "completed" &&
                    daysUntil(item.targetDate) >= 0
                  );
                })
                .slice(0, 4)
                .map((milestone) => (
                  <div key={milestone.id} className={`${SOFT_PANEL_CLASS} p-4`}>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {milestone.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Target {formatDateLabel(milestone.targetDate)}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-[var(--primary)]">
                      {getDueCopy(milestone)}
                    </p>
                  </div>
                ))}

              {items.filter((item) => {
                const status = item.status.toLowerCase();
                return (
                  !item.actualDate &&
                  status !== "completed" &&
                  daysUntil(item.targetDate) >= 0
                );
              }).length === 0 && (
                <div className={`${SOFT_PANEL_CLASS} p-4`}>
                  <p className="text-sm text-[var(--text-secondary)]">
                    No upcoming milestone is currently scheduled.
                  </p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
