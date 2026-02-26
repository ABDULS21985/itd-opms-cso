"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  MapPin,
  Layers,
  BarChart3,
  Clock,
  PieChart as PieIcon,
  CheckCircle2,
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
import type { ReportsOverview, CandidateReport } from "@/hooks/use-reports";

interface TabCandidatesProps {
  overview: ReportsOverview;
  candidateReport?: CandidateReport;
}

export function TabCandidates({ overview, candidateReport }: TabCandidatesProps) {
  const totalCandidates = overview.candidates?.total ?? 0;
  const approvedCandidates = overview.candidates?.approved ?? 0;
  const pendingProfiles = candidateReport?.pendingProfiles ?? 0;
  const approvalRate = pct(approvedCandidates, totalCandidates);

  // Status distribution
  const statusData = useMemo(() => {
    if (!candidateReport?.byStatus) return [];
    return candidateReport.byStatus.map((r, i) => ({
      name: fmt(r.status),
      value: parseInt(String(r.count), 10),
      fill: STATUS_COLORS[r.status] || CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [candidateReport]);

  // Track distribution
  const trackData = useMemo(() => {
    if (!candidateReport?.byTrack) return [];
    return [...candidateReport.byTrack]
      .sort((a, b) => b.count - a.count)
      .map((t, i) => ({
        name: t.track || "Unassigned",
        value: t.count,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [candidateReport]);

  // Location data
  const locationData = useMemo(() => {
    if (!candidateReport?.byLocation) return [];
    return [...candidateReport.byLocation]
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((l) => ({
        name: l.country,
        value: l.count,
      }));
  }, [candidateReport]);

  // Availability distribution
  const availabilityData = useMemo(() => {
    if (!candidateReport?.byAvailability) return [];
    return candidateReport.byAvailability.map((a, i) => ({
      name: fmt(a.status),
      value: a.count,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [candidateReport]);

  const totalByTrack = trackData.reduce((s, t) => s + t.value, 0);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Candidates", value: totalCandidates.toLocaleString(), color: C.primary, icon: Users },
          { label: "Approved", value: approvedCandidates.toLocaleString(), color: C.green, icon: CheckCircle2 },
          { label: "Pending Review", value: pendingProfiles.toLocaleString(), color: C.orange, icon: Clock },
          { label: "Approval Rate", value: `${approvalRate}%`, color: C.emerald, icon: UserCheck },
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

      {/* Status + Track charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Candidate Status" subtitle="Approval distribution" icon={PieIcon}>
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
              No candidate status data
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Track Distribution"
          subtitle={`${totalByTrack} candidates across ${trackData.length} tracks`}
          icon={Layers}
        >
          {trackData.length > 0 ? (
            <div className="space-y-3">
              {trackData.map((t, idx) => {
                const widthPct = pct(t.value, totalByTrack);
                return (
                  <div key={t.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--text-secondary)] font-medium truncate">{t.name}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                        {t.value.toLocaleString()}
                        <span className="text-[var(--text-muted)] font-normal text-xs ml-1">
                          ({widthPct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--surface-1)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
              No track data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Location chart */}
      <ChartCard
        title="Top Countries of Origin"
        subtitle={`Candidates from ${locationData.length} top countries`}
        icon={MapPin}
      >
        {locationData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(250, locationData.length * 36)}>
            <BarChart
              data={locationData}
              layout="vertical"
              margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" fill={C.primary} radius={[0, 6, 6, 0]} maxBarSize={28} name="Candidates" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-sm text-[var(--text-muted)]">
            No location data available
          </div>
        )}
      </ChartCard>

      {/* Availability distribution */}
      {availabilityData.length > 0 && (
        <ChartCard title="Availability Status" subtitle="Current availability distribution" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={availabilityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={55}
                paddingAngle={3}
                strokeWidth={0}
              >
                {availabilityData.map((entry, idx) => (
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
    </motion.div>
  );
}
