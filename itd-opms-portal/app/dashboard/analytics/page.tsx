"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  FolderKanban,
  CheckCircle2,
  Activity,
  DollarSign,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  useExecutiveSummary,
} from "@/hooks/use-reporting";
import { useProjects, useRisks, useMilestones } from "@/hooks/use-planning";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  ProgressRing,
  StackedBarChart,
  FunnelChart,
  WaterfallChart,
  HeatMapGrid,
  TrendLineChart,
} from "@/components/dashboard/charts";
import type { Project, Risk, PlanningMilestone } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RAG_COLORS = { green: "#22C55E", amber: "#F59E0B", red: "#EF4444" };

const STATUS_COLORS: Record<string, string> = {
  proposed: "#9CA3AF", active: "#3B82F6", "in-development": "#8B5CF6",
  implementation: "#06B6D4", completed: "#22C55E", cancelled: "#EF4444",
  "on-hold": "#F97316", "kick-off": "#14B8A6", "project-mode": "#6366F1",
  "requirement-management": "#EC4899", "solution-architecture": "#A855F7",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#84CC16", medium: "#F59E0B", high: "#F97316", critical: "#EF4444",
};

const analyticsPages = [
  { label: "Executive Overview", href: "/dashboard/analytics", active: true },
  { label: "Portfolio", href: "/dashboard/analytics/portfolio" },
  { label: "Projects", href: "/dashboard/analytics/projects" },
  { label: "Risks & Issues", href: "/dashboard/analytics/risks" },
  { label: "Resources", href: "/dashboard/analytics/resources" },
  { label: "Governance", href: "/dashboard/analytics/governance" },
  { label: "Office Analytics", href: "/dashboard/analytics/offices" },
  { label: "Collaboration", href: "/dashboard/analytics/collaboration" },
];

/* ------------------------------------------------------------------ */
/*  Computation helpers                                                */
/* ------------------------------------------------------------------ */

function computeFunnelData(projects: Project[]) {
  const stages = [
    { name: "Proposed", key: "proposed", color: "#9CA3AF" },
    { name: "Active / Kick-Off", key: "active", color: "#3B82F6" },
    { name: "In Development", key: "in-development", color: "#8B5CF6" },
    { name: "Implementation", key: "implementation", color: "#06B6D4" },
    { name: "Completed", key: "completed", color: "#22C55E" },
  ];
  const counts: Record<string, number> = {};
  for (const p of projects) {
    const s = (p.status || "").toLowerCase();
    counts[s] = (counts[s] || 0) + 1;
  }
  return stages.map((stage) => ({
    name: stage.name, value: counts[stage.key] || 0, color: stage.color,
  }));
}

function computeRagDonutData(projects: Project[]) {
  const counts = { green: 0, amber: 0, red: 0 };
  for (const p of projects) {
    const rag = (p.ragStatus || "").toLowerCase();
    if (rag in counts) counts[rag as keyof typeof counts]++;
  }
  return [
    { name: "Green", value: counts.green, color: RAG_COLORS.green },
    { name: "Amber", value: counts.amber, color: RAG_COLORS.amber },
    { name: "Red", value: counts.red, color: RAG_COLORS.red },
  ];
}

function computeDivisionalData(projects: Project[]) {
  const divisionMap: Record<string, Record<string, number>> = {};
  const allStatuses = new Set<string>();
  for (const p of projects) {
    const md = p.metadata as Record<string, string> | undefined;
    const division = md?.division || md?.owning_division || "Unassigned";
    const status = p.status || "unknown";
    allStatuses.add(status);
    if (!divisionMap[division]) divisionMap[division] = {};
    divisionMap[division][status] = (divisionMap[division][status] || 0) + 1;
  }
  const statusList = Array.from(allStatuses).sort();
  const data = Object.entries(divisionMap).map(([name, statuses]) => {
    const row: Record<string, string | number> = { name };
    for (const s of statusList) row[s] = statuses[s] || 0;
    return row;
  });
  return { data, categories: statusList };
}

function computeBudgetWaterfall(projects: Project[]) {
  const totalApproved = projects.reduce((s, p) => s + (p.budgetApproved || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.budgetSpent || 0), 0);
  return [
    { name: "Approved", value: totalApproved, type: "total" as const },
    { name: "Spent", value: totalSpent, type: "decrease" as const },
    { name: "Remaining", value: Math.max(0, totalApproved - totalSpent), type: "total" as const },
  ];
}

function computePriorityDonut(projects: Project[]) {
  const counts: Record<string, number> = {};
  for (const p of projects) {
    const pr = (p.priority || "medium").toLowerCase();
    counts[pr] = (counts[pr] || 0) + 1;
  }
  return Object.entries(counts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value,
    color: PRIORITY_COLORS[name] || "#9CA3AF",
  }));
}

function computeRiskHeatMap(risks: Risk[]) {
  const levelMap: Record<string, number> = {
    very_low: 0, low: 1, medium: 2, high: 3, very_high: 4,
  };
  const cells: Record<string, { row: number; col: number; value: number; items: Array<{ id: string; title: string }> }> = {};
  for (const r of risks) {
    const col = levelMap[(r.likelihood || "medium").toLowerCase().replace(/\s+/g, "_")] ?? 2;
    const row = levelMap[(r.impact || "medium").toLowerCase().replace(/\s+/g, "_")] ?? 2;
    const key = `${row}-${col}`;
    if (!cells[key]) cells[key] = { row, col, value: 0, items: [] };
    cells[key].value++;
    cells[key].items.push({ id: r.id, title: r.title });
  }
  return Object.values(cells);
}

function computeMilestoneTrend(milestones: PlanningMilestone[]) {
  const monthMap: Record<string, { completed: number; pending: number }> = {};
  for (const ms of milestones) {
    const date = ms.actualDate || ms.targetDate;
    if (!date) continue;
    const month = date.substring(0, 7);
    if (!monthMap[month]) monthMap[month] = { completed: 0, pending: 0 };
    if (ms.status === "completed") monthMap[month].completed++;
    else monthMap[month].pending++;
  }
  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, c]) => ({ name: month, Completed: c.completed, Pending: c.pending }));
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ExecutiveAnalyticsPage() {
  const { data: summary, isLoading: summaryLoading } = useExecutiveSummary();
  const { data: projectsRaw, isLoading: projectsLoading } = useProjects(1, 200);
  const { data: risksRaw, isLoading: risksLoading } = useRisks(1, 200);
  const { data: milestonesRaw, isLoading: milestonesLoading } = useMilestones();

  // Normalise paginated / array responses
  const { items: projects, totalFromMeta: projectsTotalFromMeta } = useMemo<{ items: Project[]; totalFromMeta: number | null }>(() => {
    if (!projectsRaw) return { items: [], totalFromMeta: null };
    if (Array.isArray(projectsRaw)) return { items: projectsRaw, totalFromMeta: null };
    if ("data" in projectsRaw && Array.isArray((projectsRaw as { data: Project[]; meta?: { total?: number; totalItems?: number } }).data)) {
      const typed = projectsRaw as { data: Project[]; meta?: { total?: number; totalItems?: number } };
      return { items: typed.data, totalFromMeta: typed.meta?.total ?? typed.meta?.totalItems ?? null };
    }
    return { items: [], totalFromMeta: null };
  }, [projectsRaw]);

  const risks = useMemo<Risk[]>(() => {
    if (!risksRaw) return [];
    if (Array.isArray(risksRaw)) return risksRaw;
    if ("data" in risksRaw && Array.isArray((risksRaw as { data: Risk[] }).data))
      return (risksRaw as { data: Risk[] }).data;
    return [];
  }, [risksRaw]);

  const milestones = useMemo<PlanningMilestone[]>(() => {
    if (!milestonesRaw) return [];
    if (Array.isArray(milestonesRaw)) return milestonesRaw;
    return [];
  }, [milestonesRaw]);

  const anyLoading = summaryLoading || projectsLoading;

  // Computed aggregations
  const funnelData = useMemo(() => computeFunnelData(projects), [projects]);
  const ragData = useMemo(() => computeRagDonutData(projects), [projects]);
  const divisionalData = useMemo(() => computeDivisionalData(projects), [projects]);
  const budgetData = useMemo(() => computeBudgetWaterfall(projects), [projects]);
  const priorityData = useMemo(() => computePriorityDonut(projects), [projects]);
  const riskHeatData = useMemo(() => computeRiskHeatMap(risks), [risks]);
  const milestoneTrend = useMemo(() => computeMilestoneTrend(milestones), [milestones]);

  const totalProjects = projectsTotalFromMeta ?? projects.length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const avgCompletion = totalProjects > 0
    ? Math.round(projects.reduce((s, p) => s + (p.completionPct || 0), 0) / totalProjects) : 0;
  const totalBudgetApproved = projects.reduce((s, p) => s + (p.budgetApproved || 0), 0);
  const totalBudgetSpent = projects.reduce((s, p) => s + (p.budgetSpent || 0), 0);
  const budgetUtilization = totalBudgetApproved > 0
    ? Math.round((totalBudgetSpent / totalBudgetApproved) * 100) : 0;

  const kpis: Array<{
    label: string; value: number | string | undefined; icon: LucideIcon;
    color: string; bgColor: string; suffix?: string; subtitle?: string; href?: string;
  }> = [
      {
        label: "Total Projects", value: anyLoading ? undefined : totalProjects,
        icon: FolderKanban, color: "#1B7340", bgColor: "rgba(27,115,64,0.1)",
        subtitle: `${completedProjects} completed`,
        href: "/dashboard/planning/projects",
      },
      {
        label: "Completed", value: anyLoading ? undefined : completedProjects,
        icon: CheckCircle2, color: "#22C55E", bgColor: "rgba(34,197,94,0.1)",
        subtitle: totalProjects > 0 ? `${Math.round((completedProjects / totalProjects) * 100)}% of total` : undefined,
        href: "/dashboard/planning/projects",
      },
      {
        label: "Overall Progress", value: anyLoading ? undefined : avgCompletion,
        icon: Activity, color: "#3B82F6", bgColor: "rgba(59,130,246,0.1)", suffix: "%",
        href: "/dashboard/planning/projects",
      },
      {
        label: "Budget Utilization", value: anyLoading ? undefined : budgetUtilization,
        icon: DollarSign, color: "#8B5CF6", bgColor: "rgba(139,92,246,0.1)", suffix: "%",
        subtitle: totalBudgetApproved > 0
          ? `${(totalBudgetSpent / 1e6).toFixed(1)}M / ${(totalBudgetApproved / 1e6).toFixed(1)}M` : undefined,
        href: "/dashboard/planning/projects",
      },
      {
        label: "On-Time Delivery", value: summary?.onTimeDeliveryPct,
        icon: Clock, color: "#06B6D4", bgColor: "rgba(6,182,212,0.1)", suffix: "%",
        href: "/dashboard/planning/milestones",
      },
      {
        label: "Active Risks", value: summary?.highRisks,
        icon: AlertTriangle, color: "#EF4444", bgColor: "rgba(239,68,68,0.1)",
        subtitle: summary?.criticalRisks ? `${summary.criticalRisks} critical` : undefined,
        href: "/dashboard/planning/risks",
      },
    ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(27,115,64,0.1)" }}>
              <BarChart3 size={20} style={{ color: "#1B7340" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Divisional Executive Dashboard
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Cross-module performance overview and strategic insights
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

      {/* Sub-navigation tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-1 overflow-x-auto pb-1"
      >
        {analyticsPages.map((page) => (
          <Link key={page.href} href={page.href}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${page.active ? "text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"}`}
            style={page.active ? { backgroundColor: "#1B7340" } : undefined}>
            {page.label}
          </Link>
        ))}
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, index) => (
          <KPIStatCard key={kpi.label} {...kpi} isLoading={anyLoading} index={index} />
        ))}
      </div>

      {/* Row 2 — Primary Charts 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Project Lifecycle Funnel" subtitle="Project flow through stages" delay={0.2}>
          {projectsLoading
            ? <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <FunnelChart data={funnelData} height={260} />}
        </ChartCard>

        <ChartCard title="RAG Status Distribution" subtitle="Project health indicators" delay={0.25}>
          {projectsLoading
            ? <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : (
              <div className="flex items-center justify-center gap-6 py-2">
                {ragData.map((rag) => (
                  <div key={rag.name} className="flex flex-col items-center">
                    <ProgressRing value={totalProjects > 0 ? (rag.value / totalProjects) * 100 : 0}
                      size={100} strokeWidth={8} color={rag.color} delay={0.4} />
                    <div className="text-center mt-2">
                      <span className="text-lg font-bold tabular-nums" style={{ color: rag.color }}>{rag.value}</span>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase">{rag.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </ChartCard>

        <ChartCard title="Divisional Progress Tracker" subtitle="Status by division" delay={0.3}>
          {projectsLoading
            ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <StackedBarChart data={divisionalData.data} categories={divisionalData.categories}
              height={280} layout="vertical" colors={Object.values(STATUS_COLORS)} />}
        </ChartCard>

        <ChartCard title="Budget Overview" subtitle="Approved → Spent → Remaining" delay={0.35}>
          {projectsLoading
            ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <WaterfallChart data={budgetData} height={280}
              formatValue={(v) => `${(v / 1e6).toFixed(1)}M`} />}
        </ChartCard>
      </div>

      {/* Row 3 — Secondary Charts 3-col */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title="Priority Distribution" delay={0.4}>
          {projectsLoading
            ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={priorityData} height={220} innerRadius={45} outerRadius={75}
              centerLabel="Projects" showLabel />}
        </ChartCard>

        <ChartCard title="Milestone Progress" subtitle="Completed vs pending over time" delay={0.45}>
          {milestonesLoading
            ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <TrendLineChart data={milestoneTrend} height={220}
              lines={[{ key: "Completed", color: "#22C55E" }, { key: "Pending", color: "#F59E0B" }]} />}
        </ChartCard>

        <ChartCard title="Risk Heat Map" subtitle="Likelihood vs Impact" delay={0.5}>
          {risksLoading
            ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <HeatMapGrid data={riskHeatData} height={220} />}
        </ChartCard>
      </div>

      {/* Quick Links to Other Dashboards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {analyticsPages.slice(1).map((page) => (
          <Link key={page.href} href={page.href}
            className="group flex items-center justify-between rounded-xl border p-4 transition-all hover:shadow-md"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}>
            <span className="text-sm font-medium text-[var(--text-primary)]">{page.label}</span>
            <ArrowRight size={16} className="text-[var(--text-muted)] transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
