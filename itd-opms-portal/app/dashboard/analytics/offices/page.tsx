"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  FolderKanban,
  Activity,
  TrendingUp,
  DollarSign,
  Info,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { useProjects, useRisks } from "@/hooks/use-planning";
import {
  KPIStatCard,
  ChartCard,
  ProgressRing,
  StackedBarChart,
  RadarChart,
} from "@/components/dashboard/charts";
import type { Project, Risk } from "@/types";

/* ------------------------------------------------------------------ */
/*  InfoHint — hover/click tooltip for contextual help                 */
/* ------------------------------------------------------------------ */

function InfoHint({
  text,
  position = "bottom",
  size = 14,
  className = "",
}: {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  size?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  };

  return (
    <span
      ref={ref}
      className={`inline-flex items-center cursor-help relative ${className}`}
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShow(true);
      }}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(() => setShow(false), 150);
      }}
      onClick={(e) => { e.stopPropagation(); setShow((v) => !v); }}
    >
      <HelpCircle
        size={size}
        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 pointer-events-none"
            style={{
              ...positionStyles[position],
              width: "max-content",
              maxWidth: 280,
            }}
          >
            <div
              className="px-3 py-2 rounded-lg text-[11px] leading-relaxed font-normal shadow-lg border"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  RAG Legend — small inline legend for RAG status dots                */
/* ------------------------------------------------------------------ */

function RAGLegend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RAG_COLORS.green }} />
        <span>On Track</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RAG_COLORS.amber }} />
        <span>At Risk</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RAG_COLORS.red }} />
        <span>Critical</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const analyticsPages = [
  { label: "Executive Overview", href: "/dashboard/analytics" },
  { label: "Portfolio", href: "/dashboard/analytics/portfolio" },
  { label: "Projects", href: "/dashboard/analytics/projects" },
  { label: "Risks & Issues", href: "/dashboard/analytics/risks" },
  { label: "Resources", href: "/dashboard/analytics/resources" },
  { label: "Governance", href: "/dashboard/analytics/governance" },
  { label: "Office Analytics", href: "/dashboard/analytics/offices", active: true },
  { label: "Collaboration", href: "/dashboard/analytics/collaboration" },
];

const OFFICES = [
  { id: "4493b788-602f-e1a7-ab04-3058bbe61ff4", name: "Business Intelligence Services", code: "BISO", color: "#3B82F6", bgColor: "rgba(59,130,246,0.1)" },
  { id: "db40aa8c-dc75-1e84-8fc9-ef0f59c80a90", name: "Collaboration Services", code: "CSO", color: "#8B5CF6", bgColor: "rgba(139,92,246,0.1)" },
  { id: "c22d15fd-f6f0-a86a-d541-f4cd13051094", name: "Financial Surveillance Services", code: "FSSO", color: "#F59E0B", bgColor: "rgba(245,158,11,0.1)" },
  { id: "2464f477-fd51-01ff-2cfc-edc0846be881", name: "Internal Support Services", code: "ISSO", color: "#06B6D4", bgColor: "rgba(6,182,212,0.1)" },
  { id: "2a5f2e13-d303-1895-16e1-1b048c9d791d", name: "Payment & Operations Services", code: "POSO", color: "#22C55E", bgColor: "rgba(34,197,94,0.1)" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  proposed: "#9CA3AF", active: "#3B82F6", "in-development": "#8B5CF6",
  implementation: "#06B6D4", completed: "#22C55E", cancelled: "#EF4444",
  "on-hold": "#F97316", "kick-off": "#14B8A6", "project-mode": "#6366F1",
  "requirement-management": "#EC4899", "solution-architecture": "#A855F7",
};

const RAG_COLORS = { green: "#22C55E", amber: "#F59E0B", red: "#EF4444" };

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OfficeMetrics {
  id: string;
  name: string;
  code: string;
  color: string;
  bgColor: string;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  proposedProjects: number;
  avgCompletion: number;
  budgetApproved: number;
  budgetSpent: number;
  budgetUtilization: number;
  ragGreen: number;
  ragAmber: number;
  ragRed: number;
  onTimePct: number;
  openRisks: number;
  healthScore: number;
  statusBreakdown: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Computation helpers                                                */
/* ------------------------------------------------------------------ */

function computeOfficeMetrics(
  projects: Project[],
  risks: Risk[],
): OfficeMetrics[] {
  // Build project-to-division lookup for risk association
  const projectDivisionMap: Record<string, string> = {};
  for (const p of projects) {
    if (p.divisionId) projectDivisionMap[p.id] = p.divisionId;
  }

  return OFFICES.map((office) => {
    const officeProjects = projects.filter((p) => p.divisionId === office.id);
    const total = officeProjects.length;
    const activeProjects = officeProjects.filter((p) =>
      ["active", "in-development", "implementation", "kick-off", "project-mode", "requirement-management", "solution-architecture"].includes(p.status),
    ).length;
    const completedProjects = officeProjects.filter((p) => p.status === "completed").length;
    const proposedProjects = officeProjects.filter((p) => p.status === "proposed").length;

    const avgCompletion = total > 0
      ? Math.round(officeProjects.reduce((s, p) => s + (p.completionPct || 0), 0) / total)
      : 0;

    const budgetApproved = officeProjects.reduce((s, p) => s + (p.budgetApproved || 0), 0);
    const budgetSpent = officeProjects.reduce((s, p) => s + (p.budgetSpent || 0), 0);
    const budgetUtilization = budgetApproved > 0 ? Math.round((budgetSpent / budgetApproved) * 100) : 0;

    let ragGreen = 0, ragAmber = 0, ragRed = 0;
    for (const p of officeProjects) {
      const rag = (p.ragStatus || "").toLowerCase();
      if (rag === "green") ragGreen++;
      else if (rag === "amber") ragAmber++;
      else if (rag === "red") ragRed++;
    }

    // On-time: projects with plannedEnd set where actualEnd <= plannedEnd or still in progress before plannedEnd
    const projectsWithDeadline = officeProjects.filter((p) => p.plannedEnd);
    let onTimeCount = 0;
    const now = new Date().toISOString().slice(0, 10);
    for (const p of projectsWithDeadline) {
      if (p.status === "completed" && p.actualEnd && p.plannedEnd) {
        if (p.actualEnd <= p.plannedEnd) onTimeCount++;
      } else if (p.status !== "completed" && p.status !== "cancelled" && p.plannedEnd) {
        if (now <= p.plannedEnd) onTimeCount++;
      }
    }
    const onTimePct = projectsWithDeadline.length > 0
      ? Math.round((onTimeCount / projectsWithDeadline.length) * 100)
      : 100;

    // Risks associated with this office's projects
    const officeProjectIds = new Set(officeProjects.map((p) => p.id));
    const officeRisks = risks.filter((r) => r.projectId && officeProjectIds.has(r.projectId));
    const openRisks = officeRisks.filter((r) => r.status === "open").length;

    // Status breakdown for stacked bars
    const statusBreakdown: Record<string, number> = {};
    for (const p of officeProjects) {
      const s = p.status || "unknown";
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }

    // Composite health score: weighted avg
    // - avgCompletion (30%)
    // - budgetEfficiency (20%): penalise if over 100%
    // - onTimePct (20%)
    // - ragHealth (20%): % of green projects
    // - riskScore (10%): fewer risks = higher score
    const ragHealth = total > 0 ? (ragGreen / total) * 100 : 100;
    const budgetEfficiency = budgetUtilization > 100 ? Math.max(0, 200 - budgetUtilization) : 100;
    const riskScore = total > 0 ? Math.max(0, 100 - (openRisks / total) * 50) : 100;
    const healthScore = Math.round(
      avgCompletion * 0.3 +
      budgetEfficiency * 0.2 +
      onTimePct * 0.2 +
      ragHealth * 0.2 +
      riskScore * 0.1,
    );

    return {
      id: office.id,
      name: office.name,
      code: office.code,
      color: office.color,
      bgColor: office.bgColor,
      totalProjects: total,
      activeProjects,
      completedProjects,
      proposedProjects,
      avgCompletion,
      budgetApproved,
      budgetSpent,
      budgetUtilization,
      ragGreen,
      ragAmber,
      ragRed,
      onTimePct,
      openRisks,
      healthScore,
      statusBreakdown,
    };
  });
}

function computeProjectsByOfficeStacked(metrics: OfficeMetrics[]) {
  const allStatuses = new Set<string>();
  for (const m of metrics) {
    for (const s of Object.keys(m.statusBreakdown)) allStatuses.add(s);
  }
  const statusList = Array.from(allStatuses).sort();
  const data = metrics.map((m) => {
    const row: Record<string, string | number> = { name: m.code };
    for (const s of statusList) row[s] = m.statusBreakdown[s] || 0;
    return row;
  });
  return { data, categories: statusList };
}

function computeRadarData(metrics: OfficeMetrics[]) {
  const axes = ["Projects", "Completion%", "Budget Used%", "On-Time%", "Low Risk%", "RAG Green%"];
  const maxProjects = Math.max(...metrics.map((m) => m.totalProjects), 1);

  return axes.map((axis) => {
    const row: Record<string, string | number> = { subject: axis };
    for (const m of metrics) {
      let val = 0;
      switch (axis) {
        case "Projects":
          val = Math.round((m.totalProjects / maxProjects) * 100);
          break;
        case "Completion%":
          val = m.avgCompletion;
          break;
        case "Budget Used%":
          val = Math.min(100, m.budgetUtilization);
          break;
        case "On-Time%":
          val = m.onTimePct;
          break;
        case "Low Risk%":
          val = m.totalProjects > 0 ? Math.max(0, Math.round(100 - (m.openRisks / m.totalProjects) * 100)) : 100;
          break;
        case "RAG Green%":
          val = m.totalProjects > 0 ? Math.round((m.ragGreen / m.totalProjects) * 100) : 0;
          break;
      }
      row[m.code] = val;
    }
    return row;
  });
}

function computeCompletionDistribution(metrics: OfficeMetrics[], projects: Project[]) {
  const ranges = ["0-25%", "26-50%", "51-75%", "76-100%"];
  const data = metrics.map((m) => {
    const officeProjects = projects.filter((p) => p.divisionId === m.id);
    let r1 = 0, r2 = 0, r3 = 0, r4 = 0;
    for (const p of officeProjects) {
      const c = p.completionPct || 0;
      if (c <= 25) r1++;
      else if (c <= 50) r2++;
      else if (c <= 75) r3++;
      else r4++;
    }
    const row: Record<string, string | number> = {
      name: m.code,
      "0-25%": r1,
      "26-50%": r2,
      "51-75%": r3,
      "76-100%": r4,
    };
    return row;
  });
  return { data, categories: ranges };
}

function computeBudgetByOffice(metrics: OfficeMetrics[]) {
  const data = metrics.map((m) => ({
    name: m.code,
    Approved: Math.round(m.budgetApproved / 1e3),
    Spent: Math.round(m.budgetSpent / 1e3),
    Remaining: Math.round(Math.max(0, m.budgetApproved - m.budgetSpent) / 1e3),
  }));
  return { data, categories: ["Approved", "Spent", "Remaining"] };
}

function formatCurrency(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OfficeAnalyticsPage() {
  const { data: projectsRaw, isLoading: projectsLoading } = useProjects(1, 200);
  const { data: risksRaw, isLoading: risksLoading } = useRisks(1, 200);

  // Normalise paginated / array responses
  const projects = useMemo<Project[]>(() => {
    if (!projectsRaw) return [];
    if (Array.isArray(projectsRaw)) return projectsRaw;
    if ("data" in projectsRaw && Array.isArray((projectsRaw as { data: Project[] }).data))
      return (projectsRaw as { data: Project[] }).data;
    return [];
  }, [projectsRaw]);

  const risks = useMemo<Risk[]>(() => {
    if (!risksRaw) return [];
    if (Array.isArray(risksRaw)) return risksRaw;
    if ("data" in risksRaw && Array.isArray((risksRaw as { data: Risk[] }).data))
      return (risksRaw as { data: Risk[] }).data;
    return [];
  }, [risksRaw]);

  const anyLoading = projectsLoading || risksLoading;

  // Computed aggregations
  const officeMetrics = useMemo(
    () => computeOfficeMetrics(projects, risks),
    [projects, risks],
  );

  const projectsByOfficeStacked = useMemo(
    () => computeProjectsByOfficeStacked(officeMetrics),
    [officeMetrics],
  );

  const radarData = useMemo(
    () => computeRadarData(officeMetrics),
    [officeMetrics],
  );

  const completionDistribution = useMemo(
    () => computeCompletionDistribution(officeMetrics, projects),
    [officeMetrics, projects],
  );

  const budgetByOffice = useMemo(
    () => computeBudgetByOffice(officeMetrics),
    [officeMetrics],
  );

  const radarDataKeys = useMemo(
    () => OFFICES.map((o) => ({ key: o.code, label: o.code, color: o.color, fillOpacity: 0.12 })),
    [],
  );

  // Overall summary KPIs
  const totalProjectsAllOffices = officeMetrics.reduce((s, m) => s + m.totalProjects, 0);
  const totalActiveAllOffices = officeMetrics.reduce((s, m) => s + m.activeProjects, 0);
  const avgCompletionAll = totalProjectsAllOffices > 0
    ? Math.round(officeMetrics.reduce((s, m) => s + m.avgCompletion * m.totalProjects, 0) / totalProjectsAllOffices)
    : 0;
  const avgHealthAll = officeMetrics.length > 0
    ? Math.round(officeMetrics.reduce((s, m) => s + m.healthScore, 0) / officeMetrics.length)
    : 0;
  const totalBudgetAll = officeMetrics.reduce((s, m) => s + m.budgetApproved, 0);
  const totalSpentAll = officeMetrics.reduce((s, m) => s + m.budgetSpent, 0);

  // Ranked offices by health score
  const rankedOffices = useMemo(
    () => [...officeMetrics].sort((a, b) => b.healthScore - a.healthScore),
    [officeMetrics],
  );

  const kpis: Array<{
    label: string; value: number | string | undefined; icon: LucideIcon;
    color: string; bgColor: string; suffix?: string; subtitle?: string; href?: string; hint?: string;
  }> = [
    {
      label: "Offices Tracked", value: anyLoading ? undefined : OFFICES.length,
      icon: Building2, color: "#1B7340", bgColor: "rgba(27,115,64,0.1)",
      subtitle: `${totalActiveAllOffices} active projects`,
      hint: "Number of ITD service offices being monitored. Each office manages a portfolio of projects.",
    },
    {
      label: "Total Projects", value: anyLoading ? undefined : totalProjectsAllOffices,
      icon: FolderKanban, color: "#3B82F6", bgColor: "rgba(59,130,246,0.1)",
      subtitle: `Across all offices`,
      href: "/dashboard/planning/projects",
      hint: "Sum of all projects across every office, regardless of status. Click to view the full project list.",
    },
    {
      label: "Avg Completion", value: anyLoading ? undefined : avgCompletionAll,
      icon: Activity, color: "#8B5CF6", bgColor: "rgba(139,92,246,0.1)", suffix: "%",
      href: "/dashboard/planning/projects",
      hint: "Weighted average completion percentage across all offices. Higher is better — 100% means all projects are finished.",
    },
    {
      label: "Avg Health Score", value: anyLoading ? undefined : avgHealthAll,
      icon: TrendingUp, color: "#22C55E", bgColor: "rgba(34,197,94,0.1)", suffix: "/100",
      hint: "Composite score (0-100) averaging: Completion 30%, Budget Efficiency 20%, On-Time Delivery 20%, RAG Status 20%, Risk Score 10%.",
    },
    {
      label: "Total Budget", value: anyLoading ? undefined : formatCurrency(totalBudgetAll),
      icon: DollarSign, color: "#F59E0B", bgColor: "rgba(245,158,11,0.1)",
      subtitle: totalBudgetAll > 0 ? `${Math.round((totalSpentAll / totalBudgetAll) * 100)}% utilised` : undefined,
      href: "/dashboard/planning/projects",
      hint: "Total approved budget across all offices. Utilisation shows the percentage spent so far — above 100% indicates overspend.",
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(27,115,64,0.1)" }}>
            <Building2 size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Office-Level Analytics
            </h1>
            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
              Performance, activity, delivery, and workload across all service offices
              <InfoHint
                text="This dashboard compares all 5 service offices side-by-side. Hover over the question mark icons throughout the page for explanations of each metric and chart."
                position="right"
                size={15}
              />
            </p>
          </div>
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              page.active ? "text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"}`}
            style={page.active ? { backgroundColor: "#1B7340" } : undefined}>
            {page.label}
          </Link>
        ))}
      </motion.div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi, index) => (
          <div key={kpi.label} className="relative">
            <KPIStatCard {...kpi} isLoading={anyLoading} index={index} />
            {kpi.hint && (
              <span className="absolute top-2 right-2">
                <InfoHint text={kpi.hint} position="bottom" size={13} />
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Row 1 — Office KPI Cards */}
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Office Breakdown</span>
        <InfoHint
          text="Each card shows one office's project count, average completion (ring), and RAG status indicators. The colored left border identifies the office."
          position="right"
          size={13}
        />
        <span className="mx-1 text-[var(--border)]">|</span>
        <RAGLegend />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {officeMetrics.map((office, index) => (
          <motion.div
            key={office.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 + index * 0.05 }}
            className="rounded-xl border p-4 relative overflow-hidden"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              borderLeftWidth: 3,
              borderLeftColor: office.color,
            }}
          >
            {anyLoading ? (
              <div className="space-y-3">
                <div className="h-4 w-16 rounded bg-[var(--surface-2)] animate-pulse" />
                <div className="h-8 w-12 rounded bg-[var(--surface-2)] animate-pulse" />
                <div className="h-3 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: office.color }}
                  >
                    {office.code}
                  </span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: office.bgColor,
                      color: office.color,
                    }}
                  >
                    {office.activeProjects} active
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                      {office.totalProjects}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">projects</p>
                  </div>
                  <ProgressRing
                    value={office.avgCompletion}
                    size={48}
                    strokeWidth={5}
                    color={office.color}
                    delay={0.3 + index * 0.05}
                    fontSize={11}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RAG_COLORS.green }} />
                    <span className="text-[9px] text-[var(--text-muted)]">{office.ragGreen}</span>
                  </div>
                  <div className="flex gap-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RAG_COLORS.amber }} />
                    <span className="text-[9px] text-[var(--text-muted)]">{office.ragAmber}</span>
                  </div>
                  <div className="flex gap-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RAG_COLORS.red }} />
                    <span className="text-[9px] text-[var(--text-muted)]">{office.ragRed}</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Row 2 — Office Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Projects per Office" subtitle="Status distribution by office" delay={0.2}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Each bar segment represents a project status. Wider segments mean more projects in that status.
            </span>
          </div>
          {anyLoading
            ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <StackedBarChart
                data={projectsByOfficeStacked.data}
                categories={projectsByOfficeStacked.categories}
                height={280}
                layout="vertical"
                colors={Object.values(STATUS_COLORS)}
              />}
        </ChartCard>

        <ChartCard title="Office Performance Radar" subtitle="Multi-axis comparison across 6 dimensions" delay={0.25}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Larger shapes indicate stronger performance. Compare offices by how far each axis extends outward (0-100 scale).
            </span>
          </div>
          {anyLoading
            ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <RadarChart
                data={radarData}
                dataKeys={radarDataKeys}
                angleKey="subject"
                height={280}
                showLegend
                domain={[0, 100]}
              />}
        </ChartCard>
      </div>

      {/* Row 3 — Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Completion Distribution by Office" subtitle="Grouped by completion ranges" delay={0.3}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Shows how many projects fall into each completion bracket. More green (76-100%) segments indicate healthier delivery.
            </span>
          </div>
          {anyLoading
            ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <StackedBarChart
                data={completionDistribution.data}
                categories={completionDistribution.categories}
                height={280}
                layout="vertical"
                colors={["#EF4444", "#F59E0B", "#3B82F6", "#22C55E"]}
              />}
        </ChartCard>

        <ChartCard title="Budget Utilization by Office" subtitle="Approved vs Spent vs Remaining (in K)" delay={0.35}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Budget values in thousands (K). If Spent exceeds Approved, the office is over budget. Remaining shows unspent funds.
            </span>
          </div>
          {anyLoading
            ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <StackedBarChart
                data={budgetByOffice.data}
                categories={budgetByOffice.categories}
                height={280}
                layout="vertical"
                colors={["#3B82F6", "#F59E0B", "#22C55E"]}
              />}
        </ChartCard>
      </div>

      {/* Row 4 — Office Health Table */}
      <ChartCard title="Office Health Summary" subtitle="Comprehensive performance metrics per office" delay={0.4}>
        <div className="flex items-center gap-1.5 mb-3">
          <Info size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">
            Health score formula: Completion (30%) + Budget Efficiency (20%) + On-Time (20%) + RAG Green % (20%) + Low Risk (10%). Scores above 70 are green, 40-69 amber, below 40 red.
          </span>
        </div>
        {anyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            ))}
          </div>
        ) : officeMetrics.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-8">No office data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {[
                    { label: "Office", hint: "Service office name and code" },
                    { label: "Total", hint: "Total number of projects in this office" },
                    { label: "Active", hint: "Projects currently in progress (active, in-development, implementation, etc.)" },
                    { label: "Done", hint: "Projects with 'completed' status" },
                    { label: "Avg %", hint: "Average completion percentage across all projects in this office" },
                    { label: "Budget Approved", hint: "Total approved budget allocated to this office's projects" },
                    { label: "Budget Spent", hint: "Total amount spent so far across all projects" },
                    { label: "RAG", hint: "Red-Amber-Green status counts: Green = on track, Amber = at risk, Red = critical issues" },
                    { label: "Risks", hint: "Number of currently open risks across the office's projects" },
                    { label: "Health", hint: "Composite score (0-100) based on completion, budget, timeliness, RAG, and risk factors" },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className="text-left py-2.5 px-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-1">
                        {h.label}
                        <InfoHint text={h.hint} position="bottom" size={11} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {officeMetrics.map((m) => {
                  const healthColor = m.healthScore >= 70 ? "#22C55E" : m.healthScore >= 40 ? "#F59E0B" : "#EF4444";
                  return (
                    <tr
                      key={m.id}
                      className="border-b hover:bg-[var(--surface-1)] transition-colors"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: m.color }}
                          />
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">{m.code}</span>
                            <p className="text-[9px] text-[var(--text-muted)] leading-tight max-w-[140px] truncate">
                              {m.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold tabular-nums text-[var(--text-primary)]">
                        {m.totalProjects}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-[var(--text-secondary)]">
                        {m.activeProjects}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-[var(--text-secondary)]">
                        {m.completedProjects}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <ProgressRing
                            value={m.avgCompletion}
                            size={28}
                            strokeWidth={3}
                            color={m.color}
                            delay={0}
                            fontSize={8}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-[var(--text-secondary)]">
                        {formatCurrency(m.budgetApproved)}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-[var(--text-secondary)]">
                        {formatCurrency(m.budgetSpent)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span
                            className="inline-flex items-center justify-center w-5 h-4 rounded text-[9px] font-bold text-white"
                            style={{ backgroundColor: RAG_COLORS.green }}
                          >
                            {m.ragGreen}
                          </span>
                          <span
                            className="inline-flex items-center justify-center w-5 h-4 rounded text-[9px] font-bold text-white"
                            style={{ backgroundColor: RAG_COLORS.amber }}
                          >
                            {m.ragAmber}
                          </span>
                          <span
                            className="inline-flex items-center justify-center w-5 h-4 rounded text-[9px] font-bold text-white"
                            style={{ backgroundColor: RAG_COLORS.red }}
                          >
                            {m.ragRed}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-[var(--text-secondary)]">
                        {m.openRisks}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="inline-flex items-center justify-center w-10 h-6 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: healthColor }}
                        >
                          {m.healthScore}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Row 5 — Office Ranking */}
      <ChartCard title="Office Ranking" subtitle="Ranked by composite health score (0-100)" delay={0.5}>
        <div className="flex items-center gap-1.5 mb-3">
          <Info size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">
            Offices ranked from highest to lowest health score. Bar length and color indicate relative performance — office color means healthy (70+), amber means moderate (40-69), red means attention needed (&lt;40).
          </span>
        </div>
        {anyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            ))}
          </div>
        ) : rankedOffices.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-8">No data available</p>
        ) : (
          <div className="space-y-3">
            {rankedOffices.map((office, index) => {
              const barColor = office.healthScore >= 70
                ? office.color
                : office.healthScore >= 40
                  ? "#F59E0B"
                  : "#EF4444";
              return (
                <motion.div
                  key={office.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.55 + index * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs font-bold text-[var(--text-muted)] w-5 text-right">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: office.color }}
                    />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{office.code}</span>
                  </div>
                  <div className="flex-1 relative">
                    <div
                      className="h-7 rounded-md"
                      style={{ backgroundColor: "var(--surface-2)" }}
                    >
                      <motion.div
                        className="h-7 rounded-md flex items-center justify-end pr-2"
                        style={{ backgroundColor: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(office.healthScore, 3)}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + index * 0.06, ease: "easeOut" }}
                      >
                        <span className="text-[10px] font-bold text-white tabular-nums">
                          {office.healthScore}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] w-48 flex-shrink-0">
                    <span>{office.totalProjects} proj</span>
                    <span>{office.avgCompletion}% done</span>
                    <span>{office.budgetUtilization}% budget</span>
                    <span>{office.openRisks} risks</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
