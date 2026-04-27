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
  ShieldAlert,
  Activity,
  Star,
  X,
  FileText,
  Building2,
  Link2,
  AlertCircle,
  CalendarClock,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useSLAComplianceStats,
  useSLAPolicies,
  useTicketStats,
  useCSATStats,
  useOLAs,
  useUCs,
  useCreateOLA,
  useUpdateOLA,
  useDeleteOLA,
  useCreateUC,
  useUpdateUC,
  useDeleteUC,
  useSLAConsistencyCheck,
  useExpiringAgreements,
  useSLADependencyChain,
  useCreateDependencyChainEntry,
  useDeleteDependencyChainEntry,
  useServiceRequestSLACompliance,
} from "@/hooks/use-itsm";
import type {
  SLAPolicy,
  OperationalLevelAgreement,
  UnderpinningContract,
  ConsistencyViolation,
} from "@/types";
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

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20";
    case "draft":
      return "bg-slate-500/10 text-slate-500 ring-1 ring-slate-500/20";
    case "expired":
      return "bg-red-500/10 text-red-600 ring-1 ring-red-500/20";
    case "suspended":
      return "bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20";
    default:
      return "bg-slate-500/10 text-slate-500 ring-1 ring-slate-500/20";
  }
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#3B82F6",
  planning: "#8B5CF6",
};

const PRIORITY_ORDER = ["critical", "high", "medium", "low", "planning"];

const TABS = [
  { key: "sla", label: "SLA Policies", icon: ShieldCheck },
  { key: "olas", label: "OLAs", icon: FileText },
  { key: "ucs", label: "Underpinning Contracts", icon: Building2 },
  { key: "chain", label: "Dependency Chain", icon: Link2 },
  { key: "consistency", label: "Consistency Check", icon: AlertCircle },
] as const;

type TabKey = (typeof TABS)[number]["key"];

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
  const { data: srSLA } = useServiceRequestSLACompliance();

  const [activeTab, setActiveTab] = useState<TabKey>("sla");
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
              Service level agreement compliance, OLAs, underpinning contracts
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

      {/* ── Service Request SLA ── */}
      {srSLA && srSLA.withSla > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Service Request SLA
            </h2>
            <Link
              href="/dashboard/itsm/service-catalog/my-requests"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
            >
              View Requests <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{srSLA.withSla}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">With SLA Policy</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: "#22C55E" }}>
                {(() => {
                  const met = srSLA.resolutionMet + srSLA.fulfillmentMet;
                  const total = met + srSLA.resolutionBreached + srSLA.fulfillmentBreached;
                  return total > 0 ? `${Math.round((met / total) * 100)}%` : "--";
                })()}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Compliance Rate</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: srSLA.resolutionBreached + srSLA.fulfillmentBreached > 0 ? "#EF4444" : "#22C55E" }}>
                {srSLA.resolutionBreached + srSLA.fulfillmentBreached}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Breached</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: srSLA.activeAtRisk > 0 ? "#F59E0B" : "var(--text-primary)" }}>
                {srSLA.activeAtRisk}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">At Risk</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === "sla" && (
          <SLAPoliciesTab
            key="sla"
            policies={policies}
            expandedPolicy={expandedPolicy}
            setExpandedPolicy={setExpandedPolicy}
          />
        )}
        {activeTab === "olas" && <OLAsTab key="olas" />}
        {activeTab === "ucs" && <UCsTab key="ucs" />}
        {activeTab === "chain" && (
          <DependencyChainTab key="chain" policies={policies} />
        )}
        {activeTab === "consistency" && <ConsistencyTab key="consistency" />}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  Tab 1: SLA Policies                                                */
/* ================================================================== */

function SLAPoliciesTab({
  policies,
  expandedPolicy,
  setExpandedPolicy,
}: {
  policies: SLAPolicy[];
  expandedPolicy: string | null;
  setExpandedPolicy: (id: string | null) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
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
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() =>
                    setExpandedPolicy(isExpanded ? null : policy.id)
                  }
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--surface-1)]"
                >
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
                                        PRIORITY_COLORS[priority] ?? "#64748B",
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
  );
}

/* ================================================================== */
/*  Tab 2: OLAs                                                        */
/* ================================================================== */

function OLAsTab() {
  const { data: olas, isLoading } = useOLAs();
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createOLA = useCreateOLA();
  const updateOLA = useUpdateOLA(editingId ?? undefined);
  const deleteOLA = useDeleteOLA();

  const filtered = useMemo(() => {
    if (!olas) return [];
    if (!statusFilter) return olas;
    return olas.filter((o) => o.status === statusFilter);
  }, [olas, statusFilter]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    supportTeamId: "",
    parentSlaId: "",
    responseTargetMinutes: 60,
    resolutionTargetMinutes: 480,
    status: "draft",
    effectiveFrom: "",
    effectiveTo: "",
  });

  function resetForm() {
    setForm({
      name: "",
      description: "",
      supportTeamId: "",
      parentSlaId: "",
      responseTargetMinutes: 60,
      resolutionTargetMinutes: 480,
      status: "draft",
      effectiveFrom: "",
      effectiveTo: "",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(ola: OperationalLevelAgreement) {
    setForm({
      name: ola.name,
      description: ola.description ?? "",
      supportTeamId: ola.supportTeamId ?? "",
      parentSlaId: ola.parentSlaId ?? "",
      responseTargetMinutes: ola.responseTargetMinutes,
      resolutionTargetMinutes: ola.resolutionTargetMinutes,
      status: ola.status,
      effectiveFrom: ola.effectiveFrom?.slice(0, 10) ?? "",
      effectiveTo: ola.effectiveTo?.slice(0, 10) ?? "",
    });
    setEditingId(ola.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      supportTeamId: form.supportTeamId || undefined,
      parentSlaId: form.parentSlaId || undefined,
      effectiveFrom: form.effectiveFrom
        ? form.effectiveFrom + "T00:00:00Z"
        : undefined,
      effectiveTo: form.effectiveTo
        ? form.effectiveTo + "T00:00:00Z"
        : undefined,
    };

    if (editingId) {
      updateOLA.mutate(body, { onSuccess: resetForm });
    } else {
      createOLA.mutate(body, { onSuccess: resetForm });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Operational Level Agreements
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Internal team agreements supporting SLA targets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={14} />
            New OLA
          </button>
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
              {editingId ? "Edit OLA" : "Create OLA"}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Response Target (min) *
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.responseTargetMinutes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      responseTargetMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Resolution Target (min) *
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.resolutionTargetMinutes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      resolutionTargetMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Effective From
                </label>
                <input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      effectiveFrom: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Effective To
                </label>
                <input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      effectiveTo: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="submit"
                disabled={createOLA.isPending || updateOLA.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-16">
          <FileText
            size={48}
            className="mb-4 text-[var(--text-muted)] opacity-40"
          />
          <p className="text-sm text-[var(--text-muted)]">
            No OLAs found.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)]">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)]">
                  Support Team
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">
                  Response
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">
                  Resolution
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)]">
                  Parent SLA
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((ola) => (
                <tr
                  key={ola.id}
                  className="bg-[var(--surface-0)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {ola.name}
                    </span>
                    {ola.description && (
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                        {ola.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {ola.supportTeamName ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium tabular-nums text-[var(--text-primary)]">
                    {formatMinutes(ola.responseTargetMinutes)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium tabular-nums text-[var(--text-primary)]">
                    {formatMinutes(ola.resolutionTargetMinutes)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {ola.parentSlaName ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadgeClass(ola.status)}`}
                    >
                      {ola.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(ola)}
                        className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                        title="Edit"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this OLA?"))
                            deleteOLA.mutate(ola.id);
                        }}
                        className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/*  Tab 3: UCs                                                         */
/* ================================================================== */

function UCsTab() {
  const { data: ucs, isLoading } = useUCs();
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createUC = useCreateUC();
  const updateUC = useUpdateUC(editingId ?? undefined);
  const deleteUC = useDeleteUC();

  const filtered = useMemo(() => {
    if (!ucs) return [];
    if (!statusFilter) return ucs;
    return ucs.filter((u) => u.status === statusFilter);
  }, [ucs, statusFilter]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    vendorId: "",
    contractId: "",
    parentSlaId: "",
    responseTargetMinutes: 60,
    resolutionTargetMinutes: 480,
    penaltyClause: "",
    status: "draft",
    effectiveFrom: "",
    effectiveTo: "",
  });

  function resetForm() {
    setForm({
      name: "",
      description: "",
      vendorId: "",
      contractId: "",
      parentSlaId: "",
      responseTargetMinutes: 60,
      resolutionTargetMinutes: 480,
      penaltyClause: "",
      status: "draft",
      effectiveFrom: "",
      effectiveTo: "",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(uc: UnderpinningContract) {
    setForm({
      name: uc.name,
      description: uc.description ?? "",
      vendorId: uc.vendorId ?? "",
      contractId: uc.contractId ?? "",
      parentSlaId: uc.parentSlaId ?? "",
      responseTargetMinutes: uc.responseTargetMinutes,
      resolutionTargetMinutes: uc.resolutionTargetMinutes,
      penaltyClause: uc.penaltyClause ?? "",
      status: uc.status,
      effectiveFrom: uc.effectiveFrom?.slice(0, 10) ?? "",
      effectiveTo: uc.effectiveTo?.slice(0, 10) ?? "",
    });
    setEditingId(uc.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      vendorId: form.vendorId || undefined,
      contractId: form.contractId || undefined,
      parentSlaId: form.parentSlaId || undefined,
      effectiveFrom: form.effectiveFrom
        ? form.effectiveFrom + "T00:00:00Z"
        : undefined,
      effectiveTo: form.effectiveTo
        ? form.effectiveTo + "T00:00:00Z"
        : undefined,
    };

    if (editingId) {
      updateUC.mutate(body, { onSuccess: resetForm });
    } else {
      createUC.mutate(body, { onSuccess: resetForm });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Underpinning Contracts
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Vendor contracts supporting SLA delivery
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={14} />
            New UC
          </button>
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
              {editingId ? "Edit UC" : "Create Underpinning Contract"}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Response Target (min) *
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.responseTargetMinutes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      responseTargetMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Resolution Target (min) *
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.resolutionTargetMinutes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      resolutionTargetMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Effective From
                </label>
                <input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      effectiveFrom: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Effective To
                </label>
                <input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      effectiveTo: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Penalty Clause
                </label>
                <textarea
                  value={form.penaltyClause}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      penaltyClause: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  placeholder="Describe penalties for SLA breaches..."
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="submit"
                disabled={createUC.isPending || updateUC.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-16">
          <Building2
            size={48}
            className="mb-4 text-[var(--text-muted)] opacity-40"
          />
          <p className="text-sm text-[var(--text-muted)]">
            No underpinning contracts found.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)]">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)]">
                  Vendor
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">
                  Response
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">
                  Resolution
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)]">
                  Parent SLA
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((uc) => (
                <tr
                  key={uc.id}
                  className="bg-[var(--surface-0)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {uc.name}
                    </span>
                    {uc.description && (
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                        {uc.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {uc.vendorName ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium tabular-nums text-[var(--text-primary)]">
                    {formatMinutes(uc.responseTargetMinutes)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium tabular-nums text-[var(--text-primary)]">
                    {formatMinutes(uc.resolutionTargetMinutes)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {uc.parentSlaName ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadgeClass(uc.status)}`}
                    >
                      {uc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(uc)}
                        className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                        title="Edit"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this UC?"))
                            deleteUC.mutate(uc.id);
                        }}
                        className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/*  Tab 4: Dependency Chain                                            */
/* ================================================================== */

function DependencyChainTab({ policies }: { policies: SLAPolicy[] }) {
  const [selectedSlaId, setSelectedSlaId] = useState(
    policies[0]?.id ?? "",
  );
  const { data: chain, isLoading } = useSLADependencyChain(
    selectedSlaId || undefined,
  );
  const { data: expiring } = useExpiringAgreements(30);
  const createEntry = useCreateDependencyChainEntry();
  const deleteEntry = useDeleteDependencyChainEntry();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            SLA Dependency Chain
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            How SLAs cascade into OLAs and underpinning contracts
          </p>
        </div>
        <select
          value={selectedSlaId}
          onChange={(e) => setSelectedSlaId(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
        >
          <option value="">Select SLA Policy</option>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedSlaId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-16">
          <Link2
            size={48}
            className="mb-4 text-[var(--text-muted)] opacity-40"
          />
          <p className="text-sm text-[var(--text-muted)]">
            Select an SLA policy to view its dependency chain.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
            />
          ))}
        </div>
      ) : (chain ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-16">
          <Link2
            size={48}
            className="mb-4 text-[var(--text-muted)] opacity-40"
          />
          <p className="text-sm text-[var(--text-muted)]">
            No dependency chain entries for this SLA.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(chain ?? []).map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
            >
              {/* SLA Column */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">
                  SLA
                </span>
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {entry.slaPolicyName ?? "--"}
                </span>
                {entry.slaResponseMinutes != null && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {formatMinutes(entry.slaResponseMinutes)} /{" "}
                    {formatMinutes(entry.slaResolutionMinutes ?? 0)}
                  </span>
                )}
              </div>

              <ArrowRight
                size={16}
                className="flex-shrink-0 text-[var(--text-muted)]"
              />

              {/* OLA Column */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                  OLA
                </span>
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {entry.olaName ?? "--"}
                </span>
                {entry.olaResponseMinutes != null && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {formatMinutes(entry.olaResponseMinutes)} /{" "}
                    {formatMinutes(entry.olaResolutionMinutes ?? 0)}
                  </span>
                )}
              </div>

              <ArrowRight
                size={16}
                className="flex-shrink-0 text-[var(--text-muted)]"
              />

              {/* UC Column */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-500">
                  UC
                </span>
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {entry.ucName ?? "--"}
                </span>
                {entry.ucResponseMinutes != null && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {formatMinutes(entry.ucResponseMinutes)} /{" "}
                    {formatMinutes(entry.ucResolutionMinutes ?? 0)}
                  </span>
                )}
              </div>

              {entry.notes && (
                <span className="flex-shrink-0 text-xs text-[var(--text-muted)]">
                  {entry.notes}
                </span>
              )}

              <button
                onClick={() => {
                  if (confirm("Remove this dependency chain entry?"))
                    deleteEntry.mutate(entry.id);
                }}
                className="flex-shrink-0 rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Expiring Agreements */}
      {expiring &&
        ((expiring.olas?.length ?? 0) > 0 ||
          (expiring.ucs?.length ?? 0) > 0) && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Expiring Within {expiring.days} Days
              </h3>
            </div>
            <div className="space-y-2">
              {(expiring.olas ?? []).map((ola) => (
                <div
                  key={ola.id}
                  className="flex items-center justify-between rounded-lg bg-[var(--surface-0)] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase text-emerald-500">
                      OLA
                    </span>
                    <span className="text-sm text-[var(--text-primary)]">
                      {ola.name}
                    </span>
                  </div>
                  <span className="text-xs text-amber-600">
                    Expires{" "}
                    {ola.effectiveTo
                      ? new Date(ola.effectiveTo).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              ))}
              {(expiring.ucs ?? []).map((uc) => (
                <div
                  key={uc.id}
                  className="flex items-center justify-between rounded-lg bg-[var(--surface-0)] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase text-orange-500">
                      UC
                    </span>
                    <span className="text-sm text-[var(--text-primary)]">
                      {uc.name}
                    </span>
                  </div>
                  <span className="text-xs text-amber-600">
                    Expires{" "}
                    {uc.effectiveTo
                      ? new Date(uc.effectiveTo).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
    </motion.div>
  );
}

/* ================================================================== */
/*  Tab 5: Consistency Check                                           */
/* ================================================================== */

function ConsistencyTab() {
  const { data: violations, isLoading } = useSLAConsistencyCheck();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
          />
        ))}
      </div>
    );
  }

  const items = violations ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          SLA Consistency Check
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Verify OLA/UC targets meet or exceed parent SLA targets
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-16">
          <CheckCircle2
            size={48}
            className="mb-4 text-emerald-500 opacity-60"
          />
          <p className="text-sm font-medium text-emerald-600">
            All targets are consistent
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            No OLA or UC targets exceed their parent SLA constraints.
          </p>
        </div>
      ) : (
        <>
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "rgba(239, 68, 68, 0.2)",
              background: "rgba(239, 68, 68, 0.04)",
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {items.length} Violation{items.length !== 1 ? "s" : ""} Found
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              The following OLAs/UCs have targets that exceed their parent
              SLA&apos;s minimum targets.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)]">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)]">
                    Field
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">
                    SLA Target
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">
                    Entity Target
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">
                    Overage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((v: ConsistencyViolation, i: number) => (
                  <tr
                    key={i}
                    className="bg-[var(--surface-0)] transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          v.type === "ola"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-orange-500/10 text-orange-600"
                        }`}
                      >
                        {v.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                      {v.entityName}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize text-[var(--text-secondary)]">
                      {v.field.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-center text-sm tabular-nums text-[var(--text-primary)]">
                      {formatMinutes(v.slaTargetMinutes)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold tabular-nums text-red-600">
                      {formatMinutes(v.entityTargetMinutes)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm tabular-nums text-red-500">
                      +{formatMinutes(v.entityTargetMinutes - v.slaTargetMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  );
}
