"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Shield,
  Ticket,
  FolderKanban,
  HardDrive,
  AlertTriangle,
  Award,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import {
  useExecutiveSummary,
  useTicketsByPriority,
  useProjectsByStatus,
  useAssetsByType,
  useSLACompliance,
} from "@/hooks/use-reporting";
import type { ChartDataPoint, SLAComplianceRate } from "@/types";

/* ------------------------------------------------------------------ */
/*  Chart Color Palette                                                 */
/* ------------------------------------------------------------------ */

const CHART_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#F97316",
  "#14B8A6",
  "#6366F1",
];

/* ------------------------------------------------------------------ */
/*  KPI Card                                                            */
/* ------------------------------------------------------------------ */

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  isLoading,
  index,
}: {
  label: string;
  value: number | string | undefined;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  isLoading: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.05 }}
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </span>
      </div>
      {isLoading ? (
        <div className="h-9 w-16 rounded bg-[var(--surface-2)] animate-pulse" />
      ) : (
        <p className="text-3xl font-bold tabular-nums" style={{ color }}>
          {value ?? "--"}
        </p>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Horizontal Bar Chart (CSS-only, progressive enhancement)            */
/* ------------------------------------------------------------------ */

function HorizontalBarChart({
  data,
  isLoading,
  emptyMessage,
}: {
  data: ChartDataPoint[] | undefined;
  isLoading: boolean;
  emptyMessage?: string;
}) {
  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-4 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
            <div className="h-6 rounded bg-[var(--surface-2)] animate-pulse" style={{ width: `${60 + i * 10}%` }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-xs text-[var(--text-secondary)]">{emptyMessage || "No data available."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((point, index) => {
        const pct = Math.round((point.value / maxValue) * 100);
        const color = CHART_COLORS[index % CHART_COLORS.length];
        return (
          <div key={point.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                {point.label}
              </span>
              <span className="text-xs font-bold tabular-nums" style={{ color }}>
                {point.value}
              </span>
            </div>
            <div
              className="w-full h-5 rounded-md overflow-hidden"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              <motion.div
                className="h-full rounded-md"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.08, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLA Gauge (CSS-only)                                                */
/* ------------------------------------------------------------------ */

function SLAGauge({
  data,
  isLoading,
}: {
  data: SLAComplianceRate | undefined;
  isLoading: boolean;
}) {
  const overallPct = useMemo(() => {
    if (!data || typeof data.rate !== "number") return 0;
    return Math.max(0, Math.min(100, Math.round(data.rate)));
  }, [data]);

  const gaugeColor = useMemo(() => {
    if (overallPct >= 90) return "#22C55E";
    if (overallPct >= 75) return "#F59E0B";
    return "#EF4444";
  }, [overallPct]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-32 h-32 rounded-full bg-[var(--surface-2)] animate-pulse" />
      </div>
    );
  }

  if (!data || typeof data.rate !== "number") {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-xs text-[var(--text-secondary)]">No SLA data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Circular gauge representation */}
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--surface-2)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 42 * (1 - overallPct / 100),
              }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums" style={{ color: gaugeColor }}>
              {overallPct}%
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
              Compliance
            </span>
          </div>
        </div>
      </div>

      {/* Overall compliance bar */}
      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Resolution SLA Compliance (Last 30 Days)
            </span>
            <span className="text-xs font-bold tabular-nums" style={{ color: gaugeColor }}>
              {overallPct}%
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: gaugeColor }}
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart Section Card                                                  */
/* ------------------------------------------------------------------ */

function ChartSection({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const { data: summary, isLoading: summaryLoading } = useExecutiveSummary();
  const { data: ticketsByPriority, isLoading: ticketsPriorityLoading } = useTicketsByPriority();
  const { data: projectsByStatus, isLoading: projectsStatusLoading } = useProjectsByStatus();
  const { data: assetsByType, isLoading: assetsTypeLoading } = useAssetsByType();
  const { data: slaCompliance, isLoading: slaLoading } = useSLACompliance();

  const kpis: Array<{
    label: string;
    value: number | undefined;
    icon: LucideIcon;
    color: string;
    bgColor: string;
  }> = [
    {
      label: "Active Policies",
      value: summary?.activePolicies,
      icon: Shield,
      color: "#1B7340",
      bgColor: "rgba(27, 115, 64, 0.1)",
    },
    {
      label: "Open Tickets",
      value: summary?.openTickets,
      icon: Ticket,
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)",
    },
    {
      label: "Active Projects",
      value: summary?.activeProjects,
      icon: FolderKanban,
      color: "#8B5CF6",
      bgColor: "rgba(139, 92, 246, 0.1)",
    },
    {
      label: "Active Assets",
      value: summary?.activeAssets,
      icon: HardDrive,
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      label: "High Risks",
      value: summary?.highRisks,
      icon: AlertTriangle,
      color: "#EF4444",
      bgColor: "rgba(239, 68, 68, 0.1)",
    },
    {
      label: "Expiring Certs",
      value: summary?.expiringCerts,
      icon: Award,
      color: "#06B6D4",
      bgColor: "rgba(6, 182, 212, 0.1)",
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
            >
              <BarChart3 size={20} style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Executive Analytics
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Cross-module performance overview and key metrics.
              </p>
            </div>
          </div>
          {summary?.refreshedAt && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <RefreshCw size={12} />
              Updated {new Date(summary.refreshedAt).toLocaleString()}
            </div>
          )}
        </div>
      </motion.div>

      {/* KPI Cards — 2 rows of 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, index) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            bgColor={kpi.bgColor}
            isLoading={summaryLoading}
            index={index}
          />
        ))}
      </div>

      {/* Charts — 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tickets by Priority */}
        <ChartSection title="Tickets by Priority" delay={0.2}>
          <HorizontalBarChart
            data={ticketsByPriority as ChartDataPoint[] | undefined}
            isLoading={ticketsPriorityLoading}
            emptyMessage="No ticket data available."
          />
        </ChartSection>

        {/* Projects by Status */}
        <ChartSection title="Projects by Status" delay={0.25}>
          <HorizontalBarChart
            data={projectsByStatus as ChartDataPoint[] | undefined}
            isLoading={projectsStatusLoading}
            emptyMessage="No project data available."
          />
        </ChartSection>

        {/* Assets by Type */}
        <ChartSection title="Assets by Type" delay={0.3}>
          <HorizontalBarChart
            data={assetsByType as ChartDataPoint[] | undefined}
            isLoading={assetsTypeLoading}
            emptyMessage="No asset data available."
          />
        </ChartSection>

        {/* SLA Compliance Rate */}
        <ChartSection title="SLA Compliance Rate" delay={0.35}>
          <SLAGauge
            data={slaCompliance}
            isLoading={slaLoading}
          />
        </ChartSection>
      </div>
    </div>
  );
}
