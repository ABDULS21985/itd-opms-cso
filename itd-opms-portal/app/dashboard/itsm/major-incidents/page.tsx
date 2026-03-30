"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Megaphone,
  PhoneCall,
  Plus,
  RadioTower,
  Siren,
  ShieldAlert,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  DataTable,
  type Column,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useActiveMajorIncidents,
  useDeclareMajorIncident,
  useMajorIncidentStats,
  useMajorIncidents,
  useTickets,
} from "@/hooks/use-itsm";
import { useUsers } from "@/hooks/use-system";
import type {
  MajorIncidentRecord,
  Ticket,
  UserDetail,
} from "@/types";

type SeverityLevel = "sev1" | "sev2" | "sev3";
type BusinessImpact = "critical" | "high" | "medium" | "low";
type NotificationChannel = "email" | "teams" | "in_app";

interface DeclareFormState {
  ticketId: string;
  severity: SeverityLevel;
  incidentCommanderId: string;
  communicationLeadId: string;
  bridgeUrl: string;
  bridgePhone: string;
  affectedServices: string;
  estimatedAffectedUsers: string;
  businessImpact: BusinessImpact;
  internalStakeholders: string[];
  externalStakeholders: string;
  updateFrequencyMinutes: string;
  channels: NotificationChannel[];
}

interface MetricCardProps {
  title: string;
  value: string;
  helper: string;
  accent: string;
  icon: LucideIcon;
}

function createInitialForm(ticketId = ""): DeclareFormState {
  return {
    ticketId,
    severity: "sev1",
    incidentCommanderId: "",
    communicationLeadId: "",
    bridgeUrl: "",
    bridgePhone: "",
    affectedServices: "",
    estimatedAffectedUsers: "",
    businessImpact: "critical",
    internalStakeholders: [],
    externalStakeholders: "",
    updateFrequencyMinutes: "30",
    channels: ["email", "teams", "in_app"],
  };
}

function severityMeta(severity: SeverityLevel) {
  switch (severity) {
    case "sev1":
      return {
        label: "SEV-1",
        color: "#DC2626",
        surface: "rgba(220, 38, 38, 0.12)",
        border: "rgba(248, 113, 113, 0.45)",
      };
    case "sev2":
      return {
        label: "SEV-2",
        color: "#EA580C",
        surface: "rgba(249, 115, 22, 0.12)",
        border: "rgba(251, 146, 60, 0.4)",
      };
    default:
      return {
        label: "SEV-3",
        color: "#CA8A04",
        surface: "rgba(234, 179, 8, 0.14)",
        border: "rgba(250, 204, 21, 0.4)",
      };
  }
}

function statusVariant(status: MajorIncidentRecord["status"]) {
  switch (status) {
    case "declared":
    case "investigating":
      return "error" as const;
    case "mitigating":
    case "monitoring":
    case "pir_pending":
      return "warning" as const;
    case "mitigated":
    case "resolved":
    case "closed":
      return "success" as const;
    default:
      return "default" as const;
  }
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(value?: string, now = Date.now()) {
  if (!value) {
    return "No updates yet";
  }

  const deltaMinutes = Math.max(
    0,
    Math.round((now - new Date(value).getTime()) / 60000),
  );
  if (deltaMinutes < 1) {
    return "just now";
  }
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const hours = Math.floor(deltaMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(
  declaredAt: string,
  now: number,
  resolvedAt?: string,
  closedAt?: string,
) {
  const end = closedAt ?? resolvedAt;
  const endValue = end ? new Date(end).getTime() : now;
  const minutes = Math.max(
    0,
    Math.floor((endValue - new Date(declaredAt).getTime()) / 60000),
  );
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatAverageMinutes(minutes?: number) {
  if (!minutes) {
    return "0m";
  }

  const rounded = Math.round(minutes);
  if (rounded >= 60) {
    return `${Math.floor(rounded / 60)}h ${rounded % 60}m`;
  }
  return `${rounded}m`;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ticketEligible(ticket: Ticket) {
  return (
    ticket.type === "incident" &&
    (ticket.priority === "P1_critical" || ticket.priority === "P2_high") &&
    !ticket.isMajorIncident
  );
}

function userMatches(user: UserDetail, query: string) {
  if (!query.trim()) {
    return true;
  }

  const haystack = [
    user.displayName,
    user.email,
    user.department,
    user.jobTitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

function MetricCard({
  title,
  value,
  helper,
  accent,
  icon: Icon,
}: MetricCardProps) {
  return (
    <div
      className="rounded-[24px] border p-5"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.72))",
        borderColor: "rgba(148, 163, 184, 0.2)",
        boxShadow: "0 18px 48px -38px rgba(15, 23, 42, 0.55)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {title}
          </p>
          <p
            className="mt-3 text-3xl font-semibold tracking-tight"
            style={{ color: accent }}
          >
            {value}
          </p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}18` }}
        >
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">{helper}</p>
    </div>
  );
}

function CommandCard({
  record,
  now,
}: {
  record: MajorIncidentRecord;
  now: number;
}) {
  const severity = severityMeta(record.severity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-[28px] border p-5"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%), linear-gradient(135deg, rgba(15,23,42,0.94), rgba(35,39,64,0.96))",
        borderColor: severity.border,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: severity.color }}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
              style={{
                backgroundColor: severity.surface,
                color: severity.color,
              }}
            >
              {severity.label}
            </span>
            <StatusBadge
              status={record.status}
              variant={statusVariant(record.status)}
            />
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/78">
              {record.ticket?.ticketNumber ?? "Ticket pending"}
            </span>
          </div>

          <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
            {record.ticket?.title ?? "Untitled major incident"}
          </h3>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/70">
            <span className="inline-flex items-center gap-2">
              <Clock3 size={14} />
              {formatDuration(
                record.declaredAt,
                now,
                record.resolvedAt,
                record.closedAt,
              )}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users size={14} />
              {record.incidentCommander?.displayName ?? "Commander pending"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Megaphone size={14} />
              Last update {formatRelative(record.lastUpdateAt, now)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3">
          {record.bridgeUrl ? (
            <Link
              href={record.bridgeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/12"
            >
              <RadioTower size={15} />
              Join bridge
            </Link>
          ) : null}
          <Link
            href={`/dashboard/itsm/major-incidents/${record.id}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5"
          >
            Open command board
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
            Last broadcast
          </p>
          <p className="mt-2 text-sm leading-6 text-white/82">
            {record.lastUpdateMessage ?? "Incident declared and stakeholder cadence started."}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
            Affected services
          </p>
          <p className="mt-2 text-sm text-white/82">
            {record.affectedServices.length > 0
              ? record.affectedServices.join(", ")
              : "Services still being confirmed"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
            Bridge details
          </p>
          <p className="mt-2 text-sm text-white/82">
            {record.bridgePhone ?? "Phone bridge not set"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function MajorIncidentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preselectedTicketId = searchParams.get("ticketId") ?? "";
  const isDeclareRequested = searchParams.get("declare") === "1";

  const [now, setNow] = useState(Date.now());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDeclareOpen, setIsDeclareOpen] = useState(isDeclareRequested);
  const [ticketSearch, setTicketSearch] = useState("");
  const [commanderSearch, setCommanderSearch] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [stakeholderSearch, setStakeholderSearch] = useState("");
  const [form, setForm] = useState<DeclareFormState>(
    createInitialForm(preselectedTicketId),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsDeclareOpen(isDeclareRequested);
  }, [isDeclareRequested]);

  useEffect(() => {
    if (preselectedTicketId) {
      setForm((current) => ({
        ...current,
        ticketId: preselectedTicketId,
      }));
    }
  }, [preselectedTicketId]);

  const { data: activeIncidents, isLoading: activeLoading } =
    useActiveMajorIncidents();
  const { data: stats } = useMajorIncidentStats();
  const { data: incidentPage, isLoading: historyLoading } = useMajorIncidents(
    page,
    pageSize,
    {
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
  );
  const { data: ticketPage } = useTickets(1, 100, { type: "incident" });
  const { data: usersPage } = useUsers(1, 200, { status: "active" });
  const declareMutation = useDeclareMajorIncident();

  const tickets = ticketPage?.data ?? [];
  const users = usersPage?.data ?? [];
  const incidents = incidentPage?.data ?? [];
  const active = activeIncidents ?? [];

  const eligibleTickets = useMemo(() => {
    return tickets
      .filter(ticketEligible)
      .filter((ticket) => {
        if (!ticketSearch.trim()) {
          return true;
        }

        const haystack = [
          ticket.ticketNumber,
          ticket.title,
          ticket.description,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(ticketSearch.trim().toLowerCase());
      });
  }, [ticketSearch, tickets]);

  const filteredCommanders = useMemo(
    () => users.filter((user) => userMatches(user, commanderSearch)),
    [commanderSearch, users],
  );
  const filteredLeads = useMemo(
    () => users.filter((user) => userMatches(user, leadSearch)),
    [leadSearch, users],
  );
  const filteredStakeholders = useMemo(
    () =>
      users.filter(
        (user) =>
          user.id !== form.incidentCommanderId &&
          user.id !== form.communicationLeadId &&
          userMatches(user, stakeholderSearch),
      ),
    [form.communicationLeadId, form.incidentCommanderId, stakeholderSearch, users],
  );

  const selectedTicket = tickets.find((ticket) => ticket.id === form.ticketId);

  function syncDeclareQuery(open: boolean, ticketId?: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (open) {
      next.set("declare", "1");
      if (ticketId) {
        next.set("ticketId", ticketId);
      }
    } else {
      next.delete("declare");
      next.delete("ticketId");
    }

    const target = next.toString() ? `${pathname}?${next.toString()}` : pathname;
    router.replace(target);
  }

  function openDeclare(ticketId?: string) {
    const nextTicketId = ticketId ?? preselectedTicketId;
    setForm(createInitialForm(nextTicketId));
    setTicketSearch("");
    setCommanderSearch("");
    setLeadSearch("");
    setStakeholderSearch("");
    setIsDeclareOpen(true);
    syncDeclareQuery(true, nextTicketId);
  }

  function closeDeclare() {
    setIsDeclareOpen(false);
    setForm(createInitialForm());
    setTicketSearch("");
    setCommanderSearch("");
    setLeadSearch("");
    setStakeholderSearch("");
    syncDeclareQuery(false);
  }

  async function submitDeclaration() {
    const created = await declareMutation.mutateAsync({
      ticketId: form.ticketId,
      severity: form.severity,
      incidentCommanderId: form.incidentCommanderId || undefined,
      communicationLeadId: form.communicationLeadId || undefined,
      bridgeUrl: form.bridgeUrl || undefined,
      bridgePhone: form.bridgePhone || undefined,
      affectedServices: splitList(form.affectedServices),
      estimatedAffectedUsers: form.estimatedAffectedUsers
        ? Number(form.estimatedAffectedUsers)
        : undefined,
      businessImpact: form.businessImpact,
      communicationPlan: {
        internalStakeholders: form.internalStakeholders,
        externalStakeholders: splitList(form.externalStakeholders),
        updateFrequencyMinutes: Number(form.updateFrequencyMinutes || "30"),
        channels: form.channels,
      },
    });

    closeDeclare();

    if (
      created &&
      typeof created === "object" &&
      "id" in created &&
      typeof created.id === "string"
    ) {
      router.push(`/dashboard/itsm/major-incidents/${created.id}`);
    }
  }

  function toggleStakeholder(userId: string) {
    setForm((current) => ({
      ...current,
      internalStakeholders: current.internalStakeholders.includes(userId)
        ? current.internalStakeholders.filter((id) => id !== userId)
        : [...current.internalStakeholders, userId],
    }));
  }

  function toggleChannel(channel: NotificationChannel) {
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((entry) => entry !== channel)
        : [...current.channels, channel],
    }));
  }

  const columns: Column<MajorIncidentRecord>[] = [
    {
      key: "ticket",
      header: "Incident",
      render: (record) => (
        <div className="min-w-[220px]">
          <Link
            href={`/dashboard/itsm/major-incidents/${record.id}`}
            className="text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            {record.ticket?.ticketNumber ?? record.ticketId.slice(0, 8)}
          </Link>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {record.ticket?.title ?? "Untitled major incident"}
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Declared {formatDateTime(record.declaredAt)}
          </p>
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (record) => {
        const severity = severityMeta(record.severity);
        return (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{
              backgroundColor: severity.surface,
              color: severity.color,
            }}
          >
            {severity.label}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (record) => (
        <StatusBadge
          status={record.status}
          variant={statusVariant(record.status)}
        />
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (record) => (
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {formatDuration(record.declaredAt, now, record.resolvedAt, record.closedAt)}
        </span>
      ),
    },
    {
      key: "commander",
      header: "Incident Commander",
      render: (record) => (
        <div className="text-sm text-[var(--text-primary)]">
          {record.incidentCommander?.displayName ?? "Unassigned"}
        </div>
      ),
    },
    {
      key: "impact",
      header: "Business Impact",
      render: (record) => (
        <div className="text-sm capitalize text-[var(--text-secondary)]">
          {record.businessImpact ?? "Unclassified"}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[32px] border border-[#6b1218]/30 bg-[#120b11] p-6 text-white shadow-[0_38px_120px_-70px_rgba(127,29,29,0.9)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(248,113,113,0.24),_transparent_34%),radial-gradient(circle_at_20%_20%,_rgba(234,179,8,0.16),_transparent_22%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              <Siren size={14} />
              Major Incident Command Center
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
              Run declared incidents like an active response, not a ticket flag.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
              Live command boards, stakeholder cadence, bridge coordination, and PIR follow-through now sit in one workflow.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard/itsm"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/12"
            >
              Back to ITSM hub
            </Link>
            <button
              type="button"
              onClick={() => openDeclare()}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              Declare Major Incident
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <MetricCard
          title="Active"
          value={String(stats?.active ?? active.length)}
          helper="Currently running war rooms and response cycles."
          accent="#DC2626"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Declared"
          value={String(stats?.total ?? incidents.length)}
          helper="Total major incidents tracked in the workflow."
          accent="#2563EB"
          icon={ShieldAlert}
        />
        <MetricCard
          title="Average Duration"
          value={formatAverageMinutes(stats?.avgDurationMinutes)}
          helper="Mean time from declaration to restoration."
          accent="#7C3AED"
          icon={Clock3}
        />
        <MetricCard
          title="SEV-1 Pressure"
          value={String(stats?.bySeverity?.sev1 ?? 0)}
          helper="Critical incidents demanding executive visibility."
          accent="#EA580C"
          icon={Megaphone}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Active Major Incidents
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Command boards in motion
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {active.length} active incident{active.length === 1 ? "" : "s"} across the tenant.
          </p>
        </div>

        {activeLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)]"
              />
            ))}
          </div>
        ) : active.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {active.map((record) => (
              <CommandCard key={record.id} record={record} now={now} />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--surface-0)] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(37,99,235,0.08)] text-[var(--primary)]">
              <ShieldAlert size={24} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              No active major incidents
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              The response floor is quiet. Use the declaration flow when a P1 or P2 incident needs coordinated command, communications, and PIR follow-up.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-[0_28px_80px_-64px_rgba(15,23,42,0.6)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Major Incident Register
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Historical incidents and filters
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="declared">Declared</option>
              <option value="investigating">Investigating</option>
              <option value="mitigating">Mitigating</option>
              <option value="mitigated">Mitigated</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
              <option value="pir_pending">PIR Pending</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={severityFilter}
              onChange={(event) => {
                setSeverityFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">All severities</option>
              <option value="sev1">SEV-1</option>
              <option value="sev2">SEV-2</option>
              <option value="sev3">SEV-3</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6">
          <DataTable
            columns={columns}
            data={incidents}
            keyExtractor={(record) => record.id}
            loading={historyLoading}
            onRowClick={(record) => {
              router.push(`/dashboard/itsm/major-incidents/${record.id}`);
            }}
            emptyTitle="No major incidents found"
            emptyDescription="Adjust the filters or declare a new major incident to start the workflow."
            emptyAction={(
              <button
                type="button"
                onClick={() => openDeclare()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Declare incident
              </button>
            )}
            pagination={{
              currentPage: incidentPage?.meta.page ?? page,
              totalPages: incidentPage?.meta.totalPages ?? 1,
              totalItems: incidentPage?.meta.totalItems,
              pageSize,
              onPageChange: setPage,
              pageSizeOptions: [10, 20, 50],
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(1);
              },
            }}
          />
        </div>
      </section>

      {isDeclareOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-6xl overflow-hidden rounded-[30px] border border-[#7f1d1d]/35 bg-[#120f17] text-white shadow-[0_50px_160px_-70px_rgba(15,23,42,0.92)]">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(248,113,113,0.24),_transparent_32%),linear-gradient(135deg,_rgba(88,28,135,0.28),_rgba(17,24,39,0.55))] px-6 py-6 md:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/64">
                    Declare Major Incident
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-tight">
                    Launch the full response workflow
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    Select the triggering P1 or P2 incident, assign command roles, wire in bridge details, and define the first communication blast.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDeclare}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white/76 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close declaration form"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:p-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
              <div className="space-y-6">
                <section className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                        Ticket Selector
                      </p>
                      <h4 className="mt-2 text-lg font-semibold">
                        Existing P1 / P2 incidents
                      </h4>
                    </div>
                    <div className="w-full max-w-sm">
                      <input
                        type="search"
                        value={ticketSearch}
                        onChange={(event) => setTicketSearch(event.target.value)}
                        placeholder="Search ticket number or title"
                        className="w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white placeholder:text-white/36 focus:border-white/28 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                    {eligibleTickets.length > 0 ? (
                      eligibleTickets.map((ticket) => {
                        const selected = ticket.id === form.ticketId;
                        return (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                ticketId: ticket.id,
                              }))
                            }
                            className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                              selected
                                ? "border-red-400/60 bg-red-500/12"
                                : "border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/7"
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-white">
                                {ticket.ticketNumber}
                              </span>
                              <StatusBadge
                                status={ticket.priority}
                                variant={
                                  ticket.priority === "P1_critical"
                                    ? "error"
                                    : "warning"
                                }
                              >
                                {ticket.priority === "P1_critical" ? "P1" : "P2"}
                              </StatusBadge>
                              <StatusBadge status={ticket.status} />
                            </div>
                            <p className="mt-2 text-sm text-white/82">
                              {ticket.title}
                            </p>
                            <p className="mt-2 text-xs text-white/48">
                              Raised {formatDateTime(ticket.createdAt)}
                            </p>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/58">
                        No eligible P1 or P2 incident tickets matched the current search.
                      </div>
                    )}
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      Severity
                    </label>
                    <select
                      value={form.severity}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          severity: event.target.value as SeverityLevel,
                        }))
                      }
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white focus:border-white/28 focus:outline-none"
                    >
                      <option value="sev1">SEV-1: critical business outage</option>
                      <option value="sev2">SEV-2: severe degradation</option>
                      <option value="sev3">SEV-3: material but contained impact</option>
                    </select>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      Business Impact
                    </label>
                    <select
                      value={form.businessImpact}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          businessImpact: event.target.value as BusinessImpact,
                        }))
                      }
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white focus:border-white/28 focus:outline-none"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      Incident Commander
                    </label>
                    <input
                      type="search"
                      value={commanderSearch}
                      onChange={(event) => setCommanderSearch(event.target.value)}
                      placeholder="Filter active users"
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white placeholder:text-white/36 focus:border-white/28 focus:outline-none"
                    />
                    <select
                      value={form.incidentCommanderId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          incidentCommanderId: event.target.value,
                        }))
                      }
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white focus:border-white/28 focus:outline-none"
                    >
                      <option value="">Select commander</option>
                      {filteredCommanders.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.displayName} · {user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      Communication Lead
                    </label>
                    <input
                      type="search"
                      value={leadSearch}
                      onChange={(event) => setLeadSearch(event.target.value)}
                      placeholder="Filter active users"
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white placeholder:text-white/36 focus:border-white/28 focus:outline-none"
                    />
                    <select
                      value={form.communicationLeadId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          communicationLeadId: event.target.value,
                        }))
                      }
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white focus:border-white/28 focus:outline-none"
                    >
                      <option value="">Select communication lead</option>
                      {filteredLeads.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.displayName} · {user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      Bridge URL
                    </label>
                    <input
                      type="url"
                      value={form.bridgeUrl}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          bridgeUrl: event.target.value,
                        }))
                      }
                      placeholder="https://teams.microsoft.com/..."
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white placeholder:text-white/36 focus:border-white/28 focus:outline-none"
                    />
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      Bridge Phone
                    </label>
                    <input
                      type="text"
                      value={form.bridgePhone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          bridgePhone: event.target.value,
                        }))
                      }
                      placeholder="+234 ..."
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white placeholder:text-white/36 focus:border-white/28 focus:outline-none"
                    />
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      Affected Services
                    </label>
                    <input
                      type="text"
                      value={form.affectedServices}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          affectedServices: event.target.value,
                        }))
                      }
                      placeholder="Core banking, ATM switching, mobile app"
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white placeholder:text-white/36 focus:border-white/28 focus:outline-none"
                    />
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      Estimated Users
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.estimatedAffectedUsers}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          estimatedAffectedUsers: event.target.value,
                        }))
                      }
                      placeholder="0"
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white placeholder:text-white/36 focus:border-white/28 focus:outline-none"
                    />
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                        Communication Plan
                      </p>
                      <h4 className="mt-2 text-lg font-semibold">
                        Initial stakeholder blast
                      </h4>
                    </div>
                    <div className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/62">
                      {form.channels.length} channels
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      Internal stakeholders
                    </label>
                    <input
                      type="search"
                      value={stakeholderSearch}
                      onChange={(event) => setStakeholderSearch(event.target.value)}
                      placeholder="Filter by name, email, department"
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white placeholder:text-white/36 focus:border-white/28 focus:outline-none"
                    />
                    <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {filteredStakeholders.slice(0, 16).map((user) => {
                        const selected = form.internalStakeholders.includes(user.id);
                        return (
                          <label
                            key={user.id}
                            className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors ${
                              selected
                                ? "border-emerald-400/45 bg-emerald-500/10"
                                : "border-white/10 bg-white/4 hover:border-white/18"
                            }`}
                          >
                            <div>
                              <p className="font-medium text-white">{user.displayName}</p>
                              <p className="text-xs text-white/48">{user.email}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleStakeholder(user.id)}
                              className="h-4 w-4 rounded border-white/20 bg-transparent"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                      External stakeholders
                    </label>
                    <textarea
                      value={form.externalStakeholders}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          externalStakeholders: event.target.value,
                        }))
                      }
                      placeholder="executives@example.com, vendor@example.com"
                      rows={3}
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white placeholder:text-white/36 focus:border-white/28 focus:outline-none"
                    />
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                        Update frequency
                      </label>
                      <select
                        value={form.updateFrequencyMinutes}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            updateFrequencyMinutes: event.target.value,
                          }))
                        }
                        className="mt-3 w-full rounded-2xl border border-white/12 bg-black/18 px-4 py-3 text-sm text-white focus:border-white/28 focus:outline-none"
                      >
                        <option value="15">Every 15 minutes</option>
                        <option value="30">Every 30 minutes</option>
                        <option value="60">Every 60 minutes</option>
                      </select>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                        Channels
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { key: "email", label: "Email" },
                          { key: "teams", label: "Teams" },
                          { key: "in_app", label: "In-app" },
                        ].map((channel) => {
                          const selected = form.channels.includes(
                            channel.key as NotificationChannel,
                          );
                          return (
                            <button
                              key={channel.key}
                              type="button"
                              onClick={() =>
                                toggleChannel(channel.key as NotificationChannel)
                              }
                              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                selected
                                  ? "bg-white text-slate-950"
                                  : "border border-white/12 bg-white/6 text-white/72"
                              }`}
                            >
                              {channel.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
                    Declaration Preview
                  </p>
                  <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                        style={{
                          backgroundColor: severityMeta(form.severity).surface,
                          color: severityMeta(form.severity).color,
                        }}
                      >
                        {severityMeta(form.severity).label}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/72">
                        {selectedTicket?.ticketNumber ?? "Select a ticket"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-white">
                      {selectedTicket?.title ?? "No incident selected yet"}
                    </p>
                    <div className="mt-4 space-y-2 text-sm text-white/68">
                      <p className="inline-flex items-center gap-2">
                        <Users size={14} />
                        Commander:{" "}
                        {users.find((user) => user.id === form.incidentCommanderId)
                          ?.displayName ?? "Pending"}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <Megaphone size={14} />
                        Comms lead:{" "}
                        {users.find((user) => user.id === form.communicationLeadId)
                          ?.displayName ?? "Pending"}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <PhoneCall size={14} />
                        Bridge: {form.bridgePhone || "Phone not set"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeDeclare}
                      className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitDeclaration}
                      disabled={
                        declareMutation.isPending ||
                        !form.ticketId ||
                        form.channels.length === 0
                      }
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {declareMutation.isPending ? (
                        "Declaring..."
                      ) : (
                        <>
                          <Siren size={16} />
                          Launch workflow
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
