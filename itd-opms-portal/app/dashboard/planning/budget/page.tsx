"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronRight,
  Filter,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Receipt,
  Banknote,
  Activity,
  Search,
  Download,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  X,
  ShieldAlert,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { usePortfolioBudgetSummary } from "@/hooks/use-budget";
import { usePortfolios } from "@/hooks/use-planning";
import type { PortfolioBudgetItem } from "@/hooks/use-budget";
import { EnhancedKPICard } from "@/components/dashboard/enhanced-kpi-card";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { ProgressRing } from "@/components/dashboard/charts/progress-ring";
import { GaugeChart } from "@/components/dashboard/charts/gauge-chart";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { WaterfallChart } from "@/components/dashboard/charts/waterfall-chart";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NGN_FULL = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACT = new Intl.NumberFormat("en", { notation: "compact" });

function varianceBadge(pct: number): string {
  if (pct > 20)
    return "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20";
  if (pct > 0) return "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20";
  return "bg-red-500/10 text-red-600 ring-1 ring-red-500/20";
}

function varianceColor(pct: number): string {
  if (pct > 20) return "#22C55E";
  if (pct > 0) return "#F59E0B";
  return "#EF4444";
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    proposed: "bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20",
    approved: "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20",
    active: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20",
    on_hold: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20",
    completed: "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20",
    cancelled: "bg-red-500/10 text-red-600 ring-1 ring-red-500/20",
  };
  return (
    map[status] ?? "bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20"
  );
}

const STATUS_LABELS: Record<string, string> = {
  proposed: "Proposed",
  approved: "Approved",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PROJECT_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "proposed", label: "Proposed" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/* ---- Sorting ---- */
type SortField =
  | "title"
  | "status"
  | "approved"
  | "spent"
  | "committed"
  | "utilization"
  | "remaining"
  | "variance";
type SortDir = "asc" | "desc";

function getSortValue(p: PortfolioBudgetItem, field: SortField): number | string {
  switch (field) {
    case "title":
      return p.projectTitle.toLowerCase();
    case "status":
      return p.status;
    case "approved":
      return p.approvedBudget;
    case "spent":
      return p.actualSpend;
    case "committed":
      return p.committedSpend;
    case "utilization":
      return p.approvedBudget > 0
        ? ((p.actualSpend + p.committedSpend) / p.approvedBudget) * 100
        : 0;
    case "remaining":
      return p.remainingBudget;
    case "variance":
      return p.variancePct;
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortfolioBudgetPage() {
  const router = useRouter();

  /* ---- Filters ---- */
  const [portfolioFilter, setPortfolioFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("approved");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [riskAlertDismissed, setRiskAlertDismissed] = useState(false);

  /* ---- Data ---- */
  const { data: portfoliosData } = usePortfolios(1, 100);
  const { data: summaryData, isLoading } = usePortfolioBudgetSummary({
    portfolioId: portfolioFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit: 50,
  });

  /* ---- Derived ---- */
  const portfolios = useMemo(() => {
    if (!portfoliosData) return [];
    if (Array.isArray(portfoliosData)) return portfoliosData;
    return (portfoliosData as any).data ?? [];
  }, [portfoliosData]);

  const summary = useMemo(() => {
    if (!summaryData) return null;
    return {
      ...summaryData,
      totalApproved: summaryData.totalApproved ?? 0,
      totalSpent: summaryData.totalSpent ?? 0,
      totalCommitted: summaryData.totalCommitted ?? 0,
      totalRemaining: summaryData.totalRemaining ?? 0,
      avgVariance: summaryData.avgVariance ?? 0,
    };
  }, [summaryData]);

  const allProjects: PortfolioBudgetItem[] = useMemo(() => {
    return summary?.projects ?? [];
  }, [summary]);

  /* Filtered + sorted projects */
  const projects = useMemo(() => {
    let filtered = allProjects;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.projectTitle.toLowerCase().includes(q) ||
          p.projectCode.toLowerCase().includes(q),
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      const cmp =
        typeof aVal === "string" && typeof bVal === "string"
          ? aVal.localeCompare(bVal)
          : (aVal as number) - (bVal as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allProjects, searchQuery, sortField, sortDir]);

  /* At-risk projects */
  const atRiskProjects = useMemo(() => {
    return allProjects.filter((p) => {
      if (p.status === "cancelled" || p.status === "completed") return false;
      const utilization =
        p.approvedBudget > 0
          ? ((p.actualSpend + p.committedSpend) / p.approvedBudget) * 100
          : 0;
      return utilization > 90 || p.variancePct < -10;
    });
  }, [allProjects]);

  /* Utilization percentage */
  const utilizationPct = useMemo(() => {
    if (!summary || summary.totalApproved === 0) return 0;
    return Math.round(
      ((summary.totalSpent + summary.totalCommitted) / summary.totalApproved) *
        100,
    );
  }, [summary]);

  /* Chart data: top 10 projects by approved budget */
  const chartData = useMemo(() => {
    return [...allProjects]
      .sort((a, b) => b.approvedBudget - a.approvedBudget)
      .slice(0, 10)
      .map((p) => ({
        name:
          p.projectTitle.length > 18
            ? p.projectTitle.slice(0, 18) + "..."
            : p.projectTitle,
        approved: p.approvedBudget,
        actual: p.actualSpend,
        committed: p.committedSpend,
        remaining: Math.max(0, p.remainingBudget),
      }));
  }, [allProjects]);

  /* Waterfall data for budget flow */
  const waterfallData = useMemo(() => {
    if (!summary) return [];
    return [
      {
        name: "Approved",
        value: summary.totalApproved,
        type: "total" as const,
      },
      {
        name: "Actual Spend",
        value: -summary.totalSpent,
        type: "decrease" as const,
      },
      {
        name: "Committed",
        value: -summary.totalCommitted,
        type: "decrease" as const,
      },
      {
        name: "Remaining",
        value: summary.totalRemaining,
        type: "total" as const,
      },
    ];
  }, [summary]);

  /* Donut data for status distribution */
  const statusDonutData = useMemo(() => {
    const counts: Record<string, { count: number; budget: number }> = {};
    allProjects.forEach((p) => {
      if (!counts[p.status]) counts[p.status] = { count: 0, budget: 0 };
      counts[p.status].count += 1;
      counts[p.status].budget += p.approvedBudget;
    });
    const colorMap: Record<string, string> = {
      active: "#22C55E",
      approved: "#3B82F6",
      proposed: "#64748B",
      on_hold: "#F59E0B",
      completed: "#8B5CF6",
      cancelled: "#EF4444",
    };
    return Object.entries(counts).map(([status, { budget }]) => ({
      name: STATUS_LABELS[status] ?? status,
      value: budget,
      color: colorMap[status] ?? "#64748B",
    }));
  }, [allProjects]);

  /* Sort handler */
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir(field === "title" || field === "status" ? "asc" : "desc");
      }
    },
    [sortField],
  );

  /* CSV export */
  const handleExportCSV = useCallback(() => {
    const header = [
      "Project",
      "Code",
      "Status",
      "Approved",
      "Spent",
      "Committed",
      "Remaining",
      "Variance %",
    ];
    const rows = projects.map((p) => [
      `"${p.projectTitle}"`,
      p.projectCode,
      STATUS_LABELS[p.status] ?? p.status,
      p.approvedBudget,
      p.actualSpend,
      p.committedSpend,
      p.remainingBudget,
      p.variancePct.toFixed(1),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-overview-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projects]);

  /* ---- Loading skeleton ---- */
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-64 animate-pulse rounded-lg bg-[var(--surface-2)]" />
            <div className="h-4 w-80 animate-pulse rounded-lg bg-[var(--surface-2)]" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-36 animate-pulse rounded-lg bg-[var(--surface-2)]" />
            <div className="h-9 w-32 animate-pulse rounded-lg bg-[var(--surface-2)]" />
          </div>
        </div>
        {/* KPI skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        {/* Utilization skeleton */}
        <div className="h-24 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]" />
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]" />
          <div className="h-80 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]" />
        </div>
        {/* Table skeleton */}
        <div className="h-96 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Portfolio Budget Overview
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Cross-project budget tracking and financial analysis
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4 text-[var(--text-muted)]" />
          <select
            value={portfolioFilter}
            onChange={(e) => {
              setPortfolioFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
          >
            <option value="">All Portfolios</option>
            {portfolios.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </motion.div>
      </div>

      {/* ── Budget Risk Alerts ── */}
      <AnimatePresence>
        {atRiskProjects.length > 0 && !riskAlertDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="relative rounded-xl border p-4"
              style={{
                borderColor: "rgba(239, 68, 68, 0.2)",
                background:
                  "linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)",
              }}
            >
              <button
                onClick={() => setRiskAlertDismissed(true)}
                className="absolute right-3 top-3 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-secondary)]"
              >
                <X size={14} />
              </button>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {atRiskProjects.length} Project
                    {atRiskProjects.length > 1 ? "s" : ""} at Budget Risk
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    These projects have &gt;90% budget utilization or negative
                    variance exceeding 10%
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {atRiskProjects.slice(0, 5).map((p) => {
                      const util =
                        p.approvedBudget > 0
                          ? Math.round(
                              ((p.actualSpend + p.committedSpend) /
                                p.approvedBudget) *
                                100,
                            )
                          : 0;
                      return (
                        <button
                          key={p.projectId}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/dashboard/planning/projects/${p.projectId}/budget`,
                            );
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-500/15 bg-[var(--surface-0)] px-3 py-1.5 text-xs transition-all hover:border-red-500/30 hover:shadow-sm"
                        >
                          <span className="font-medium text-[var(--text-primary)]">
                            {p.projectTitle.length > 25
                              ? p.projectTitle.slice(0, 25) + "..."
                              : p.projectTitle}
                          </span>
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                            {util}% used
                          </span>
                        </button>
                      );
                    })}
                    {atRiskProjects.length > 5 && (
                      <span className="self-center text-xs text-[var(--text-muted)]">
                        +{atRiskProjects.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Cards ── */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <EnhancedKPICard
            label="Total Approved"
            value={NGN.format(summary.totalApproved)}
            icon={Landmark}
            color="var(--primary)"
            bgColor="rgba(27, 115, 64, 0.1)"
            isLoading={false}
            index={0}
            subtitle={`${allProjects.length} project${allProjects.length !== 1 ? "s" : ""}`}
          />
          <EnhancedKPICard
            label="Total Spent"
            value={NGN.format(summary.totalSpent)}
            icon={Receipt}
            color="#3B82F6"
            bgColor="rgba(59, 130, 246, 0.1)"
            isLoading={false}
            index={1}
            trend={
              summary.totalSpent > summary.totalApproved * 0.8 ? "up" : "flat"
            }
            trendValue={
              summary.totalApproved > 0
                ? `${((summary.totalSpent / summary.totalApproved) * 100).toFixed(0)}% of budget`
                : undefined
            }
            needsAttention={summary.totalSpent > summary.totalApproved * 0.9}
          >
            <ProgressRing
              value={
                summary.totalApproved > 0
                  ? (summary.totalSpent / summary.totalApproved) * 100
                  : 0
              }
              size={52}
              strokeWidth={5}
              delay={0.5}
              showPercentage={false}
            />
          </EnhancedKPICard>
          <EnhancedKPICard
            label="Committed"
            value={NGN.format(summary.totalCommitted)}
            icon={Banknote}
            color="#8B5CF6"
            bgColor="rgba(139, 92, 246, 0.1)"
            isLoading={false}
            index={2}
            subtitle={
              summary.totalApproved > 0
                ? `${((summary.totalCommitted / summary.totalApproved) * 100).toFixed(0)}% committed`
                : undefined
            }
          />
          <EnhancedKPICard
            label="Remaining"
            value={NGN.format(summary.totalRemaining)}
            icon={DollarSign}
            color={summary.totalRemaining >= 0 ? "#22C55E" : "#EF4444"}
            bgColor={
              summary.totalRemaining >= 0
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(239, 68, 68, 0.1)"
            }
            isLoading={false}
            index={3}
            needsAttention={summary.totalRemaining < 0}
            trend={summary.totalRemaining >= 0 ? "up" : "down"}
            trendValue={
              summary.totalApproved > 0
                ? `${((summary.totalRemaining / summary.totalApproved) * 100).toFixed(0)}% available`
                : undefined
            }
          />
          <EnhancedKPICard
            label="Avg Variance"
            value={`${summary.avgVariance > 0 ? "+" : ""}${summary.avgVariance.toFixed(1)}%`}
            icon={Activity}
            color={varianceColor(summary.avgVariance)}
            bgColor={`${varianceColor(summary.avgVariance)}18`}
            isLoading={false}
            index={4}
          >
            <GaugeChart
              value={Math.max(0, Math.min(100, 50 + summary.avgVariance))}
              size={56}
              thresholds={{ good: 70, warning: 50 }}
              showValue={false}
              delay={0.6}
            />
          </EnhancedKPICard>
        </div>
      )}

      {/* ── Budget Utilization Strip ── */}
      {summary && summary.totalApproved > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Budget Utilization
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Spent + Committed vs Approved Budget
              </p>
            </div>
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: varianceColor(100 - utilizationPct) }}
            >
              {utilizationPct}%
            </span>
          </div>

          {/* Multi-segment progress bar */}
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-l-full"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(
                  100,
                  (summary.totalSpent / summary.totalApproved) * 100,
                )}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
              style={{ backgroundColor: "#3B82F6" }}
            />
            <motion.div
              className="absolute inset-y-0"
              initial={{ width: 0 }}
              animate={{
                left: `${Math.min(
                  100,
                  (summary.totalSpent / summary.totalApproved) * 100,
                )}%`,
                width: `${Math.min(
                  100 - (summary.totalSpent / summary.totalApproved) * 100,
                  (summary.totalCommitted / summary.totalApproved) * 100,
                )}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.7 }}
              style={{ backgroundColor: "#8B5CF6" }}
            />
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "#3B82F6" }}
              />
              <span className="text-[var(--text-muted)]">
                Actual Spend (
                {(
                  (summary.totalSpent / summary.totalApproved) *
                  100
                ).toFixed(1)}
                %)
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "#8B5CF6" }}
              />
              <span className="text-[var(--text-muted)]">
                Committed (
                {(
                  (summary.totalCommitted / summary.totalApproved) *
                  100
                ).toFixed(1)}
                %)
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "var(--surface-2)" }}
              />
              <span className="text-[var(--text-muted)]">
                Available (
                {(
                  (summary.totalRemaining / summary.totalApproved) *
                  100
                ).toFixed(1)}
                %)
              </span>
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Waterfall Chart */}
        {waterfallData.length > 0 && (
          <ChartCard
            title="Budget Flow"
            subtitle="Approved to Remaining breakdown"
            delay={0.2}
            expandable
          >
            <WaterfallChart
              data={waterfallData}
              height={280}
              formatValue={(v) => NGN.format(Math.abs(v))}
            />
          </ChartCard>
        )}

        {/* Status Distribution Donut */}
        {statusDonutData.length > 0 && (
          <ChartCard
            title="Budget by Status"
            subtitle="Budget allocation across project statuses"
            delay={0.3}
            expandable
          >
            <DonutChart
              data={statusDonutData}
              height={280}
              innerRadius={60}
              outerRadius={90}
              centerLabel="Total"
              centerValue={allProjects.length}
              showLegend
            />
          </ChartCard>
        )}
      </div>

      {/* ── Stacked Bar Chart ── */}
      {chartData.length > 0 && (
        <ChartCard
          title="Budget Allocation by Project"
          subtitle={`Top ${chartData.length} projects by approved budget`}
          delay={0.35}
          expandable
        >
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, bottom: 60, left: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={80}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickFormatter={(v) => COMPACT.format(v)}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-0)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={(value) => NGN_FULL.format(Number(value))}
                cursor={{ fill: "var(--surface-1)", opacity: 0.5 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Bar
                dataKey="actual"
                name="Actual Spend"
                fill="#3B82F6"
                stackId="budget"
                radius={[0, 0, 0, 0]}
                animationBegin={200}
                animationDuration={800}
              />
              <Bar
                dataKey="committed"
                name="Committed"
                fill="#8B5CF6"
                stackId="budget"
                radius={[0, 0, 0, 0]}
                animationBegin={400}
                animationDuration={800}
              />
              <Bar
                dataKey="remaining"
                name="Remaining"
                fill="#22C55E"
                stackId="budget"
                radius={[4, 4, 0, 0]}
                animationBegin={600}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Projects Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
      >
        {/* Table toolbar */}
        <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Projects
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {projects.length}
              {projects.length !== allProjects.length
                ? ` of ${allProjects.length}`
                : ""}{" "}
              project{allProjects.length !== 1 ? "s" : ""}
              {searchQuery ? ` matching "${searchQuery}"` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="h-8 w-48 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] pl-8 pr-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {/* CSV Export */}
            <button
              onClick={handleExportCSV}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
            >
              <Download size={13} />
              Export
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <BarChart3 className="h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">
              {searchQuery
                ? "No projects match your search"
                : "No projects found matching the selected filters"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <SortableHeader
                    label="Project"
                    field="title"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="left"
                    className="pl-5"
                  />
                  <SortableHeader
                    label="Status"
                    field="status"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableHeader
                    label="Approved"
                    field="approved"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Spent"
                    field="spent"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Committed"
                    field="committed"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Utilization"
                    field="utilization"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="left"
                    className="min-w-[160px]"
                  />
                  <SortableHeader
                    label="Remaining"
                    field="remaining"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Variance"
                    field="variance"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {projects.map((project, idx) => {
                    const spendPct =
                      project.approvedBudget > 0
                        ? (project.actualSpend / project.approvedBudget) * 100
                        : 0;
                    const commitPct =
                      project.approvedBudget > 0
                        ? (project.committedSpend / project.approvedBudget) *
                          100
                        : 0;
                    const isAtRisk =
                      spendPct + commitPct > 90 || project.variancePct < -10;

                    return (
                      <motion.tr
                        key={project.projectId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.02 * idx }}
                        className={`group cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-1)] ${
                          isAtRisk ? "bg-red-500/[0.02]" : ""
                        }`}
                        onClick={() =>
                          router.push(
                            `/dashboard/planning/projects/${project.projectId}/budget`,
                          )
                        }
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {isAtRisk && (
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
                                {project.projectTitle}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {project.projectCode}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(project.status)}`}
                          >
                            {STATUS_LABELS[project.status] ?? project.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-[var(--text-primary)]">
                          {NGN.format(project.approvedBudget)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-[var(--text-primary)]">
                          {NGN.format(project.actualSpend)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-[var(--text-muted)]">
                          {NGN.format(project.committedSpend)}
                        </td>
                        {/* Utilization bar inline */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                              <div
                                className="absolute inset-y-0 left-0 rounded-l-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, spendPct)}%`,
                                  backgroundColor:
                                    spendPct + commitPct > 100
                                      ? "#EF4444"
                                      : "#3B82F6",
                                }}
                              />
                              <div
                                className="absolute inset-y-0 transition-all duration-500"
                                style={{
                                  left: `${Math.min(100, spendPct)}%`,
                                  width: `${Math.min(100 - spendPct, commitPct)}%`,
                                  backgroundColor:
                                    spendPct + commitPct > 100
                                      ? "#F59E0B"
                                      : "#8B5CF6",
                                }}
                              />
                            </div>
                            <span
                              className={`w-9 text-right text-[10px] font-semibold tabular-nums ${
                                spendPct + commitPct > 90
                                  ? "text-red-500"
                                  : "text-[var(--text-muted)]"
                              }`}
                            >
                              {Math.round(spendPct + commitPct)}%
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums font-medium">
                          <span
                            style={{
                              color: varianceColor(
                                project.approvedBudget > 0
                                  ? (project.remainingBudget /
                                      project.approvedBudget) *
                                      100
                                  : 0,
                              ),
                            }}
                          >
                            {NGN.format(project.remainingBudget)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${varianceBadge(project.variancePct)}`}
                          >
                            {project.variancePct > 0 ? (
                              <ArrowUpRight size={10} />
                            ) : project.variancePct < 0 ? (
                              <ArrowDownRight size={10} />
                            ) : null}
                            {project.variancePct > 0 ? "+" : ""}
                            {project.variancePct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-2 py-3.5 text-right">
                          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Totals Row ── */}
        {projects.length > 0 && summary && (
          <div className="border-t-2 border-[var(--primary)]/20 bg-[var(--surface-1)]">
            <div className="flex items-center px-5 py-3.5 text-sm font-semibold">
              <span className="flex-1 text-[var(--text-primary)]">
                Total ({allProjects.length} projects)
              </span>
              <span className="w-32 text-right tabular-nums text-[var(--text-primary)]">
                {NGN.format(summary.totalApproved)}
              </span>
              <span className="w-28 text-right tabular-nums text-[var(--text-primary)]">
                {NGN.format(summary.totalSpent)}
              </span>
              <span className="w-28 text-right tabular-nums text-[var(--text-muted)]">
                {NGN.format(summary.totalCommitted)}
              </span>
              <span className="w-40" />
              <span
                className="w-28 text-right tabular-nums font-semibold"
                style={{
                  color: varianceColor(
                    summary.totalApproved > 0
                      ? (summary.totalRemaining / summary.totalApproved) * 100
                      : 0,
                  ),
                }}
              >
                {NGN.format(summary.totalRemaining)}
              </span>
              <span className="w-20 text-right">
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${varianceBadge(summary.avgVariance)}`}
                >
                  {summary.avgVariance > 0 ? "+" : ""}
                  {summary.avgVariance.toFixed(1)}%
                </span>
              </span>
              <span className="w-10" />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable Table Header                                              */
/* ------------------------------------------------------------------ */

function SortableHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const isActive = currentField === field;

  return (
    <th
      className={`px-4 py-3 text-${align} ${className}`}
      onClick={() => onSort(field)}
    >
      <button
        className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
          isActive
            ? "text-[var(--primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        }`}
      >
        {label}
        <span className="flex flex-col">
          {isActive ? (
            currentDir === "asc" ? (
              <ChevronUp size={10} />
            ) : (
              <ChevronDown size={10} />
            )
          ) : (
            <ArrowUpDown size={10} className="opacity-40" />
          )}
        </span>
      </button>
    </th>
  );
}
