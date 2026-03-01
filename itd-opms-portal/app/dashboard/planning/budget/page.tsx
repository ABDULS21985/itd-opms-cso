"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  ChevronRight,
  Filter,
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

function varianceBadge(pct: number): string {
  if (pct > 20) return "bg-green-100 text-green-700";
  if (pct > 0) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function varianceColor(pct: number): string {
  if (pct > 20) return "#22C55E";
  if (pct > 0) return "#F59E0B";
  return "#EF4444";
}

const STATUS_LABELS: Record<string, string> = {
  proposed: "Proposed",
  approved: "Approved",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  proposed: "bg-gray-100 text-gray-700",
  approved: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-700",
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortfolioBudgetPage() {
  const router = useRouter();

  /* ---- Filters ---- */
  const [portfolioFilter, setPortfolioFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

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
    return summaryData;
  }, [summaryData]);

  const projects: PortfolioBudgetItem[] = useMemo(() => {
    return summary?.projects ?? [];
  }, [summary]);

  // Chart data: top 10 projects by approved budget
  const chartData = useMemo(() => {
    return [...projects]
      .sort((a, b) => b.approvedBudget - a.approvedBudget)
      .slice(0, 10)
      .map((p) => ({
        name:
          p.projectTitle.length > 20
            ? p.projectTitle.slice(0, 20) + "..."
            : p.projectTitle,
        approved: p.approvedBudget,
        actual: p.actualSpend,
        committed: p.committedSpend,
        remaining: Math.max(0, p.remainingBudget),
      }));
  }, [projects]);

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Portfolio Budget Overview
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Cross-project budget tracking and financial analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--text-secondary)]" />
          <select
            value={portfolioFilter}
            onChange={(e) => {
              setPortfolioFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
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
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <OverviewCard
            label="Total Approved"
            value={NGN.format(summary.totalApproved)}
            icon={<Wallet className="h-5 w-5" />}
            color="var(--primary)"
          />
          <OverviewCard
            label="Total Spent"
            value={NGN.format(summary.totalSpent)}
            icon={<TrendingDown className="h-5 w-5" />}
            color="#3B82F6"
          />
          <OverviewCard
            label="Total Remaining"
            value={NGN.format(summary.totalRemaining)}
            icon={<DollarSign className="h-5 w-5" />}
            color={summary.totalRemaining >= 0 ? "#22C55E" : "#EF4444"}
          />
          <OverviewCard
            label="Avg Variance"
            value={`${summary.avgVariance > 0 ? "+" : ""}${summary.avgVariance.toFixed(1)}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            color={varianceColor(summary.avgVariance)}
          />
        </div>
      )}

      {/* ── Stacked Bar Chart ── */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Budget Allocation by Project
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, bottom: 60, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("en", {
                    notation: "compact",
                  }).format(v)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-0)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                formatter={(value) => NGN_FULL.format(Number(value))}
              />
              <Legend />
              <Bar
                dataKey="actual"
                name="Actual Spend"
                fill="#3B82F6"
                stackId="budget"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="committed"
                name="Committed"
                fill="#F59E0B"
                stackId="budget"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="remaining"
                name="Remaining"
                fill="#22C55E"
                stackId="budget"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Projects Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
      >
        <div className="border-b border-[var(--border)] p-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Projects
          </h2>
        </div>

        {projects.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-[var(--text-secondary)]">
            No projects found matching the selected filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                    Approved
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                    Spent
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                    Committed
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                    Remaining
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                    Variance
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                    {/* Actions */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.projectId}
                    className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-1)]"
                    onClick={() =>
                      router.push(
                        `/dashboard/planning/projects/${project.projectId}/budget`,
                      )
                    }
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-[var(--text-primary)]">
                          {project.projectTitle}
                        </span>
                        <span className="ml-2 text-xs text-[var(--text-secondary)]">
                          {project.projectCode}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[project.status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_LABELS[project.status] ?? project.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-primary)]">
                      {NGN.format(project.approvedBudget)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-primary)]">
                      {NGN.format(project.actualSpend)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                      {NGN.format(project.committedSpend)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
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
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${varianceBadge(
                          project.variancePct,
                        )}`}
                      >
                        {project.variancePct > 0 ? "+" : ""}
                        {project.variancePct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="inline-block h-4 w-4 text-[var(--text-secondary)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Totals Row ── */}
        {projects.length > 0 && summary && (
          <div className="border-t border-[var(--border)] bg-[var(--surface-1)]">
            <div className="flex items-center px-4 py-3 text-sm font-semibold">
              <span className="flex-1 text-[var(--text-primary)]">
                Total ({projects.length} projects)
              </span>
              <span className="w-32 text-right text-[var(--text-primary)]">
                {NGN.format(summary.totalApproved)}
              </span>
              <span className="w-28 text-right text-[var(--text-primary)]">
                {NGN.format(summary.totalSpent)}
              </span>
              <span className="w-28 text-right text-[var(--text-secondary)]">
                {NGN.format(summary.totalCommitted)}
              </span>
              <span
                className="w-28 text-right font-medium"
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
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${varianceBadge(
                    summary.avgVariance,
                  )}`}
                >
                  {summary.avgVariance > 0 ? "+" : ""}
                  {summary.avgVariance.toFixed(1)}%
                </span>
              </span>
              <span className="w-8" />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Card                                                      */
/* ------------------------------------------------------------------ */

function OverviewCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </p>
          <p className="mt-0.5 text-xl font-bold" style={{ color }}>
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
