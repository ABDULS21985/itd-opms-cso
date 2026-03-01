"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Activity,
  Award,
  ClipboardList,
} from "lucide-react";
import { useExecutiveSummary } from "@/hooks/use-reporting";
import { useWorkItems, useProjects } from "@/hooks/use-planning";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  GaugeChart,
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
} from "recharts";
import type { WorkItem, Project } from "@/types";

const analyticsPages = [
  { label: "Executive Overview", href: "/dashboard/analytics" },
  { label: "Portfolio", href: "/dashboard/analytics/portfolio" },
  { label: "Projects", href: "/dashboard/analytics/projects" },
  { label: "Risks & Issues", href: "/dashboard/analytics/risks" },
  { label: "Resources", href: "/dashboard/analytics/resources", active: true },
  { label: "Governance", href: "/dashboard/analytics/governance" },
  { label: "Office Analytics", href: "/dashboard/analytics/offices" },
  { label: "Collaboration", href: "/dashboard/analytics/collaboration" },
];

const STATUS_COLORS: Record<string, string> = {
  todo: "#9CA3AF", backlog: "#9CA3AF", in_progress: "#3B82F6",
  in_review: "#8B5CF6", done: "#22C55E", completed: "#22C55E",
  blocked: "#EF4444",
};

const TYPE_COLORS: Record<string, string> = {
  task: "#3B82F6", story: "#8B5CF6", epic: "#F59E0B",
  subtask: "#06B6D4", bug: "#EF4444",
};

export default function ResourceWorkloadPage() {
  const { data: summary, isLoading: summaryLoading } = useExecutiveSummary();
  const { data: workItemsRaw, isLoading: workItemsLoading } = useWorkItems(1, 500);
  const { data: projectsRaw, isLoading: projectsLoading } = useProjects(1, 100);

  const workItems = useMemo<WorkItem[]>(() => {
    if (!workItemsRaw) return [];
    if (Array.isArray(workItemsRaw)) return workItemsRaw;
    if ("data" in workItemsRaw) return (workItemsRaw as { data: WorkItem[] }).data || [];
    return [];
  }, [workItemsRaw]);

  const projects = useMemo<Project[]>(() => {
    if (!projectsRaw) return [];
    if (Array.isArray(projectsRaw)) return projectsRaw;
    if ("data" in projectsRaw) return (projectsRaw as { data: Project[] }).data || [];
    return [];
  }, [projectsRaw]);

  // Work item status donut
  const statusDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of workItems) {
      const s = (w.status || "todo").toLowerCase();
      counts[s] = (counts[s] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
      color: STATUS_COLORS[name] || "#9CA3AF",
    }));
  }, [workItems]);

  // Work item type bar
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of workItems) {
      const t = (w.type || "task").toLowerCase();
      counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: TYPE_COLORS[name] || "#9CA3AF",
    }));
  }, [workItems]);

  // Priority stacked bar
  const priorityByStatus = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const allStatuses = new Set<string>();
    for (const w of workItems) {
      const pr = (w.priority || "medium").toLowerCase();
      const st = (w.status || "todo").toLowerCase();
      allStatuses.add(st);
      if (!map[pr]) map[pr] = {};
      map[pr][st] = (map[pr][st] || 0) + 1;
    }
    const statusList = Array.from(allStatuses);
    const data = Object.entries(map).map(([name, statuses]) => {
      const row: Record<string, string | number> = { name: name.charAt(0).toUpperCase() + name.slice(1) };
      for (const s of statusList) row[s] = statuses[s] || 0;
      return row;
    });
    return { data, categories: statusList };
  }, [workItems]);

  // Estimated vs Actual hours by project
  const hoursComparison = useMemo(() => {
    const projectMap: Record<string, { name: string; estimated: number; actual: number }> = {};
    for (const w of workItems) {
      if (!projectMap[w.projectId]) {
        const proj = projects.find((p) => p.id === w.projectId);
        projectMap[w.projectId] = { name: proj?.code || w.projectId.substring(0, 8), estimated: 0, actual: 0 };
      }
      projectMap[w.projectId].estimated += w.estimatedHours || 0;
      projectMap[w.projectId].actual += w.actualHours || 0;
    }
    return Object.values(projectMap)
      .filter((p) => p.estimated > 0 || p.actual > 0)
      .sort((a, b) => b.estimated - a.estimated)
      .slice(0, 10);
  }, [workItems, projects]);

  const totalAssigned = workItems.filter((w) => w.status !== "done" && w.status !== "completed").length;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(6,182,212,0.1)" }}>
            <Users size={20} style={{ color: "#06B6D4" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Resource & Workload</h1>
            <p className="text-sm text-[var(--text-secondary)]">Team capacity, work item distribution, and effort tracking</p>
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
            style={page.active ? { backgroundColor: "#06B6D4" } : undefined}>
            {page.label}
          </Link>
        ))}
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPIStatCard label="Capacity Utilization" value={summaryLoading ? undefined : summary?.teamCapacityUtilizationPct ?? 0}
          icon={Activity} color="#22C55E" bgColor="rgba(34,197,94,0.1)" isLoading={summaryLoading} index={0} suffix="%"
          href="/dashboard/people/capacity" />
        <KPIStatCard label="Overdue Training" value={summaryLoading ? undefined : summary?.overdueTrainingCerts ?? 0}
          icon={Award} color="#EF4444" bgColor="rgba(239,68,68,0.1)" isLoading={summaryLoading} index={1}
          href="/dashboard/people/training" />
        <KPIStatCard label="Expiring Certs" value={summaryLoading ? undefined : summary?.expiringCerts ?? 0}
          icon={Award} color="#F59E0B" bgColor="rgba(245,158,11,0.1)" isLoading={summaryLoading} index={2}
          href="/dashboard/people/training" />
        <KPIStatCard label="Active Tasks" value={workItemsLoading ? undefined : totalAssigned}
          icon={ClipboardList} color="#3B82F6" bgColor="rgba(59,130,246,0.1)" isLoading={workItemsLoading} index={3}
          href="/dashboard/planning/work-items" />
      </div>

      {/* Capacity Gauge + Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Team Capacity Utilization" delay={0.2}>
          <div className="flex items-center justify-center py-4">
            <GaugeChart
              value={summary?.teamCapacityUtilizationPct ?? 0}
              label="Utilization"
              size={200}
              thresholds={{ good: 60, warning: 40 }}
            />
          </div>
        </ChartCard>

        <ChartCard title="Work Item Status" delay={0.25}>
          {workItemsLoading ? <div className="h-56 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={statusDonut} height={240} innerRadius={50} outerRadius={80}
                centerLabel="Items" showLabel />}
        </ChartCard>
      </div>

      {/* Type + Priority Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Work Items by Type" delay={0.3}>
          {workItemsLoading ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={typeData} height={220} innerRadius={40} outerRadius={70} centerLabel="Types" />}
        </ChartCard>

        <ChartCard title="Priority x Status" delay={0.35}>
          {workItemsLoading ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <StackedBarChart data={priorityByStatus.data} categories={priorityByStatus.categories}
                height={220} layout="vertical" colors={Object.values(STATUS_COLORS)} />}
        </ChartCard>
      </div>

      {/* Hours Comparison */}
      <ChartCard title="Estimated vs Actual Hours" subtitle="By project (top 10)" delay={0.4}>
        {workItemsLoading || projectsLoading
          ? <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hoursComparison} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "var(--surface-1)", border: "1px solid var(--border)",
                  borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="estimated" name="Estimated" fill="#3B82F6" radius={[4, 4, 0, 0]} animationDuration={600} />
                <Bar dataKey="actual" name="Actual" fill="#F59E0B" radius={[4, 4, 0, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          )}
      </ChartCard>
    </div>
  );
}
