"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target,
  Plus,
  ArrowLeft,
  List,
  GitBranch,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  GaugeChart,
  StackedBarChart,
} from "@/components/dashboard/charts";
import { useOKRs, useOKRTree } from "@/hooks/use-governance";
import type { OKR } from "@/types";

/* ------------------------------------------------------------------ */
/*  Progress Bar Component                                              */
/* ------------------------------------------------------------------ */

function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 70 ? "var(--success)" : pct >= 40 ? "#F59E0B" : "var(--error)";

  return (
    <div
      className={`h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Level Badge                                                         */
/* ------------------------------------------------------------------ */

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    department: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
    division: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
    office: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
    unit: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  };
  const c = colors[level] || colors.unit;

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {level}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Tree Node Component                                                 */
/* ------------------------------------------------------------------ */

function OKRTreeNode({
  okr,
  depth = 0,
  onSelect,
}: {
  okr: OKR;
  depth?: number;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = okr.children && okr.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--surface-1)] cursor-pointer group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => onSelect(okr.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
          >
            {expanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <LevelBadge level={okr.level} />
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {okr.objective}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-24">
              <ProgressBar value={okr.progressPct ?? 0} />
            </div>
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              {okr.progressPct ?? 0}%
            </span>
            <StatusBadge status={okr.status} />
          </div>
        </div>
      </div>
      {hasChildren && expanded && (
        <div>
          {okr.children!.map((child) => (
            <OKRTreeNode
              key={child.id}
              okr={child}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  View Toggle                                                         */
/* ------------------------------------------------------------------ */

type ViewMode = "list" | "tree";

/* ------------------------------------------------------------------ */
/*  Analytics Helpers                                                   */
/* ------------------------------------------------------------------ */

function computeOKRStats(okrs: OKR[]) {
  const total = okrs.length;
  if (total === 0)
    return { total: 0, active: 0, completed: 0, avgProgress: 0, completionRate: 0, atRisk: 0, needsAttention: 0 };
  const active = okrs.filter((o) => o.status === "active").length;
  const completed = okrs.filter((o) => o.status === "completed").length;
  const avgProgress = Math.round(okrs.reduce((s, o) => s + (o.progressPct ?? 0), 0) / total);
  const completionRate = Math.round((completed / total) * 100);
  const atRisk = okrs.filter((o) => o.status === "active" && (o.progressPct ?? 0) < 40).length;
  const needsAttention = okrs.filter((o) => o.status === "active" && (o.progressPct ?? 0) >= 40 && (o.progressPct ?? 0) < 70).length;
  return { total, active, completed, avgProgress, completionRate, atRisk, needsAttention };
}

function computeProgressDistribution(okrs: OKR[]) {
  const bands = { onTrack: 0, attention: 0, risk: 0 };
  for (const o of okrs) {
    const p = o.progressPct ?? 0;
    if (p >= 70) bands.onTrack++;
    else if (p >= 40) bands.attention++;
    else bands.risk++;
  }
  return [
    { name: "On Track (70-100%)", value: bands.onTrack, color: "#22C55E" },
    { name: "Needs Attention (40-69%)", value: bands.attention, color: "#F59E0B" },
    { name: "At Risk (0-39%)", value: bands.risk, color: "#EF4444" },
  ];
}

function computeStatusBreakdown(okrs: OKR[]) {
  const STATUS_COLORS: Record<string, string> = {
    draft: "#9CA3AF", active: "#3B82F6", completed: "#22C55E", cancelled: "#EF4444",
  };
  const counts: Record<string, number> = {};
  for (const o of okrs) {
    const s = o.status || "draft";
    counts[s] = (counts[s] || 0) + 1;
  }
  return Object.entries(counts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: STATUS_COLORS[name] || "#9CA3AF",
  }));
}

function computeLevelStatusData(okrs: OKR[]) {
  const levelMap: Record<string, Record<string, number>> = {};
  const allStatuses = new Set<string>();
  for (const o of okrs) {
    const level = o.level || "unknown";
    const status = o.status || "draft";
    allStatuses.add(status);
    if (!levelMap[level]) levelMap[level] = {};
    levelMap[level][status] = (levelMap[level][status] || 0) + 1;
  }
  const categories = Array.from(allStatuses).sort();
  const data = Object.entries(levelMap).map(([name, statuses]) => {
    const row: Record<string, string | number> = { name: name.charAt(0).toUpperCase() + name.slice(1) };
    for (const s of categories) row[s] = statuses[s] || 0;
    return row;
  });
  return { data, categories };
}

function computeLevelProgress(okrs: OKR[]) {
  const levelMap: Record<string, { sum: number; count: number }> = {};
  for (const o of okrs) {
    const level = o.level || "unknown";
    if (!levelMap[level]) levelMap[level] = { sum: 0, count: 0 };
    levelMap[level].sum += o.progressPct ?? 0;
    levelMap[level].count++;
  }
  return Object.entries(levelMap).map(([level, { sum, count }]) => ({
    level: level.charAt(0).toUpperCase() + level.slice(1),
    avgProgress: Math.round(sum / count),
    count,
  }));
}

function computePeriodData(okrs: OKR[]) {
  const periodMap: Record<string, Record<string, number>> = {};
  const allStatuses = new Set<string>();
  for (const o of okrs) {
    const period = o.period || "Unknown";
    const status = o.status || "draft";
    allStatuses.add(status);
    if (!periodMap[period]) periodMap[period] = {};
    periodMap[period][status] = (periodMap[period][status] || 0) + 1;
  }
  const categories = Array.from(allStatuses).sort();
  const data = Object.entries(periodMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, statuses]) => {
      const row: Record<string, string | number> = { name };
      for (const s of categories) row[s] = statuses[s] || 0;
      return row;
    });
  return { data, categories };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OKRListPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);

  /* Filters */
  const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
  const [periodFilter, setPeriodFilter] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );

  /* Data hooks */
  const { data: okrsData, isLoading: listLoading } = useOKRs(
    page,
    20,
    levelFilter,
    periodFilter,
    statusFilter,
  );
  const { data: _treeData, isLoading: _treeLoading } = useOKRTree(undefined);

  /* Analytics: fetch all OKRs (unfiltered) for dashboard computations */
  const { data: allOkrsData, isLoading: analyticsLoading } = useOKRs(1, 200);
  const allOkrs: OKR[] = allOkrsData?.data ?? [];

  const stats = useMemo(() => computeOKRStats(allOkrs), [allOkrs]);
  const progressDistData = useMemo(() => computeProgressDistribution(allOkrs), [allOkrs]);
  const statusData = useMemo(() => computeStatusBreakdown(allOkrs), [allOkrs]);
  const levelStatusData = useMemo(() => computeLevelStatusData(allOkrs), [allOkrs]);
  const levelProgress = useMemo(() => computeLevelProgress(allOkrs), [allOkrs]);
  const periodData = useMemo(() => computePeriodData(allOkrs), [allOkrs]);

  const okrs = okrsData?.data ?? [];
  const meta = okrsData?.meta;

  /* Note: useOKRTree(undefined) won't fire because enabled: !!id is false.
     We need all root OKRs. We'll use the list view data for tree as well,
     since the tree endpoint returns a single OKR. For the tree view,
     we'll use list data with children if available. */
  const treeRoots = okrs.filter((o) => !o.parentId);

  /* ------------------------------------------------------------------ */
  /*  List columns                                                       */
  /* ------------------------------------------------------------------ */

  const columns: Column<OKR>[] = [
    {
      key: "objective",
      header: "Objective",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-[var(--text-primary)]">
          {item.objective}
        </span>
      ),
      className: "min-w-[250px]",
    },
    {
      key: "level",
      header: "Level",
      render: (item) => <LevelBadge level={item.level} />,
    },
    {
      key: "period",
      header: "Period",
      sortable: true,
      render: (item) => (
        <span className="text-[var(--text-secondary)]">{item.period}</span>
      ),
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => (
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {item.ownerId.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "progressPct",
      header: "Progress",
      render: (item) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <ProgressBar value={item.progressPct ?? 0} className="flex-1" />
          <span className="text-xs tabular-nums text-[var(--text-secondary)] w-8 text-right">
            {item.progressPct ?? 0}%
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/governance"
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Objectives & Key Results
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Set and track objectives across department, division, office, and
              unit levels.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/governance/okrs/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Plus size={16} />
          New OKR
        </Link>
      </motion.div>

      {/* ── Analytics Dashboard ── */}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPIStatCard
          label="Total OKRs"
          value={stats.total}
          icon={Target}
          color="#1B7340"
          bgColor="rgba(27, 115, 64, 0.1)"
          isLoading={analyticsLoading}
          index={0}
          subtitle={`${stats.active} active`}
          hint="Total Objectives across all levels and periods."
        />
        <KPIStatCard
          label="Avg Progress"
          value={stats.avgProgress}
          suffix="%"
          icon={TrendingUp}
          color="#3B82F6"
          bgColor="rgba(59, 130, 246, 0.1)"
          isLoading={analyticsLoading}
          index={1}
          subtitle={stats.avgProgress >= 70 ? "On track" : stats.avgProgress >= 40 ? "Needs attention" : "At risk"}
          hint="Average progress percentage across all OKRs."
        />
        <KPIStatCard
          label="Completion Rate"
          value={stats.completionRate}
          suffix="%"
          icon={CheckCircle2}
          color="#22C55E"
          bgColor="rgba(34, 197, 94, 0.1)"
          isLoading={analyticsLoading}
          index={2}
          subtitle={`${stats.completed} of ${stats.total} completed`}
          hint="Percentage of OKRs with completed status."
        />
        <KPIStatCard
          label="At Risk"
          value={stats.atRisk}
          icon={AlertTriangle}
          color="#EF4444"
          bgColor="rgba(239, 68, 68, 0.1)"
          isLoading={analyticsLoading}
          index={3}
          subtitle={`${stats.needsAttention} need attention`}
          hint="Active OKRs with progress below 40%."
        />
      </div>

      {/* Chart Row 1: Progress Distribution + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Progress Distribution"
          subtitle="OKRs grouped by progress health"
          delay={0.15}
          isLoading={analyticsLoading}
          isEmpty={allOkrs.length === 0}
          expandable
        >
          <DonutChart
            data={progressDistData}
            height={240}
            innerRadius={50}
            outerRadius={80}
            centerLabel="OKRs"
            centerValue={stats.total}
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="Status Breakdown"
          subtitle="OKRs by current status"
          delay={0.2}
          isLoading={analyticsLoading}
          isEmpty={allOkrs.length === 0}
          expandable
        >
          <DonutChart
            data={statusData}
            height={240}
            innerRadius={50}
            outerRadius={80}
            centerLabel="Status"
            centerValue={stats.total}
            showLegend
          />
        </ChartCard>
      </div>

      {/* Chart Row 2: By Level + Level Progress + Period */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard
          title="OKRs by Level"
          subtitle="Distribution across organizational levels"
          delay={0.25}
          isLoading={analyticsLoading}
          isEmpty={allOkrs.length === 0}
          expandable
        >
          <StackedBarChart
            data={levelStatusData.data}
            categories={levelStatusData.categories}
            height={220}
            layout="vertical"
            colors={["#3B82F6", "#EF4444", "#22C55E", "#9CA3AF"]}
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="Avg Progress by Level"
          subtitle="Average completion per organizational level"
          delay={0.3}
          isLoading={analyticsLoading}
          isEmpty={allOkrs.length === 0}
        >
          <div className="flex items-center justify-around flex-wrap gap-4 py-2">
            {levelProgress.map((lp, i) => (
              <div key={lp.level} className="flex flex-col items-center">
                <GaugeChart
                  value={lp.avgProgress}
                  size={90}
                  label={lp.level}
                  delay={0.35 + i * 0.05}
                  suffix="%"
                  showValue
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1">
                  {lp.count} OKR{lp.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Period Comparison"
          subtitle="OKRs across different periods"
          delay={0.35}
          isLoading={analyticsLoading}
          isEmpty={allOkrs.length === 0}
          expandable
        >
          <StackedBarChart
            data={periodData.data}
            categories={periodData.categories}
            height={220}
            colors={["#3B82F6", "#EF4444", "#22C55E", "#9CA3AF"]}
            showLegend
          />
        </ChartCard>
      </div>

      {/* Section divider */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          All Objectives
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
      </motion.div>

      {/* Controls: View toggle + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="flex flex-wrap items-center gap-3"
      >
        {/* View toggle */}
        <div
          className="flex items-center gap-1 rounded-xl border p-1"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              viewMode === "list"
                ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <List size={14} />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              viewMode === "tree"
                ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <GitBranch size={14} />
            Tree
          </button>
        </div>

        {/* Filters */}
        <select
          value={levelFilter || ""}
          onChange={(e) => {
            setLevelFilter(e.target.value || undefined);
            setPage(1);
          }}
          className="rounded-xl border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <option value="">All Levels</option>
          <option value="department">Department</option>
          <option value="division">Division</option>
          <option value="office">Office</option>
          <option value="unit">Unit</option>
        </select>

        <input
          type="text"
          value={periodFilter || ""}
          onChange={(e) => {
            setPeriodFilter(e.target.value || undefined);
            setPage(1);
          }}
          placeholder="Filter by period..."
          className="rounded-xl border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        />

        <select
          value={statusFilter || ""}
          onChange={(e) => {
            setStatusFilter(e.target.value || undefined);
            setPage(1);
          }}
          className="rounded-xl border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        {viewMode === "list" ? (
          <DataTable
            columns={columns}
            data={okrs}
            keyExtractor={(item) => item.id}
            loading={listLoading}
            emptyTitle="No OKRs found"
            emptyDescription="Create your first OKR to start tracking objectives."
            emptyAction={
              <Link
                href="/dashboard/governance/okrs/new"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <Plus size={16} />
                New OKR
              </Link>
            }
            onRowClick={(item) =>
              router.push(`/dashboard/governance/okrs/${item.id}`)
            }
            pagination={
              meta
                ? {
                    currentPage: meta.page,
                    totalPages: meta.totalPages,
                    totalItems: meta.totalItems,
                    pageSize: meta.pageSize,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        ) : (
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            {listLoading ? (
              <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
                Loading OKR tree...
              </div>
            ) : treeRoots.length === 0 ? (
              <div className="p-8 text-center">
                <Target
                  size={32}
                  className="mx-auto mb-2 text-[var(--text-secondary)] opacity-40"
                />
                <p className="text-sm text-[var(--text-secondary)]">
                  No OKRs found. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {treeRoots.map((okr) => (
                  <OKRTreeNode
                    key={okr.id}
                    okr={okr}
                    onSelect={(id) =>
                      router.push(`/dashboard/governance/okrs/${id}`)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
