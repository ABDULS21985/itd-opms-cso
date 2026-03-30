"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Eye,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTickets, useTicketStats, useDeclareMajorIncident } from "@/hooks/use-itsm";
import type { Ticket } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */

interface SeverityOption {
  value: string;
  label: string;
  accent: string;
  description: string;
}

const SEVERITY_LEVELS: SeverityOption[] = [
  {
    value: "",
    label: "All incidents",
    accent: "#DC2626",
    description: "Full major-incident view",
  },
  {
    value: "P1",
    label: "SEV-1 / P1",
    accent: "#DC2626",
    description: "Critical — full outage or data loss",
  },
  {
    value: "P2",
    label: "SEV-2 / P2",
    accent: "#F59E0B",
    description: "High — significant degradation",
  },
  {
    value: "P3",
    label: "SEV-3 / P3",
    accent: "#3B82F6",
    description: "Medium — partial impact",
  },
];

const STATUS_COLORS: Record<string, string> = {
  open: "#EF4444",
  in_progress: "#F59E0B",
  pending: "#8B5CF6",
  resolved: "#10B981",
  closed: "#6B7280",
};

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  helper: string;
  icon: LucideIcon;
  accent: string;
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({ title, value, helper, icon: Icon, accent }: StatCardProps) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between mb-1">
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          {title}
        </p>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
        {helper}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline event item                                                 */
/* ------------------------------------------------------------------ */

function TimelineEntry({
  ticket,
  now,
}: {
  ticket: Ticket;
  now: Date;
}) {
  const age = Math.round(
    (now.getTime() - new Date(ticket.createdAt).getTime()) / 60_000,
  );
  const ageLabel =
    age < 60 ? `${age}m` : age < 1440 ? `${Math.floor(age / 60)}h` : `${Math.floor(age / 1440)}d`;

  const isBreached =
    (ticket.slaResolutionTarget &&
      now > new Date(ticket.slaResolutionTarget)) ||
    (ticket.slaResponseTarget &&
      !ticket.firstResponseAt &&
      now > new Date(ticket.slaResponseTarget));

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative pl-6 pb-6 last:pb-0"
    >
      {/* Timeline dot */}
      <div
        className="absolute left-0 top-1 h-3 w-3 rounded-full border-2"
        style={{
          borderColor:
            ticket.status === "open" || ticket.status === "in_progress"
              ? "#EF4444"
              : "#10B981",
          backgroundColor:
            ticket.status === "open" || ticket.status === "in_progress"
              ? "rgba(239,68,68,0.2)"
              : "rgba(16,185,129,0.2)",
        }}
      />
      {/* Connector line */}
      <div
        className="absolute left-[5px] top-4 bottom-0 w-0.5"
        style={{ backgroundColor: "var(--border)" }}
      />

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/dashboard/itsm/tickets?id=${ticket.id}`}
                className="text-sm font-semibold hover:underline"
                style={{ color: "var(--primary)" }}
              >
                {ticket.ticketNumber}
              </Link>
              <StatusBadge status={ticket.status} />
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  backgroundColor:
                    ticket.priority === "P1"
                      ? "rgba(220,38,38,0.12)"
                      : ticket.priority === "P2"
                        ? "rgba(245,158,11,0.12)"
                        : "rgba(59,130,246,0.12)",
                  color:
                    ticket.priority === "P1"
                      ? "#DC2626"
                      : ticket.priority === "P2"
                        ? "#F59E0B"
                        : "#3B82F6",
                }}
              >
                {ticket.priority}
              </span>
              {isBreached && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.12)",
                    color: "#EF4444",
                  }}
                >
                  SLA Breached
                </span>
              )}
            </div>
            <p
              className="mt-1 text-sm font-medium truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {ticket.title}
            </p>
            <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {ageLabel} old
              </span>
              {ticket.assigneeName && (
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {ticket.assigneeName}
                </span>
              )}
              {ticket.teamQueueName && (
                <span>{ticket.teamQueueName}</span>
              )}
            </div>
          </div>

          <Link
            href={`/dashboard/itsm/tickets?id=${ticket.id}`}
            className="shrink-0 rounded-lg p-2 hover:bg-[var(--surface-1)] transition-colors"
            title="View ticket"
          >
            <Eye size={16} style={{ color: "var(--text-secondary)" }} />
          </Link>
        </div>

        {/* SLA progress bar */}
        {ticket.slaResolutionTarget && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-tertiary)" }}>
              <span>SLA Resolution</span>
              <span>
                Target: {new Date(ticket.slaResolutionTarget).toLocaleString()}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--surface-1)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, slaConsumption(ticket, now))}%`,
                  backgroundColor:
                    slaConsumption(ticket, now) >= 100
                      ? "#EF4444"
                      : slaConsumption(ticket, now) >= 80
                        ? "#F59E0B"
                        : "#10B981",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function slaConsumption(ticket: Ticket, now: Date): number {
  if (!ticket.slaResolutionTarget) return 0;
  const total =
    new Date(ticket.slaResolutionTarget).getTime() -
    new Date(ticket.createdAt).getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - new Date(ticket.createdAt).getTime();
  return (elapsed / total) * 100;
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function MajorIncidentsPage() {
  const [severityFilter, setSeverityFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: ticketStats } = useTicketStats();
  const { data: ticketsData, isLoading } = useTickets(1, 200, {
    type: "incident",
  });

  const now = useMemo(() => new Date(), []);

  /* Filter to major incidents only */
  const majorIncidents = useMemo(() => {
    const allTickets: Ticket[] = Array.isArray(ticketsData)
      ? ticketsData
      : (ticketsData as { items?: Ticket[] })?.items ?? [];

    return allTickets.filter((t) => {
      if (!t.isMajorIncident) return false;
      if (severityFilter && t.priority !== severityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q) ||
          t.assigneeName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ticketsData, severityFilter, search]);

  const activeIncidents = majorIncidents.filter(
    (t) => !["resolved", "closed", "cancelled"].includes(t.status),
  );
  const resolvedIncidents = majorIncidents.filter(
    (t) => ["resolved", "closed"].includes(t.status),
  );

  const avgResolutionMins = useMemo(() => {
    const resolved = majorIncidents.filter((t) => t.resolvedAt);
    if (resolved.length === 0) return 0;
    const total = resolved.reduce((sum, t) => {
      return (
        sum +
        (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) /
          60_000
      );
    }, 0);
    return Math.round(total / resolved.length);
  }, [majorIncidents]);

  const avgResolutionLabel =
    avgResolutionMins < 60
      ? `${avgResolutionMins}m`
      : `${Math.floor(avgResolutionMins / 60)}h ${avgResolutionMins % 60}m`;

  const breachedCount = activeIncidents.filter(
    (t) =>
      t.slaResolutionTarget && now > new Date(t.slaResolutionTarget),
  ).length;

  const activeSeverity = SEVERITY_LEVELS.find((s) => s.value === severityFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert size={24} style={{ color: "#DC2626" }} />
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Major Incidents
          </h1>
          {activeIncidents.length > 0 && (
            <span
              className="ml-2 rounded-full px-2.5 py-0.5 text-xs font-bold animate-pulse"
              style={{
                backgroundColor: "rgba(220,38,38,0.12)",
                color: "#DC2626",
              }}
            >
              {activeIncidents.length} ACTIVE
            </span>
          )}
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Command-centre view for declared major incidents — SLA tracking,
          severity triage, and stakeholder coordination.
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          title="Active Incidents"
          value={activeIncidents.length}
          helper={
            activeIncidents.length === 0
              ? "No major incidents burning"
              : `${activeIncidents.length} incident${activeIncidents.length > 1 ? "s" : ""} in flight`
          }
          icon={Radio}
          accent="#DC2626"
        />
        <StatCard
          title="SLA Breached"
          value={breachedCount}
          helper={
            breachedCount === 0
              ? "All within SLA"
              : `${breachedCount} past resolution target`
          }
          icon={AlertTriangle}
          accent="#F59E0B"
        />
        <StatCard
          title="Resolved"
          value={resolvedIncidents.length}
          helper="Major incidents resolved"
          icon={Shield}
          accent="#10B981"
        />
        <StatCard
          title="Avg Resolution"
          value={avgResolutionMins > 0 ? avgResolutionLabel : "—"}
          helper="Mean time to resolve"
          icon={Clock}
          accent="#3B82F6"
        />
      </motion.div>

      {/* Severity filter + search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        {SEVERITY_LEVELS.map((sev) => (
          <button
            key={sev.value}
            onClick={() => setSeverityFilter(sev.value)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border"
            style={{
              backgroundColor:
                severityFilter === sev.value
                  ? `${sev.accent}18`
                  : "var(--surface-0)",
              color:
                severityFilter === sev.value
                  ? sev.accent
                  : "var(--text-secondary)",
              borderColor:
                severityFilter === sev.value
                  ? sev.accent
                  : "var(--border)",
            }}
          >
            {sev.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              type="text"
              placeholder="Search incidents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] pl-8 pr-3 py-1.5 text-sm w-56"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Severity description */}
      {activeSeverity && activeSeverity.value && (
        <p className="text-xs" style={{ color: activeSeverity.accent }}>
          {activeSeverity.description}
        </p>
      )}

      {/* Active incidents — timeline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wide mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Active Incident Timeline
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}
            />
          </div>
        ) : activeIncidents.length === 0 ? (
          <div
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-8 text-center"
          >
            <Shield size={32} className="mx-auto mb-2" style={{ color: "#10B981" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              All clear
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              No active major incidents. The environment is stable.
            </p>
          </div>
        ) : (
          <div className="relative">
            {activeIncidents
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .map((ticket) => (
                <TimelineEntry key={ticket.id} ticket={ticket} now={now} />
              ))}
          </div>
        )}
      </motion.div>

      {/* Resolved / past incidents */}
      {resolvedIncidents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2
            className="text-sm font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Resolved Major Incidents ({resolvedIncidents.length})
          </h2>
          <div className="space-y-2">
            {resolvedIncidents
              .sort(
                (a, b) =>
                  new Date(b.resolvedAt ?? b.updatedAt).getTime() -
                  new Date(a.resolvedAt ?? a.updatedAt).getTime(),
              )
              .slice(0, 10)
              .map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3"
                >
                  <Shield size={16} style={{ color: "#10B981" }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/itsm/tickets?id=${ticket.id}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {ticket.ticketNumber}
                      </Link>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: "rgba(16,185,129,0.12)",
                          color: "#10B981",
                        }}
                      >
                        {ticket.status}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: "rgba(107,114,128,0.12)",
                          color: "#6B7280",
                        }}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <p
                      className="text-sm truncate mt-0.5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {ticket.title}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      Resolved
                    </p>
                    <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                      {ticket.resolvedAt
                        ? new Date(ticket.resolvedAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/itsm/tickets?id=${ticket.id}`}
                    className="shrink-0 rounded-lg p-1.5 hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <ArrowRight size={14} style={{ color: "var(--text-secondary)" }} />
                  </Link>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
