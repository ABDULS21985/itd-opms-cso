"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FolderKanban,
  Activity,
  AlertCircle,
  FileText,
  Timer,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { InfoHint } from "@/components/shared/info-hint";
import {
  useProjects,
  useWorkItems,
  useRisks,
  useIssues,
  useChangeRequests,
} from "@/hooks/use-planning";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  TreemapChart,
  FilterBar,
} from "@/components/dashboard/charts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Project, WorkItem } from "@/types";

const analyticsPages = [
  { label: "Executive Overview", href: "/dashboard/analytics" },
  { label: "Portfolio", href: "/dashboard/analytics/portfolio" },
  { label: "Projects", href: "/dashboard/analytics/projects", active: true },
  { label: "Risks & Issues", href: "/dashboard/analytics/risks" },
  { label: "Resources", href: "/dashboard/analytics/resources" },
  { label: "Governance", href: "/dashboard/analytics/governance" },
  { label: "Office Analytics", href: "/dashboard/analytics/offices" },
  { label: "Collaboration", href: "/dashboard/analytics/collaboration" },
];

const STATUS_COLORS: Record<string, string> = {
  proposed: "#9CA3AF", active: "#3B82F6", completed: "#22C55E",
  cancelled: "#EF4444", "on-hold": "#F97316", "in-development": "#8B5CF6",
  implementation: "#06B6D4",
};

const RAG_COLORS: Record<string, string> = {
  green: "#22C55E", amber: "#F59E0B", red: "#EF4444",
};

export default function ProjectPerformancePage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [ragFilter, setRagFilter] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const tablePageSize = 15;

  const { data: projectsRaw, isLoading: projectsLoading } = useProjects(1, 200, undefined, statusFilter || undefined, ragFilter || undefined);
  const { data: workItemsRaw, isLoading: workItemsLoading } = useWorkItems(1, 500);
  const { data: risksRaw } = useRisks(1, 200);
  const { data: issuesRaw } = useIssues(1, 200);
  const { data: changeReqRaw } = useChangeRequests(1, 100);

  const projects = useMemo<Project[]>(() => {
    if (!projectsRaw) return [];
    if (Array.isArray(projectsRaw)) return projectsRaw;
    if ("data" in projectsRaw) return (projectsRaw as { data: Project[] }).data || [];
    return [];
  }, [projectsRaw]);

  const workItems = useMemo<WorkItem[]>(() => {
    if (!workItemsRaw) return [];
    if (Array.isArray(workItemsRaw)) return workItemsRaw;
    if ("data" in workItemsRaw) return (workItemsRaw as { data: WorkItem[] }).data || [];
    return [];
  }, [workItemsRaw]);

  const riskCount = useMemo(() => {
    if (!risksRaw) return 0;
    if (Array.isArray(risksRaw)) return risksRaw.length;
    if ("data" in risksRaw) return ((risksRaw as { data: unknown[] }).data || []).length;
    return 0;
  }, [risksRaw]);

  const issueCount = useMemo(() => {
    if (!issuesRaw) return 0;
    if (Array.isArray(issuesRaw)) return issuesRaw.length;
    if ("data" in issuesRaw) return ((issuesRaw as { data: unknown[] }).data || []).length;
    return 0;
  }, [issuesRaw]);

  const changeReqCount = useMemo(() => {
    if (!changeReqRaw) return 0;
    if (Array.isArray(changeReqRaw)) return changeReqRaw.length;
    if ("data" in changeReqRaw) return ((changeReqRaw as { data: unknown[] }).data || []).length;
    return 0;
  }, [changeReqRaw]);

  const isLoading = projectsLoading;

  // Status distribution donut
  const statusDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const s = p.status || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " "),
      value,
      color: STATUS_COLORS[name] || "#9CA3AF",
    }));
  }, [projects]);

  // Completion histogram
  const completionHistogram = useMemo(() => {
    const buckets = [
      { name: "0-25%", min: 0, max: 25, count: 0, color: "#EF4444" },
      { name: "26-50%", min: 26, max: 50, count: 0, color: "#F97316" },
      { name: "51-75%", min: 51, max: 75, count: 0, color: "#F59E0B" },
      { name: "76-100%", min: 76, max: 100, count: 0, color: "#22C55E" },
    ];
    for (const p of projects) {
      const pct = p.completionPct || 0;
      for (const b of buckets) {
        if (pct >= b.min && pct <= b.max) { b.count++; break; }
      }
    }
    return buckets;
  }, [projects]);

  // Budget treemap
  const budgetTreemap = useMemo(() => {
    return projects
      .filter((p) => (p.budgetApproved || 0) > 0)
      .map((p) => ({
        name: p.title || p.code || "Untitled",
        value: p.budgetApproved || 0,
      }));
  }, [projects]);

  // Work item velocity by project
  const workItemVelocity = useMemo(() => {
    const projectMap: Record<string, { id: string; name: string; completed: number; total: number }> = {};
    for (const wi of workItems) {
      if (!projectMap[wi.projectId]) {
        const proj = projects.find((p) => p.id === wi.projectId);
        projectMap[wi.projectId] = { id: wi.projectId, name: proj?.title || proj?.code || wi.projectId.substring(0, 8), completed: 0, total: 0 };
      }
      projectMap[wi.projectId].total++;
      if (wi.status === "done" || wi.status === "completed") projectMap[wi.projectId].completed++;
    }
    return Object.values(projectMap)
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 10);
  }, [workItems, projects]);

  // Aggregated stats
  const activeProjects = projects.filter((p) => p.status !== "completed" && p.status !== "cancelled").length;
  const avgCompletion = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + (p.completionPct || 0), 0) / projects.length) : 0;
  const overdueWorkItems = workItems.filter((w) =>
    w.dueDate && new Date(w.dueDate) < new Date() && w.status !== "done" && w.status !== "completed"
  ).length;
  const totalEstimated = workItems.reduce((s, w) => s + (w.estimatedHours || 0), 0);
  const totalActual = workItems.reduce((s, w) => s + (w.actualHours || 0), 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(139,92,246,0.1)" }}>
            <FolderKanban size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Project Performance</h1>
            <p className="text-sm text-[var(--text-secondary)]">Detailed project metrics, work item velocity, and budget analysis</p>
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
            style={page.active ? { backgroundColor: "#8B5CF6" } : undefined}>
            {page.label}
          </Link>
        ))}
      </motion.div>

      {/* Filters */}
      <FilterBar
        filters={[
          {
            key: "status", label: "Status", value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "Active", value: "active" },
              { label: "Completed", value: "completed" },
              { label: "On Hold", value: "on-hold" },
              { label: "Proposed", value: "proposed" },
            ],
          },
          {
            key: "rag", label: "RAG Status", value: ragFilter,
            onChange: setRagFilter,
            options: [
              { label: "Green", value: "green" },
              { label: "Amber", value: "amber" },
              { label: "Red", value: "red" },
            ],
          },
        ]}
        onReset={() => { setStatusFilter(""); setRagFilter(""); }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="relative">
          <KPIStatCard label="Active Projects" value={isLoading ? undefined : activeProjects}
            icon={FolderKanban} color="#3B82F6" bgColor="rgba(59,130,246,0.1)" isLoading={isLoading} index={0}
            href="/dashboard/planning/projects" />
          <span className="absolute top-2 right-2"><InfoHint text="Projects currently in progress — excludes completed and cancelled. Click to view the full list." position="bottom" size={13} /></span>
        </div>
        <div className="relative">
          <KPIStatCard label="Avg Completion" value={isLoading ? undefined : avgCompletion}
            icon={Activity} color="#22C55E" bgColor="rgba(34,197,94,0.1)" isLoading={isLoading} index={1} suffix="%"
            href="/dashboard/planning/projects" />
          <span className="absolute top-2 right-2"><InfoHint text="Average completion percentage across all projects matching the current filters." position="bottom" size={13} /></span>
        </div>
        <div className="relative">
          <KPIStatCard label="Overdue Tasks" value={workItemsLoading ? undefined : overdueWorkItems}
            icon={AlertCircle} color="#EF4444" bgColor="rgba(239,68,68,0.1)" isLoading={workItemsLoading} index={2}
            href="/dashboard/planning/work-items" />
          <span className="absolute top-2 right-2"><InfoHint text="Work items past their due date that are not yet completed. High numbers may indicate bottlenecks." position="bottom" size={13} /></span>
        </div>
        <div className="relative">
          <KPIStatCard label="Change Requests" value={changeReqCount || 0}
            icon={FileText} color="#F59E0B" bgColor="rgba(245,158,11,0.1)" isLoading={isLoading} index={3}
            href="/dashboard/planning/change-requests" />
          <span className="absolute top-2 right-2"><InfoHint text="Total change requests submitted across all projects. Includes all statuses." position="bottom" size={13} /></span>
        </div>
        <div className="relative">
          <KPIStatCard label="Est. Hours" value={workItemsLoading ? undefined : totalEstimated.toLocaleString()}
            icon={Timer} color="#8B5CF6" bgColor="rgba(139,92,246,0.1)" isLoading={workItemsLoading} index={4}
            href="/dashboard/planning/work-items" />
          <span className="absolute top-2 right-2"><InfoHint text="Total estimated hours across all work items. Compare with actual hours to measure estimation accuracy." position="bottom" size={13} /></span>
        </div>
        <div className="relative">
          <KPIStatCard label="Actual Hours" value={workItemsLoading ? undefined : totalActual.toLocaleString()}
            icon={ClipboardList} color="#06B6D4" bgColor="rgba(6,182,212,0.1)" isLoading={workItemsLoading} index={5}
            href="/dashboard/planning/work-items" />
          <span className="absolute top-2 right-2"><InfoHint text="Total actual hours logged across all work items. Significantly exceeding estimates indicates scope creep." position="bottom" size={13} /></span>
        </div>
      </div>

      {/* Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Status Distribution" delay={0.2}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Donut shows project count by status. Larger slices indicate more projects in that status. Center shows total count.
            </span>
          </div>
          {isLoading ? <div className="h-56 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <DonutChart data={statusDonut} height={240} innerRadius={50} outerRadius={80}
                centerLabel="Total" showLabel />}
        </ChartCard>

        <ChartCard title="Completion Distribution" subtitle="Projects by progress range" delay={0.25}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Histogram of projects grouped by completion range. More projects in 76-100% (green) indicates healthy delivery pipeline.
            </span>
          </div>
          {isLoading ? <div className="h-56 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={completionHistogram} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--surface-1)", border: "1px solid var(--border)",
                    borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={600}>
                    {completionHistogram.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </ChartCard>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title="Work Item Velocity" subtitle="Completed items by project" delay={0.3}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Ratio of completed to total work items per project. Higher fill = better throughput. Click project codes to navigate.
            </span>
          </div>
          {workItemsLoading ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {workItemVelocity.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Link href={`/dashboard/planning/projects/${item.id}`}
                      className="text-[10px] text-[var(--text-secondary)] w-16 truncate hover:text-[var(--primary)] hover:underline transition-colors">
                      {item.name}
                    </Link>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                      <motion.div className="h-full rounded-full bg-[#22C55E]"
                        initial={{ width: 0 }} animate={{ width: `${item.total > 0 ? (item.completed / item.total) * 100 : 0}%` }}
                        transition={{ duration: 0.5, delay: 0.05 * i }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-[var(--text-primary)]">
                      {item.completed}/{item.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </ChartCard>

        <ChartCard title="Budget Utilization" subtitle="Treemap — size = approved budget" delay={0.35} className="lg:col-span-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Treemap where each block's size represents approved budget. Larger blocks are higher-budget projects.
            </span>
          </div>
          {projectsLoading ? <div className="h-52 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            : <TreemapChart data={budgetTreemap} height={220} />}
        </ChartCard>
      </div>

      {/* Project Health Table */}
      <ChartCard title="Project Health Overview" delay={0.4}>
        <div className="flex items-center gap-1.5 mb-3">
          <Info size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">
            Summary table showing key health indicators per project. RAG dot indicates overall health. Click project names to view details.
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {["Project", "Status", "RAG", "Completion", "Budget Used", "Risks", "Issues"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize).map((p) => {
                const budgetPct = p.budgetApproved ? Math.round(((p.budgetSpent || 0) / p.budgetApproved) * 100) : 0;
                return (
                  <tr key={p.id} className="border-b hover:bg-[var(--surface-1)] transition-colors" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 px-3 font-medium">
                      <Link href={`/dashboard/planning/projects/${p.id}`}
                        className="text-[var(--text-primary)] hover:text-[var(--primary)] hover:underline transition-colors">
                        {p.title || p.code}
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                        style={{ backgroundColor: STATUS_COLORS[p.status] || "#9CA3AF" }}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: RAG_COLORS[p.ragStatus?.toLowerCase()] || "#9CA3AF" }} />
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${p.completionPct || 0}%`, backgroundColor: (p.completionPct || 0) >= 75 ? "#22C55E" : (p.completionPct || 0) >= 50 ? "#F59E0B" : "#EF4444" }} />
                        </div>
                        <span className="tabular-nums font-medium">{p.completionPct || 0}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 tabular-nums">{budgetPct}%</td>
                    <td className="py-2 px-3 tabular-nums">{riskCount}</td>
                    <td className="py-2 px-3 tabular-nums">{issueCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {projects.length === 0 && !isLoading && (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">No projects found</p>
          )}
          {projects.length > tablePageSize && (
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Showing {(tablePage - 1) * tablePageSize + 1}–{Math.min(tablePage * tablePageSize, projects.length)} of {projects.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  disabled={tablePage === 1}
                  className="p-1 rounded-md hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} className="text-[var(--text-secondary)]" />
                </button>
                {Array.from({ length: Math.ceil(projects.length / tablePageSize) }, (_, i) => i + 1).map((pg) => (
                  <button key={pg} onClick={() => setTablePage(pg)}
                    className={`w-6 h-6 rounded-md text-[11px] font-medium transition-colors ${
                      pg === tablePage
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                    }`}>
                    {pg}
                  </button>
                ))}
                <button
                  onClick={() => setTablePage((p) => Math.min(Math.ceil(projects.length / tablePageSize), p + 1))}
                  disabled={tablePage >= Math.ceil(projects.length / tablePageSize)}
                  className="p-1 rounded-md hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} className="text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
