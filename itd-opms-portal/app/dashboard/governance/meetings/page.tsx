"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  Search,
  Sparkles,
  Target,
  User,
  X,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useMeetings,
  useActionItems,
  useCompleteAction,
} from "@/hooks/use-governance";
import { formatDate } from "@/lib/utils";
import type { Meeting, ActionItem } from "@/types";

type Tab = "meetings" | "actions";

const MEETING_STATUSES = [
  { value: "", label: "All Meetings" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const ACTION_STATUSES = [
  { value: "", label: "All Actions" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
] as const;

function formatMeetingType(value?: string) {
  if (!value) return "--";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatusLabel(value?: string) {
  if (!value) return "All";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Friendly "in 3 days" / "2 days ago" relative label without the "ago" noise for future dates. */
function formatDueHint(value: string) {
  const target = new Date(value).getTime();
  const now = Date.now();
  const dayMs = 86_400_000;
  const diffDays = Math.round((target - now) / dayMs);
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays === -1) return "Due yesterday";
  if (diffDays > 1) return `Due in ${diffDays} days`;
  return `${Math.abs(diffDays)} days overdue`;
}

/** Deterministic accent color for an id so each person avatar stays stable. */
const AVATAR_COLORS = [
  "#2563EB",
  "#10B981",
  "#7C3AED",
  "#D97706",
  "#DC2626",
  "#0891B2",
  "#DB2777",
  "#65A30D",
];

function PersonCell({ id, fallback }: { id?: string; fallback?: string }) {
  if (!id) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <User size={14} />
        {fallback ?? "Unassigned"}
      </span>
    );
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <span className="inline-flex items-center gap-2" title={id}>
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold uppercase text-white"
        style={{ backgroundColor: color }}
      >
        {id.slice(0, 2)}
      </span>
      <span className="font-mono text-xs text-[var(--text-secondary)]">
        {id.slice(0, 8)}
      </span>
    </span>
  );
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
  onClick,
  active,
}: {
  label: string;
  value: number | string;
  helper: string;
  color: string;
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const interactive = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`group h-full w-full rounded-[28px] border p-5 text-left transition-all duration-200 ${
        interactive
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2"
          : "cursor-default"
      }`}
      style={{
        borderColor: active ? `${color}66` : `${color}1f`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${color}${active ? "26" : "14"}, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
        boxShadow: active ? `0 18px 48px -32px ${color}99` : undefined,
      }}
    >
      <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
        {interactive && (
          <span
            className="text-[10px] font-medium normal-case tracking-normal opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color }}
          >
            {active ? "Filtered" : "View →"}
          </span>
        )}
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color }}>
        {loading ? <LoadingValue /> : value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </button>
  );
}

function getProgramPulse(
  totalMeetings: number,
  openActions: number,
  overdueActions: number,
) {
  if (totalMeetings === 0 && openActions === 0) {
    return {
      label: "Program cold start",
      badgeClass:
        "border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      description:
        "No meeting cadence or follow-through workload is visible yet, so the focus should be building the governance rhythm and the first action pipeline.",
    };
  }

  if (overdueActions >= 3 || openActions >= 8) {
    return {
      label: "Needs intervention",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "Meeting decisions are generating more unresolved work than the current governance rhythm is clearing, so follow-through needs direct attention.",
    };
  }

  if (overdueActions > 0 || openActions >= 4) {
    return {
      label: "Active oversight",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "The cadence is functioning, but a visible block of open or overdue work still needs closer steering.",
    };
  }

  return {
    label: "Well governed",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "Meetings and their downstream actions are moving in a stable rhythm with manageable pressure on execution owners.",
  };
}

export default function MeetingsAndActionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("meetings");
  const [search, setSearch] = useState("");

  const [meetingPage, setMeetingPage] = useState(1);
  const [meetingStatus, setMeetingStatus] = useState<string | undefined>(
    undefined,
  );
  const { data: meetingsData, isLoading: meetingsLoading } = useMeetings(
    meetingPage,
    20,
    meetingStatus,
  );
  const meetings = meetingsData?.data ?? [];
  const meetingMeta = meetingsData?.meta;

  const [actionPage, setActionPage] = useState(1);
  const [actionStatus, setActionStatus] = useState<string | undefined>(
    undefined,
  );
  const { data: actionsData, isLoading: actionsLoading } = useActionItems(
    actionPage,
    20,
    actionStatus,
  );
  const actions = actionsData?.data ?? [];
  const actionMeta = actionsData?.meta;

  const completeMutation = useCompleteAction();

  const totalMeetings = meetingMeta?.totalItems ?? meetings.length;
  const totalActions = actionMeta?.totalItems ?? actions.length;

  const meetingSummary = useMemo(() => {
    const scheduled = meetings.filter(
      (meeting) => meeting.status === "scheduled",
    ).length;
    const inProgress = meetings.filter(
      (meeting) => meeting.status === "in_progress",
    ).length;
    const completed = meetings.filter(
      (meeting) => meeting.status === "completed",
    ).length;
    const cancelled = meetings.filter(
      (meeting) => meeting.status === "cancelled",
    ).length;
    const nextMeeting = [...meetings]
      .filter(
        (meeting) => new Date(meeting.scheduledAt).getTime() >= Date.now(),
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )[0];

    return {
      scheduled,
      inProgress,
      completed,
      cancelled,
      nextMeeting,
    };
  }, [meetings]);

  const actionSummary = useMemo(() => {
    const overdue = actions.filter((item) => {
      if (item.status === "completed") return false;
      if (item.status === "overdue") return true;
      return new Date(item.dueDate).getTime() < Date.now();
    }).length;
    const open = actions.filter(
      (item) =>
        item.status === "open" ||
        item.status === "in_progress" ||
        item.status === "overdue",
    ).length;
    const completed = actions.filter(
      (item) => item.status === "completed",
    ).length;
    const critical = actions.filter(
      (item) => item.priority === "critical",
    ).length;
    const highPriority = actions.filter(
      (item) => item.priority === "high" || item.priority === "critical",
    ).length;
    const nextDue = [...actions]
      .filter((item) => item.status !== "completed")
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )[0];

    return {
      overdue,
      open,
      completed,
      critical,
      highPriority,
      nextDue,
    };
  }, [actions]);

  const programPulse = getProgramPulse(
    totalMeetings,
    actionSummary.open,
    actionSummary.overdue,
  );

  const meetingColumns: Column<Meeting>[] = [
    {
      key: "title",
      header: "Meeting",
      sortable: true,
      className: "min-w-[240px]",
      render: (item) => (
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {formatMeetingType(item.meetingType)}
          </p>
        </div>
      ),
    },
    {
      key: "scheduledAt",
      header: "Schedule",
      sortable: true,
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {formatDate(item.scheduledAt)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {item.durationMinutes
              ? `${item.durationMinutes} mins`
              : "Duration TBD"}
          </p>
        </div>
      ),
    },
    {
      key: "organizerId",
      header: "Organizer",
      render: (item) => <PersonCell id={item.organizerId} />,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  const actionColumns: Column<ActionItem>[] = [
    {
      key: "title",
      header: "Action",
      sortable: true,
      className: "min-w-[240px]",
      render: (item) => (
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {item.sourceType.replace(/_/g, " ")}
          </p>
        </div>
      ),
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => <PersonCell id={item.ownerId} />,
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (item) => {
        const isOverdue =
          item.status !== "completed" &&
          new Date(item.dueDate).getTime() < Date.now();

        return (
          <div>
            <p
              className={
                isOverdue
                  ? "text-sm font-semibold text-[var(--error)]"
                  : "text-sm font-medium text-[var(--text-primary)]"
              }
            >
              {formatDate(item.dueDate)}
            </p>
            <p
              className={`mt-0.5 text-xs ${isOverdue ? "text-[var(--error)]" : "text-[var(--text-secondary)]"}`}
            >
              {item.status === "completed"
                ? "Completed"
                : formatDueHint(item.dueDate)}
            </p>
          </div>
        );
      },
    },
    {
      key: "priority",
      header: "Priority",
      render: (item) => {
        const priorityColor: Record<string, string> = {
          critical: "#DC2626",
          high: "#D97706",
          medium: "#2563EB",
          low: "#6B7280",
        };

        return (
          <span
            className="capitalize text-xs font-semibold"
            style={{ color: priorityColor[item.priority] || "inherit" }}
          >
            {item.priority}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
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
              completeMutation.mutate({ id: item.id });
            }}
            disabled={completeMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--success-light)]"
            style={{ color: "var(--success)" }}
            title="Mark complete"
          >
            <CheckCircle2 size={14} />
            Complete
          </button>
        ) : null,
    },
  ];

  const currentStatuses =
    activeTab === "meetings" ? MEETING_STATUSES : ACTION_STATUSES;
  const currentStatusValue =
    activeTab === "meetings" ? meetingStatus || "" : actionStatus || "";
  const currentCount = activeTab === "meetings" ? totalMeetings : totalActions;
  const currentLoading =
    activeTab === "meetings" ? meetingsLoading : actionsLoading;

  function applyStatus(value: string) {
    const normalized = value || undefined;
    if (activeTab === "meetings") {
      setMeetingStatus(normalized);
      setMeetingPage(1);
      return;
    }

    setActionStatus(normalized);
    setActionPage(1);
  }

  // Jump from a summary card straight into the matching workspace + status filter.
  function focusWorkspace(tab: Tab, status?: string) {
    setActiveTab(tab);
    setSearch("");
    if (tab === "meetings") {
      setMeetingStatus(status);
      setMeetingPage(1);
    } else {
      setActionStatus(status);
      setActionPage(1);
    }
  }

  // Client-side search across the currently loaded page of the active workspace.
  const query = search.trim().toLowerCase();
  const filteredMeetings = useMemo(() => {
    if (!query) return meetings;
    return meetings.filter((m) =>
      [m.title, m.meetingType, m.location, m.organizerId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query)),
    );
  }, [meetings, query]);
  const filteredActions = useMemo(() => {
    if (!query) return actions;
    return actions.filter((a) =>
      [a.title, a.sourceType, a.priority, a.ownerId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query)),
    );
  }, [actions, query]);

  return (
    <div className="space-y-8 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(37, 99, 235, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(37,99,235,0.16), transparent 30%), radial-gradient(circle at 88% 16%, rgba(16,185,129,0.12), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(37, 99, 235, 0.24)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/governance"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:bg-[var(--surface-1)]"
              >
                <ArrowLeft size={14} />
                Back to Governance
              </Link>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${programPulse.badgeClass}`}
              >
                <Sparkles size={14} />
                {programPulse.label}
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                Meetings & Action Items
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                Governance cadence, decision follow-through, and action pressure
                in a stronger operational workspace so teams can see where
                meetings are happening and where execution is slipping.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/governance/meetings/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                Schedule Meeting
              </Link>
              <Link
                href="/dashboard/governance/actions"
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                <ClipboardList size={16} />
                Open Action Hub
              </Link>
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Governance pulse
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Program telemetry
                </h2>
              </div>
              <Activity size={20} className="text-[var(--primary)]" />
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {programPulse.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Meetings in scope
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {meetingsLoading ? <LoadingValue /> : totalMeetings}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Open actions
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {actionsLoading ? <LoadingValue /> : actionSummary.open}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Overdue actions
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {actionsLoading ? <LoadingValue /> : actionSummary.overdue}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Next meeting
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {meetingsLoading ? (
                    <LoadingValue width="w-20" />
                  ) : meetingSummary.nextMeeting ? (
                    formatDate(meetingSummary.nextMeeting.scheduledAt)
                  ) : (
                    "No upcoming meeting"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Meetings scheduled"
          value={meetingSummary.scheduled}
          helper="Meetings currently visible with planned dates and expected governance cadence."
          color="#2563EB"
          loading={meetingsLoading}
          onClick={() => focusWorkspace("meetings", "scheduled")}
          active={activeTab === "meetings" && meetingStatus === "scheduled"}
        />
        <MetricCard
          label="Meetings completed"
          value={meetingSummary.completed}
          helper="Meetings that already produced minutes, outcomes, or a closed cadence loop."
          color="#10B981"
          loading={meetingsLoading}
          onClick={() => focusWorkspace("meetings", "completed")}
          active={activeTab === "meetings" && meetingStatus === "completed"}
        />
        <MetricCard
          label="Actions in motion"
          value={actionSummary.open}
          helper="Open or active follow-through items still assigned to execution owners."
          color="#7C3AED"
          loading={actionsLoading}
          onClick={() => focusWorkspace("actions", "open")}
          active={activeTab === "actions" && actionStatus === "open"}
        />
        <MetricCard
          label="Critical pressure"
          value={actionSummary.highPriority}
          helper="High or critical action items that need closer steering from governance leads."
          color="#DC2626"
          loading={actionsLoading}
          onClick={() => focusWorkspace("actions", "overdue")}
          active={activeTab === "actions" && actionStatus === "overdue"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            key: "meetings" as const,
            label: "Meeting board",
            description:
              "Review upcoming cadence, status, and scheduled governance forums.",
            icon: Calendar,
            count: totalMeetings,
          },
          {
            key: "actions" as const,
            label: "Action tracker",
            description:
              "Track decisions through owners, deadlines, and execution pressure.",
            icon: ClipboardList,
            count: totalActions,
          },
        ].map((workspace) => {
          const active = activeTab === workspace.key;
          const Icon = workspace.icon;

          return (
            <button
              key={workspace.key}
              type="button"
              onClick={() => {
                setActiveTab(workspace.key);
                setSearch("");
              }}
              className="rounded-[28px] border p-5 text-left transition-all duration-200"
              style={{
                borderColor: active
                  ? "rgba(37, 99, 235, 0.28)"
                  : "var(--border)",
                backgroundImage: active
                  ? "radial-gradient(circle at 100% 0%, rgba(37,99,235,0.12), transparent 32%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)"
                  : "linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
                boxShadow: active
                  ? "0 20px 50px -40px rgba(37, 99, 235, 0.55)"
                  : "none",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    {workspace.label}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {workspace.description}
                  </p>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: active
                      ? "rgba(37, 99, 235, 0.1)"
                      : "var(--surface-1)",
                  }}
                >
                  <Icon
                    size={20}
                    className={
                      active
                        ? "text-[var(--primary)]"
                        : "text-[var(--text-secondary)]"
                    }
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-3xl font-bold text-[var(--text-primary)]">
                  {workspace.count}
                </span>
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                    active
                      ? "bg-[rgba(37,99,235,0.1)] text-[var(--primary)]"
                      : "bg-[var(--surface-1)] text-[var(--text-secondary)]"
                  }`}
                >
                  {active ? "Active workspace" : "Open workspace"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-4">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Live workspace
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {activeTab === "meetings"
                    ? "Meeting board"
                    : "Action tracker"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {currentLoading
                    ? "Loading current workspace..."
                    : query
                      ? `${
                          activeTab === "meetings"
                            ? filteredMeetings.length
                            : filteredActions.length
                        } match${
                          (activeTab === "meetings"
                            ? filteredMeetings.length
                            : filteredActions.length) !== 1
                            ? "es"
                            : ""
                        } for "${search}" on this page.`
                      : `${currentCount} item${currentCount !== 1 ? "s" : ""} visible with ${formatStatusLabel(currentStatusValue)} status coverage.`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentStatuses.map((status) => {
                  const active = currentStatusValue === status.value;

                  return (
                    <button
                      key={status.label}
                      type="button"
                      onClick={() => applyStatus(status.value)}
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
                      style={{
                        borderColor: active
                          ? "var(--primary)"
                          : "var(--border)",
                        backgroundColor: active
                          ? "rgba(37, 99, 235, 0.1)"
                          : "var(--surface-0)",
                        color: active
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative mt-4">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  activeTab === "meetings"
                    ? "Search meetings by title, type, location..."
                    : "Search actions by title, source, priority..."
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] py-3 pl-11 pr-11 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-1"
          >
            {activeTab === "meetings" ? (
              <DataTable
                columns={meetingColumns}
                data={filteredMeetings}
                keyExtractor={(item) => item.id}
                loading={meetingsLoading}
                emptyTitle={query ? "No matching meetings" : "No meetings found"}
                emptyDescription={
                  query
                    ? `No meetings on this page match "${search}". Try a different search or clear it.`
                    : "Schedule your first meeting to establish the governance cadence."
                }
                emptyAction={
                  <Link
                    href="/dashboard/governance/meetings/new"
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    <Plus size={16} />
                    Schedule Meeting
                  </Link>
                }
                onRowClick={(item) =>
                  router.push(`/dashboard/governance/meetings/${item.id}`)
                }
                pagination={
                  meetingMeta
                    ? {
                        currentPage: meetingMeta.page,
                        totalPages: meetingMeta.totalPages,
                        totalItems: meetingMeta.totalItems,
                        pageSize: meetingMeta.pageSize,
                        onPageChange: setMeetingPage,
                      }
                    : undefined
                }
              />
            ) : (
              <DataTable
                columns={actionColumns}
                data={filteredActions}
                keyExtractor={(item) => item.id}
                loading={actionsLoading}
                emptyTitle={query ? "No matching actions" : "No action items found"}
                emptyDescription={
                  query
                    ? `No actions on this page match "${search}". Try a different search or clear it.`
                    : "Action items from meetings and decisions will appear here."
                }
                emptyAction={
                  <Link
                    href="/dashboard/governance/actions"
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    <ClipboardList size={16} />
                    Open Action Hub
                  </Link>
                }
                pagination={
                  actionMeta
                    ? {
                        currentPage: actionMeta.page,
                        totalPages: actionMeta.totalPages,
                        totalItems: actionMeta.totalItems,
                        pageSize: actionMeta.pageSize,
                        onPageChange: setActionPage,
                      }
                    : undefined
                }
              />
            )}
          </motion.div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Cadence snapshot
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Meeting rhythm
                </h2>
              </div>
              <Calendar size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Next planned meeting
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {meetingSummary.nextMeeting
                    ? `${meetingSummary.nextMeeting.title} on ${formatDate(meetingSummary.nextMeeting.scheduledAt)}`
                    : "No upcoming meeting in the visible board"}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="Scheduled"
                  value={meetingSummary.scheduled}
                  helper="Planned forums"
                  color="#2563EB"
                  loading={meetingsLoading}
                />
                <MetricCard
                  label="In progress"
                  value={meetingSummary.inProgress}
                  helper="Live sessions"
                  color="#10B981"
                  loading={meetingsLoading}
                />
              </div>
              <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Cancelled meetings
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {meetingsLoading ? "Loading..." : meetingSummary.cancelled}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Execution pressure
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Action pressure
                </h2>
              </div>
              <Target size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Open actions
                  </p>
                  <span className="rounded-full bg-[rgba(37,99,235,0.1)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
                    {actionsLoading ? "..." : actionSummary.open}
                  </span>
                </div>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Overdue actions
                  </p>
                  <span className="rounded-full bg-[rgba(220,38,38,0.1)] px-2.5 py-1 text-xs font-semibold text-[#DC2626]">
                    {actionsLoading ? "..." : actionSummary.overdue}
                  </span>
                </div>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Critical actions
                  </p>
                  <span className="rounded-full bg-[rgba(217,119,6,0.1)] px-2.5 py-1 text-xs font-semibold text-[#D97706]">
                    {actionsLoading ? "..." : actionSummary.critical}
                  </span>
                </div>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Next due item
                </p>
                {actionSummary.nextDue ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {actionSummary.nextDue.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {formatDate(actionSummary.nextDue.dueDate)} ·{" "}
                      {formatDueHint(actionSummary.nextDue.dueDate)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    No upcoming due action in the visible tracker
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Current focus
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Active lane
                </h2>
              </div>
              <Clock3 size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
              {activeTab === "meetings"
                ? `The meeting board is focused on ${formatStatusLabel(currentStatusValue)} governance sessions and their current cadence health.`
                : `The action tracker is focused on ${formatStatusLabel(currentStatusValue)} follow-through items and execution pressure across owners.`}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
