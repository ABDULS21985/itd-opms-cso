"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  ChevronDown,
} from "lucide-react";
import {
  usePortfolios,
  usePortfolioAnalytics,
  useProjects,
} from "@/hooks/use-planning";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  RadarChart,
  ProgressRing,
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
} from "recharts";
import type { Project, Portfolio } from "@/types";

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

export default function PortfolioAnalyticsPage() {
  const { data: portfoliosRaw, isLoading: portfoliosLoading } = usePortfolios(1, 50);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");

  const portfolios = useMemo<Portfolio[]>(() => {
    if (!portfoliosRaw) return [];
    if (Array.isArray(portfoliosRaw)) return portfoliosRaw;
    if ("data" in portfoliosRaw) return (portfoliosRaw as { data: Portfolio[] }).data || [];
    return [];
  }, [portfoliosRaw]);

  const activePortfolioId = selectedPortfolioId || portfolios[0]?.id;

  const { data: analytics, isLoading: analyticsLoading } = usePortfolioAnalytics(activePortfolioId);
  const { data: projectsRaw, isLoading: projectsLoading } = useProjects(1, 100, activePortfolioId);

  const projects = useMemo<Project[]>(() => {
    if (!projectsRaw) return [];
    if (Array.isArray(projectsRaw)) return projectsRaw;
    if ("data" in projectsRaw) return (projectsRaw as { data: Project[] }).data || [];
    return [];
  }, [projectsRaw]);

  const isLoading = portfoliosLoading || analyticsLoading || projectsLoading;

  // RAG distribution donut
  const ragDonut = useMemo(() => {
    if (!analytics?.ragSummary) return [];
    return Object.entries(analytics.ragSummary).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: RAG_COLORS[name.toLowerCase()] || "#9CA3AF",
    }));
  }, [analytics]);

  // Budget comparison by project
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

  // Radar chart data (portfolio health)
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

  // Project completion progress bars
  const projectProgress = useMemo(() => {
    return [...projects]
      .sort((a, b) => (b.completionPct || 0) - (a.completionPct || 0))
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
          {/* Portfolio selector */}
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
        <KPIStatCard label="Total Projects" value={isLoading ? undefined : analytics?.totalProjects ?? projects.length}
          icon={Briefcase} color="#1B7340" bgColor="rgba(27,115,64,0.1)" isLoading={isLoading} index={0} />
        <KPIStatCard label="Active Projects" value={isLoading ? undefined : analytics?.activeProjects ?? 0}
          icon={TrendingUp} color="#3B82F6" bgColor="rgba(59,130,246,0.1)" isLoading={isLoading} index={1}
          subtitle={analytics ? `${analytics.completedProjects} completed` : undefined} />
        <KPIStatCard label="Total Budget" value={isLoading ? undefined : `${((analytics?.totalBudgetApproved || 0) / 1e6).toFixed(1)}M`}
          icon={DollarSign} color="#8B5CF6" bgColor="rgba(139,92,246,0.1)" isLoading={isLoading} index={2} />
        <KPIStatCard label="Avg Completion" value={isLoading ? undefined : analytics?.avgCompletionPct ?? 0}
          icon={Target} color="#22C55E" bgColor="rgba(34,197,94,0.1)" isLoading={isLoading} index={3} suffix="%" />
        <KPIStatCard label="On-Time Delivery" value={isLoading ? undefined : analytics?.onTimeDeliveryPct ?? 0}
          icon={Clock} color="#06B6D4" bgColor="rgba(6,182,212,0.1)" isLoading={isLoading} index={4} suffix="%" />
      </div>

      {/* Primary Charts 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Portfolio Health Scorecard" subtitle="Multi-dimensional assessment" delay={0.2}>
          {isLoading
            ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <RadarChart data={radarData} dataKeys={[{ key: "score", label: "Score", color: "#1B7340" }]}
                angleKey="subject" height={300} domain={[0, 100]} />}
        </ChartCard>

        <ChartCard title="Budget: Approved vs Spent" subtitle="Top 10 projects by budget" delay={0.25}>
          {projectsLoading
            ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetComparison} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--surface-1)", border: "1px solid var(--border)",
                    borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }}
                    formatter={(v: number) => `${(v / 1e6).toFixed(2)}M`} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => (
                    <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{v}</span>)} />
                  <Bar dataKey="Approved" fill="#3B82F6" radius={[4, 4, 0, 0]} animationDuration={600} />
                  <Bar dataKey="Spent" fill="#F59E0B" radius={[4, 4, 0, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </ChartCard>
      </div>

      {/* Secondary Charts 3-col */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title="RAG Distribution" delay={0.3}>
          {isLoading
            ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={ragDonut} height={220} innerRadius={45} outerRadius={75}
                centerLabel="Projects" showLabel />}
        </ChartCard>

        <ChartCard title="Project Completion" subtitle="Sorted by progress" delay={0.35} className="lg:col-span-2">
          {projectsLoading
            ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
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
                      <span className={`w-2 h-2 rounded-full`}
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
      </div>
    </div>
  );
}
