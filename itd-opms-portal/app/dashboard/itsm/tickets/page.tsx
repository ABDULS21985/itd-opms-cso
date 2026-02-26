"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Ticket as TicketIcon,
  Plus,
  Filter,
  AlertTriangle,
  Clock,
  Loader2,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTickets, useTicketStats } from "@/hooks/use-itsm";
import type { Ticket } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TICKET_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending_user", label: "Pending User" },
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

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  P1_critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  P2_high: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" },
  P3_medium: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  P4_low: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  assigned: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  in_progress: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  pending_user: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" },
  pending_vendor: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" },
  resolved: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  closed: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  cancelled: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
};

function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    P1_critical: "P1",
    P2_high: "P2",
    P3_medium: "P3",
    P4_low: "P4",
  };
  return map[priority] ?? priority;
}

function getSLAColor(ticket: Ticket): { color: string; label: string } {
  if (ticket.slaResolutionMet === false) {
    return { color: "#EF4444", label: "Breached" };
  }
  if (ticket.slaResponseMet === false) {
    return { color: "#EF4444", label: "Response Breached" };
  }
  if (ticket.slaPausedAt) {
    return { color: "#9CA3AF", label: "Paused" };
  }
  if (ticket.status === "closed" || ticket.status === "resolved") {
    if (ticket.slaResolutionMet) {
      return { color: "#10B981", label: "Met" };
    }
    return { color: "#10B981", label: "Met" };
  }
  // Check if resolution target exists and how close we are
  if (ticket.slaResolutionTarget) {
    const target = new Date(ticket.slaResolutionTarget).getTime();
    const now = Date.now();
    const created = new Date(ticket.createdAt).getTime();
    const totalDuration = target - created;
    const elapsed = now - created;
    const pct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

    if (pct >= 100) return { color: "#EF4444", label: "Breached" };
    if (pct >= 80) return { color: "#F59E0B", label: "At Risk" };
    return { color: "#10B981", label: "On Track" };
  }
  return { color: "#9CA3AF", label: "No SLA" };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TicketsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useTickets(page, 20, {
    status: status || undefined,
    priority: priority || undefined,
    type: type || undefined,
  });
  const { data: stats } = useTicketStats();

  const tickets = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Columns ---- */

  const columns: Column<Ticket>[] = [
    {
      key: "ticketNumber",
      header: "Ticket #",
      sortable: true,
      className: "min-w-[120px]",
      render: (item) => (
        <span className="text-sm font-mono font-medium text-[var(--primary)]">
          {item.ticketNumber}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[220px]",
      render: (item) => (
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
            {item.title}
          </p>
          {item.isMajorIncident && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#EF4444" }}
            >
              <AlertTriangle size={10} />
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
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
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
          text: "var(--neutral-gray)",
        };
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {getPriorityLabel(item.priority)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "assigneeId",
      header: "Assignee",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.assigneeId ? item.assigneeId.slice(0, 8) + "..." : "Unassigned"}
        </span>
      ),
    },
    {
      key: "sla",
      header: "SLA",
      align: "center",
      render: (item) => {
        const sla = getSLAColor(item);
        return (
          <div className="flex items-center justify-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: sla.color }}
            />
            <span className="text-xs font-medium" style={{ color: sla.color }}>
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
        <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Total Tickets
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Open
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--primary)] tabular-nums">
              {stats.openCount}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-1.5">
              <Clock size={12} style={{ color: "#EF4444" }} />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                SLA Breached
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#EF4444" }}>
              {stats.slaBreachedCount}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={12} style={{ color: "#F97316" }} />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                Major Incidents
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#F97316" }}>
              {stats.majorIncidents}
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
            <TicketIcon size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Tickets
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              View and manage incidents, service requests, and changes
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
            onClick={() => router.push("/dashboard/itsm/tickets/new")}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Create Ticket
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {TICKET_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {TICKET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={tickets}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No tickets found"
          emptyDescription="Create your first ticket to get started."
          emptyAction={
            <button
              type="button"
              onClick={() => router.push("/dashboard/itsm/tickets/new")}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
  );
}
