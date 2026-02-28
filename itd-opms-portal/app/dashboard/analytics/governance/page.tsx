"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Shield,
  FileCheck,
  AlertCircle,
  Target,
  ClipboardCheck,
} from "lucide-react";
import {
  useExecutiveSummary,
  useTicketsByPriority,
  useTicketsByStatus,
  useSLACompliance,
  useAssetsByType,
  useAssetsByStatus,
} from "@/hooks/use-reporting";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  GaugeChart,
  ProgressRing,
} from "@/components/dashboard/charts";
import type { ChartDataPoint, SLAComplianceRate } from "@/types";

const analyticsPages = [
  { label: "Executive Overview", href: "/dashboard/analytics" },
  { label: "Portfolio", href: "/dashboard/analytics/portfolio" },
  { label: "Projects", href: "/dashboard/analytics/projects" },
  { label: "Risks & Issues", href: "/dashboard/analytics/risks" },
  { label: "Resources", href: "/dashboard/analytics/resources" },
  { label: "Governance", href: "/dashboard/analytics/governance", active: true },
  { label: "Office Analytics", href: "/dashboard/analytics/offices" },
  { label: "Collaboration", href: "/dashboard/analytics/collaboration" },
];

const CHART_COLORS = [
  "#1B7340", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#14B8A6", "#6366F1",
];

export default function GovernanceCompliancePage() {
  const { data: summary, isLoading: summaryLoading } = useExecutiveSummary();
  const { data: ticketsByPriority, isLoading: ticketsPriorityLoading } = useTicketsByPriority();
  const { data: ticketsByStatus, isLoading: ticketsStatusLoading } = useTicketsByStatus();
  const { data: slaCompliance, isLoading: slaLoading } = useSLACompliance();
  const { data: assetsByType, isLoading: assetsTypeLoading } = useAssetsByType();
  const { data: assetsByStatus, isLoading: assetsStatusLoading } = useAssetsByStatus();

  // Ticket priority donut
  const ticketPriorityDonut = useMemo(() => {
    if (!ticketsByPriority || !Array.isArray(ticketsByPriority)) return [];
    return (ticketsByPriority as ChartDataPoint[]).map((item, i) => ({
      name: item.label, value: item.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [ticketsByPriority]);

  // Ticket status donut
  const ticketStatusDonut = useMemo(() => {
    if (!ticketsByStatus || !Array.isArray(ticketsByStatus)) return [];
    return (ticketsByStatus as ChartDataPoint[]).map((item, i) => ({
      name: item.label, value: item.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [ticketsByStatus]);

  // Asset type donut
  const assetTypeDonut = useMemo(() => {
    if (!assetsByType || !Array.isArray(assetsByType)) return [];
    return (assetsByType as ChartDataPoint[]).map((item, i) => ({
      name: item.label, value: item.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [assetsByType]);

  // Asset status donut
  const assetStatusDonut = useMemo(() => {
    if (!assetsByStatus || !Array.isArray(assetsByStatus)) return [];
    return (assetsByStatus as ChartDataPoint[]).map((item, i) => ({
      name: item.label, value: item.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [assetsByStatus]);

  const slaRate = useMemo(() => {
    if (!slaCompliance) return 0;
    const data = slaCompliance as SLAComplianceRate;
    return typeof data.rate === "number" ? Math.round(data.rate) : 0;
  }, [slaCompliance]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(27,115,64,0.1)" }}>
            <Shield size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Governance & Compliance</h1>
            <p className="text-sm text-[var(--text-secondary)]">Policy compliance, OKR progress, SLA tracking, and audit readiness</p>
          </div>
        </div>
      </motion.div>

      {/* Sub-nav */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-1 overflow-x-auto pb-1">
        {analyticsPages.map((page) => (
          <Link key={page.href} href={page.href}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              page.active ? "text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"}`}
            style={page.active ? { backgroundColor: "#1B7340" } : undefined}>
            {page.label}
          </Link>
        ))}
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPIStatCard label="Active Policies" value={summaryLoading ? undefined : summary?.activePolicies ?? 0}
          icon={Shield} color="#1B7340" bgColor="rgba(27,115,64,0.1)" isLoading={summaryLoading} index={0}
          href="/dashboard/governance/policies" />
        <KPIStatCard label="Overdue Actions" value={summaryLoading ? undefined : summary?.overdueActions ?? 0}
          icon={AlertCircle} color="#EF4444" bgColor="rgba(239,68,68,0.1)" isLoading={summaryLoading} index={1}
          href="/dashboard/governance/actions" />
        <KPIStatCard label="Pending Attestations" value={summaryLoading ? undefined : summary?.pendingAttestations ?? 0}
          icon={FileCheck} color="#F59E0B" bgColor="rgba(245,158,11,0.1)" isLoading={summaryLoading} index={2}
          href="/dashboard/governance/policies" />
        <KPIStatCard label="OKR Progress" value={summaryLoading ? undefined : summary?.avgOkrProgress ?? 0}
          icon={Target} color="#3B82F6" bgColor="rgba(59,130,246,0.1)" isLoading={summaryLoading} index={3} suffix="%"
          href="/dashboard/governance/okrs" />
        <KPIStatCard label="Audit Readiness" value={summaryLoading ? undefined : summary?.auditReadinessScore ?? 0}
          icon={ClipboardCheck} color="#8B5CF6" bgColor="rgba(139,92,246,0.1)" isLoading={summaryLoading} index={4} suffix="%"
          href="/dashboard/governance/policies" />
      </div>

      {/* Row 1 — OKR + Audit Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="OKR Progress" delay={0.2}>
          <div className="flex items-center justify-center py-4">
            <ProgressRing value={summary?.avgOkrProgress ?? 0} size={140} strokeWidth={10}
              label="Avg OKR" delay={0.4} />
          </div>
        </ChartCard>

        <ChartCard title="SLA Compliance" delay={0.25}>
          <div className="flex items-center justify-center py-2">
            <GaugeChart value={slaRate} label="Compliance" size={180}
              thresholds={{ good: 90, warning: 75 }} />
          </div>
        </ChartCard>

        <ChartCard title="Audit Readiness" delay={0.3}>
          <div className="flex items-center justify-center py-4">
            <ProgressRing value={summary?.auditReadinessScore ?? 0} size={140} strokeWidth={10}
              label="Readiness" delay={0.5} />
          </div>
        </ChartCard>
      </div>

      {/* Row 2 — Ticket Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tickets by Priority" delay={0.35}>
          {ticketsPriorityLoading ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={ticketPriorityDonut} height={240} innerRadius={45} outerRadius={75}
                centerLabel="Tickets" showLabel />}
        </ChartCard>

        <ChartCard title="Tickets by Status" delay={0.4}>
          {ticketsStatusLoading ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={ticketStatusDonut} height={240} innerRadius={45} outerRadius={75}
                centerLabel="Tickets" showLabel />}
        </ChartCard>
      </div>

      {/* Row 3 — Asset Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Assets by Type" delay={0.45}>
          {assetsTypeLoading ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={assetTypeDonut} height={240} innerRadius={45} outerRadius={75}
                centerLabel="Assets" showLabel />}
        </ChartCard>

        <ChartCard title="Assets by Status" delay={0.5}>
          {assetsStatusLoading ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={assetStatusDonut} height={240} innerRadius={45} outerRadius={75}
                centerLabel="Assets" showLabel />}
        </ChartCard>
      </div>

      {/* Summary Metrics */}
      <ChartCard title="Cross-Module Metrics" delay={0.55}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Open Tickets", value: summary?.openTickets ?? 0, color: "#F59E0B", href: "/dashboard/itsm/tickets" },
            { label: "Critical Tickets", value: summary?.criticalTickets ?? 0, color: "#EF4444", href: "/dashboard/itsm/tickets" },
            { label: "Active Assets", value: summary?.activeAssets ?? 0, color: "#3B82F6", href: "/dashboard/cmdb/assets" },
            { label: "License Compliance", value: `${summary?.licenseCompliancePct ?? 0}%`, color: "#22C55E", href: "/dashboard/cmdb/licenses" },
            { label: "Warranties (90d)", value: summary?.warrantiesExpiring90Days ?? 0, color: "#F97316", href: "/dashboard/cmdb/warranties" },
          ].map((metric, i) => (
            <Link key={metric.label} href={metric.href}>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="text-center group cursor-pointer rounded-lg p-2 transition-all hover:bg-[var(--surface-1)]">
                <p className="text-2xl font-bold tabular-nums" style={{ color: metric.color }}>{metric.value}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                  {metric.label}
                  <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
