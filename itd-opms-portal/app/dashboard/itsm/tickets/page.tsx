"use client";

import { useMemo, useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket as TicketIcon,
  Plus,
  Filter,
  Clock,
  CheckCircle,
  UserCheck,
  Download,
  X,
  Flame,
  ShieldAlert,
  Search,
  Sparkles,
  Activity,
  Layers3,
  ArrowRight,
  Inbox,
} from "lucide-react";
import {
  DataTable,
  type Column,
  type BulkAction,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { InlineSelect } from "@/components/shared/inline-edit";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import {
  useTickets,
  useTicketStats,
  useBulkUpdateTickets,
} from "@/hooks/use-itsm";
import { useAuth } from "@/providers/auth-provider";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { Ticket } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TICKET_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "logged", label: "Logged" },
  { value: "classified", label: "Classified" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending_customer", label: "Pending Customer" },
  { value: "pending_vendor", label: "Pending Vendor" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const TICKET_PRIORITIES = [
  { value: "", label: "All Priorities" },
  { value: "P1_critical", label: "P1 - Critical" },
  { value: "P2_high", label: "P2 - High" },
  { value: "P3_medium", label: "P3 - Medium" },
  { value: "P4_low", label: "P4 - Low" },
];

const TICKET_TYPES = [
  { value: "", label: "All Types" },
  { value: "incident", label: "Incident" },
  { value: "service_request", label: "Service Request" },
  { value: "problem", label: "Problem" },
  { value: "change", label: "Change" },
];

const PRIORITY_COLORS: Record<
  string,
  { bg: string; text: string; accent: string }
> = {
  P1_critical: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#EF4444",
    accent: "#DC2626",
  },
  P2_high: {
    bg: "rgba(249, 115, 22, 0.1)",
    text: "#F97316",
    accent: "#EA580C",
  },
  P3_medium: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#F59E0B",
    accent: "#D97706",
  },
  P4_low: {
    bg: "rgba(59, 130, 246, 0.1)",
    text: "#3B82F6",
    accent: "#2563EB",
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    P1_critical: "P1",
    P2_high: "P2",
    P3_medium: "P3",
    P4_low: "P4",
  };
  return map[priority] ?? priority;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSLAInfo(ticket: Ticket): {
  color: string;
  label: string;
  pct: number | null;
} {
  if (ticket.slaResolutionMet === false) {
    return { color: "#EF4444", label: "Breached", pct: 100 };
  }
  if (ticket.slaResponseMet === false) {
    return { color: "#EF4444", label: "Response Breached", pct: 100 };
  }
  if (ticket.slaPausedAt) {
    return { color: "#9CA3AF", label: "Paused", pct: null };
  }
  if (ticket.status === "closed" || ticket.status === "resolved") {
    return { color: "#10B981", label: "Met", pct: 0 };
  }
  if (ticket.slaResolutionTarget) {
    const target = new Date(ticket.slaResolutionTarget).getTime();
    const now = Date.now();
    const created = new Date(ticket.createdAt).getTime();
    const totalDuration = target - created;
    const elapsed = now - created;
    const pct =
      totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;

    if (pct >= 100) return { color: "#EF4444", label: "Breached", pct: 100 };
    if (pct >= 80) return { color: "#F59E0B", label: "At Risk", pct };
    return { color: "#10B981", label: "On Track", pct };
  }
  return { color: "#9CA3AF", label: "No SLA", pct: null };
}

function ticketPosture({
  openCount,
  breachedCount,
  majorCount,
  hotCount,
}: {
  openCount: number;
  breachedCount: number;
  majorCount: number;
  hotCount: number;
}) {
  if (breachedCount > 0 || majorCount > 0) {
    return {
      label: "Escalation pressure",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "There is active SLA or major-incident pressure inside the ticket estate, so the board should stay in fast-response mode.",
    };
  }

  if (openCount >= 20 || hotCount >= 5) {
    return {
      label: "Busy flow",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "Demand is elevated enough that triage quality and focus discipline matter more than raw throughput.",
    };
  }

  return {
    label: "Controlled board",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "Ticket volume is currently manageable and the board is not showing major pressure indicators.",
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
  icon: ElementType;
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
        primary
          ? "text-white hover:opacity-90"
          : "border text-[var(--text-primary)] hover:-translate-y-0.5 hover:shadow-md"
      }`}
      style={
        primary
          ? { backgroundColor: "#1B7340" }
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TicketsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [focusMode, setFocusMode] = useState<
    "all" | "hot" | "major" | "unassigned"
  >("all");

  const { data, isLoading } = useTickets(page, 20, {
    status: status || undefined,
    priority: priority || undefined,
    type: type || undefined,
  });
  const { data: stats, isLoading: statsLoading } = useTicketStats();
  const bulkUpdate = useBulkUpdateTickets();

  const tickets = data?.data ?? [];
  const meta = data?.meta;
  const hasManage =
    user?.permissions?.includes("*") ||
    user?.permissions?.includes("itsm.manage");

  const openCount =
    stats?.openCount ??
    tickets.filter(
      (ticket) => !["closed", "resolved", "cancelled"].includes(ticket.status),
    ).length;
  const breachedCount =
    stats?.slaBreachedCount ??
    tickets.filter(
      (ticket) =>
        ticket.slaResolutionMet === false || ticket.slaResponseMet === false,
    ).length;
  const majorCount =
    stats?.majorIncidents ??
    tickets.filter((ticket) => ticket.isMajorIncident).length;

  const visibleTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const slaInfo = getSLAInfo(ticket);
      const isHot =
        ticket.isMajorIncident ||
        ticket.priority === "P1_critical" ||
        slaInfo.label === "Breached" ||
        slaInfo.label === "Response Breached" ||
        slaInfo.label === "At Risk";

      const matchesSearch =
        !query ||
        ticket.ticketNumber.toLowerCase().includes(query) ||
        ticket.title.toLowerCase().includes(query) ||
        ticket.type.toLowerCase().includes(query) ||
        ticket.assigneeName?.toLowerCase().includes(query) ||
        ticket.teamQueueName?.toLowerCase().includes(query) ||
        ticket.reporterName?.toLowerCase().includes(query);

      const matchesFocus =
        focusMode === "all"
          ? true
          : focusMode === "hot"
            ? isHot
            : focusMode === "major"
              ? ticket.isMajorIncident
              : !ticket.assigneeId;

      return matchesSearch && matchesFocus;
    });
  }, [tickets, searchQuery, focusMode]);

  const visibleHotCount = useMemo(
    () =>
      tickets.filter((ticket) => {
        const slaInfo = getSLAInfo(ticket);
        return (
          ticket.isMajorIncident ||
          ticket.priority === "P1_critical" ||
          slaInfo.label === "Breached" ||
          slaInfo.label === "Response Breached" ||
          slaInfo.label === "At Risk"
        );
      }).length,
    [tickets],
  );

  const visibleIncidentCount = useMemo(
    () => visibleTickets.filter((ticket) => ticket.type === "incident").length,
    [visibleTickets],
  );
  const visibleRequestCount = useMemo(
    () =>
      visibleTickets.filter((ticket) => ticket.type === "service_request")
        .length,
    [visibleTickets],
  );
  const visibleUnassignedCount = useMemo(
    () => visibleTickets.filter((ticket) => !ticket.assigneeId).length,
    [visibleTickets],
  );

  const posture = ticketPosture({
    openCount,
    breachedCount,
    majorCount,
    hotCount: visibleHotCount,
  });

  const activeFilterCount = [status, priority, type].filter(Boolean).length;

  const exportColumns = useMemo(
    () => [
      { key: "ticketNumber", header: "Ticket #" },
      { key: "title", header: "Title" },
      { key: "type", header: "Type" },
      { key: "priority", header: "Priority" },
      { key: "status", header: "Status" },
      {
        key: "createdAt",
        header: "Created",
        format: (value: string) =>
          value ? new Date(value).toLocaleDateString() : "",
      },
    ],
    [],
  );

  const bulkActions: BulkAction[] = useMemo(
    () => [
      {
        id: "close",
        label: "Close",
        icon: CheckCircle,
        onExecute: async (ids) => {
          await bulkUpdate.mutateAsync({ ids, fields: { status: "closed" } });
          toast.success(`${ids.length} ticket(s) closed`);
        },
      },
      {
        id: "assign",
        label: "Assign to Me",
        icon: UserCheck,
        onExecute: async (ids) => {
          await bulkUpdate.mutateAsync({
            ids,
            fields: { assigneeId: user?.id },
          });
          toast.success(`${ids.length} ticket(s) assigned`);
        },
      },
      {
        id: "export",
        label: "Export Selected",
        icon: Download,
        onExecute: (ids) => {
          const selected = visibleTickets.filter((ticket) =>
            ids.includes(ticket.id),
          );
          exportToCSV(selected, exportColumns, "tickets-selected");
          toast.success("Exported selected tickets");
        },
      },
    ],
    [bulkUpdate, user?.id, visibleTickets, exportColumns],
  );

  const columns: Column<Ticket>[] = [
    {
      key: "ticketNumber",
      header: "Ticket #",
      sortable: true,
      className: "min-w-[120px]",
      render: (item) => (
        <span className="text-sm font-mono font-semibold text-[var(--primary)]">
          {item.ticketNumber}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[280px]",
      render: (item) => (
        <div className="flex items-start gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
              {item.title}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {item.teamQueueName || item.teamQueueId || "Direct route"}
              {" • "}
              {item.reporterName || item.reporterId}
            </p>
          </div>
          {item.isMajorIncident && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-500 ring-1 ring-red-500/20">
              <Flame size={9} />
              Major
            </span>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[10px] font-semibold capitalize text-[var(--text-secondary)]">
          {item.type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      align: "center",
      render: (item) => {
        const color = PRIORITY_COLORS[item.priority] ?? {
          bg: "var(--surface-2)",
          text: "var(--text-muted)",
          accent: "#64748B",
        };

        return (
          <InlineSelect
            value={item.priority}
            options={TICKET_PRIORITIES.filter((entry) => entry.value).map(
              (entry) => ({
                value: entry.value,
                label: entry.label,
              }),
            )}
            onSave={async (newPriority) => {
              await apiClient.put(`/itsm/tickets/${item.id}`, {
                priority: newPriority,
              });
              toast.success("Priority updated");
            }}
            renderValue={() => (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1"
                style={{
                  backgroundColor: color.bg,
                  color: color.text,
                  boxShadow: `inset 0 0 0 1px ${color.text}20`,
                }}
              >
                {getPriorityLabel(item.priority)}
              </span>
            )}
            editable={!!hasManage}
          />
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => (
        <InlineSelect
          value={item.status}
          options={TICKET_STATUSES.filter((entry) => entry.value).map(
            (entry) => ({
              value: entry.value,
              label: entry.label,
            }),
          )}
          onSave={async (newStatus) => {
            await apiClient.post(`/itsm/tickets/${item.id}/transition`, {
              status: newStatus,
            });
            toast.success("Status updated");
          }}
          renderValue={() => <StatusBadge status={item.status} />}
          editable={!!hasManage}
        />
      ),
    },
    {
      key: "assigneeId",
      header: "Assignee",
      render: (item) => (
        <span
          className={`text-sm ${
            item.assigneeId
              ? "text-[var(--text-secondary)]"
              : "text-[var(--text-muted)] italic"
          }`}
        >
          {item.assigneeName ||
            (item.assigneeId
              ? `${item.assigneeId.slice(0, 8)}...`
              : "Unassigned")}
        </span>
      ),
    },
    {
      key: "sla",
      header: "SLA",
      align: "center",
      render: (item) => {
        const sla = getSLAInfo(item);

        return (
          <div className="flex items-center justify-center gap-2">
            {sla.pct !== null ? (
              <div className="relative h-1.5 w-10 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, sla.pct)}%`,
                    backgroundColor: sla.color,
                  }}
                />
              </div>
            ) : (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: sla.color }}
              />
            )}
            <span
              className="text-[10px] font-semibold"
              style={{ color: sla.color }}
            >
              {sla.label}
            </span>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (item) => (
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
  ];

  const focusCards = [
    {
      key: "all" as const,
      title: "All tickets",
      count: meta?.totalItems ?? tickets.length,
      description:
        "The full working board across incidents, requests, and change-linked work.",
      accent: "#1B7340",
      icon: Layers3,
    },
    {
      key: "hot" as const,
      title: "High-risk lane",
      count: visibleHotCount,
      description:
        "Major incidents, breached work, and the tickets most likely to create noise.",
      accent: "#DC2626",
      icon: ShieldAlert,
    },
    {
      key: "unassigned" as const,
      title: "Unassigned",
      count: tickets.filter((ticket) => !ticket.assigneeId).length,
      description:
        "Work that still needs clean ownership before it can move properly.",
      accent: "#2563EB",
      icon: Inbox,
    },
  ];

  const emptyTitle =
    searchQuery.trim() || focusMode !== "all"
      ? "No tickets match this board"
      : "No tickets found";
  const emptyDescription =
    searchQuery.trim() || focusMode !== "all"
      ? "Try adjusting your search or focus lane to reopen the command board."
      : "Create your first ticket to get started.";

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(27, 115, 64, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(27,115,64,0.16), transparent 32%), radial-gradient(circle at 88% 16%, rgba(37,99,235,0.12), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(27, 115, 64, 0.24)",
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
                <TicketIcon size={14} className="text-[#1B7340]" />
                Ticket operations desk
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                Tickets
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                Manage incidents, service requests, and change-linked work with
                a stronger command view, cleaner focus lanes, and faster
                board-level decision making.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <HeroActionButton
                icon={Plus}
                label="Create Ticket"
                primary
                onClick={() => router.push("/dashboard/itsm/tickets/new")}
              />
              <HeroActionButton
                icon={Filter}
                label="Filters"
                onClick={() => setShowFilters((value) => !value)}
              />
              <HeroActionButton
                icon={ShieldAlert}
                label="Hot Work"
                onClick={() => setFocusMode("hot")}
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
                  Operational posture
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Ticket pulse
                </h2>
              </div>
              <Activity size={20} className="text-[#1B7340]" />
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {posture.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Total tickets
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {statsLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    (stats?.total ?? tickets.length)
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Open
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {statsLoading ? <LoadingValue width="w-14" /> : openCount}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  SLA breached
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {statsLoading ? <LoadingValue width="w-14" /> : breachedCount}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Major incidents
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {statsLoading ? <LoadingValue width="w-14" /> : majorCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Total Tickets",
            value: stats?.total ?? tickets.length,
            color: "#1B7340",
            bg: "rgba(27, 115, 64, 0.1)",
            helper:
              "Every ticket currently represented in the operating estate.",
          },
          {
            label: "Open",
            value: openCount,
            color: "#2563EB",
            bg: "rgba(37, 99, 235, 0.1)",
            helper:
              "Tickets still requiring movement before they can be closed out.",
          },
          {
            label: "SLA Breached",
            value: breachedCount,
            color: "#DC2626",
            bg: "rgba(220, 38, 38, 0.1)",
            helper:
              "Items that need recovery rather than quiet background handling.",
          },
          {
            label: "Major Incidents",
            value: majorCount,
            color: "#F97316",
            bg: "rgba(249, 115, 22, 0.1)",
            helper:
              "High-visibility incidents that can distort the rest of the board.",
          },
          {
            label: "Hot Work",
            value: visibleHotCount,
            color: "#7C3AED",
            bg: "rgba(124, 58, 237, 0.1)",
            helper:
              "Local page view of tickets needing the sharpest operational attention.",
          },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5"
            style={{
              backgroundImage: `radial-gradient(circle at 100% 0%, ${card.color}16, transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
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
            {statsLoading ? (
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
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

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="grid gap-3 lg:grid-cols-3"
      >
        {focusCards.map((card) => {
          const Icon = card.icon;
          const active = focusMode === card.key;

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setFocusMode(card.key)}
              className="relative overflow-hidden rounded-[28px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: active ? card.accent : "var(--border)",
                backgroundColor: active
                  ? `${card.accent}10`
                  : "var(--surface-0)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: active
                      ? `${card.accent}18`
                      : "var(--surface-1)",
                    color: active ? card.accent : "var(--text-secondary)",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: active ? card.accent : "var(--text-primary)",
                      }}
                    >
                      {card.title}
                    </p>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                      style={{
                        backgroundColor: active
                          ? `${card.accent}16`
                          : "var(--surface-2)",
                        color: active ? card.accent : "var(--text-secondary)",
                      }}
                    >
                      {card.count}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {card.description}
                  </p>
                </div>
              </div>
              {active && (
                <motion.div
                  layoutId="tickets-focus"
                  className="absolute inset-x-0 top-0 h-1 rounded-t-[28px]"
                  style={{ backgroundColor: card.accent }}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Ticket command board
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Primary operating view
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ExportDropdown
                  data={visibleTickets}
                  columns={exportColumns}
                  filename="tickets"
                  title="ITSM Tickets"
                  serverExportUrl="/itsm/tickets/export"
                  serverExportParams={{
                    ...(status ? { status } : {}),
                    ...(priority ? { priority } : {}),
                    ...(type ? { type } : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                  className={`relative flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                    showFilters || activeFilterCount > 0
                      ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                  }`}
                >
                  <Filter size={15} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="relative w-full sm:max-w-sm">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <input
                  type="text"
                  placeholder="Search ticket number, title, route, or owner..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>

              {(searchQuery || focusMode !== "all") && (
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <FilterChip
                      label={`Search: ${searchQuery}`}
                      onRemove={() => setSearchQuery("")}
                    />
                  )}
                  {focusMode !== "all" && (
                    <FilterChip
                      label={
                        focusCards.find((card) => card.key === focusMode)
                          ?.title ?? focusMode
                      }
                      onRemove={() => setFocusMode("all")}
                    />
                  )}
                </div>
              )}
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <FilterSelect
                        label="Status"
                        value={status}
                        options={TICKET_STATUSES}
                        onChange={(value) => {
                          setStatus(value);
                          setPage(1);
                        }}
                      />
                      <FilterSelect
                        label="Priority"
                        value={priority}
                        options={TICKET_PRIORITIES}
                        onChange={(value) => {
                          setPriority(value);
                          setPage(1);
                        }}
                      />
                      <FilterSelect
                        label="Type"
                        value={type}
                        options={TICKET_TYPES}
                        onChange={(value) => {
                          setType(value);
                          setPage(1);
                        }}
                      />
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatus("");
                            setPriority("");
                            setType("");
                            setPage(1);
                          }}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-secondary)]"
                        >
                          <X size={12} />
                          Clear all
                        </button>
                      )}
                    </div>

                    {activeFilterCount > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                        {status && (
                          <FilterChip
                            label={
                              TICKET_STATUSES.find(
                                (entry) => entry.value === status,
                              )?.label ?? status
                            }
                            onRemove={() => {
                              setStatus("");
                              setPage(1);
                            }}
                          />
                        )}
                        {priority && (
                          <FilterChip
                            label={
                              TICKET_PRIORITIES.find(
                                (entry) => entry.value === priority,
                              )?.label ?? priority
                            }
                            onRemove={() => {
                              setPriority("");
                              setPage(1);
                            }}
                          />
                        )}
                        {type && (
                          <FilterChip
                            label={
                              TICKET_TYPES.find((entry) => entry.value === type)
                                ?.label ?? type
                            }
                            onRemove={() => {
                              setType("");
                              setPage(1);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <DataTable
              columns={columns}
              data={visibleTickets}
              keyExtractor={(item) => item.id}
              loading={isLoading}
              selectable={!!hasManage}
              bulkActions={hasManage ? bulkActions : undefined}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
              emptyAction={
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/itsm/tickets/new")}
                  className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Plus size={16} />
                  Create Ticket
                </button>
              }
              onRowClick={(item) =>
                router.push(`/dashboard/itsm/tickets/${item.id}`)
              }
              pagination={
                meta
                  ? {
                      currentPage: meta.page,
                      totalPages: meta.totalPages,
                      totalItems: meta.totalItems,
                      pageSize: meta.pageSize,
                      onPageChange: setPage,
                    }
                  : undefined
              }
            />
          </motion.div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Coverage pressure
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Visible mix
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              This panel shows what the current board view is actually made of,
              so you can see when one work type is crowding out the rest.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SignalCard
                label="Incidents"
                value={visibleIncidentCount}
                accent="#DC2626"
                helper="Operational break-fix work in the current view."
              />
              <SignalCard
                label="Service Requests"
                value={visibleRequestCount}
                accent="#2563EB"
                helper="Fulfilment work moving alongside incident demand."
              />
              <SignalCard
                label="Unassigned"
                value={visibleUnassignedCount}
                accent="#7C3AED"
                helper="Items that still need explicit ownership."
              />
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Risk signal
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Board watchlist
            </h3>
            <div className="mt-4 space-y-3">
              {[
                {
                  title: "Protect breached work",
                  body: "Tickets already outside SLA need recovery plans, not quiet updates that leave them aging further.",
                },
                {
                  title: "Separate major-incident gravity",
                  body: "Major work can distort the board quickly, so isolate it mentally from normal queue handling.",
                },
                {
                  title: "Assign or surface blockers",
                  body: "Unowned work and tickets waiting silently are both signs of command drift.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Control posture
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Operator notes
            </h3>
            <div className="mt-4 space-y-4">
              <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Permissions
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {hasManage ? "Manage enabled" : "Read only"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {hasManage
                    ? "Inline status and priority changes are available in this workspace."
                    : "Use this view to monitor tickets, but management actions are restricted."}
                </p>
              </div>

              <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Active view
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]">
                    {focusCards.find((card) => card.key === focusMode)?.title ??
                      "All tickets"}
                    <ArrowRight size={14} />
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {focusMode === "all"
                    ? "The full board is visible, so use filters only when you need tighter operational framing."
                    : "A narrowed focus lane is active, which is useful for pressure handling but can hide adjacent demand."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter Select                                                      */
/* ------------------------------------------------------------------ */

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-lg border bg-[var(--surface-0)] px-3 py-2 text-sm transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 ${
          value
            ? "border-[var(--primary)]/30 text-[var(--primary)]"
            : "border-[var(--border)] text-[var(--text-primary)]"
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter Chip                                                        */
/* ------------------------------------------------------------------ */

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/8 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-[var(--primary)]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--primary)]/15"
      >
        <X size={11} />
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Signal Card                                                        */
/* ------------------------------------------------------------------ */

function SignalCard({
  label,
  value,
  accent,
  helper,
}: {
  label: string;
  value: number;
  accent: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p
        className="mt-2 text-2xl font-bold tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}
