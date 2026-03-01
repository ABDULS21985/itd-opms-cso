"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  Cell,
  Treemap,
} from "recharts";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import {
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { LEVEL_COLORS } from "./constants";
import type { OrgTreeNode, OrgAnalyticsResponse } from "@/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AnalyticsTabProps {
  tree: OrgTreeNode[];
  analytics?: OrgAnalyticsResponse;
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Get solid color for a level. */
function getLevelSolidColor(level: string): string {
  return LEVEL_COLORS[level.toLowerCase()]?.text ?? "#6B7280";
}

/** Compute client-side health matrix from tree. */
function computeHealthMatrix(tree: OrgTreeNode[]) {
  const rows: {
    id: string;
    name: string;
    level: string;
    manager: string;
    directReports: number;
    totalHeadcount: number;
    depth: number;
    healthScore: number;
  }[] = [];

  function walk(nodes: OrgTreeNode[], depth: number) {
    for (const node of nodes) {
      const directReports = node.children?.length ?? 0;
      let totalHC = node.userCount;

      function sumHC(n: OrgTreeNode) {
        for (const c of n.children ?? []) {
          totalHC += c.userCount;
          sumHC(c);
        }
      }
      sumHC(node);

      // Health score: 0-100
      let score = 100;
      if (!node.managerName) score -= 30; // no manager
      if (node.userCount === 0) score -= 20; // no users
      if (directReports > 10) score -= 20; // too many direct reports
      else if (directReports > 8) score -= 10;
      if (depth > 5) score -= 10; // too deep
      score = Math.max(0, score);

      rows.push({
        id: node.id,
        name: node.name,
        level: node.level,
        manager: node.managerName || "\u2014",
        directReports,
        totalHeadcount: totalHC,
        depth,
        healthScore: score,
      });

      if (node.children?.length) walk(node.children, depth + 1);
    }
  }

  walk(tree, 1);
  return rows;
}

/** Build treemap data from tree. */
function buildTreemapData(tree: OrgTreeNode[]) {
  return tree.map((node) => {
    let totalUsers = node.userCount;
    let maxDepth = 1;

    function walk(n: OrgTreeNode, d: number) {
      for (const c of n.children ?? []) {
        totalUsers += c.userCount;
        if (d + 1 > maxDepth) maxDepth = d + 1;
        walk(c, d + 1);
      }
    }
    walk(node, 1);

    return {
      name: node.name,
      size: Math.max(totalUsers, 1),
      depth: maxDepth,
      level: node.level,
      color: getLevelSolidColor(node.level),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AnalyticsTab({
  tree,
  analytics,
  isLoading,
}: AnalyticsTabProps) {
  const [healthSearch, setHealthSearch] = useState("");
  const [healthSort, setHealthSort] = useState<{
    col: string;
    dir: "asc" | "desc";
  }>({ col: "healthScore", dir: "asc" });
  const [healthPage, setHealthPage] = useState(0);
  const PAGE_SIZE = 10;

  /* ---------- Headcount by level chart data ---------- */
  const headcountData = useMemo(() => {
    if (analytics?.headcountByLevel?.length) {
      return analytics.headcountByLevel.map((h) => ({
        level: h.level.charAt(0).toUpperCase() + h.level.slice(1),
        headcount: h.count,
        units: h.unitCount,
        color: getLevelSolidColor(h.level),
      }));
    }
    // Client-side fallback from tree
    const map: Record<string, { headcount: number; units: number }> = {};
    function walk(nodes: OrgTreeNode[]) {
      for (const n of nodes) {
        if (!map[n.level]) map[n.level] = { headcount: 0, units: 0 };
        map[n.level].headcount += n.userCount;
        map[n.level].units++;
        if (n.children?.length) walk(n.children);
      }
    }
    walk(tree);
    return Object.entries(map).map(([level, data]) => ({
      level: level.charAt(0).toUpperCase() + level.slice(1),
      headcount: data.headcount,
      units: data.units,
      color: getLevelSolidColor(level),
    }));
  }, [tree, analytics]);

  /* ---------- Span of control distribution ---------- */
  const spanData = useMemo(() => {
    if (analytics?.spanDistribution?.length) return analytics.spanDistribution;
    // Client-side fallback
    const buckets: Record<string, number> = {
      "1-3": 0,
      "4-6": 0,
      "7-10": 0,
      "10+": 0,
    };
    function walk(nodes: OrgTreeNode[]) {
      for (const n of nodes) {
        const c = n.children?.length ?? 0;
        if (c > 0) {
          if (c <= 3) buckets["1-3"]++;
          else if (c <= 6) buckets["4-6"]++;
          else if (c <= 10) buckets["7-10"]++;
          else buckets["10+"]++;
        }
        if (n.children?.length) walk(n.children);
      }
    }
    walk(tree);
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [tree, analytics]);

  /* ---------- Treemap data ---------- */
  const treemapData = useMemo(() => buildTreemapData(tree), [tree]);

  /* ---------- Health matrix ---------- */
  const healthRows = useMemo(() => computeHealthMatrix(tree), [tree]);

  const filteredHealth = useMemo(() => {
    let rows = healthRows;
    if (healthSearch.trim()) {
      const q = healthSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.level.toLowerCase().includes(q) ||
          r.manager.toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => {
      const col = healthSort.col as keyof (typeof healthRows)[0];
      const aVal = a[col];
      const bVal = b[col];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return healthSort.dir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return healthSort.dir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return rows;
  }, [healthRows, healthSearch, healthSort]);

  const healthPageCount = Math.ceil(filteredHealth.length / PAGE_SIZE);
  const healthPageData = filteredHealth.slice(
    healthPage * PAGE_SIZE,
    (healthPage + 1) * PAGE_SIZE,
  );

  /* ---------- Growth timeline ---------- */
  const growthData = analytics?.growthTimeline ?? [];

  /* ---------- Recent changes ---------- */
  const recentChanges = analytics?.recentChanges ?? [];

  /* ---------- Sort toggle ---------- */
  const toggleSort = (col: string) => {
    setHealthSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "desc" },
    );
  };

  /* ---------- Shared tooltip style ---------- */
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      fontSize: 12,
      color: "var(--text-primary)",
    },
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      {/* Row 1: Headcount + Span */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Headcount Distribution by Level"
          isLoading={isLoading}
          isEmpty={headcountData.length === 0}
          contentHeight={280}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={headcountData}
              layout="vertical"
              margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <YAxis
                type="category"
                dataKey="level"
                width={90}
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value?: number) => [value ?? 0, "Headcount"]}
              />
              <Bar dataKey="headcount" radius={[0, 6, 6, 0]} barSize={24}>
                {headcountData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Span of Control Distribution"
          subtitle="Ideal range: 4-8 direct reports"
          isLoading={isLoading}
          isEmpty={spanData.length === 0}
          contentHeight={280}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={spanData}
              margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip
                {...tooltipStyle}
                formatter={(value?: number) => [value ?? 0, "Managers"]}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                {spanData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.range === "4-6"
                        ? "#10B981"
                        : entry.range === "7-10"
                          ? "#F59E0B"
                          : entry.range === "10+"
                            ? "#EF4444"
                            : "#3B82F6"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Treemap + Health Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Hierarchy Balance"
          subtitle="Size = headcount, color = level"
          isLoading={isLoading}
          isEmpty={treemapData.length === 0}
          contentHeight={280}
        >
          <ResponsiveContainer width="100%" height={280}>
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="var(--surface-0)"
              content={({ x, y, width, height, name, color }: any) => {
                if (width < 30 || height < 20) return <g />;
                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={color}
                      rx={4}
                      opacity={0.85}
                    />
                    {width > 50 && height > 25 && (
                      <text
                        x={x + width / 2}
                        y={y + height / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize={Math.min(12, width / 8)}
                        fontWeight={600}
                      >
                        {String(name).length > width / 8
                          ? String(name).slice(0, Math.floor(width / 8)) +
                            "\u2026"
                          : name}
                      </text>
                    )}
                  </g>
                );
              }}
            />
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Unit Health Matrix"
          isLoading={isLoading}
          isEmpty={healthRows.length === 0}
          contentHeight={280}
        >
          <div className="flex flex-col h-[280px]">
            {/* Search */}
            <div className="relative mb-2">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
              />
              <input
                type="text"
                value={healthSearch}
                onChange={(e) => {
                  setHealthSearch(e.target.value);
                  setHealthPage(0);
                }}
                placeholder="Search units..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto text-xs">
              <table className="w-full">
                <thead className="sticky top-0 bg-[var(--surface-0)]">
                  <tr className="border-b border-[var(--border)]">
                    {[
                      { key: "name", label: "Unit" },
                      { key: "level", label: "Level" },
                      { key: "directReports", label: "Reports" },
                      { key: "totalHeadcount", label: "HC" },
                      { key: "healthScore", label: "Health" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className="cursor-pointer px-2 py-1.5 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          <ArrowUpDown
                            size={10}
                            className={
                              healthSort.col === col.key
                                ? "text-[var(--primary)]"
                                : "opacity-30"
                            }
                          />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {healthPageData.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-1)]"
                    >
                      <td className="px-2 py-1.5 font-medium text-[var(--text-primary)] truncate max-w-[140px]">
                        {row.name}
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                          style={{
                            backgroundColor: LEVEL_COLORS[row.level]?.bg,
                            color: LEVEL_COLORS[row.level]?.text,
                          }}
                        >
                          {row.level}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-[var(--text-secondary)] tabular-nums">
                        {row.directReports}
                      </td>
                      <td className="px-2 py-1.5 text-[var(--text-secondary)] tabular-nums">
                        {row.totalHeadcount}
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            row.healthScore >= 80
                              ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]"
                              : row.healthScore >= 50
                                ? "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                                : "bg-[rgba(239,68,68,0.1)] text-[#EF4444]"
                          }`}
                        >
                          {row.healthScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {healthPageCount > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {filteredHealth.length} units &middot; Page {healthPage + 1}/
                  {healthPageCount}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setHealthPage((p) => Math.max(0, p - 1))}
                    disabled={healthPage === 0}
                    className="p-1 rounded hover:bg-[var(--surface-1)] disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setHealthPage((p) =>
                        Math.min(healthPageCount - 1, p + 1),
                      )
                    }
                    disabled={healthPage >= healthPageCount - 1}
                    className="p-1 rounded hover:bg-[var(--surface-1)] disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Row 3: Growth Timeline */}
      {growthData.length > 0 && (
        <ChartCard
          title="Organizational Growth Timeline"
          subtitle="Cumulative units created over time"
          isLoading={isLoading}
          contentHeight={220}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={growthData}
              margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip {...tooltipStyle} />
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#6366F1"
                fill="url(#growthGrad)"
                strokeWidth={2}
                name="Units"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Row 4: Recent Changes */}
      {recentChanges.length > 0 && (
        <ChartCard
          title="Recent Changes"
          subtitle="Latest org structure modifications"
          contentHeight={200}
        >
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {recentChanges.map((change, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--surface-1)]"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    change.action.includes("created")
                      ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]"
                      : change.action.includes("deleted")
                        ? "bg-[rgba(239,68,68,0.1)] text-[#EF4444]"
                        : change.action.includes("moved")
                          ? "bg-[rgba(59,130,246,0.1)] text-[#3B82F6]"
                          : "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                  }`}
                >
                  {change.action.includes("created")
                    ? "+"
                    : change.action.includes("deleted")
                      ? "\u00d7"
                      : change.action.includes("moved")
                        ? "\u2192"
                        : "~"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {change.unitName}
                  </p>
                  <p className="text-[10px] text-[var(--neutral-gray)]">
                    {change.action.replace("org_unit.", "")} by{" "}
                    {change.changedBy}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] shrink-0">
                  <Clock size={10} />
                  {new Date(change.changedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
