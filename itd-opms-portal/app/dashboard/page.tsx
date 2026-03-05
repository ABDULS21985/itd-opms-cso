"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Shield,
  Users,
  FolderKanban,
  Headphones,
  HardDrive,
  Settings,
  Ticket,
  Activity,
  AlertTriangle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useExecutiveSummary } from "@/hooks/use-reporting";
import { CriticalAlertsBanner } from "@/components/dashboard/critical-alerts-banner";
import BentoKPICard from "@/components/dashboard/bento-kpi-card";
import { SecondaryMetricsStrip } from "@/components/dashboard/secondary-metrics-strip";
import { SparkLine } from "@/components/dashboard/charts/spark-line";
import { GaugeChart } from "@/components/dashboard/charts/gauge-chart";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { ProgressRing } from "@/components/dashboard/charts/progress-ring";
import { MiniBarChart } from "@/components/dashboard/charts/mini-bar-chart";
import { AnalyticsGrid } from "@/components/dashboard/analytics/analytics-grid";
import { DivisionPerformanceSection } from "@/components/dashboard/division-performance/division-performance-section";
import { ActivityPulse } from "@/components/dashboard/activity-pulse";
import { HexNavigationHub } from "@/components/dashboard/hex-navigation-hub";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateTrend(currentValue: number, length = 7): number[] {
  if (!currentValue && currentValue !== 0) return [];
  const base = Math.max(0, currentValue * 0.65);
  const range = currentValue * 0.35 || 1;
  return Array.from({ length }, (_, i) => {
    const progress = i / (length - 1);
    const noise = Math.sin(i * 2.7) * range * 0.25;
    return Math.round(base + range * progress + noise);
  });
}

function formatElapsed(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ago`;
}

/* ------------------------------------------------------------------ */
/*  Module config (shared with HexNavigationHub)                       */
/* ------------------------------------------------------------------ */

interface ModuleCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  bgColor: string;
  permission?: string;
}

const modules: ModuleCard[] = [
  {
    title: "Governance",
    description: "Policies, RACI matrices, meeting governance, and OKRs",
    icon: Shield,
    href: "/dashboard/governance",
    color: "#1B7340",
    bgColor: "rgba(27, 115, 64, 0.1)",
    permission: "governance.view",
  },
  {
    title: "People",
    description: "Staff directory, skills matrix, onboarding, and roster",
    icon: Users,
    href: "/dashboard/people",
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    permission: "people.view",
  },
  {
    title: "Planning",
    description: "Portfolios, projects, tasks, risks, and dependencies",
    icon: FolderKanban,
    href: "/dashboard/planning",
    color: "#8B5CF6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    permission: "planning.view",
  },
  {
    title: "ITSM",
    description: "Service catalog, incidents, requests, and problem management",
    icon: Headphones,
    href: "/dashboard/itsm",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.1)",
    permission: "itsm.view",
  },
  {
    title: "Assets",
    description: "Inventory, CMDB, license tracking, and procurement",
    icon: HardDrive,
    href: "/dashboard/assets",
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    permission: "assets.view",
  },
  {
    title: "Knowledge Base",
    description: "Documentation, SOPs, runbooks, and shared knowledge",
    icon: LayoutDashboard,
    href: "/dashboard/knowledge",
    color: "#06B6D4",
    bgColor: "rgba(6, 182, 212, 0.1)",
    permission: "knowledge.view",
  },
  {
    title: "System",
    description: "Audit logs, system settings, roles, and permissions",
    icon: Settings,
    href: "/dashboard/system",
    color: "#64748B",
    bgColor: "rgba(100, 116, 139, 0.1)",
    permission: "system.view",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    data: summary,
    isLoading: summaryLoading,
    dataUpdatedAt,
    refetch,
    isFetching,
  } = useExecutiveSummary();
  const userPermissions = user?.permissions || [];

  /* ---- Elapsed-time ticker ---- */
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!dataUpdatedAt) return;
    setElapsed(Math.floor((Date.now() - dataUpdatedAt) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - dataUpdatedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  /* ---- Permission filtering ---- */
  const visibleModules = useMemo(() => {
    if (userPermissions.length === 0 || userPermissions.includes("*"))
      return modules;
    return modules.filter(
      (m) => !m.permission || userPermissions.includes(m.permission),
    );
  }, [userPermissions]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  /* ---- Derived KPI data ---- */
  const ticketTrend = useMemo(
    () => generateTrend(summary?.openTickets ?? 0),
    [summary?.openTickets],
  );

  const assetBarData = useMemo(() => {
    if (!summary?.assetCountsByType) return [];
    const palette = ["#1B7340", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"];
    return Object.entries(summary.assetCountsByType).map(([name, value], i) => ({
      name,
      value,
      color: palette[i % palette.length],
    }));
  }, [summary?.assetCountsByType]);

  const ragDonutData = useMemo(
    () => [
      { name: "Green", value: summary?.projectsRagGreen ?? 0, color: "#22C55E" },
      { name: "Amber", value: summary?.projectsRagAmber ?? 0, color: "#F59E0B" },
      { name: "Red", value: summary?.projectsRagRed ?? 0, color: "#EF4444" },
    ],
    [summary?.projectsRagGreen, summary?.projectsRagAmber, summary?.projectsRagRed],
  );

  const totalHighCriticalRisks = (summary?.highRisks ?? 0) + (summary?.criticalRisks ?? 0);

  /* ---- Central hub status ---- */
  const centralStatus = useMemo(() => {
    if (
      (summary?.openP1Incidents ?? 0) > 0 ||
      (summary?.criticalRisks ?? 0) > 2 ||
      (summary?.slaCompliancePct ?? 100) < 80
    )
      return "critical" as const;
    if (
      totalHighCriticalRisks > 3 ||
      (summary?.slaCompliancePct ?? 100) < 90 ||
      (summary?.onTimeDeliveryPct ?? 100) < 80
    )
      return "warning" as const;
    return "healthy" as const;
  }, [summary, totalHighCriticalRisks]);

  /* ---- SLA color helpers ---- */
  const slaColor =
    (summary?.slaCompliancePct ?? 100) >= 95
      ? "#22C55E"
      : (summary?.slaCompliancePct ?? 100) >= 85
        ? "#F59E0B"
        : "#EF4444";

  const slaBgColor =
    (summary?.slaCompliancePct ?? 100) >= 95
      ? "rgba(34, 197, 94, 0.1)"
      : (summary?.slaCompliancePct ?? 100) >= 85
        ? "rgba(245, 158, 11, 0.1)"
        : "rgba(239, 68, 68, 0.1)";

  const otdColor =
    (summary?.onTimeDeliveryPct ?? 100) >= 90
      ? "#22C55E"
      : (summary?.onTimeDeliveryPct ?? 100) >= 75
        ? "#F59E0B"
        : "#EF4444";

  const otdBgColor =
    (summary?.onTimeDeliveryPct ?? 100) >= 90
      ? "rgba(34, 197, 94, 0.1)"
      : (summary?.onTimeDeliveryPct ?? 100) >= 75
        ? "rgba(245, 158, 11, 0.1)"
        : "rgba(239, 68, 68, 0.1)";

  return (
    <div className="space-y-6 pb-8">
      {/* ============================================================ */}
      {/* Header + Last updated                                        */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2"
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            {greeting}, {user?.displayName || "User"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Executive Command Center — IT AMD Projects and Initiatives
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
            Updated {formatElapsed(elapsed)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-1.5 rounded-lg border transition-colors"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-0)",
              color: "var(--text-secondary)",
            }}
            aria-label="Refresh data"
          >
            <RefreshCw
              size={14}
              className={isFetching ? "animate-spin" : ""}
            />
          </button>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/* Critical Alerts Banner                                       */}
      {/* ============================================================ */}
      {!summaryLoading && (
        <CriticalAlertsBanner
          openP1Incidents={summary?.openP1Incidents ?? 0}
          slaBreaches24h={summary?.slaBreaches24h ?? 0}
          criticalRisks={summary?.criticalRisks ?? 0}
        />
      )}

      {/* ============================================================ */}
      {/* BENTO GRID + ACTIVITY PULSE                                  */}
      {/* Two-column layout: Bento KPIs left, Activity feed right      */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* ---- LEFT: Bento KPI Grid ---- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 auto-rows-min">
          {/* HERO CARD — Open Tickets (2x2) */}
          <BentoKPICard
            label="Open Tickets"
            value={summary?.openTickets}
            icon={Ticket}
            color="#EF4444"
            size="hero"
            isLoading={summaryLoading}
            index={0}
            href="/dashboard/itsm"
            needsAttention={(summary?.openTickets ?? 0) > 50}
            subtitle={`P1: ${summary?.openTicketsP1 ?? 0} · P2: ${summary?.openTicketsP2 ?? 0}`}
          >
            <SparkLine data={ticketTrend} color="#EF4444" width={120} height={48} />
          </BentoKPICard>

          {/* SLA Compliance — compact */}
          <BentoKPICard
            label="SLA Compliance"
            value={summary?.slaCompliancePct !== undefined ? Math.round(summary.slaCompliancePct) : undefined}
            icon={Activity}
            color={slaColor}
            size="compact"
            isLoading={summaryLoading}
            index={1}
            suffix="%"
            href="/dashboard/itsm?tab=sla"
            needsAttention={(summary?.slaCompliancePct ?? 100) < 85}
          >
            <GaugeChart
              value={summary?.slaCompliancePct ?? 0}
              size={52}
              thresholds={{ good: 95, warning: 85 }}
              delay={0.4}
              showValue={false}
            />
          </BentoKPICard>

          {/* On-Time Delivery — compact */}
          <BentoKPICard
            label="On-Time Delivery"
            value={summary?.onTimeDeliveryPct !== undefined ? Math.round(summary.onTimeDeliveryPct) : undefined}
            icon={Activity}
            color={otdColor}
            size="compact"
            isLoading={summaryLoading}
            index={2}
            suffix="%"
            href="/dashboard/planning"
            needsAttention={(summary?.onTimeDeliveryPct ?? 100) < 75}
          >
            <ProgressRing
              value={summary?.onTimeDeliveryPct ?? 0}
              size={44}
              strokeWidth={5}
              delay={0.5}
              showPercentage={false}
            />
          </BentoKPICard>

          {/* Active Projects — wide (spans 2 cols) */}
          <BentoKPICard
            label="Active Projects"
            value={summary?.activeProjects}
            icon={FolderKanban}
            color="#8B5CF6"
            size="wide"
            isLoading={summaryLoading}
            index={3}
            href="/dashboard/planning"
            subtitle={`G:${summary?.projectsRagGreen ?? 0} A:${summary?.projectsRagAmber ?? 0} R:${summary?.projectsRagRed ?? 0}`}
          >
            <DonutChart
              data={ragDonutData}
              height={48}
              innerRadius={12}
              outerRadius={20}
              showLegend={false}
            />
          </BentoKPICard>

          {/* Active Assets — compact */}
          <BentoKPICard
            label="Active Assets"
            value={summary?.activeAssets}
            icon={HardDrive}
            color="#F59E0B"
            size="compact"
            isLoading={summaryLoading}
            index={4}
            href="/dashboard/assets"
          >
            <MiniBarChart data={assetBarData} width={68} height={24} defaultColor="#F59E0B" />
          </BentoKPICard>

          {/* High/Critical Risks — compact */}
          <BentoKPICard
            label="High/Critical Risks"
            value={totalHighCriticalRisks}
            icon={AlertTriangle}
            color={totalHighCriticalRisks > 0 ? "#EF4444" : "#22C55E"}
            size="compact"
            isLoading={summaryLoading}
            index={5}
            href="/dashboard/grc/risks"
            needsAttention={totalHighCriticalRisks > 5}
            trend={totalHighCriticalRisks > 3 ? "up" : totalHighCriticalRisks === 0 ? "down" : "flat"}
            trendValue={
              totalHighCriticalRisks > 0
                ? `${summary?.criticalRisks ?? 0} critical`
                : "None"
            }
          />
        </div>

        {/* ---- RIGHT: Live Activity Pulse ---- */}
        <ActivityPulse className="hidden xl:flex" />
      </div>

      {/* ============================================================ */}
      {/* Secondary Metrics Strip                                      */}
      {/* ============================================================ */}
      <SecondaryMetricsStrip
        mttrMinutes={summary?.mttrMinutes}
        mttaMinutes={summary?.mttaMinutes}
        backlogOver30Days={summary?.backlogOver30Days}
        licenseCompliancePct={summary?.licenseCompliancePct}
        auditReadinessScore={summary?.auditReadinessScore}
        teamCapacityUtilizationPct={summary?.teamCapacityUtilizationPct}
        overdueTrainingCerts={summary?.overdueTrainingCerts}
        warrantiesExpiring90Days={summary?.warrantiesExpiring90Days}
        isLoading={summaryLoading}
        delay={0.55}
      />

      {/* ============================================================ */}
      {/* Interactive Analytics Grid                                   */}
      {/* ============================================================ */}
      <AnalyticsGrid delay={0.6} />

      {/* ============================================================ */}
      {/* Division Performance Drill-Down                              */}
      {/* ============================================================ */}
      <DivisionPerformanceSection delay={0.85} />

      {/* ============================================================ */}
      {/* Command Hub — Hex Navigation (replaces module cards)         */}
      {/* ============================================================ */}
      <HexNavigationHub
        modules={visibleModules}
        centralLabel="OPMS"
        centralStatus={centralStatus}
      />

      {/* Activity Pulse for mobile (below the grid) */}
      <div className="xl:hidden">
        <ActivityPulse />
      </div>
    </div>
  );
}
