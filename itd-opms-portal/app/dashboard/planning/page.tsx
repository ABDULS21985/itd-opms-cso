"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FolderKanban,
  Briefcase,
  ListTodo,
  Milestone,
  AlertTriangle,
  AlertCircle,
  FileEdit,
  Plus,
  ArrowRight,
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  DollarSign,
  Clock,
  TrendingUp,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useProjects,
  useOverdueWorkItems,
  useRisks,
  useIssues,
  useChangeRequests,
  usePortfolios,
  useMilestones,
} from "@/hooks/use-planning";
import {
  useExecutiveSummary,
  useProjectsByRAG,
  useProjectsByStatus,
  useProjectsByPriority,
  useRisksByCategory,
  useRecentActivity,
  useMyTasks,
  useUpcomingEvents,
} from "@/hooks/use-reporting";
import { EnhancedKPICard } from "@/components/dashboard/enhanced-kpi-card";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { MiniBarChart } from "@/components/dashboard/charts/mini-bar-chart";
import { ProgressRing } from "@/components/dashboard/charts/progress-ring";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const RAG_COLORS: Record<string, string> = {
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  Green: "#22C55E",
  Amber: "#F59E0B",
  Red: "#EF4444",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#1B7340",
  planning: "#3B82F6",
  on_hold: "#F59E0B",
  completed: "#22C55E",
  cancelled: "#9CA3AF",
  draft: "#6366F1",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#22C55E",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function daysUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days}d`;
}

/* ------------------------------------------------------------------ */
/*  Module Card Definition                                             */
/* ------------------------------------------------------------------ */

interface ModuleCard {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string;
  count?: number;
  loading?: boolean;
  countLabel?: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PlanningHubPage() {
  const { user } = useAuth();

  // Planning data
  const { data: projectsData, isLoading: projectsLoading } = useProjects(1, 1, undefined, "active");
  const { data: allProjectsData, isLoading: allProjectsLoading } = useProjects(1, 1);
  const { data: overdueData, isLoading: overdueLoading } = useOverdueWorkItems();
  const { data: risksData, isLoading: risksLoading } = useRisks(1, 1, undefined, "open");
  const { data: issuesData, isLoading: issuesLoading } = useIssues(1, 1, undefined, "open");
  const { data: changeReqData, isLoading: crLoading } = useChangeRequests(1, 1, undefined, "pending");
  const { data: portfoliosData, isLoading: portfoliosLoading } = usePortfolios(1, 1);
  const { data: milestonesData, isLoading: milestonesLoading } = useMilestones();

  // Dashboard / reporting data
  const { data: execSummary, isLoading: execLoading } = useExecutiveSummary();
  const { data: ragData, isLoading: ragLoading } = useProjectsByRAG();
  const { data: statusData, isLoading: statusLoading } = useProjectsByStatus();
  const { data: priorityData, isLoading: priorityLoading } = useProjectsByPriority();
  const { data: riskCatData, isLoading: riskCatLoading } = useRisksByCategory();
  const { data: activityData, isLoading: activityLoading } = useRecentActivity(1, 8);
  const { data: myTasksData, isLoading: myTasksLoading } = useMyTasks();
  const { data: upcomingData, isLoading: upcomingLoading } = useUpcomingEvents(6);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // RAG mini chart data for KPI card
  const ragMiniData = useMemo(() => {
    if (!execSummary) return [];
    return [
      { name: "Green", value: execSummary.projectsRagGreen, color: "#22C55E" },
      { name: "Amber", value: execSummary.projectsRagAmber, color: "#F59E0B" },
      { name: "Red", value: execSummary.projectsRagRed, color: "#EF4444" },
    ];
  }, [execSummary]);

  // Chart data with colors
  const ragChartData = useMemo(() => {
    if (!ragData) return [];
    return (Array.isArray(ragData) ? ragData : []).map((d) => ({
      name: d.label,
      value: d.value,
      color: RAG_COLORS[d.label] || "#9CA3AF",
    }));
  }, [ragData]);

  const statusChartData = useMemo(() => {
    if (!statusData) return [];
    return (Array.isArray(statusData) ? statusData : []).map((d) => ({
      name: d.label,
      value: d.value,
      color: STATUS_COLORS[d.label?.toLowerCase()] || "#9CA3AF",
    }));
  }, [statusData]);

  const priorityChartData = useMemo(() => {
    if (!priorityData) return [];
    return (Array.isArray(priorityData) ? priorityData : []).map((d) => ({
      name: d.label,
      value: d.value,
      color: PRIORITY_COLORS[d.label?.toLowerCase()] || "#9CA3AF",
    }));
  }, [priorityData]);

  const riskCategoryChartData = useMemo(() => {
    if (!riskCatData) return [];
    return (Array.isArray(riskCatData) ? riskCatData : []).map((d) => ({
      name: d.label,
      value: d.value,
    }));
  }, [riskCatData]);

  const activityItems = useMemo(() => {
    if (!activityData) return [];
    return activityData.data || [];
  }, [activityData]);

  const upcomingItems = useMemo(() => {
    if (!upcomingData) return [];
    return Array.isArray(upcomingData) ? upcomingData : [];
  }, [upcomingData]);

  // Module cards
  const moduleCards: ModuleCard[] = [
    {
      title: "Portfolios",
      description: "Strategic project portfolios by fiscal year",
      href: "/dashboard/planning/portfolios",
      icon: FolderKanban,
      color: "#1B7340",
      count: portfoliosData?.meta?.totalItems,
      loading: portfoliosLoading,
      countLabel: "total",
    },
    {
      title: "Projects",
      description: "Project lifecycles, timelines & budgets",
      href: "/dashboard/planning/projects",
      icon: Briefcase,
      color: "#3B82F6",
      count: allProjectsData?.meta?.totalItems,
      loading: allProjectsLoading,
      countLabel: "total",
    },
    {
      title: "Work Items",
      description: "Tasks, stories & deliverables",
      href: "/dashboard/planning/work-items",
      icon: ListTodo,
      color: "#8B5CF6",
    },
    {
      title: "Milestones",
      description: "Key project milestones & deliverables",
      href: "/dashboard/planning/milestones",
      icon: Milestone,
      color: "#06B6D4",
      count: Array.isArray(milestonesData) ? milestonesData.length : undefined,
      loading: milestonesLoading,
      countLabel: "tracked",
    },
    {
      title: "Risks",
      description: "Identify, assess & mitigate risks",
      href: "/dashboard/planning/risks",
      icon: AlertTriangle,
      color: "#F59E0B",
      count: risksData?.meta?.totalItems,
      loading: risksLoading,
      countLabel: "open",
    },
    {
      title: "Issues",
      description: "Track & resolve project blockers",
      href: "/dashboard/planning/issues",
      icon: AlertCircle,
      color: "#EF4444",
      count: issuesData?.meta?.totalItems,
      loading: issuesLoading,
      countLabel: "open",
    },
    {
      title: "Change Requests",
      description: "Scope, schedule & budget changes",
      href: "/dashboard/planning/change-requests",
      icon: FileEdit,
      color: "#F97316",
      count: changeReqData?.meta?.totalItems,
      loading: crLoading,
      countLabel: "pending",
    },
    {
      title: "PIR Reviews",
      description: "Post-implementation reviews",
      href: "/dashboard/planning/pir",
      icon: ClipboardCheck,
      color: "#14B8A6",
    },
    {
      title: "Change Calendar",
      description: "Schedule of upcoming changes",
      href: "/dashboard/planning/calendar",
      icon: CalendarDays,
      color: "#6366F1",
    },
    {
      title: "Budget Overview",
      description: "Financial tracking across projects",
      href: "/dashboard/planning/budget",
      icon: DollarSign,
      color: "#059669",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ======== Header ======== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--primary)]/10">
            <LayoutDashboard size={22} className="text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Planning &amp; PMO
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {greeting}, {user?.displayName || "User"}. Your project management command center.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/planning/portfolios/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-all hover:shadow-sm hover:border-[var(--primary)]/30"
          >
            <Plus size={14} className="text-[var(--primary)]" />
            Portfolio
          </Link>
          <Link
            href="/dashboard/planning/projects/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
          >
            <Plus size={14} />
            New Project
          </Link>
        </div>
      </motion.div>

      {/* ======== KPI Cards Row ======== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <EnhancedKPICard
          label="Active Projects"
          value={projectsData?.meta?.totalItems}
          icon={Briefcase}
          color="#1B7340"
          bgColor="rgba(27, 115, 64, 0.1)"
          isLoading={projectsLoading}
          index={0}
          href="/dashboard/planning/projects"
          subtitle={execSummary ? `${execSummary.projectsRagGreen} on track` : undefined}
        >
          <MiniBarChart data={ragMiniData} height={32} width={64} />
        </EnhancedKPICard>

        <EnhancedKPICard
          label="On-Time Delivery"
          value={execSummary?.onTimeDeliveryPct}
          icon={TrendingUp}
          color="#22C55E"
          bgColor="rgba(34, 197, 94, 0.1)"
          isLoading={execLoading}
          index={1}
          suffix="%"
        >
          <ProgressRing
            value={execSummary?.onTimeDeliveryPct ?? 0}
            size={40}
            strokeWidth={4}
            color="#22C55E"
            showPercentage={false}
            fontSize={10}
          />
        </EnhancedKPICard>

        <EnhancedKPICard
          label="Milestone Burn"
          value={execSummary?.milestoneBurnDownPct}
          icon={Milestone}
          color="#06B6D4"
          bgColor="rgba(6, 182, 212, 0.1)"
          isLoading={execLoading}
          index={2}
          suffix="%"
        >
          <ProgressRing
            value={execSummary?.milestoneBurnDownPct ?? 0}
            size={40}
            strokeWidth={4}
            color="#06B6D4"
            showPercentage={false}
            fontSize={10}
          />
        </EnhancedKPICard>

        <EnhancedKPICard
          label="Overdue Tasks"
          value={Array.isArray(overdueData) ? overdueData.length : undefined}
          icon={Clock}
          color="#EF4444"
          bgColor="rgba(239, 68, 68, 0.1)"
          isLoading={overdueLoading}
          index={3}
          needsAttention={(Array.isArray(overdueData) ? overdueData.length : 0) > 0}
        />

        <EnhancedKPICard
          label="Open Risks"
          value={risksData?.meta?.totalItems}
          icon={AlertTriangle}
          color="#F59E0B"
          bgColor="rgba(245, 158, 11, 0.1)"
          isLoading={risksLoading}
          index={4}
          href="/dashboard/planning/risks"
          subtitle={execSummary ? `${execSummary.highRisks} high, ${execSummary.criticalRisks} critical` : undefined}
          needsAttention={(execSummary?.criticalRisks ?? 0) > 0}
        />

        <EnhancedKPICard
          label="Open Issues"
          value={issuesData?.meta?.totalItems}
          icon={AlertCircle}
          color="#8B5CF6"
          bgColor="rgba(139, 92, 246, 0.1)"
          isLoading={issuesLoading}
          index={5}
          href="/dashboard/planning/issues"
        />
      </div>

      {/* ======== Charts Row ======== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <ChartCard
          title="Projects by RAG"
          delay={0.2}
          isLoading={ragLoading}
          isEmpty={ragChartData.length === 0}
          expandable
          contentHeight={220}
        >
          <DonutChart
            data={ragChartData}
            height={220}
            innerRadius={45}
            outerRadius={70}
            centerLabel="Total"
            showLabel
          />
        </ChartCard>

        <ChartCard
          title="Projects by Status"
          delay={0.25}
          isLoading={statusLoading}
          isEmpty={statusChartData.length === 0}
          expandable
          contentHeight={220}
        >
          <DonutChart
            data={statusChartData}
            height={220}
            innerRadius={45}
            outerRadius={70}
            centerLabel="Projects"
          />
        </ChartCard>

        <ChartCard
          title="Risks by Category"
          delay={0.3}
          isLoading={riskCatLoading}
          isEmpty={riskCategoryChartData.length === 0}
          expandable
          contentHeight={220}
        >
          <DonutChart
            data={riskCategoryChartData}
            height={220}
            innerRadius={45}
            outerRadius={70}
            centerLabel="Risks"
          />
        </ChartCard>

        <ChartCard
          title="Projects by Priority"
          delay={0.35}
          isLoading={priorityLoading}
          isEmpty={priorityChartData.length === 0}
          expandable
          contentHeight={220}
        >
          <DonutChart
            data={priorityChartData}
            height={220}
            innerRadius={45}
            outerRadius={70}
            centerLabel="Priority"
            showLabel
          />
        </ChartCard>
      </div>

      {/* ======== Three-Column: Tasks | Activity | Upcoming ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-xl border p-5"
          style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              My Tasks
            </h3>
            <Zap size={14} className="text-[var(--primary)]" />
          </div>
          {myTasksLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-[var(--surface-2)] animate-pulse" />
              ))}
            </div>
          ) : !myTasksData ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">No tasks found</p>
          ) : (
            <div className="space-y-2.5">
              {[
                { label: "Open Tickets", count: myTasksData.openTickets?.count ?? 0, items: myTasksData.openTickets?.items ?? [], color: "#3B82F6", icon: Circle },
                { label: "Due This Week", count: myTasksData.tasksDueThisWeek?.count ?? 0, items: myTasksData.tasksDueThisWeek?.items ?? [], color: "#F59E0B", icon: Clock },
                { label: "Pending Approvals", count: myTasksData.pendingApprovals?.count ?? 0, items: myTasksData.pendingApprovals?.items ?? [], color: "#8B5CF6", icon: CheckCircle2 },
                { label: "Overdue Items", count: myTasksData.overdueItems?.count ?? 0, items: myTasksData.overdueItems?.items ?? [], color: "#EF4444", icon: AlertCircle },
              ].map((section) => {
                const Icon = section.icon;
                return (
                  <div
                    key={section.label}
                    className="rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon size={13} style={{ color: section.color }} />
                        <span className="text-xs font-medium text-[var(--text-secondary)]">{section.label}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums" style={{ color: section.color }}>
                        {section.count}
                      </span>
                    </div>
                    {section.items.slice(0, 2).map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="block text-xs text-[var(--text-muted)] truncate hover:text-[var(--primary)] transition-colors pl-5"
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-xl border p-5"
          style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
            Recent Activity
          </h3>
          {activityLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-[var(--surface-2)] animate-pulse" />
              ))}
            </div>
          ) : activityItems.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {activityItems.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href={item.entity?.href || "#"}
                  className="group flex items-start gap-2.5 rounded-lg p-2 -mx-2 transition-colors hover:bg-[var(--surface-1)]"
                >
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-[var(--primary)]">
                      {item.actor?.name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-primary)] leading-snug">
                      <span className="font-medium">{item.actor?.name}</span>{" "}
                      <span className="text-[var(--text-muted)]">{item.description}</span>
                    </p>
                    <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(item.timestamp)}</span>
                  </div>
                  <ArrowUpRight size={12} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="rounded-xl border p-5"
          style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
            Upcoming Deadlines
          </h3>
          {upcomingLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-[var(--surface-2)] animate-pulse" />
              ))}
            </div>
          ) : upcomingItems.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">No upcoming deadlines</p>
          ) : (
            <div className="space-y-1">
              {upcomingItems.slice(0, 6).map((event) => {
                const typeColors: Record<string, string> = {
                  deadline: "#EF4444",
                  meeting: "#3B82F6",
                  milestone: "#F59E0B",
                  expiration: "#8B5CF6",
                };
                const color = typeColors[event.type] || "#9CA3AF";
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 rounded-lg p-2.5 -mx-2 transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <div
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0 flex-1">
                      {event.href ? (
                        <Link href={event.href} className="text-xs font-medium text-[var(--text-primary)] truncate block hover:text-[var(--primary)] transition-colors">
                          {event.title}
                        </Link>
                      ) : (
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{event.title}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[10px] font-medium uppercase tracking-wider"
                          style={{ color }}
                        >
                          {event.type}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">{daysUntil(event.date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ======== Quick Actions ======== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "New Portfolio", href: "/dashboard/planning/portfolios/new", icon: FolderKanban },
            { label: "New Project", href: "/dashboard/planning/projects/new", icon: Briefcase },
            { label: "Log Risk", href: "/dashboard/planning/risks", icon: AlertTriangle },
            { label: "Report Issue", href: "/dashboard/planning/issues", icon: AlertCircle },
            { label: "Change Request", href: "/dashboard/planning/change-requests", icon: FileEdit },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-all hover:shadow-sm hover:border-[var(--primary)]/30 hover:bg-[var(--surface-1)]"
              >
                <Plus size={14} className="text-[var(--primary)]" />
                <Icon size={14} className="text-[var(--text-muted)]" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* ======== Planning Modules Grid ======== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Planning Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {moduleCards.map((mod, index) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.03 }}
              >
                <Link
                  href={mod.href}
                  className="group block rounded-xl border p-4 transition-all duration-200 hover:shadow-md hover:border-[var(--primary)]/30"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${mod.color}15` }}
                    >
                      <Icon
                        size={18}
                        style={{ color: mod.color }}
                        className="transition-transform duration-200 group-hover:scale-110"
                      />
                    </div>
                    {mod.count !== undefined && (
                      <div className="text-right">
                        {mod.loading ? (
                          <div className="h-5 w-6 rounded bg-[var(--surface-2)] animate-pulse" />
                        ) : (
                          <span className="text-lg font-bold tabular-nums" style={{ color: mod.color }}>
                            {mod.count}
                          </span>
                        )}
                        {mod.countLabel && !mod.loading && (
                          <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{mod.countLabel}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5 group-hover:text-[var(--primary)] transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                    {mod.description}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1 text-[10px] font-medium text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight size={10} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
