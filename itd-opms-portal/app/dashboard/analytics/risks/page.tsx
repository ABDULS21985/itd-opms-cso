"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Bug,
  TrendingDown,
} from "lucide-react";
import { useRisks, useIssues } from "@/hooks/use-planning";
import { useExecutiveSummary } from "@/hooks/use-reporting";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  HeatMapGrid,
  StackedBarChart,
  FilterBar,
} from "@/components/dashboard/charts";
import type { Risk, ProjectIssue } from "@/types";

const analyticsPages = [
  { label: "Executive Overview", href: "/dashboard/analytics" },
  { label: "Portfolio", href: "/dashboard/analytics/portfolio" },
  { label: "Projects", href: "/dashboard/analytics/projects" },
  { label: "Risks & Issues", href: "/dashboard/analytics/risks", active: true },
  { label: "Resources", href: "/dashboard/analytics/resources" },
  { label: "Governance", href: "/dashboard/analytics/governance" },
];

const CATEGORY_COLORS: Record<string, string> = {
  technical: "#3B82F6", organizational: "#8B5CF6", external: "#F97316",
  financial: "#EF4444", operational: "#06B6D4", security: "#EC4899",
  compliance: "#14B8A6", strategic: "#6366F1",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444", high: "#F97316", medium: "#F59E0B", low: "#84CC16",
};

export default function RiskIssuesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: summary } = useExecutiveSummary();
  const { data: risksRaw, isLoading: risksLoading } = useRisks(1, 200, undefined, statusFilter || undefined, categoryFilter || undefined);
  const { data: issuesRaw, isLoading: issuesLoading } = useIssues(1, 200);

  const risks = useMemo<Risk[]>(() => {
    if (!risksRaw) return [];
    if (Array.isArray(risksRaw)) return risksRaw;
    if ("data" in risksRaw) return (risksRaw as { data: Risk[] }).data || [];
    return [];
  }, [risksRaw]);

  const issues = useMemo<ProjectIssue[]>(() => {
    if (!issuesRaw) return [];
    if (Array.isArray(issuesRaw)) return issuesRaw;
    if ("data" in issuesRaw) return (issuesRaw as { data: ProjectIssue[] }).data || [];
    return [];
  }, [issuesRaw]);

  // Risk heat map
  const heatMapData = useMemo(() => {
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
  }, [risks]);

  // Risk by category donut
  const categoryDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of risks) {
      const cat = (r.category || "other").toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: CATEGORY_COLORS[name] || "#9CA3AF",
    }));
  }, [risks]);

  // Risk status stacked bar
  const riskStatusData = useMemo(() => {
    const statusMap: Record<string, Record<string, number>> = {};
    const allStatuses = new Set<string>();
    for (const r of risks) {
      const cat = (r.category || "other").toLowerCase();
      const status = r.status || "open";
      allStatuses.add(status);
      if (!statusMap[cat]) statusMap[cat] = {};
      statusMap[cat][status] = (statusMap[cat][status] || 0) + 1;
    }
    const statusList = Array.from(allStatuses);
    const data = Object.entries(statusMap).map(([name, statuses]) => {
      const row: Record<string, string | number> = { name: name.charAt(0).toUpperCase() + name.slice(1) };
      for (const s of statusList) row[s] = statuses[s] || 0;
      return row;
    });
    return { data, categories: statusList };
  }, [risks]);

  // Issues by severity
  const issueSeverityData = useMemo(() => {
    const sevMap: Record<string, Record<string, number>> = {};
    const allStatuses = new Set<string>();
    for (const i of issues) {
      const sev = (i.severity || "medium").toLowerCase();
      const status = i.status || "open";
      allStatuses.add(status);
      if (!sevMap[sev]) sevMap[sev] = {};
      sevMap[sev][status] = (sevMap[sev][status] || 0) + 1;
    }
    const statusList = Array.from(allStatuses);
    const data = Object.entries(sevMap).map(([name, statuses]) => {
      const row: Record<string, string | number> = { name: name.charAt(0).toUpperCase() + name.slice(1) };
      for (const s of statusList) row[s] = statuses[s] || 0;
      return row;
    });
    return { data, categories: statusList };
  }, [issues]);

  const openRisks = risks.filter((r) => r.status === "open").length;
  const criticalRisks = risks.filter((r) => r.riskScore >= 20).length;
  const highRisks = risks.filter((r) => r.riskScore >= 12 && r.riskScore < 20).length;
  const openIssues = issues.filter((i) => i.status !== "closed" && i.status !== "resolved").length;
  const avgRiskScore = risks.length > 0 ? (risks.reduce((s, r) => s + r.riskScore, 0) / risks.length).toFixed(1) : "0";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
            <ShieldAlert size={20} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Risk & Issues Analytics</h1>
            <p className="text-sm text-[var(--text-secondary)]">Risk heat map, category analysis, and issue tracking</p>
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
            style={page.active ? { backgroundColor: "#EF4444" } : undefined}>
            {page.label}
          </Link>
        ))}
      </motion.div>

      {/* Filters */}
      <FilterBar
        filters={[
          {
            key: "status", label: "Risk Status", value: statusFilter, onChange: setStatusFilter,
            options: [{ label: "Open", value: "open" }, { label: "Mitigated", value: "mitigated" }, { label: "Closed", value: "closed" }],
          },
          {
            key: "category", label: "Category", value: categoryFilter, onChange: setCategoryFilter,
            options: [
              { label: "Technical", value: "technical" }, { label: "Organizational", value: "organizational" },
              { label: "Financial", value: "financial" }, { label: "External", value: "external" },
            ],
          },
        ]}
        onReset={() => { setStatusFilter(""); setCategoryFilter(""); }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPIStatCard label="Open Risks" value={risksLoading ? undefined : openRisks}
          icon={AlertTriangle} color="#F59E0B" bgColor="rgba(245,158,11,0.1)" isLoading={risksLoading} index={0} />
        <KPIStatCard label="Critical Risks" value={risksLoading ? undefined : criticalRisks}
          icon={AlertOctagon} color="#EF4444" bgColor="rgba(239,68,68,0.1)" isLoading={risksLoading} index={1} />
        <KPIStatCard label="High Risks" value={risksLoading ? undefined : highRisks}
          icon={ShieldAlert} color="#F97316" bgColor="rgba(249,115,22,0.1)" isLoading={risksLoading} index={2} />
        <KPIStatCard label="Open Issues" value={issuesLoading ? undefined : openIssues}
          icon={Bug} color="#8B5CF6" bgColor="rgba(139,92,246,0.1)" isLoading={issuesLoading} index={3} />
        <KPIStatCard label="Avg Risk Score" value={risksLoading ? undefined : avgRiskScore}
          icon={TrendingDown} color="#06B6D4" bgColor="rgba(6,182,212,0.1)" isLoading={risksLoading} index={4} />
      </div>

      {/* Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Risk Heat Map" subtitle="Likelihood vs Impact (5x5)" delay={0.2}>
          {risksLoading ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <HeatMapGrid data={heatMapData} height={300} />}
        </ChartCard>

        <ChartCard title="Risks by Category" delay={0.25}>
          {risksLoading ? <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={categoryDonut} height={300} innerRadius={55} outerRadius={90}
                centerLabel="Total" showLabel />}
        </ChartCard>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Risk Status by Category" delay={0.3}>
          {risksLoading ? <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <StackedBarChart data={riskStatusData.data} categories={riskStatusData.categories}
                height={260} layout="vertical"
                colors={["#22C55E", "#F59E0B", "#EF4444", "#3B82F6", "#9CA3AF"]} />}
        </ChartCard>

        <ChartCard title="Issues by Severity" delay={0.35}>
          {issuesLoading ? <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <StackedBarChart data={issueSeverityData.data} categories={issueSeverityData.categories}
                height={260} layout="vertical"
                colors={["#22C55E", "#3B82F6", "#F59E0B", "#EF4444", "#9CA3AF"]} />}
        </ChartCard>
      </div>

      {/* Top Risks Table */}
      <ChartCard title="Top Risks" subtitle="Sorted by risk score" delay={0.4}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {["Title", "Category", "Likelihood", "Impact", "Score", "Status"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...risks].sort((a, b) => b.riskScore - a.riskScore).slice(0, 10).map((r) => {
                const scoreColor = r.riskScore >= 20 ? "#EF4444" : r.riskScore >= 12 ? "#F97316" : r.riskScore >= 6 ? "#F59E0B" : "#22C55E";
                return (
                  <tr key={r.id} className="border-b hover:bg-[var(--surface-1)] transition-colors" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)] max-w-48 truncate">{r.title}</td>
                    <td className="py-2 px-3 capitalize text-[var(--text-secondary)]">{r.category || "—"}</td>
                    <td className="py-2 px-3 capitalize text-[var(--text-secondary)]">{r.likelihood}</td>
                    <td className="py-2 px-3 capitalize text-[var(--text-secondary)]">{r.impact}</td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: scoreColor }}>
                        {r.riskScore}
                      </span>
                    </td>
                    <td className="py-2 px-3 capitalize text-[var(--text-secondary)]">{r.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {risks.length === 0 && !risksLoading && (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">No risks found</p>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
