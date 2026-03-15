"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ListChecks,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  CalendarClock,
  Loader2,
  User,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
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

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  high: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  medium: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  low: { bg: "rgba(107, 114, 128, 0.1)", text: "var(--neutral-gray)" },
};

const PRIORITY_CHART_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#3B82F6",
  low: "#6B7280",
};

/** Shared Recharts tooltip style */
const tooltipStyle = {
  backgroundColor: "var(--surface-0)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

const selectStyle = {
  backgroundColor: "var(--surface-0)",
  borderColor: "var(--border)",
};

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

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

/* ================================================================== */
/*  Summary Card                                                       */
/* ================================================================== */

function SummaryCard({
  icon,
  label,
  value,
  color,
  bgColor,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: bgColor }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */

export default function ActionTrackerPage() {
  useBreadcrumbs([
    { label: "Governance", href: "/dashboard/governance" },
    { label: "Action Tracker", href: "/dashboard/governance/actions" },
  ]);

  const { user } = useAuth();

  /* ---- State ---- */
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showMyActions, setShowMyActions] = useState(false);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);

  /* ---- Data hooks ---- */
  const {
    data: stats,
    isLoading: statsLoading,
  } = useOverdueActionStats();

  const {
    data: actionsData,
    isLoading: actionsLoading,
  } = useActionItems(
    page,
    20,
    statusFilter || undefined,
    showMyActions ? user?.id : undefined,
    undefined,
    undefined,
    priorityFilter || undefined,
  );

  const actions = actionsData?.data ?? [];
  const actionMeta = actionsData?.meta;

  const {
    data: myOverdueActions,
  } = useMyOverdueActions();

  const completeMutation = useCompleteAction();

  /* Priority filter is now applied server-side via useActionItems. */
  const filteredActions = actions;

  /* ---- Chart data for overdue by priority ---- */
  const chartData = useMemo(() => {
    if (!stats?.overdueByPriority) return [];
    const priorities = ["critical", "high", "medium", "low"];
    return priorities
      .map((p) => ({
        priority: p.charAt(0).toUpperCase() + p.slice(1),
        count: stats.overdueByPriority[p] ?? 0,
        key: p,
      }))
      .filter((d) => d.count > 0);
  }, [stats]);

  /* ---- Complete action handler ---- */
  function handleComplete() {
    if (!confirmCompleteId) return;
    completeMutation.mutate({ id: confirmCompleteId }, {
      onSuccess: () => {
        toast.success("Action item marked as completed");
        setConfirmCompleteId(null);
      },
      onError: () => {
        toast.error("Failed to complete action item");
      },
    });
  }

  /* ---- Stat values ---- */
  const totalOverdue = stats?.totalOverdue ?? 0;
  const dueThisWeek = stats?.dueThisWeek ?? 0;
  const avgDaysOverdue = stats?.avgDaysOverdue ?? 0;
  const completedThisMonth = stats?.completedThisMonth ?? 0;

  /* ---- My overdue count ---- */
  const myOverdueCount = myOverdueActions?.length ?? 0;

  /* ---- Table columns ---- */
  const columns: Column<ActionItem>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[220px]",
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {item.title}
          </p>
          {item.description && (
            <p className="text-xs text-[var(--neutral-gray)] line-clamp-1 max-w-[300px] mt-0.5">
              {item.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "sourceType",
      header: "Source",
      render: (item) => (
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize bg-[var(--surface-2)] text-[var(--text-secondary)]">
          {item.sourceType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (item) => {
        const color = PRIORITY_COLORS[item.priority] ?? {
          bg: "var(--surface-2)",
          text: "var(--neutral-gray)",
        };
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {item.priority}
          </span>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (item) => {
        const overdue = isOverdue(item);
        const days = overdue ? daysOverdue(item.dueDate) : 0;
        return (
          <div>
            <span
              className={
                overdue
                  ? "text-sm font-medium text-[var(--error)]"
                  : "text-sm text-[var(--text-secondary)]"
              }
            >
              {formatDate(item.dueDate)}
            </span>
            {overdue && days > 0 && (
              <span className="block text-xs font-medium text-[var(--error)] mt-0.5">
                {days} day{days !== 1 ? "s" : ""} overdue
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const displayStatus = isOverdue(item) && item.status !== "completed" ? "overdue" : item.status;
        return <StatusBadge status={displayStatus} />;
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
      key: "actions",
      header: "",
      align: "right",
      render: (item) =>
        item.status !== "completed" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
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

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <PermissionGate permission="governance.view">
    <div className="space-y-6 pb-8">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <ListChecks size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Action Tracker
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Monitor and manage action items across all governance activities
            </p>
          </div>
        </div>
      </motion.div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<AlertCircle size={20} />}
          label="Total Overdue"
          value={statsLoading ? "--" : totalOverdue}
          color="#EF4444"
          bgColor="rgba(239, 68, 68, 0.1)"
          delay={0.05}
        />
        <SummaryCard
          icon={<CalendarClock size={20} />}
          label="Due This Week"
          value={statsLoading ? "--" : dueThisWeek}
          color="#F59E0B"
          bgColor="rgba(245, 158, 11, 0.1)"
          delay={0.1}
        />
        <SummaryCard
          icon={<Clock size={20} />}
          label="Avg Days Overdue"
          value={statsLoading ? "--" : Math.round(avgDaysOverdue)}
          color="#EA580C"
          bgColor="rgba(234, 88, 12, 0.1)"
          delay={0.15}
        />
        <SummaryCard
          icon={<TrendingUp size={20} />}
          label="Completed This Month"
          value={statsLoading ? "--" : completedThisMonth}
          color="#22C55E"
          bgColor="rgba(34, 197, 94, 0.1)"
          delay={0.2}
        />
      </div>

      {/* ---- Filter Bar ---- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="flex flex-wrap items-center gap-3"
      >
        {/* My Actions Toggle */}
        <button
          type="button"
          onClick={() => {
            setShowMyActions((v) => !v);
            setPage(1);
          }}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
            showMyActions
              ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
              : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
          }`}
        >
          <User size={16} />
          My Actions
          {myOverdueCount > 0 && (
            <span
              className={`ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                showMyActions
                  ? "bg-white/20 text-white"
                  : "bg-[var(--error)] text-white"
              }`}
            >
              {myOverdueCount}
            </span>
          )}
        </button>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          style={selectStyle}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1); // reset page since priority is now a server-side filter
          }}
          className="rounded-xl border px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          style={selectStyle}
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {(statusFilter || priorityFilter || showMyActions) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("");
              setPriorityFilter("");
              setShowMyActions(false);
              setPage(1);
            }}
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Clear filters
          </button>
        )}
      </motion.div>

      {/* ---- Content Grid: Table + Chart ---- */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {/* Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="xl:col-span-3"
        >
          <DataTable
            columns={columns}
            data={filteredActions}
            keyExtractor={(item) => item.id}
            loading={actionsLoading}
            emptyTitle="No action items found"
            emptyDescription={
              showMyActions
                ? "You have no action items matching the current filters."
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

        {/* Overdue by Priority Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="xl:col-span-1"
        >
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
              Overdue by Priority
            </h3>
            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[var(--neutral-gray)]" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2
                  size={32}
                  className="text-[var(--success)] mb-2"
                />
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  No overdue items
                </p>
                <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                  All action items are on track
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="priority"
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                    width={70}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={PRIORITY_CHART_COLORS[entry.key] ?? "var(--primary)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Additional stats below chart */}
            {!statsLoading && stats && (
              <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">
                    Oldest overdue
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                    {stats.oldestOverdueDays ?? 0} day{(stats.oldestOverdueDays ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                {stats.overdueByOwner && stats.overdueByOwner.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Top Overdue Owners
                    </p>
                    <div className="space-y-1.5">
                      {stats.overdueByOwner.slice(0, 5).map((owner: OwnerOverdueCount) => (
                        <div
                          key={owner.ownerId}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs text-[var(--text-primary)] truncate max-w-[120px]">
                            {owner.ownerName || owner.ownerId.slice(0, 8) + "..."}
                          </span>
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color: "var(--error)" }}
                          >
                            {owner.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ---- Confirm Complete Dialog ---- */}
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
