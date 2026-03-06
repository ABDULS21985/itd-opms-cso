"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket as TicketIcon,
  Plus,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle,
  UserCheck,
  Download,
  X,
  Flame,
  CircleDot,
  ShieldAlert,
} from "lucide-react";
import { DataTable, type Column, type BulkAction } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { InlineSelect } from "@/components/shared/inline-edit";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { useTickets, useTicketStats, useBulkUpdateTickets } from "@/hooks/use-itsm";
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

function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    P1_critical: "P1",
    P2_high: "P2",
    P3_medium: "P3",
    P4_low: "P4",
  };
  return map[priority] ?? priority;
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
    const pct = totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;

    if (pct >= 100) return { color: "#EF4444", label: "Breached", pct: 100 };
    if (pct >= 80) return { color: "#F59E0B", label: "At Risk", pct };
    return { color: "#10B981", label: "On Track", pct };
  }
  return { color: "#9CA3AF", label: "No SLA", pct: null };
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
  const [showFilters, setShowFilters] = useState(false);

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
    user?.permissions?.includes("*") || user?.permissions?.includes("itsm.manage");

  const activeFilterCount = [status, priority, type].filter(Boolean).length;

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
          const selected = tickets.filter((t) => ids.includes(t.id));
          exportToCSV(selected, exportColumns, "tickets-selected");
          toast.success("Exported selected tickets");
        },
      },
    ],
    [bulkUpdate, tickets, user?.id],
  );

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
        format: (v: any) => (v ? new Date(v).toLocaleDateString() : ""),
      },
    ],
    [],
  );

  /* ---- Columns ---- */

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
      className: "min-w-[240px]",
      render: (item) => (
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
            {item.title}
          </p>
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
        };
        return (
          <InlineSelect
            value={item.priority}
            options={TICKET_PRIORITIES.filter((p) => p.value).map((p) => ({
              value: p.value,
              label: p.label,
            }))}
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
          options={TICKET_STATUSES.filter((s) => s.value).map((s) => ({
            value: s.value,
            label: s.label,
          }))}
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
          className={`text-sm ${item.assigneeId ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)] italic"}`}
        >
          {item.assigneeName || (item.assigneeId
            ? item.assigneeId.slice(0, 8) + "..."
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
            {/* Mini SLA progress bar */}
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
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <TicketIcon size={22} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Tickets
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Manage incidents, service requests, and changes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportDropdown
            data={tickets}
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
            onClick={() => setShowFilters((f) => !f)}
            className={`relative flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
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
          <button
            type="button"
            onClick={() => router.push("/dashboard/itsm/tickets/new")}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
          >
            <Plus size={15} />
            Create Ticket
          </button>
        </div>
      </motion.div>

      {/* ── Stats Bar ── */}
      {(stats || statsLoading) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          <StatCard
            label="Total Tickets"
            value={stats?.total}
            icon={<CircleDot size={16} />}
            color="var(--primary)"
            loading={statsLoading}
            index={0}
          />
          <StatCard
            label="Open"
            value={stats?.openCount}
            icon={<Clock size={16} />}
            color="#3B82F6"
            loading={statsLoading}
            index={1}
          />
          <StatCard
            label="SLA Breached"
            value={stats?.slaBreachedCount}
            icon={<ShieldAlert size={16} />}
            color="#EF4444"
            loading={statsLoading}
            needsAttention={(stats?.slaBreachedCount ?? 0) > 0}
            index={2}
          />
          <StatCard
            label="Major Incidents"
            value={stats?.majorIncidents}
            icon={<Flame size={16} />}
            color="#F97316"
            loading={statsLoading}
            needsAttention={(stats?.majorIncidents ?? 0) > 0}
            index={3}
          />
        </motion.div>
      )}

      {/* ── Filters ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <div className="flex flex-wrap items-end gap-3">
                <FilterSelect
                  label="Status"
                  value={status}
                  options={TICKET_STATUSES}
                  onChange={(v) => {
                    setStatus(v);
                    setPage(1);
                  }}
                />
                <FilterSelect
                  label="Priority"
                  value={priority}
                  options={TICKET_PRIORITIES}
                  onChange={(v) => {
                    setPriority(v);
                    setPage(1);
                  }}
                />
                <FilterSelect
                  label="Type"
                  value={type}
                  options={TICKET_TYPES}
                  onChange={(v) => {
                    setType(v);
                    setPage(1);
                  }}
                />
                {activeFilterCount > 0 && (
                  <button
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

              {/* Active filter chips */}
              {activeFilterCount > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                  {status && (
                    <FilterChip
                      label={
                        TICKET_STATUSES.find((s) => s.value === status)
                          ?.label ?? status
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
                        TICKET_PRIORITIES.find((p) => p.value === priority)
                          ?.label ?? priority
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
                        TICKET_TYPES.find((t) => t.value === type)?.label ??
                        type
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

      {/* ── Data Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <DataTable
          columns={columns}
          data={tickets}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          selectable={!!hasManage}
          bulkActions={hasManage ? bulkActions : undefined}
          emptyTitle="No tickets found"
          emptyDescription="Create your first ticket to get started."
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
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  color,
  loading,
  needsAttention,
  index = 0,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  needsAttention?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 transition-shadow hover:shadow-sm ${
        needsAttention ? "ring-1" : ""
      }`}
      style={
        needsAttention
          ? { boxShadow: `0 0 0 1px ${color}20`, borderColor: `${color}30` }
          : undefined
      }
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {label}
          </p>
          {loading ? (
            <div className="mt-0.5 h-6 w-10 animate-pulse rounded bg-[var(--surface-2)]" />
          ) : (
            <p
              className="text-xl font-bold tabular-nums"
              style={{ color: needsAttention ? color : "var(--text-primary)" }}
            >
              {value ?? "--"}
            </p>
          )}
        </div>
      </div>
    </motion.div>
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
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border bg-[var(--surface-0)] px-3 py-2 text-sm transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 ${
          value
            ? "border-[var(--primary)]/30 text-[var(--primary)]"
            : "border-[var(--border)] text-[var(--text-primary)]"
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
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
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--primary)]/15"
      >
        <X size={11} />
      </button>
    </span>
  );
}
