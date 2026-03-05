"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Gauge,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Timer,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Activity,
  TrendingUp,
  Star,
  X,
  BarChart3,
} from "lucide-react";
import {
  useSLAComplianceStats,
  useSLAPolicies,
  useTicketStats,
  useCSATStats,
} from "@/hooks/use-itsm";
import type { SLAPolicy } from "@/types";
import { EnhancedKPICard } from "@/components/dashboard/enhanced-kpi-card";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { GaugeChart } from "@/components/dashboard/charts/gauge-chart";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { ProgressRing } from "@/components/dashboard/charts/progress-ring";
import { RadarChart } from "@/components/dashboard/charts/radar-chart";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function complianceColor(pct: number): string {
  if (pct >= 95) return "#22C55E";
  if (pct >= 90) return "#22C55E";
  if (pct >= 75) return "#F59E0B";
  return "#EF4444";
}

function complianceBg(pct: number): string {
  if (pct >= 90) return "rgba(34, 197, 94, 0.1)";
  if (pct >= 75) return "rgba(245, 158, 11, 0.1)";
  return "rgba(239, 68, 68, 0.1)";
}

function complianceLabel(pct: number): string {
  if (pct >= 95) return "Excellent";
  if (pct >= 90) return "Healthy";
  if (pct >= 75) return "At Risk";
  return "Critical";
}

function complianceBadge(pct: number): string {
  if (pct >= 90)
    return "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20";
  if (pct >= 75)
    return "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20";
  return "bg-red-500/10 text-red-600 ring-1 ring-red-500/20";
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#3B82F6",
  planning: "#8B5CF6",
};

const PRIORITY_ORDER = ["critical", "high", "medium", "low", "planning"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SLADashboardPage() {
  const { data: compliance, isLoading: complianceLoading } =
    useSLAComplianceStats();
  const { data: policiesData, isLoading: policiesLoading } =
    useSLAPolicies(1, 50);
  const { data: ticketStats, isLoading: ticketStatsLoading } =
    useTicketStats();
  const { data: csatStats } = useCSATStats();

  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [breachAlertDismissed, setBreachAlertDismissed] = useState(false);

  const policies = useMemo(() => {
    if (!policiesData) return [];
    if (Array.isArray(policiesData)) return policiesData as SLAPolicy[];
    return (policiesData as { data?: SLAPolicy[] }).data || [];
  }, [policiesData]);

  const responsePct =
    compliance && compliance.totalTickets > 0
      ? Math.round((compliance.responseMet / compliance.totalTickets) * 100)
      : 0;

  const resolutionPct =
    compliance && compliance.totalTickets > 0
      ? Math.round(
          (compliance.resolutionMet / compliance.totalTickets) * 100,
        )
      : 0;

  const overallHealth = Math.round((responsePct + resolutionPct) / 2);

  const responseBreached =
    compliance && compliance.totalTickets > 0
      ? compliance.totalTickets - compliance.responseMet
      : 0;

  const resolutionBreached =
    compliance && compliance.totalTickets > 0
      ? compliance.totalTickets - compliance.resolutionMet
      : 0;

  /* Donut data: Response SLA */
  const responseDonutData = useMemo(() => {
    if (!compliance || compliance.totalTickets === 0) return [];
    return [
      { name: "Met", value: compliance.responseMet, color: "#22C55E" },
      {
        name: "Breached",
        value: compliance.totalTickets - compliance.responseMet,
        color: "#EF4444",
      },
    ];
  }, [compliance]);

  /* Donut data: Resolution SLA */
  const resolutionDonutData = useMemo(() => {
    if (!compliance || compliance.totalTickets === 0) return [];
    return [
      { name: "Met", value: compliance.resolutionMet, color: "#22C55E" },
      {
        name: "Breached",
        value: compliance.totalTickets - compliance.resolutionMet,
        color: "#EF4444",
      },
    ];
  }, [compliance]);

  /* Radar data: per-priority compliance (from default policy targets) */
  const radarData = useMemo(() => {
    const defaultPolicy = policies.find((p) => p.isDefault) ?? policies[0];
    if (!defaultPolicy) return [];
    return PRIORITY_ORDER.filter(
      (p) => defaultPolicy.priorityTargets?.[p],
    ).map((priority) => ({
      subject: priority.charAt(0).toUpperCase() + priority.slice(1),
      response: Math.min(
        100,
        (defaultPolicy.priorityTargets[priority].response_minutes / 60) * 10,
      ),
      resolution: Math.min(
        100,
        (defaultPolicy.priorityTargets[priority].resolution_minutes / 480) *
          100,
      ),
    }));
  }, [policies]);

  const isLoading = complianceLoading || policiesLoading || ticketStatsLoading;

  /* ---- Loading skeleton ---- */
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-[var(--surface-2)]" />
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-[var(--surface-2)]" />
            <div className="h-4 w-72 animate-pulse rounded-lg bg-[var(--surface-2)]" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]" />
          <div className="h-80 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]" />
        </div>
      </div>
    );
  }

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
            style={{
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))",
            }}
          >
            <Gauge size={22} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              SLA Dashboard
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Service level agreement compliance and performance monitoring
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/itsm/tickets"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-1)] hover:shadow-sm"
        >
          View All Tickets
          <ArrowRight size={14} />
        </Link>
      </motion.div>

      {/* ── Breach Alert Banner ── */}
      <AnimatePresence>
        {(ticketStats?.slaBreachedCount ?? 0) > 0 && !breachAlertDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="relative rounded-xl border p-4"
              style={{
                borderColor: "rgba(239, 68, 68, 0.2)",
                background:
                  "linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(249, 115, 22, 0.04) 100%)",
              }}
            >
              <button
                onClick={() => setBreachAlertDismissed(true)}
                className="absolute right-3 top-3 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-secondary)]"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                  <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {ticketStats?.slaBreachedCount} Active SLA Breach
                    {(ticketStats?.slaBreachedCount ?? 0) > 1 ? "es" : ""}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {responseBreached > 0 &&
                      `${responseBreached} response breach${responseBreached > 1 ? "es" : ""}`}
                    {responseBreached > 0 && resolutionBreached > 0 && " · "}
                    {resolutionBreached > 0 &&
                      `${resolutionBreached} resolution breach${resolutionBreached > 1 ? "es" : ""}`}
                  </p>
                </div>
                <Link
                  href="/dashboard/itsm/tickets?sla_status=breached"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/20"
                >
                  View Breaches
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <EnhancedKPICard
          label="Overall Health"
          value={`${overallHealth}%`}
          icon={Activity}
          color={complianceColor(overallHealth)}
          bgColor={complianceBg(overallHealth)}
          isLoading={false}
          index={0}
          subtitle={complianceLabel(overallHealth)}
        >
          <GaugeChart
            value={overallHealth}
            size={52}
            thresholds={{ good: 90, warning: 75 }}
            showValue={false}
            delay={0.4}
          />
        </EnhancedKPICard>

        <EnhancedKPICard
          label="Response SLA"
          value={`${responsePct}%`}
          icon={Zap}
          color={complianceColor(responsePct)}
          bgColor={complianceBg(responsePct)}
          isLoading={false}
          index={1}
          subtitle={`${compliance?.responseMet ?? 0} of ${compliance?.totalTickets ?? 0} met`}
          needsAttention={responsePct < 75}
        >
          <ProgressRing
            value={responsePct}
            size={48}
            strokeWidth={5}
            delay={0.5}
            showPercentage={false}
          />
        </EnhancedKPICard>

        <EnhancedKPICard
          label="Resolution SLA"
          value={`${resolutionPct}%`}
          icon={Target}
          color={complianceColor(resolutionPct)}
          bgColor={complianceBg(resolutionPct)}
          isLoading={false}
          index={2}
          subtitle={`${compliance?.resolutionMet ?? 0} of ${compliance?.totalTickets ?? 0} met`}
          needsAttention={resolutionPct < 75}
        >
          <ProgressRing
            value={resolutionPct}
            size={48}
            strokeWidth={5}
            delay={0.6}
            showPercentage={false}
          />
        </EnhancedKPICard>

        <EnhancedKPICard
          label="Total Tracked"
          value={compliance?.totalTickets ?? 0}
          icon={Clock}
          color="#3B82F6"
          bgColor="rgba(59, 130, 246, 0.1)"
          isLoading={false}
          index={3}
          subtitle="Tickets with SLA"
        />

        <EnhancedKPICard
          label="Avg CSAT"
          value={
            csatStats?.avgRating != null
              ? `${csatStats.avgRating.toFixed(1)}/5`
              : "--"
          }
          icon={Star}
          color="#F59E0B"
          bgColor="rgba(245, 158, 11, 0.1)"
          isLoading={false}
          index={4}
          subtitle={csatStats ? `${csatStats.total} responses` : undefined}
        />
      </div>

      {/* ── Dual Gauge Hero Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
      >
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Compliance Overview
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Response Gauge */}
          <div className="flex flex-col items-center">
            <GaugeChart
              value={responsePct}
              size={200}
              label="Response"
              thresholds={{ good: 90, warning: 75 }}
              suffix="%"
              delay={0.4}
            />
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {compliance?.responseMet ?? 0}
                  </span>{" "}
                  met
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {responseBreached}
                  </span>{" "}
                  breached
                </span>
              </div>
            </div>
            <span
              className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold ${complianceBadge(responsePct)}`}
            >
              {complianceLabel(responsePct)}
            </span>
          </div>

          {/* Resolution Gauge */}
          <div className="flex flex-col items-center">
            <GaugeChart
              value={resolutionPct}
              size={200}
              label="Resolution"
              thresholds={{ good: 90, warning: 75 }}
              suffix="%"
              delay={0.6}
            />
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {compliance?.resolutionMet ?? 0}
                  </span>{" "}
                  met
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {resolutionBreached}
                  </span>{" "}
                  breached
                </span>
              </div>
            </div>
            <span
              className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold ${complianceBadge(resolutionPct)}`}
            >
              {complianceLabel(resolutionPct)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Response SLA Donut */}
        {responseDonutData.length > 0 && (
          <ChartCard
            title="Response SLA Breakdown"
            subtitle="First response target compliance"
            delay={0.35}
            expandable
          >
            <DonutChart
              data={responseDonutData}
              height={260}
              innerRadius={55}
              outerRadius={85}
              centerLabel="Response"
              centerValue={`${responsePct}%`}
              showLegend
            />
          </ChartCard>
        )}

        {/* Resolution SLA Donut */}
        {resolutionDonutData.length > 0 && (
          <ChartCard
            title="Resolution SLA Breakdown"
            subtitle="Resolution target compliance"
            delay={0.4}
            expandable
          >
            <DonutChart
              data={resolutionDonutData}
              height={260}
              innerRadius={55}
              outerRadius={85}
              centerLabel="Resolution"
              centerValue={`${resolutionPct}%`}
              showLegend
            />
          </ChartCard>
        )}
      </div>

      {/* ── Priority Targets Radar ── */}
      {radarData.length > 0 && (
        <ChartCard
          title="SLA Targets by Priority"
          subtitle="Response and resolution target intensity across priority levels"
          delay={0.45}
          expandable
        >
          <RadarChart
            data={radarData}
            dataKeys={[
              {
                key: "response",
                label: "Response Target",
                color: "#3B82F6",
                fillOpacity: 0.2,
              },
              {
                key: "resolution",
                label: "Resolution Target",
                color: "#8B5CF6",
                fillOpacity: 0.2,
              },
            ]}
            angleKey="subject"
            height={300}
            showLegend
          />
        </ChartCard>
      )}

      {/* ── SLA Policies ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              SLA Policies
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {policies.length} configured polic
              {policies.length !== 1 ? "ies" : "y"}
            </p>
          </div>
        </div>

        {policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-16">
            <Gauge
              size={48}
              className="mb-4 text-[var(--text-muted)] opacity-40"
            />
            <p className="text-sm text-[var(--text-muted)]">
              No SLA policies configured yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map((policy, index) => {
              const isExpanded = expandedPolicy === policy.id;
              const priorities = Object.entries(
                policy.priorityTargets || {},
              ).sort(
                ([a], [b]) =>
                  PRIORITY_ORDER.indexOf(a) - PRIORITY_ORDER.indexOf(b),
              );

              return (
                <motion.div
                  key={policy.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.5 + index * 0.04 }}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] transition-shadow hover:shadow-sm"
                >
                  {/* Policy header (clickable) */}
                  <button
                    onClick={() =>
                      setExpandedPolicy(isExpanded ? null : policy.id)
                    }
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--surface-1)]"
                  >
                    {/* Icon */}
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: policy.isActive
                          ? "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))"
                          : "var(--surface-2)",
                      }}
                    >
                      <ShieldCheck
                        size={18}
                        className={
                          policy.isActive
                            ? "text-emerald-500"
                            : "text-[var(--text-muted)]"
                        }
                      />
                    </div>

                    {/* Title + badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {policy.name}
                        </span>
                        {policy.isDefault && (
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-500/20">
                            Default
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            policy.isActive
                              ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20"
                              : "bg-slate-500/10 text-slate-500 ring-1 ring-slate-500/20"
                          }`}
                        >
                          {policy.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {policy.description && (
                        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                          {policy.description}
                        </p>
                      )}
                    </div>

                    {/* Priority count + expand icon */}
                    <span className="text-xs text-[var(--text-muted)]">
                      {priorities.length} priorities
                    </span>
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown
                        size={16}
                        className="text-[var(--text-muted)]"
                      />
                    </motion.span>
                  </button>

                  {/* Expanded priority targets */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[var(--border)] px-5 py-4">
                          {priorities.length === 0 ? (
                            <p className="text-xs text-[var(--text-muted)]">
                              No priority targets configured.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                              {priorities.map(([priority, targets], i) => (
                                <motion.div
                                  key={priority}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3"
                                >
                                  <div className="mb-2 flex items-center gap-2">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{
                                        backgroundColor:
                                          PRIORITY_COLORS[priority] ??
                                          "#64748B",
                                      }}
                                    />
                                    <span className="text-xs font-semibold capitalize text-[var(--text-primary)]">
                                      {priority}
                                    </span>
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                        <Zap size={10} />
                                        Response
                                      </span>
                                      <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                                        {formatMinutes(
                                          targets.response_minutes,
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                        <Timer size={10} />
                                        Resolution
                                      </span>
                                      <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                                        {formatMinutes(
                                          targets.resolution_minutes,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
