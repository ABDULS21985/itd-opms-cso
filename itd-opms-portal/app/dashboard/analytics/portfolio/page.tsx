"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  ChevronDown,
  Info,
  AlertTriangle,
  Flag,
  CalendarCheck,
  Building2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  XCircle,
  Timer,
  Milestone as MilestoneIcon,
} from "lucide-react";
import { InfoHint } from "@/components/shared/info-hint";
import {
  usePortfolios,
  usePortfolioAnalytics,
  useProjects,
  usePortfolioTimeline,
  useRisks,
  useMilestones,
} from "@/hooks/use-planning";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  RadarChart,
  GaugeChart,
  HeatMapGrid,
  StackedBarChart,
} from "@/components/dashboard/charts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Project, Portfolio, PortfolioTimelineItem, Risk, PlanningMilestone } from "@/types";

const analyticsPages = [
  { label: "Executive Overview", href: "/dashboard/analytics" },
  { label: "Portfolio", href: "/dashboard/analytics/portfolio", active: true },
  { label: "Projects", href: "/dashboard/analytics/projects" },
  { label: "Risks & Issues", href: "/dashboard/analytics/risks" },
  { label: "Resources", href: "/dashboard/analytics/resources" },
  { label: "Governance", href: "/dashboard/analytics/governance" },
  { label: "Office Analytics", href: "/dashboard/analytics/offices" },
  { label: "Collaboration", href: "/dashboard/analytics/collaboration" },
];

const RAG_COLORS: Record<string, string> = {
  green: "#22C55E", amber: "#F59E0B", red: "#EF4444",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "#8B5CF6",
  active: "#3B82F6",
  on_hold: "#F59E0B",
  completed: "#22C55E",
  cancelled: "#EF4444",
  draft: "#9CA3AF",
  approved: "#06B6D4",
  in_progress: "#3B82F6",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#22C55E",
};

const LIKELIHOOD_LABELS = ["Very Low", "Low", "Medium", "High", "Very High"];
const IMPACT_LABELS = ["Negligible", "Minor", "Moderate", "Major", "Severe"];

export default function PortfolioAnalyticsPage() {
  const { data: portfoliosRaw, isLoading: portfoliosLoading } = usePortfolios(1, 50);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");

  const portfolios = useMemo<Portfolio[]>(() => {
    if (!portfoliosRaw) return [];
    if (Array.isArray(portfoliosRaw)) return portfoliosRaw;
    if ("data" in portfoliosRaw) return (portfoliosRaw as { data: Portfolio[] }).data || [];
    return [];
  }, [portfoliosRaw]);

  useEffect(() => {
    if (!selectedPortfolioId && portfolios.length > 0) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId]);

  const activePortfolioId = selectedPortfolioId || undefined;

  const { data: analytics, isLoading: analyticsLoading } = usePortfolioAnalytics(activePortfolioId);
  const { data: projectsRaw, isLoading: projectsLoading } = useProjects(1, 200, activePortfolioId);
  const { data: timelineRaw, isLoading: timelineLoading } = usePortfolioTimeline(activePortfolioId);
  const { data: risksRaw, isLoading: risksLoading } = useRisks(1, 200);
  const { data: milestonesRaw, isLoading: milestonesLoading } = useMilestones();

  const projects = useMemo<Project[]>(() => {
    if (!projectsRaw) return [];
    if (Array.isArray(projectsRaw)) return projectsRaw;
    if ("data" in projectsRaw) return (projectsRaw as { data: Project[] }).data || [];
    return [];
  }, [projectsRaw]);

  const timeline = useMemo<PortfolioTimelineItem[]>(() => {
    if (!timelineRaw) return [];
    if (Array.isArray(timelineRaw)) return timelineRaw;
    if ("data" in (timelineRaw as object)) return ((timelineRaw as { data: PortfolioTimelineItem[] }).data) || [];
    return [];
  }, [timelineRaw]);

  const risks = useMemo<Risk[]>(() => {
    if (!risksRaw) return [];
    if (Array.isArray(risksRaw)) return risksRaw;
    if ("data" in (risksRaw as object)) return ((risksRaw as { data: Risk[] }).data) || [];
    return [];
  }, [risksRaw]);

  const milestones = useMemo<PlanningMilestone[]>(() => {
    if (!milestonesRaw) return [];
    if (Array.isArray(milestonesRaw)) return milestonesRaw;
    if ("data" in (milestonesRaw as object)) return ((milestonesRaw as { data: PlanningMilestone[] }).data) || [];
    return [];
  }, [milestonesRaw]);

  const isLoading = portfoliosLoading || analyticsLoading || projectsLoading;

  /* ─── Derived Data: Existing Charts ─── */

  const ragDonut = useMemo(() => {
    if (!analytics?.ragSummary) return [];
    return Object.entries(analytics.ragSummary).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: RAG_COLORS[name.toLowerCase()] || "#9CA3AF",
    }));
  }, [analytics]);

  const budgetComparison = useMemo(() => {
    return projects
      .filter((p) => (p.budgetApproved || 0) > 0)
      .sort((a, b) => (b.budgetApproved || 0) - (a.budgetApproved || 0))
      .slice(0, 10)
      .map((p) => ({
        name: p.code || p.title.substring(0, 15),
        Approved: p.budgetApproved || 0,
        Spent: p.budgetSpent || 0,
      }));
  }, [projects]);

  const radarData = useMemo(() => {
    if (!analytics) return [];
    const budgetHealth = analytics.totalBudgetApproved > 0
      ? Math.min(100, Math.round((1 - (analytics.totalBudgetSpent / analytics.totalBudgetApproved - 1)) * 100))
      : 50;
    return [
      { subject: "Schedule", score: analytics.onTimeDeliveryPct || 0 },
      { subject: "Budget", score: Math.max(0, budgetHealth) },
      { subject: "Completion", score: analytics.avgCompletionPct || 0 },
      { subject: "Quality", score: analytics.ragSummary?.green
        ? Math.round((analytics.ragSummary.green / Math.max(analytics.totalProjects, 1)) * 100) : 50 },
      { subject: "Risk Mgmt", score: 100 - (analytics.ragSummary?.red
        ? Math.round((analytics.ragSummary.red / Math.max(analytics.totalProjects, 1)) * 100) : 0) },
      { subject: "Scope", score: analytics.avgCompletionPct || 50 },
    ];
  }, [analytics]);

  const projectProgress = useMemo(() => {
    return [...projects]
      .sort((a, b) => (b.completionPct || 0) - (a.completionPct || 0))
      .slice(0, 12);
  }, [projects]);

  /* ─── Derived Data: NEW Charts ─── */

  // 1. Budget Burn-Down Gauge
  const budgetBurnPct = useMemo(() => {
    if (!analytics || analytics.totalBudgetApproved <= 0) return 0;
    return Math.round((analytics.totalBudgetSpent / analytics.totalBudgetApproved) * 100);
  }, [analytics]);

  // 2. Timeline / Gantt strip
  const ganttData = useMemo(() => {
    if (!timeline.length && !projects.length) return [];
    const items = timeline.length ? timeline : projects;
    const now = new Date();
    return items
      .filter((t) => t.plannedStart && t.plannedEnd)
      .sort((a, b) => new Date(a.plannedStart!).getTime() - new Date(b.plannedStart!).getTime())
      .slice(0, 15)
      .map((t) => {
        const start = new Date(t.plannedStart!);
        const end = new Date(t.plannedEnd!);
        const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
        const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
        const timeProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
        return {
          id: t.id,
          title: ("code" in t ? (t as PortfolioTimelineItem).code : "") || t.title?.substring(0, 20) || "Untitled",
          start,
          end,
          completionPct: ("completionPct" in t ? (t as PortfolioTimelineItem).completionPct : (t as Project).completionPct) || 0,
          ragStatus: ("ragStatus" in t ? (t as PortfolioTimelineItem | Project).ragStatus : "green") || "green",
          timeProgress,
          status: ("status" in t ? (t as PortfolioTimelineItem | Project).status : "") || "",
        };
      });
  }, [timeline, projects]);

  const ganttRange = useMemo(() => {
    if (!ganttData.length) return { min: new Date(), max: new Date(), span: 1 };
    const min = ganttData.reduce((m, d) => (d.start < m ? d.start : m), ganttData[0].start);
    const max = ganttData.reduce((m, d) => (d.end > m ? d.end : m), ganttData[0].end);
    return { min, max, span: Math.max(1, (max.getTime() - min.getTime()) / 86400000) };
  }, [ganttData]);

  // 3. Risk Heat Map
  const riskHeatMap = useMemo(() => {
    const likelihoodMap: Record<string, number> = { very_low: 0, low: 1, medium: 2, high: 3, very_high: 4 };
    const impactMap: Record<string, number> = { negligible: 0, minor: 1, moderate: 2, major: 3, severe: 4, critical: 4 };

    const cells: { row: number; col: number; value: number; items: { id: string; title: string }[] }[] = [];
    const grid: Record<string, { id: string; title: string }[]> = {};

    risks.forEach((r) => {
      const row = likelihoodMap[r.likelihood?.toLowerCase?.() || ""] ?? 2;
      const col = impactMap[r.impact?.toLowerCase?.() || ""] ?? 2;
      const key = `${row}-${col}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push({ id: r.id, title: r.title });
    });

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const items = grid[`${row}-${col}`] || [];
        cells.push({ row, col, value: items.length, items });
      }
    }
    return cells;
  }, [risks]);

  // 4. Milestone tracker
  const milestoneData = useMemo(() => {
    const now = new Date();
    const sorted = [...milestones]
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

    const overdue = sorted.filter((m) =>
      !m.actualDate && new Date(m.targetDate) < now && m.status !== "completed"
    );
    const upcoming = sorted.filter((m) =>
      !m.actualDate && new Date(m.targetDate) >= now && m.status !== "completed"
    ).slice(0, 8);
    const completed = sorted.filter((m) => m.status === "completed").slice(-5);

    return { overdue, upcoming, completed, total: milestones.length };
  }, [milestones]);

  // 5. Project Status Breakdown
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      const s = p.status?.toLowerCase() || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
        color: STATUS_COLORS[name] || "#9CA3AF",
      }));
  }, [projects]);

  // 6a. Office Allocation (by portfolioName)
  const officeAllocation = useMemo(() => {
    const groups: Record<string, { count: number; budget: number }> = {};
    projects.forEach((p) => {
      const office = p.portfolioName || "Unassigned";
      if (!groups[office]) groups[office] = { count: 0, budget: 0 };
      groups[office].count += 1;
      groups[office].budget += p.budgetApproved || 0;
    });
    return Object.entries(groups)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, data]) => ({
        name: name.length > 18 ? name.substring(0, 16) + "…" : name,
        Projects: data.count,
        Budget: data.budget,
      }));
  }, [projects]);

  // 6b. Division Allocation (by divisionName)
  const divisionAllocation = useMemo(() => {
    const groups: Record<string, { count: number; budget: number }> = {};
    projects.forEach((p) => {
      const div = p.divisionName || "Unassigned";
      if (!groups[div]) groups[div] = { count: 0, budget: 0 };
      groups[div].count += 1;
      groups[div].budget += p.budgetApproved || 0;
    });
    return Object.entries(groups)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, data]) => ({
        name: name.length > 18 ? name.substring(0, 16) + "…" : name,
        Projects: data.count,
        Budget: data.budget,
      }));
  }, [projects]);

  // 7. Priority Distribution
  const priorityDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      const pr = p.priority?.toLowerCase() || "medium";
      counts[pr] = (counts[pr] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => {
        const order = ["critical", "high", "medium", "low"];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      })
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: PRIORITY_COLORS[name] || "#9CA3AF",
      }));
  }, [projects]);

  // 8. Schedule Variance
  const scheduleVariance = useMemo(() => {
    return projects
      .filter((p) => p.plannedEnd)
      .map((p) => {
        const planned = new Date(p.plannedEnd!);
        const actual = p.actualEnd ? new Date(p.actualEnd) : new Date();
        const varianceDays = Math.round((actual.getTime() - planned.getTime()) / 86400000);
        return {
          id: p.id,
          code: p.code || p.title.substring(0, 20),
          title: p.title,
          plannedEnd: p.plannedEnd,
          actualEnd: p.actualEnd,
          varianceDays,
          status: p.status,
          completionPct: p.completionPct || 0,
          ragStatus: p.ragStatus,
        };
      })
      .sort((a, b) => b.varianceDays - a.varianceDays)
      .slice(0, 12);
  }, [projects]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
              <Briefcase size={20} style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Portfolio Analytics
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Strategic portfolio performance and project alignment
              </p>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="appearance-none text-sm rounded-lg border px-4 py-2 pr-8 outline-none"
              style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <option value="">All Portfolios</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (FY{p.fiscalYear})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
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
            style={page.active ? { backgroundColor: "#3B82F6" } : undefined}>
            {page.label}
          </Link>
        ))}
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="relative">
          <KPIStatCard label="Total Projects" value={isLoading ? undefined : analytics?.totalProjects ?? projects.length}
            icon={Briefcase} color="#1B7340" bgColor="rgba(27,115,64,0.1)" isLoading={isLoading} index={0}
            href="/dashboard/planning/projects" />
          <span className="absolute top-2 right-2"><InfoHint text="Total number of projects in the selected portfolio." position="bottom" size={13} /></span>
        </div>
        <div className="relative">
          <KPIStatCard label="Active Projects" value={isLoading ? undefined : analytics?.activeProjects ?? 0}
            icon={TrendingUp} color="#3B82F6" bgColor="rgba(59,130,246,0.1)" isLoading={isLoading} index={1}
            subtitle={analytics ? `${analytics.completedProjects} completed` : undefined}
            href="/dashboard/planning/projects" />
          <span className="absolute top-2 right-2"><InfoHint text="Projects currently in progress. Subtitle shows completed count." position="bottom" size={13} /></span>
        </div>
        <div className="relative">
          <KPIStatCard label="Total Budget" value={isLoading ? undefined : `${((analytics?.totalBudgetApproved || 0) / 1e6).toFixed(1)}M`}
            icon={DollarSign} color="#8B5CF6" bgColor="rgba(139,92,246,0.1)" isLoading={isLoading} index={2}
            href="/dashboard/planning/portfolios" />
          <span className="absolute top-2 right-2"><InfoHint text="Total approved budget across all projects, shown in millions." position="bottom" size={13} /></span>
        </div>
        <div className="relative">
          <KPIStatCard label="Avg Completion" value={isLoading ? undefined : Math.round(analytics?.avgCompletionPct ?? 0)}
            icon={Target} color="#22C55E" bgColor="rgba(34,197,94,0.1)" isLoading={isLoading} index={3} suffix="%"
            href="/dashboard/planning/projects" />
          <span className="absolute top-2 right-2"><InfoHint text="Average completion percentage across portfolio projects." position="bottom" size={13} /></span>
        </div>
        <div className="relative">
          <KPIStatCard label="On-Time Delivery" value={isLoading ? undefined : analytics?.onTimeDeliveryPct ?? 0}
            icon={Clock} color="#06B6D4" bgColor="rgba(6,182,212,0.1)" isLoading={isLoading} index={4} suffix="%"
            href="/dashboard/planning/milestones" />
          <span className="absolute top-2 right-2"><InfoHint text="Percentage of milestones delivered on or before target dates." position="bottom" size={13} /></span>
        </div>
      </div>

      {/* ═══ Section 1: Budget Gauge + Health Radar ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget Burn-Down Gauge */}
        <ChartCard title="Budget Burn Rate" subtitle="Approved vs spent" delay={0.15}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Portfolio budget consumption. Green = under budget, amber = nearing limit, red = over budget.
            </span>
          </div>
          {isLoading ? (
            <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <GaugeChart
                value={budgetBurnPct}
                max={150}
                label="Budget Used"
                suffix="%"
                thresholds={{ good: 75, warning: 100 }}
                size={180}
                showValue
              />
              <div className="grid grid-cols-2 gap-4 w-full mt-2">
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: "var(--surface-2)" }}>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Approved</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {((analytics?.totalBudgetApproved || 0) / 1e6).toFixed(1)}M
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: "var(--surface-2)" }}>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Spent</p>
                  <p className="text-sm font-bold" style={{ color: budgetBurnPct > 100 ? "#EF4444" : budgetBurnPct > 75 ? "#F59E0B" : "#22C55E" }}>
                    {((analytics?.totalBudgetSpent || 0) / 1e6).toFixed(1)}M
                  </p>
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Health Radar — expanded */}
        <ChartCard title="Portfolio Health Scorecard" subtitle="Multi-dimensional assessment" delay={0.2} className="lg:col-span-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Radar chart across 6 dimensions. Larger shapes = better performance.
            </span>
          </div>
          {isLoading
            ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <RadarChart data={radarData} dataKeys={[{ key: "score", label: "Score", color: "#1B7340" }]}
                angleKey="subject" height={300} domain={[0, 100]} />}
        </ChartCard>
      </div>

      {/* ═══ Section 2: Budget Comparison (full width) ═══ */}
      <ChartCard title="Budget: Approved vs Spent" subtitle="Top 10 projects by budget" delay={0.25}>
        <div className="flex items-center gap-1.5 mb-2">
          <Info size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">
            Side-by-side comparison of approved vs actual spend. Blue = Approved, Amber = Spent.
          </span>
        </div>
        {projectsLoading ? (
          <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetComparison} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip contentStyle={{ backgroundColor: "var(--surface-1)", border: "1px solid var(--border)",
                borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }}
                formatter={(v) => `${(Number(v) / 1e6).toFixed(2)}M`} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => (
                <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{v}</span>)} />
              <Bar dataKey="Approved" fill="#3B82F6" radius={[4, 4, 0, 0]} animationDuration={600} />
              <Bar dataKey="Spent" fill="#F59E0B" radius={[4, 4, 0, 0]} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ═══ Section 3: Portfolio Timeline / Gantt Strip ═══ */}
      <ChartCard title="Portfolio Timeline" subtitle="Project schedule overview" delay={0.3}>
        <div className="flex items-center gap-1.5 mb-3">
          <Info size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">
            Gantt-style view of project timelines. Bar fill shows completion %. RAG dot indicates health. Hover for details.
          </span>
        </div>
        {(timelineLoading && projectsLoading) ? (
          <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        ) : ganttData.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-12">No timeline data available</p>
        ) : (
          <div className="space-y-1.5 overflow-x-auto">
            {/* Month headers */}
            <div className="flex items-center gap-2 mb-2 pl-36">
              {(() => {
                const months: string[] = [];
                const d = new Date(ganttRange.min);
                d.setDate(1);
                while (d <= ganttRange.max) {
                  months.push(d.toLocaleDateString("en", { month: "short", year: "2-digit" }));
                  d.setMonth(d.getMonth() + 1);
                }
                const monthWidth = 100 / Math.max(months.length, 1);
                return months.map((m, i) => (
                  <span key={i} className="text-[9px] text-[var(--text-muted)] font-medium"
                    style={{ width: `${monthWidth}%`, minWidth: 40 }}>{m}</span>
                ));
              })()}
            </div>
            {ganttData.map((item, i) => {
              const leftPct = ((item.start.getTime() - ganttRange.min.getTime()) / 86400000 / ganttRange.span) * 100;
              const widthPct = Math.max(2, ((item.end.getTime() - item.start.getTime()) / 86400000 / ganttRange.span) * 100);
              const ragColor = RAG_COLORS[item.ragStatus?.toLowerCase()] || "#9CA3AF";
              return (
                <motion.div key={item.id} className="flex items-center gap-2 group"
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i }}>
                  <div className="flex items-center gap-1.5 w-32 shrink-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ragColor }} />
                    <span className="text-[11px] text-[var(--text-secondary)] truncate">{item.title}</span>
                  </div>
                  <div className="flex-1 h-6 relative rounded" style={{ backgroundColor: "var(--surface-2)" }}>
                    {/* Track bar */}
                    <div className="absolute top-0 h-full rounded overflow-hidden"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}>
                      {/* Background */}
                      <div className="w-full h-full rounded" style={{ backgroundColor: `${ragColor}20` }} />
                      {/* Fill */}
                      <motion.div className="absolute top-0 left-0 h-full rounded"
                        style={{ backgroundColor: ragColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.completionPct}%` }}
                        transition={{ duration: 0.8, delay: 0.1 + i * 0.03 }} />
                    </div>
                    {/* Today marker */}
                    {(() => {
                      const todayPct = ((new Date().getTime() - ganttRange.min.getTime()) / 86400000 / ganttRange.span) * 100;
                      if (todayPct >= 0 && todayPct <= 100) {
                        return <div className="absolute top-0 h-full w-px opacity-40" style={{ left: `${todayPct}%`, backgroundColor: "#EF4444" }} />;
                      }
                      return null;
                    })()}
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums w-10 text-right" style={{ color: ragColor }}>
                    {item.completionPct}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </ChartCard>

      {/* ═══ Section 4: Risk Heat Map + Milestone Tracker ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Heat Map */}
        <ChartCard title="Risk Heat Map" subtitle="Likelihood × Impact matrix" delay={0.35}>
          <div className="flex items-center gap-1.5 mb-3">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              5×5 risk matrix. Darker cells = more risks in that zone. Top-right corner is highest severity.
            </span>
          </div>
          {risksLoading ? (
            <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : risks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <AlertTriangle size={24} className="text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">No risks registered</p>
            </div>
          ) : (
            <HeatMapGrid
              data={riskHeatMap}
              rowLabels={LIKELIHOOD_LABELS}
              colLabels={IMPACT_LABELS}
              rowTitle="Likelihood"
              colTitle="Impact"
              height={280}
            />
          )}
        </ChartCard>

        {/* Milestone Tracker */}
        <ChartCard title="Milestone Tracker" subtitle={`${milestoneData.total} milestones tracked`} delay={0.4}>
          <div className="flex items-center gap-1.5 mb-3">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Upcoming and overdue milestones across the portfolio. Red items are overdue.
            </span>
          </div>
          {milestonesLoading ? (
            <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : milestones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <CalendarCheck size={24} className="text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">No milestones found</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {/* Summary pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                  <XCircle size={10} /> {milestoneData.overdue.length} Overdue
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>
                  <Timer size={10} /> {milestoneData.upcoming.length} Upcoming
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
                  <CheckCircle2 size={10} /> {milestoneData.completed.length} Completed
                </span>
              </div>

              {/* Overdue milestones */}
              {milestoneData.overdue.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#EF4444" }}>
                    Overdue
                  </p>
                  {milestoneData.overdue.slice(0, 5).map((m, i) => {
                    const daysOver = Math.round((new Date().getTime() - new Date(m.targetDate).getTime()) / 86400000);
                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 * i }}
                        className="flex items-center gap-2 p-2 rounded-lg border"
                        style={{ backgroundColor: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.15)" }}>
                        <XCircle size={12} style={{ color: "#EF4444" }} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--text-primary)] truncate">{m.title}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            Due {new Date(m.targetDate).toLocaleDateString("en", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold shrink-0" style={{ color: "#EF4444" }}>
                          +{daysOver}d
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Upcoming milestones */}
              {milestoneData.upcoming.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#3B82F6" }}>
                    Upcoming
                  </p>
                  {milestoneData.upcoming.map((m, i) => {
                    const daysUntil = Math.round((new Date(m.targetDate).getTime() - new Date().getTime()) / 86400000);
                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 * i }}
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ backgroundColor: "var(--surface-2)" }}>
                        <CalendarCheck size={12} style={{ color: "#3B82F6" }} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--text-primary)] truncate">{m.title}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {new Date(m.targetDate).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold shrink-0"
                          style={{ color: daysUntil <= 7 ? "#F59E0B" : "#3B82F6" }}>
                          {daysUntil}d
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ═══ Section 5: Status Breakdown + Priority + RAG ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Project Status Breakdown */}
        <ChartCard title="Status Breakdown" subtitle="Project lifecycle distribution" delay={0.45}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Distribution of projects by lifecycle status.
            </span>
          </div>
          {isLoading ? (
            <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : statusBreakdown.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">No projects</p>
          ) : (
            <div className="space-y-3">
              <DonutChart data={statusBreakdown} height={160} innerRadius={35} outerRadius={60}
                centerLabel="Status" showLabel />
              <div className="grid grid-cols-2 gap-1.5">
                {statusBreakdown.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-[var(--text-secondary)] truncate">{s.name}</span>
                    <span className="text-[10px] font-bold text-[var(--text-primary)] ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Priority Distribution */}
        <ChartCard title="Priority Distribution" subtitle="Project urgency levels" delay={0.5}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Breakdown of projects by priority level. Red = critical, green = low priority.
            </span>
          </div>
          {isLoading ? (
            <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : priorityDonut.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">No projects</p>
          ) : (
            <div className="space-y-3">
              <DonutChart data={priorityDonut} height={160} innerRadius={35} outerRadius={60}
                centerLabel="Priority" showLabel />
              {/* Priority bar strips */}
              <div className="space-y-1.5">
                {priorityDonut.map((p, i) => {
                  const maxVal = Math.max(...priorityDonut.map((d) => d.value), 1);
                  return (
                    <motion.div key={p.name} className="flex items-center gap-2"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }}>
                      <span className="text-[10px] w-14 text-[var(--text-secondary)]">{p.name}</span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: p.color }}
                          initial={{ width: 0 }} animate={{ width: `${(p.value / maxVal) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }} />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums w-6 text-right text-[var(--text-primary)]">
                        {p.value}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>

        {/* RAG Distribution */}
        <ChartCard title="RAG Distribution" delay={0.55}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Red-Amber-Green health status. More green = healthier portfolio.
            </span>
          </div>
          {isLoading
            ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={ragDonut} height={220} innerRadius={45} outerRadius={75}
                centerLabel="Projects" showLabel />}
        </ChartCard>
      </div>

      {/* ═══ Section 6: Office & Division Allocation ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Office Allocation (divisionName = offices under a division) */}
        <ChartCard title="Office Allocation" subtitle="Projects and budget by office" delay={0.6}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Number of projects per office. Shows which offices have the most portfolio activity.
            </span>
          </div>
          {projectsLoading ? (
            <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : divisionAllocation.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">No office data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={divisionAllocation} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: "var(--surface-1)", border: "1px solid var(--border)",
                  borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => (
                  <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{v}</span>)} />
                <Bar dataKey="Projects" fill="#3B82F6" radius={[0, 4, 4, 0]} animationDuration={600} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Division Allocation (portfolioName = division level) */}
        <ChartCard title="Division Allocation" subtitle="Projects and budget by division" delay={0.65}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Number of projects per division. Shows which divisions have the most activity.
            </span>
          </div>
          {projectsLoading ? (
            <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : officeAllocation.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">No division data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={officeAllocation} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: "var(--surface-1)", border: "1px solid var(--border)",
                  borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => (
                  <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{v}</span>)} />
                <Bar dataKey="Projects" fill="#8B5CF6" radius={[0, 4, 4, 0]} animationDuration={600} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ═══ Section 7: Project Completion Progress ═══ */}
      <ChartCard title="Project Completion" subtitle="Sorted by progress" delay={0.65} className="lg:col-span-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Info size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">
            Top 12 projects sorted by completion. Green = near-completion, red = needs attention. RAG dot shows health.
          </span>
        </div>
        {projectsLoading ? (
          <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {projectProgress.map((p, i) => {
              const pct = p.completionPct || 0;
              const color = pct >= 75 ? "#22C55E" : pct >= 50 ? "#F59E0B" : pct >= 25 ? "#F97316" : "#EF4444";
              return (
                <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-secondary)] w-32 truncate">{p.code || p.title}</span>
                  <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color }}>{pct}%</span>
                  <span className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: RAG_COLORS[p.ragStatus?.toLowerCase()] || "#9CA3AF" }} />
                </motion.div>
              );
            })}
            {projectProgress.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">No projects in this portfolio</p>
            )}
          </div>
        )}
      </ChartCard>

      {/* ═══ Section 8: Schedule Variance Table ═══ */}
      <ChartCard title="Schedule Variance Analysis" subtitle="Planned vs actual delivery" delay={0.7}>
        <div className="flex items-center gap-1.5 mb-3">
          <Info size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">
            Shows deviation between planned and actual end dates. Positive values = behind schedule (red), negative = ahead (green).
          </span>
        </div>
        {projectsLoading ? (
          <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        ) : scheduleVariance.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-8">No schedule data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="text-left py-2 px-2 text-[var(--text-muted)] font-medium">Project</th>
                  <th className="text-left py-2 px-2 text-[var(--text-muted)] font-medium">Status</th>
                  <th className="text-center py-2 px-2 text-[var(--text-muted)] font-medium">Progress</th>
                  <th className="text-center py-2 px-2 text-[var(--text-muted)] font-medium">Planned End</th>
                  <th className="text-center py-2 px-2 text-[var(--text-muted)] font-medium">Actual End</th>
                  <th className="text-right py-2 px-2 text-[var(--text-muted)] font-medium">Variance</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {scheduleVariance.map((row, i) => {
                    const varColor = row.varianceDays > 14 ? "#EF4444"
                      : row.varianceDays > 0 ? "#F59E0B"
                      : row.varianceDays < -7 ? "#22C55E"
                      : "#3B82F6";
                    const VarIcon = row.varianceDays > 0 ? ArrowUpRight
                      : row.varianceDays < 0 ? ArrowDownRight : Minus;
                    return (
                      <motion.tr key={row.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.03 * i }}
                        className="border-b hover:bg-[var(--surface-2)] transition-colors"
                        style={{ borderColor: "var(--border)" }}>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: RAG_COLORS[row.ragStatus?.toLowerCase()] || "#9CA3AF" }} />
                            <span className="text-[var(--text-primary)] font-medium truncate max-w-[140px]">
                              {row.code}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              backgroundColor: `${STATUS_COLORS[row.status?.toLowerCase()] || "#9CA3AF"}15`,
                              color: STATUS_COLORS[row.status?.toLowerCase()] || "#9CA3AF",
                            }}>
                            {row.status?.replace(/_/g, " ") || "—"}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                              <div className="h-full rounded-full" style={{
                                width: `${row.completionPct}%`,
                                backgroundColor: row.completionPct >= 75 ? "#22C55E" : row.completionPct >= 50 ? "#F59E0B" : "#EF4444"
                              }} />
                            </div>
                            <span className="text-[10px] tabular-nums text-[var(--text-secondary)]">{row.completionPct}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center text-[var(--text-secondary)]">
                          {row.plannedEnd ? new Date(row.plannedEnd).toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
                        </td>
                        <td className="py-2 px-2 text-center text-[var(--text-secondary)]">
                          {row.actualEnd
                            ? new Date(row.actualEnd).toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" })
                            : <span className="text-[var(--text-muted)] italic">In progress</span>}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="inline-flex items-center gap-0.5 font-bold tabular-nums" style={{ color: varColor }}>
                            <VarIcon size={11} />
                            <span>{Math.abs(row.varianceDays)}d</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
