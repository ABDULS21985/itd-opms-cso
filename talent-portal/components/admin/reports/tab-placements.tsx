"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Target,
  Zap,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { colorAlpha } from "@/lib/color-utils";
import { ChartCard } from "./chart-card";
import { C, CHART_COLORS, STATUS_COLORS, tooltipStyle, fmt, pct } from "./shared";
import type {
  ReportsOverview,
  PlacementReport,
  TimeMetrics,
} from "@/hooks/use-reports";

interface TabPlacementsProps {
  overview: ReportsOverview;
  placementReport?: PlacementReport;
  timeMetrics?: TimeMetrics;
}

export function TabPlacements({
  overview,
  placementReport,
  timeMetrics,
}: TabPlacementsProps) {
  const totalPlacements = overview.placements?.total ?? 0;
  const activePlacements = overview.placements?.active ?? 0;
  const completedPlacements = placementReport?.completedPlacements ?? 0;
  const avgTimeToPlace = placementReport?.averageTimeToPlace ?? 0;
  const successRate = pct(completedPlacements, totalPlacements);

  // Status distribution
  const statusData = useMemo(() => {
    if (!placementReport?.byStatus) return [];
    return placementReport.byStatus.map((r, i) => ({
      name: fmt(typeof r.status === "string" ? r.status : ""),
      value: typeof r.count === "number" ? r.count : parseInt(String(r.count), 10) || 0,
      fill: STATUS_COLORS[r.status] || CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [placementReport]);

  // Type distribution
  const typeData = useMemo(() => {
    if (!placementReport?.byType) return [];
    return placementReport.byType.map((t, i) => ({
      name: fmt(t.type),
      value: t.count,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [placementReport]);

  // Intro request pipeline
  const introPipeline = useMemo(() => {
    if (!timeMetrics?.introsByStatus) return [];
    return timeMetrics.introsByStatus.map((r, i) => ({
      name: fmt(r.status),
      value: parseInt(String(r.count), 10),
      fill: STATUS_COLORS[r.status] || CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [timeMetrics]);

  // Funnel stages (vertical with bars)
  const funnelStages = useMemo(() => {
    const stages: { label: string; status: string; count: number; color: string }[] = [
      { label: "In Discussion", status: "IN_DISCUSSION", count: 0, color: C.orange },
      { label: "Interviewing", status: "INTERVIEWING", count: 0, color: C.purple },
      { label: "Offer", status: "OFFER", count: 0, color: C.amber },
      { label: "Placed", status: "PLACED", count: 0, color: C.green },
      { label: "Completed", status: "COMPLETED", count: 0, color: C.emerald },
    ];

    if (placementReport?.byStatus) {
      for (const s of placementReport.byStatus) {
        const match = stages.find((st) => st.status === s.status);
        if (match) match.count = typeof s.count === "number" ? s.count : parseInt(String(s.count), 10) || 0;
      }
    }

    return stages;
  }, [placementReport]);

  const maxFunnel = Math.max(...funnelStages.map((s) => s.count), 1);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Placements", value: totalPlacements.toLocaleString(), color: C.green, icon: TrendingUp },
          { label: "Active", value: activePlacements.toLocaleString(), color: C.primaryLight, icon: Zap },
          { label: "Completed", value: completedPlacements.toLocaleString(), color: C.emerald, icon: CheckCircle2 },
          { label: "Avg. Time to Place", value: avgTimeToPlace > 0 ? `${avgTimeToPlace}d` : "\u2014", color: C.orange, icon: Clock },
          { label: "Success Rate", value: `${successRate}%`, color: C.primary, icon: Target },
        ].map((kpi) => {
          const KIcon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: colorAlpha(kpi.color, 0.07) }}
              >
                <KIcon size={20} style={{ color: kpi.color }} />
              </div>
              <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight leading-none">
                {kpi.value}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5 font-medium">{kpi.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Funnel + status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Placement Funnel" subtitle="Pipeline progression by stage" icon={BarChart3}>
          <div className="space-y-3">
            {funnelStages.map((stage, i) => (
              <div key={stage.status} className="flex items-center gap-3">
                <div className="w-24 text-right shrink-0">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">{stage.label}</p>
                </div>
                <div className="flex-1 relative">
                  <motion.div
                    className="h-9 rounded-lg flex items-center px-3"
                    style={{
                      background: `linear-gradient(90deg, ${stage.color}20, ${stage.color}40)`,
                      borderLeft: `3px solid ${stage.color}`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(15, (stage.count / maxFunnel) * 100)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  >
                    <span className="text-sm font-bold" style={{ color: stage.color }}>
                      {stage.count}
                    </span>
                  </motion.div>
                </div>
                {i < funnelStages.length - 1 && funnelStages[i].count > 0 && (
                  <div className="w-14 text-right shrink-0">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">
                      {Math.round((funnelStages[i + 1].count / funnelStages[i].count) * 100) || 0}%
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Status Distribution" subtitle="Current placement statuses" icon={PieIcon}>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {statusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(v: string) => <span className="text-[var(--text-secondary)]">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
              No placement data
            </div>
          )}
        </ChartCard>
      </div>

      {/* Time metrics */}
      <ChartCard title="Pipeline Velocity" subtitle="Average duration between milestones" icon={Clock}>
        <div className="flex items-center gap-2 py-6">
          {[
            { label: "Avg. Response", value: timeMetrics?.avgDaysToResponse ?? 0, icon: Zap, color: C.primaryLight },
            { label: "Avg. to Interview", value: timeMetrics?.avgDaysToInterview ?? 0, icon: Target, color: C.orange },
            { label: "Avg. to Placement", value: timeMetrics?.avgDaysToPlacement ?? 0, icon: CheckCircle2, color: C.green },
          ].map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <div key={step.label} className="contents">
                {idx > 0 && (
                  <div className="shrink-0 text-[var(--text-muted)]">
                    <ArrowRight size={20} />
                  </div>
                )}
                <div className="flex-1 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: colorAlpha(step.color, 0.07) }}
                  >
                    <StepIcon size={24} style={{ color: step.color }} />
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {step.value > 0 ? step.value : "\u2014"}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">days</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{step.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* Placement type + Intro pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {typeData.length > 0 && (
          <ChartCard title="Placement Types" subtitle="Type distribution" icon={PieIcon}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={55}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {typeData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(v: string) => <span className="text-[var(--text-secondary)]">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {introPipeline.length > 0 && (
          <ChartCard title="Intro Request Pipeline" subtitle="Status breakdown" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={introPipeline} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48} name="Requests">
                  {introPipeline.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </motion.div>
  );
}
