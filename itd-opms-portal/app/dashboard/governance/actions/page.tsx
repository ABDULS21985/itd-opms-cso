"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import { useAuth } from "@/providers/auth-provider";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useActionItems,
  useOverdueActionStats,
  useMyOverdueActions,
  useCompleteAction,
} from "@/hooks/use-governance";
import { formatDate } from "@/lib/utils";
import type { ActionItem, OwnerOverdueCount } from "@/types";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  high: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  medium: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  low: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function isOverdue(item: ActionItem): boolean {
  return item.status !== "completed" && new Date(item.dueDate) < new Date();
}

function formatSourceType(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function LoadingValue({ width = "w-14" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function MetricCard({
  label,
  value,
  helper,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  helper: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: `${color}1f`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${color}14, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color }}>
        {loading ? <LoadingValue /> : value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function getActionPulse(
  totalOverdue: number,
  dueThisWeek: number,
  myOverdue: number,
) {
  if (totalOverdue === 0 && dueThisWeek === 0) {
    return {
      label: "Under control",
      badgeClass:
        "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      description:
        "No overdue pressure is visible and nothing urgent is clustering this week, so the tracker is operating in a healthy range.",
    };
  }

  if (totalOverdue >= 6 || myOverdue >= 3) {
    return {
      label: "Needs intervention",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "Overdue work is piling up quickly enough that governance owners need direct follow-through rather than passive monitoring.",
    };
  }

  if (totalOverdue > 0 || dueThisWeek >= 4) {
    return {
      label: "Watch closely",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "The action program is moving, but enough deadlines are clustering that owner pressure should stay visible.",
    };
  }

  return {
    label: "Steady rhythm",
    badgeClass:
      "border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    description:
      "The tracker has active work in motion without meaningful overdue drag, which suggests a stable execution cadence.",
  };
}

export default function ActionTrackerPage() {
  useBreadcrumbs([
    { label: "Governance", href: "/dashboard/governance" },
    { label: "Action Tracker", href: "/dashboard/governance/actions" },
  ]);

  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showMyActions, setShowMyActions] = useState(false);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(
    null,
  );

  const { data: stats, isLoading: statsLoading } = useOverdueActionStats();
  const { data: actionsData, isLoading: actionsLoading } = useActionItems(
    page,
    20,
    statusFilter || undefined,
    showMyActions ? user?.id : undefined,
    undefined,
    undefined,
    priorityFilter || undefined,
  );
  const { data: myOverdueActions } = useMyOverdueActions();
  const completeMutation = useCompleteAction();

  const actions = actionsData?.data ?? [];
  const actionMeta = actionsData?.meta;
  const totalVisible = actionMeta?.totalItems ?? actions.length;

  const totalOverdue = stats?.totalOverdue ?? 0;
  const dueThisWeek = stats?.dueThisWeek ?? 0;
  const avgDaysOverdue = stats?.avgDaysOverdue ?? 0;
  const completedThisMonth = stats?.completedThisMonth ?? 0;
  const myOverdueCount = myOverdueActions?.length ?? 0;

  const visibleSummary = useMemo(() => {
    const open = actions.filter(
      (item) =>
        item.status === "open" ||
        item.status === "in_progress" ||
        item.status === "overdue",
    ).length;
    const overdue = actions.filter(
      (item) => isOverdue(item) || item.status === "overdue",
    ).length;
    const critical = actions.filter(
      (item) => item.priority === "critical",
    ).length;
    const nextDue = [...actions]
      .filter((item) => item.status !== "completed")
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )[0];

    return {
      open,
      overdue,
      critical,
      nextDue,
    };
  }, [actions]);

  const priorityPressure = useMemo(
    () =>
      ["critical", "high", "medium", "low"].map((priority) => ({
        priority,
        count: stats?.overdueByPriority?.[priority] ?? 0,
      })),
    [stats?.overdueByPriority],
  );

  const topOwners = stats?.overdueByOwner ?? [];
  const maxPriorityCount = Math.max(
    ...priorityPressure.map((item) => item.count),
    1,
  );
  const pulse = getActionPulse(totalOverdue, dueThisWeek, myOverdueCount);
  const hasActiveFilters = Boolean(
    statusFilter || priorityFilter || showMyActions,
  );

  function handleComplete() {
    if (!confirmCompleteId) return;

    completeMutation.mutate(
      { id: confirmCompleteId },
      {
        onSuccess: () => {
          toast.success("Action item marked as completed");
          setConfirmCompleteId(null);
        },
        onError: () => {
          toast.error("Failed to complete action item");
        },
      },
    );
  }

  function resetFilters() {
    setStatusFilter("");
    setPriorityFilter("");
    setShowMyActions(false);
    setPage(1);
  }

  const columns: Column<ActionItem>[] = [
    {
      key: "title",
      header: "Action",
      sortable: true,
      className: "min-w-[240px]",
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {formatSourceType(item.sourceType)}
          </p>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (item) => {
        const tone = PRIORITY_COLORS[item.priority] ?? {
          bg: "var(--surface-2)",
          text: "var(--text-secondary)",
        };

        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
            style={{ backgroundColor: tone.bg, color: tone.text }}
          >
            {item.priority}
          </span>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due Window",
      sortable: true,
      render: (item) => {
        const overdue = isOverdue(item);
        const overdueDays = overdue ? daysOverdue(item.dueDate) : 0;

        return (
          <div>
            <p
              className={
                overdue
                  ? "text-sm font-semibold text-[var(--error)]"
                  : "text-sm font-medium text-[var(--text-primary)]"
              }
            >
              {formatDate(item.dueDate)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {overdue
                ? `${overdueDays} day${overdueDays !== 1 ? "s" : ""} overdue`
                : "On timeline"}
            </p>
          </div>
        );
      },
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => (
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {item.ownerId?.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const displayStatus =
          isOverdue(item) && item.status !== "completed"
            ? "overdue"
            : item.status;

        return <StatusBadge status={displayStatus} />;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) =>
        item.status !== "completed" ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setConfirmCompleteId(item.id);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[rgba(34,197,94,0.1)]"
            style={{ color: "var(--success)" }}
            title="Mark as complete"
          >
            <CheckCircle2 size={14} />
            Complete
          </button>
        ) : null,
    },
  ];

  return (
    <PermissionGate permission="governance.view">
      <div className="space-y-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "rgba(27, 115, 64, 0.16)",
            backgroundImage:
              "radial-gradient(circle at 12% 18%, rgba(27,115,64,0.16), transparent 30%), radial-gradient(circle at 88% 16%, rgba(239,68,68,0.12), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
            boxShadow: "0 28px 90px -58px rgba(27, 115, 64, 0.28)",
          }}
        >
          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${pulse.badgeClass}`}
                >
                  <Sparkles size={14} />
                  {pulse.label}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                  <ListChecks size={14} className="text-[#1B7340]" />
                  Governance action tracker
                </span>
              </div>

              <div className="max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                  Action Tracker
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                  Ownership, deadlines, and overdue pressure in a stronger
                  governance workspace so teams can see which actions are
                  moving, which are stalled, and where escalation should land.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMyActions((current) => !current);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                    showMyActions
                      ? "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                  }`}
                >
                  <User size={16} />
                  My Action Lane
                  {myOverdueCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        showMyActions
                          ? "bg-white/20 text-white"
                          : "bg-[var(--error)] text-white"
                      }`}
                    >
                      {myOverdueCount}
                    </span>
                  )}
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                  >
                    Reset view
                  </button>
                )}
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
                    Action pulse
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Execution telemetry
                  </h2>
                </div>
                <Activity size={20} className="text-[var(--primary)]" />
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                {pulse.description}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Total overdue
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {statsLoading ? <LoadingValue /> : totalOverdue}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Due this week
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {statsLoading ? <LoadingValue /> : dueThisWeek}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    My overdue
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {myOverdueCount}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Next due
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {actionsLoading ? (
                      <LoadingValue width="w-20" />
                    ) : visibleSummary.nextDue ? (
                      formatDate(visibleSummary.nextDue.dueDate)
                    ) : (
                      "No due item"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Overdue actions"
            value={totalOverdue}
            helper="All governance actions currently beyond due date."
            color="#EF4444"
            loading={statsLoading}
          />
          <MetricCard
            label="Due this week"
            value={dueThisWeek}
            helper="Deadlines clustering inside the current operating window."
            color="#F59E0B"
            loading={statsLoading}
          />
          <MetricCard
            label="Avg days overdue"
            value={Math.round(avgDaysOverdue)}
            helper="Average age of overdue work still unresolved."
            color="#EA580C"
            loading={statsLoading}
          />
          <MetricCard
            label="Completed this month"
            value={completedThisMonth}
            helper="Actions closed out during the current monthly cycle."
            color="#22C55E"
            loading={statsLoading}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="space-y-4">
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Live board
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Action control board
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {actionsLoading
                      ? "Loading action visibility..."
                      : `${totalVisible} item${totalVisible !== 1 ? "s" : ""} visible in the current governance lens.`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const active = statusFilter === option.value;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          setStatusFilter(option.value);
                          setPage(1);
                        }}
                        className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
                        style={{
                          borderColor: active
                            ? "var(--primary)"
                            : "var(--border)",
                          backgroundColor: active
                            ? "rgba(27, 115, 64, 0.1)"
                            : "var(--surface-0)",
                          color: active
                            ? "var(--primary)"
                            : "var(--text-secondary)",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[auto_240px_auto]">
                <button
                  type="button"
                  onClick={() => {
                    setShowMyActions((current) => !current);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    showMyActions
                      ? "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                  }`}
                >
                  <User size={16} />
                  My Actions
                  {myOverdueCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        showMyActions
                          ? "bg-white/20 text-white"
                          : "bg-[var(--error)] text-white"
                      }`}
                    >
                      {myOverdueCount}
                    </span>
                  )}
                </button>

                <div>
                  <label
                    htmlFor="priority-filter"
                    className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Priority lens
                  </label>
                  <select
                    id="priority-filter"
                    value={priorityFilter}
                    onChange={(event) => {
                      setPriorityFilter(event.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] lg:self-end"
                >
                  Reset filters
                </button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-1"
            >
              <DataTable
                columns={columns}
                data={actions}
                keyExtractor={(item) => item.id}
                loading={actionsLoading}
                emptyTitle={
                  showMyActions
                    ? "No personal action items found"
                    : "No action items found"
                }
                emptyDescription={
                  showMyActions
                    ? "You have no action items matching the current governance lens."
                    : "Action items from meetings and governance decisions will appear here."
                }
                pagination={
                  actionMeta
                    ? {
                        currentPage: actionMeta.page,
                        totalPages: actionMeta.totalPages,
                        totalItems: actionMeta.totalItems,
                        pageSize: actionMeta.pageSize,
                        onPageChange: setPage,
                      }
                    : undefined
                }
              />
            </motion.div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Priority pressure
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Overdue by priority
                  </h2>
                </div>
                <AlertCircle size={20} className="text-[var(--primary)]" />
              </div>

              <div className="mt-5 space-y-4">
                {statsLoading ? (
                  [1, 2, 3, 4].map((index) => (
                    <div
                      key={index}
                      className="h-12 animate-pulse rounded-2xl bg-[var(--surface-2)]"
                    />
                  ))
                ) : priorityPressure.every((item) => item.count === 0) ? (
                  <div className="rounded-[22px] border border-dashed border-[var(--border)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
                    No overdue actions are currently pressuring the priority
                    mix.
                  </div>
                ) : (
                  priorityPressure.map((item) => {
                    const tone = PRIORITY_COLORS[item.priority];
                    const width = `${(item.count / maxPriorityCount) * 100}%`;

                    return (
                      <div key={item.priority} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium capitalize text-[var(--text-primary)]">
                            {item.priority}
                          </p>
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{
                              backgroundColor: tone.bg,
                              color: tone.text,
                            }}
                          >
                            {item.count}
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width,
                              backgroundColor: tone.text,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Owner watchlist
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Top overdue owners
                  </h2>
                </div>
                <User size={20} className="text-[var(--primary)]" />
              </div>

              <div className="mt-5 space-y-3">
                {statsLoading ? (
                  [1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className="h-14 animate-pulse rounded-2xl bg-[var(--surface-2)]"
                    />
                  ))
                ) : topOwners.length === 0 ? (
                  <div className="rounded-[22px] bg-[var(--surface-1)] p-4 text-sm text-[var(--text-secondary)]">
                    No overdue owner concentration is visible right now.
                  </div>
                ) : (
                  topOwners.slice(0, 5).map((owner: OwnerOverdueCount) => (
                    <div
                      key={owner.ownerId}
                      className="flex items-center justify-between gap-3 rounded-[22px] bg-[var(--surface-1)] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {owner.ownerName || `${owner.ownerId.slice(0, 8)}...`}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          Overdue owner load
                        </p>
                      </div>
                      <span className="rounded-full bg-[rgba(239,68,68,0.1)] px-2.5 py-1 text-xs font-semibold text-[#EF4444]">
                        {owner.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Current lane
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Execution notes
                  </h2>
                </div>
                <Clock3 size={20} className="text-[var(--primary)]" />
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={18}
                      className="mt-0.5 shrink-0 text-[#EF4444]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Visible overdue work
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {actionsLoading
                          ? "Loading current overdue signal..."
                          : `${visibleSummary.overdue} item${visibleSummary.overdue !== 1 ? "s are" : " is"} overdue in the current board.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                  <div className="flex items-start gap-3">
                    <Target
                      size={18}
                      className="mt-0.5 shrink-0 text-[#2563EB]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Highest visible pressure
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {actionsLoading
                          ? "Loading visible action pressure..."
                          : `${visibleSummary.critical} critical item${visibleSummary.critical !== 1 ? "s are" : " is"} currently in view.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp
                      size={18}
                      className="mt-0.5 shrink-0 text-[#22C55E]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Completion pace
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {statsLoading
                          ? "Loading completion pace..."
                          : `${completedThisMonth} item${completedThisMonth !== 1 ? "s were" : " was"} completed this month.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                  <div className="flex items-start gap-3">
                    <CalendarClock
                      size={18}
                      className="mt-0.5 shrink-0 text-[#D97706]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Next due action
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {visibleSummary.nextDue
                          ? `${visibleSummary.nextDue.title} is due ${formatDate(visibleSummary.nextDue.dueDate)}.`
                          : "No pending due action is visible in the current board."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <ConfirmDialog
          open={confirmCompleteId !== null}
          onClose={() => setConfirmCompleteId(null)}
          onConfirm={handleComplete}
          title="Complete Action Item"
          message="Are you sure you want to mark this action item as completed? This action cannot be undone."
          confirmLabel="Mark Complete"
          cancelLabel="Cancel"
          variant="default"
          loading={completeMutation.isPending}
        />
      </div>
    </PermissionGate>
  );
}
