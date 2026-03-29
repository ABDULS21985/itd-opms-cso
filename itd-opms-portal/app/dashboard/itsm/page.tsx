"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bug,
  ClipboardList,
  Gauge,
  Headphones,
  Plus,
  ShoppingCart,
  Sparkles,
  Star,
  TicketIcon,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useCSATStats,
  useMyQueue,
  useMyServiceRequests,
  usePendingApprovals,
  useProblems,
  useSLAComplianceStats,
  useSupportQueues,
  useTicketStats,
  type ServiceRequest,
} from "@/hooks/use-itsm";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { GaugeChart } from "@/components/dashboard/charts/gauge-chart";
import { ProgressRing } from "@/components/dashboard/charts/progress-ring";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ITSMProblem, Ticket } from "@/types";

interface MetricCardConfig {
  title: string;
  value: string | number;
  helper: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  progress?: number;
  loading?: boolean;
}

interface LaneCardConfig {
  title: string;
  value: string | number;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  loading?: boolean;
}

interface ModuleCardConfig {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  metric: string;
  className?: string;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatRelativeTime(value?: string) {
  if (!value) return "just now";

  const delta = Date.now() - new Date(value).getTime();
  const mins = Math.floor(delta / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function humanize(value?: string) {
  return value ? value.replace(/_/g, " ") : "unknown";
}

function getPriorityMeta(priority?: string) {
  const tones: Record<
    string,
    { label: string; bgColor: string; textColor: string }
  > = {
    P1_critical: {
      label: "P1",
      bgColor: "rgba(239, 68, 68, 0.12)",
      textColor: "#DC2626",
    },
    P2_high: {
      label: "P2",
      bgColor: "rgba(249, 115, 22, 0.14)",
      textColor: "#EA580C",
    },
    P3_medium: {
      label: "P3",
      bgColor: "rgba(139, 111, 46, 0.14)",
      textColor: "#8B6F2E",
    },
    P4_low: {
      label: "P4",
      bgColor: "rgba(37, 99, 235, 0.12)",
      textColor: "#2563EB",
    },
  };

  return (
    tones[priority || ""] ?? {
      label: priority ? humanize(priority).toUpperCase() : "P?",
      bgColor: "rgba(100, 116, 139, 0.12)",
      textColor: "#475569",
    }
  );
}

function getPosture(
  overallCompliance: number,
  majorIncidents: number,
  breachedTickets: number,
  openTickets: number,
) {
  const breachLoad =
    openTickets > 0 ? clampPercent((breachedTickets / openTickets) * 100) : 0;

  if (majorIncidents > 0 || overallCompliance < 72 || breachLoad >= 35) {
    return {
      label: "Critical watch",
      description: "Executive attention needed across the service floor.",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      accent: "#DC2626",
      glow: "rgba(220, 38, 38, 0.16)",
    };
  }

  if (overallCompliance < 90 || breachLoad >= 15 || openTickets >= 18) {
    return {
      label: "Elevated",
      description: "Queues are active and breach exposure needs tight control.",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      accent: "#D97706",
      glow: "rgba(217, 119, 6, 0.14)",
    };
  }

  return {
    label: "Controlled",
    description: "Service operations are stable and tracking within target.",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    accent: "#1B7340",
    glow: "rgba(27, 115, 64, 0.14)",
  };
}

function LoadingValue({ width = "w-16" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
        color: "var(--text-primary)",
        backdropFilter: "blur(18px)",
      }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-0)] text-[var(--primary)] shadow-sm">
        <Icon size={16} />
      </span>
      <span>{label}</span>
      <ArrowRight
        size={15}
        className="text-[var(--text-secondary)] transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function MetricCard({
  title,
  value,
  helper,
  href,
  icon: Icon,
  accent,
  progress,
  loading,
}: MetricCardConfig) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Link
        href={href}
        className="group block h-full rounded-[28px] border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-[var(--surface-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {title}
            </span>
            <div className="flex items-end gap-3">
              <div
                className="text-3xl font-bold tracking-tight text-[var(--text-primary)]"
                style={{ color: accent }}
              >
                {loading ? <LoadingValue width="w-20" /> : value}
              </div>
            </div>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
            style={{ backgroundColor: `${accent}18` }}
          >
            <Icon size={20} style={{ color: accent }} />
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          {helper}
        </p>

        <div className="mt-4 flex items-center justify-between gap-4">
          {typeof progress === "number" ? (
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${clampPercent(progress)}%`,
                  background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
                }}
              />
            </div>
          ) : (
            <div className="h-2 flex-1" />
          )}
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Explore
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function LaneCard({
  title,
  value,
  description,
  href,
  icon: Icon,
  accent,
  loading,
}: LaneCardConfig) {
  return (
    <Link
      href={href}
      className="group block rounded-[24px] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${accent}16` }}
          >
            <Icon size={18} style={{ color: accent }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: accent }}
          >
            {loading ? <LoadingValue width="w-12" /> : value}
          </div>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Open
            <ArrowRight
              size={13}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const priority = getPriorityMeta(ticket.priority);

  return (
    <Link
      href={`/dashboard/itsm/tickets/${ticket.id}`}
      className="group block rounded-[24px] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{
                backgroundColor: priority.bgColor,
                color: priority.textColor,
              }}
            >
              {priority.label}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {ticket.ticketNumber}
            </span>
            {ticket.isMajorIncident && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-700 dark:text-red-300">
                <AlertTriangle size={12} />
                Major
              </span>
            )}
          </div>

          <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--primary)]">
            {ticket.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <span className="text-xs capitalize text-[var(--text-secondary)]">
              {humanize(ticket.type)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Updated {formatRelativeTime(ticket.updatedAt)}
            </span>
          </div>
        </div>

        <ArrowRight
          size={16}
          className="mt-1 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

function RequestRow({ request }: { request: ServiceRequest }) {
  return (
    <Link
      href={
        request.id
          ? `/dashboard/itsm/service-catalog/my-requests/${request.id}`
          : "/dashboard/itsm/service-catalog/my-requests"
      }
      className="group block rounded-[24px] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {request.requestNumber}
            </span>
            <StatusBadge status={request.status} />
          </div>
          <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--primary)]">
            {request.catalogItemName || "Service request"}
          </h3>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            Priority {humanize(request.priority)} · Updated{" "}
            {formatRelativeTime(request.updatedAt)}
          </p>
        </div>

        <ArrowRight
          size={16}
          className="mt-1 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

function ProblemRow({ problem }: { problem: ITSMProblem }) {
  return (
    <Link
      href={`/dashboard/itsm/problems/${problem.id}`}
      className="group block rounded-[22px] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {problem.problemNumber}
          </span>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--primary)]">
            {problem.title}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={problem.status} />
            <span className="text-xs text-[var(--text-muted)]">
              Opened {formatRelativeTime(problem.createdAt)}
            </span>
          </div>
        </div>

        <ArrowRight
          size={16}
          className="mt-1 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

function EmptyDeck({
  title,
  description,
  href,
  hrefLabel,
}: {
  title: string;
  description: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <div
      className="rounded-[24px] border border-dashed p-5"
      style={{
        backgroundColor: "var(--surface-1)",
        borderColor: "var(--border)",
      }}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
      >
        {hrefLabel}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function ModuleCard({
  title,
  description,
  href,
  icon: Icon,
  accent,
  metric,
  className = "",
}: ModuleCardConfig) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-[28px] border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_-38px_rgba(15,23,42,0.5)] ${className}`}
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
        backgroundImage: `radial-gradient(circle at 100% 0%, ${accent}20, transparent 40%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
        style={{ backgroundColor: `${accent}22` }}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${accent}16` }}
          >
            <Icon size={20} style={{ color: accent }} />
          </div>
          <span className="rounded-full bg-[var(--surface-0)]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)] shadow-sm">
            {metric}
          </span>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>

        <div className="mt-auto pt-6">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            Enter module
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ITSMHubPage() {
  const { user } = useAuth();

  const { data: ticketStats, isLoading: ticketStatsLoading } = useTicketStats();
  const { data: csatStats, isLoading: csatLoading } = useCSATStats();
  const { data: compliance, isLoading: complianceLoading } =
    useSLAComplianceStats();
  const { data: problemsData, isLoading: problemsLoading } = useProblems(1, 3);
  const { data: queues, isLoading: queuesLoading } = useSupportQueues(true);
  const { data: myQueueData, isLoading: myQueueLoading } = useMyQueue(1, 4);
  const { data: requestsData, isLoading: requestsLoading } =
    useMyServiceRequests(1, 4);
  const { data: approvalsData } = usePendingApprovals(1, 1);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const totalTickets = ticketStats?.total ?? 0;
  const openTickets = ticketStats?.openCount ?? 0;
  const breachedTickets = ticketStats?.slaBreachedCount ?? 0;
  const majorIncidents = ticketStats?.majorIncidents ?? 0;
  const resolvedTickets = Math.max(totalTickets - openTickets, 0);
  const healthyOpenTickets = Math.max(openTickets - breachedTickets, 0);

  const responsePct =
    compliance && compliance.totalTickets > 0
      ? clampPercent((compliance.responseMet / compliance.totalTickets) * 100)
      : 0;
  const resolutionPct =
    compliance && compliance.totalTickets > 0
      ? clampPercent((compliance.resolutionMet / compliance.totalTickets) * 100)
      : 0;
  const overallCompliance = Math.round((responsePct + resolutionPct) / 2);

  const queueCount = queues?.length ?? 0;
  const myQueueCount = myQueueData?.meta.totalItems ?? myQueueData?.data.length ?? 0;
  const requestCount =
    requestsData?.meta.totalItems ?? requestsData?.data.length ?? 0;
  const approvalCount =
    approvalsData?.meta.totalItems ?? approvalsData?.data.length ?? 0;
  const problemCount =
    problemsData?.meta.totalItems ?? problemsData?.data.length ?? 0;
  const avgRating = csatStats?.avgRating ?? 0;
  const posture = getPosture(
    overallCompliance,
    majorIncidents,
    breachedTickets,
    openTickets,
  );

  const summaryCards: MetricCardConfig[] = [
    {
      title: "Open tickets",
      value: openTickets,
      helper:
        totalTickets > 0
          ? `${clampPercent((openTickets / totalTickets) * 100)}% of all tracked tickets still need active handling.`
          : "No active ticket load is visible yet.",
      href: "/dashboard/itsm/tickets",
      icon: TicketIcon,
      accent: "#1B7340",
      progress: totalTickets > 0 ? (openTickets / totalTickets) * 100 : 0,
      loading: ticketStatsLoading,
    },
    {
      title: "SLA exposure",
      value: breachedTickets,
      helper:
        openTickets > 0
          ? `${clampPercent((breachedTickets / openTickets) * 100)}% of active work is already outside SLA.`
          : "No breached work is currently in the open queue.",
      href: "/dashboard/itsm/sla-dashboard",
      icon: Gauge,
      accent: "#D97706",
      progress: openTickets > 0 ? (breachedTickets / openTickets) * 100 : 0,
      loading: ticketStatsLoading,
    },
    {
      title: "Major incidents",
      value: majorIncidents,
      helper:
        majorIncidents > 0
          ? "Stabilize the bridge first, then protect downstream queues."
          : "No declared major incident is burning right now.",
      href: "/dashboard/itsm/tickets?type=incident&major=true",
      icon: AlertTriangle,
      accent: "#DC2626",
      progress: majorIncidents > 0 ? Math.min(100, majorIncidents * 25) : 0,
      loading: ticketStatsLoading,
    },
    {
      title: "Customer voice",
      value:
        csatStats?.avgRating != null
          ? `${csatStats.avgRating.toFixed(1)} / 5`
          : "--",
      helper:
        csatStats?.total != null
          ? `${csatStats.total} survey responses are shaping the current service signal.`
          : "CSAT has not recorded a score yet.",
      href: "/dashboard/itsm/service-catalog/my-requests",
      icon: Star,
      accent: "#2563EB",
      progress: (avgRating / 5) * 100,
      loading: csatLoading,
    },
  ];

  const lanes: LaneCardConfig[] = [
    {
      title: "Incident response",
      value: openTickets,
      description:
        majorIncidents > 0
          ? `${majorIncidents} major incident in flight.`
          : `${breachedTickets} tickets currently outside target.`,
      href: "/dashboard/itsm/tickets",
      icon: Activity,
      accent: "#1B7340",
      loading: ticketStatsLoading,
    },
    {
      title: "Request fulfilment",
      value: requestCount,
      description:
        approvalCount > 0
          ? `${approvalCount} request waiting for approval.`
          : "No approval bottleneck is visible right now.",
      href: "/dashboard/itsm/service-catalog/my-requests",
      icon: ShoppingCart,
      accent: "#8B6F2E",
      loading: requestsLoading,
    },
    {
      title: "Problem control",
      value: problemCount,
      description:
        problemCount > 0
          ? "Root-cause investigations are active and need follow-through."
          : "Problem backlog is clear from this view.",
      href: "/dashboard/itsm/problems",
      icon: Bug,
      accent: "#2563EB",
      loading: problemsLoading,
    },
    {
      title: "Queue coverage",
      value: queueCount,
      description:
        myQueueCount > 0
          ? `${myQueueCount} ticket assigned to you across live queues.`
          : "Your personal queue is currently clear.",
      href: "/dashboard/itsm/my-queue",
      icon: Users,
      accent: "#D97706",
      loading: myQueueLoading || queuesLoading,
    },
  ];

  const modules: ModuleCardConfig[] = [
    {
      title: "Tickets",
      description:
        "Drive incident, request, and change execution from a single operating surface.",
      href: "/dashboard/itsm/tickets",
      icon: TicketIcon,
      accent: "#1B7340",
      metric: `${openTickets || 0} open`,
      className: "md:col-span-2",
    },
    {
      title: "Service Catalog",
      description:
        "Launch fulfilment journeys, browse services, and convert demand into structured work.",
      href: "/dashboard/itsm/service-catalog",
      icon: ShoppingCart,
      accent: "#8B6F2E",
      metric: `${requestCount || 0} requests`,
    },
    {
      title: "My Queue",
      description:
        "Jump straight into what is assigned to you and keep triage moving.",
      href: "/dashboard/itsm/my-queue",
      icon: Users,
      accent: "#2563EB",
      metric: `${myQueueCount || 0} mine`,
    },
    {
      title: "SLA Dashboard",
      description:
        "Track response and resolution discipline before breaches become noise.",
      href: "/dashboard/itsm/sla-dashboard",
      icon: Gauge,
      accent: "#D97706",
      metric: `${overallCompliance || 0}%`,
    },
    {
      title: "Problems",
      description:
        "Move from symptom management to permanent fixes and known-error discipline.",
      href: "/dashboard/itsm/problems",
      icon: Workflow,
      accent: "#DC2626",
      metric: `${problemCount || 0} active`,
    },
  ];

  const flowData = [
    { name: "Open", value: openTickets, color: "#1B7340" },
    { name: "Resolved", value: resolvedTickets, color: "#8B6F2E" },
  ].filter((item) => item.value > 0);

  const riskData = [
    { name: "Healthy", value: healthyOpenTickets, color: "#1B7340" },
    { name: "Breached", value: breachedTickets, color: "#DC2626" },
  ].filter((item) => item.value > 0);

  const firstName = user?.displayName?.split(" ")[0] || "there";
  const nextTicket = myQueueData?.data?.[0];
  const nextRequest = requestsData?.data?.[0];
  const spotlightProblem = problemsData?.data?.[0];

  return (
    <div className="space-y-8 pb-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(27, 115, 64, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(27,115,64,0.18), transparent 32%), radial-gradient(circle at 88% 16%, rgba(139,111,46,0.18), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -56px rgba(27, 115, 64, 0.42)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl"
          style={{ backgroundColor: posture.glow }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent 0%, rgba(27,115,64,0.12) 35%, rgba(139,111,46,0.12) 65%, transparent 100%)",
          }}
        />

        <div className="relative grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${posture.badgeClass}`}
              >
                <Sparkles size={14} />
                {posture.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <Headphones size={14} className="text-[var(--primary)]" />
                Live ITSM command center
              </span>
            </div>

            <div className="max-w-3xl space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  {greeting}, {firstName}.
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                  IT Service Management
                </h1>
              </div>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                A sharper cockpit for ticket flow, fulfilment momentum, SLA
                integrity, and root-cause control. Run the floor, spot pressure
                early, and move work forward without hunting through modules.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ActionLink
                href="/dashboard/itsm/tickets/new"
                icon={Plus}
                label="Create Ticket"
              />
              <ActionLink
                href="/dashboard/itsm/service-catalog"
                icon={ShoppingCart}
                label="Browse Catalog"
              />
              <ActionLink
                href="/dashboard/itsm/my-queue"
                icon={Users}
                label="Open My Queue"
              />
              <ActionLink
                href="/dashboard/itsm/sla-dashboard"
                icon={Gauge}
                label="Inspect SLA Pulse"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/60 bg-white/65 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Work in motion
                </p>
                <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                  {ticketStatsLoading ? <LoadingValue width="w-16" /> : openTickets}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Active tickets requiring analyst attention.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/60 bg-white/65 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Queues online
                </p>
                <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                  {queuesLoading ? <LoadingValue width="w-12" /> : queueCount}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Active support lanes routing the service workload.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/60 bg-white/65 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Approvals waiting
                </p>
                <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                  {approvalCount}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Fulfilment decisions that can unblock downstream progress.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
            <div
              className="rounded-[28px] border p-5"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Operations posture
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {posture.label}
                  </h2>
                </div>
                <Headphones
                  size={20}
                  style={{ color: posture.accent }}
                  className="shrink-0"
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <div className="rounded-[24px] bg-[var(--surface-0)] p-4">
                  <GaugeChart
                    value={overallCompliance}
                    max={100}
                    size={138}
                    label="SLA health"
                    showValue
                  />
                  <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">
                    Combined response and resolution discipline.
                  </p>
                </div>
                <div className="rounded-[24px] bg-[var(--surface-0)] p-4">
                  <div className="flex flex-col items-center">
                    <ProgressRing
                      value={avgRating * 20}
                      max={100}
                      size={120}
                      strokeWidth={10}
                      color="#2563EB"
                      label="voice"
                    />
                    <p className="mt-3 text-center text-sm font-semibold text-[var(--text-primary)]">
                      {csatLoading ? <LoadingValue width="w-16" /> : `${avgRating.toFixed(1)} / 5`}
                    </p>
                    <p className="mt-1 text-center text-xs text-[var(--text-secondary)]">
                      Average satisfaction across {csatStats?.total ?? 0} surveys.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] bg-[var(--surface-0)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Response
                  </p>
                  <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                    {complianceLoading ? <LoadingValue width="w-14" /> : `${responsePct}%`}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--surface-0)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Resolution
                  </p>
                  <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                    {complianceLoading ? <LoadingValue width="w-14" /> : `${resolutionPct}%`}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-[28px] border p-5"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Personal workbench
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    Where to press next
                  </h2>
                </div>
                <ClipboardList size={20} className="text-[var(--primary)]" />
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Next ticket
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    {myQueueLoading
                      ? "Loading your assignments..."
                      : nextTicket
                        ? `${nextTicket.ticketNumber} · ${nextTicket.title}`
                        : "Your queue is clear."}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {nextTicket
                      ? `${humanize(nextTicket.status)} · updated ${formatRelativeTime(nextTicket.updatedAt)}`
                      : "Use this quiet pocket to clear requests, problems, or backlog hygiene."}
                  </p>
                </div>

                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Request spotlight
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    {requestsLoading
                      ? "Loading fulfilment flow..."
                      : nextRequest
                        ? `${nextRequest.requestNumber} · ${nextRequest.catalogItemName || "Service request"}`
                        : "No personal requests are currently in motion."}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {nextRequest
                      ? `${humanize(nextRequest.status)} · updated ${formatRelativeTime(nextRequest.updatedAt)}`
                      : "Demand is light right now from the current user perspective."}
                  </p>
                </div>

                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Problem focus
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    {problemsLoading
                      ? "Loading root-cause work..."
                      : spotlightProblem
                        ? `${spotlightProblem.problemNumber} · ${spotlightProblem.title}`
                        : "No problem record is demanding immediate attention."}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {spotlightProblem
                      ? `${humanize(spotlightProblem.status)} · opened ${formatRelativeTime(spotlightProblem.createdAt)}`
                      : "Stay proactive by reviewing recent incident clusters and known errors."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.05 }}
          className="rounded-[32px] border p-6"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Service pulse
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Pressure, stability, and recovery in one view
              </h2>
            </div>
            <Link
              href="/dashboard/itsm/sla-dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
            >
              Open SLA dashboard
              <ArrowRight size={15} />
            </Link>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            Use this panel to judge whether the day is dominated by throughput,
            breach containment, or recovery work.
          </p>

          {majorIncidents > 0 && (
            <div className="mt-5 rounded-[24px] border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {majorIncidents} major incident {majorIncidents > 1 ? "bridges are" : "bridge is"} active. Stabilization should outrank lower-priority fulfilment until containment is secure.
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[28px] bg-[var(--surface-1)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Ticket balance
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Open versus resolved workload across tracked tickets.
                </p>
                <div className="mt-4">
                  <DonutChart
                    data={flowData}
                    height={240}
                    innerRadius={52}
                    outerRadius={82}
                    centerLabel="tickets"
                    centerValue={totalTickets}
                  />
                </div>
              </div>

              <div className="rounded-[28px] bg-[var(--surface-1)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Active risk
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Healthy open work against breached exposure.
                </p>
                <div className="mt-4">
                  <DonutChart
                    data={riskData}
                    height={240}
                    innerRadius={52}
                    outerRadius={82}
                    centerLabel="open"
                    centerValue={openTickets}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border p-5" style={{ borderColor: "var(--border)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Response discipline
                </p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">
                      {complianceLoading ? <LoadingValue width="w-16" /> : `${responsePct}%`}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      First-touch performance against committed SLA.
                    </p>
                  </div>
                  <Gauge size={20} className="text-[var(--primary)]" />
                </div>
              </div>

              <div className="rounded-[28px] border p-5" style={{ borderColor: "var(--border)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Resolution discipline
                </p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">
                      {complianceLoading ? <LoadingValue width="w-16" /> : `${resolutionPct}%`}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      End-to-end closure performance across tracked tickets.
                    </p>
                  </div>
                  <Activity size={20} className="text-[var(--primary)]" />
                </div>
              </div>

              <div className="rounded-[28px] border p-5" style={{ borderColor: "var(--border)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Support coverage
                </p>
                <p className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
                  {queuesLoading ? <LoadingValue width="w-14" /> : queueCount}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Live support queues absorbing incident and request demand.
                </p>
              </div>

              <div className="rounded-[28px] border p-5" style={{ borderColor: "var(--border)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Problem backlog
                </p>
                <p className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
                  {problemsLoading ? <LoadingValue width="w-14" /> : problemCount}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Root-cause items that can suppress repeat incident noise.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.08 }}
          className="rounded-[32px] border p-6"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Operational lanes
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Move straight to the workstream that needs pressure
              </h2>
            </div>
            <Workflow size={20} className="mt-1 text-[var(--primary)]" />
          </div>

          <div className="mt-6 grid gap-4">
            {lanes.map((lane) => (
              <LaneCard key={lane.title} {...lane} />
            ))}
          </div>
        </motion.section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.12 }}
          className="rounded-[32px] border p-6"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                My workbench
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Assigned work, fulfilment flow, and problem watch
              </h2>
            </div>
            <Link
              href="/dashboard/itsm/my-queue"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
            >
              Triage queue
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Assigned to me
                </h3>
                <span className="rounded-full bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                  {myQueueCount} total
                </span>
              </div>

              {myQueueLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-[24px] bg-[var(--surface-1)]"
                    />
                  ))}
                </div>
              ) : myQueueData?.data?.length ? (
                <div className="space-y-3">
                  {myQueueData.data.map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              ) : (
                <EmptyDeck
                  title="Queue clear"
                  description="Nothing is assigned to you right now. That is a good window to clean up requests or problem investigations."
                  href="/dashboard/itsm/tickets"
                  hrefLabel="Open all tickets"
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Requests in flight
                </h3>
                <span className="rounded-full bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                  {requestCount} total
                </span>
              </div>

              {requestsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-[24px] bg-[var(--surface-1)]"
                    />
                  ))}
                </div>
              ) : requestsData?.data?.length ? (
                <div className="space-y-3">
                  {requestsData.data.map((request) => (
                    <RequestRow key={request.id} request={request} />
                  ))}
                </div>
              ) : (
                <EmptyDeck
                  title="No requests in motion"
                  description="Current fulfilment demand is quiet. Launch the catalog or review approvals to keep the pipeline healthy."
                  href="/dashboard/itsm/service-catalog"
                  hrefLabel="Open service catalog"
                />
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Problem watch
              </h3>
              <Link
                href="/dashboard/itsm/problems"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
              >
                View all problems
                <ArrowRight size={15} />
              </Link>
            </div>

            {problemsLoading ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-32 animate-pulse rounded-[22px] bg-[var(--surface-1)]"
                  />
                ))}
              </div>
            ) : problemsData?.data?.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {problemsData.data.map((problem) => (
                  <ProblemRow key={problem.id} problem={problem} />
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyDeck
                  title="Problem backlog is quiet"
                  description="No active problem records are visible in this slice. Use the breathing room to mine repeat incidents and tighten preventive controls."
                  href="/dashboard/itsm/problems"
                  hrefLabel="Open problems"
                />
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.15 }}
          className="rounded-[32px] border p-6"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Module runway
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Jump into the exact ITSM surface you need
              </h2>
            </div>
            <Sparkles size={20} className="mt-1 text-[var(--primary)]" />
          </div>

          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            This layout favors intent over menu crawling. Enter the domain that
            matches the job in front of you.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
