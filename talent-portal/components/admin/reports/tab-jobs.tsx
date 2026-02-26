"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Clock,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  CheckCircle2,
  XCircle,
  FileText,
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
import type { ReportsOverview, JobReport } from "@/hooks/use-reports";

interface TabJobsProps {
  overview: ReportsOverview;
  jobReport?: JobReport;
}

export function TabJobs({ overview, jobReport }: TabJobsProps) {
  const totalJobs = overview.jobs?.total ?? 0;
  const publishedJobs = overview.jobs?.published ?? 0;
  const closedJobs = jobReport?.closedJobs ?? 0;
  const pubRate = pct(publishedJobs, totalJobs);

  // Job type distribution
  const typeData = useMemo(() => {
    if (!jobReport?.byType) return [];
    return jobReport.byType.map((t, i) => ({
      name: fmt(t.type),
      value: t.count,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [jobReport]);

  // Experience level distribution
  const experienceData = useMemo(() => {
    if (!jobReport?.byExperienceLevel) return [];
    return jobReport.byExperienceLevel.map((l) => ({
      name: fmt(l.level),
      value: l.count,
    }));
  }, [jobReport]);

  // Application stats (top jobs by applications)
  const appStats = useMemo(() => {
    if (!jobReport?.applicationStats) return [];
    return [...jobReport.applicationStats]
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 8)
      .map((a) => ({
        name: a.title.length > 25 ? a.title.slice(0, 25) + "..." : a.title,
        value: a.applications,
      }));
  }, [jobReport]);

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
          { label: "Total Jobs", value: totalJobs.toLocaleString(), color: C.primaryLight, icon: Briefcase },
          { label: "Published", value: publishedJobs.toLocaleString(), color: C.green, icon: CheckCircle2 },
          { label: "Closed", value: closedJobs.toLocaleString(), color: C.red, icon: XCircle },
          { label: "Publication Rate", value: `${pubRate}%`, color: C.primary, icon: BarChart3 },
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

      {/* Job type + Experience level */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Jobs by Type" subtitle="Full-time, part-time, contract, etc." icon={PieIcon}>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
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
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
              No job type data
            </div>
          )}
        </ChartCard>

        <ChartCard title="Experience Level" subtitle="Required experience distribution" icon={Layers}>
          {experienceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={experienceData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" fill={C.primary} radius={[6, 6, 0, 0]} maxBarSize={48} name="Jobs" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
              No experience level data
            </div>
          )}
        </ChartCard>
      </div>

      {/* Most popular jobs by applications */}
      {appStats.length > 0 && (
        <ChartCard
          title="Most Popular Job Postings"
          subtitle="Ranked by number of applications"
          icon={FileText}
        >
          <ResponsiveContainer width="100%" height={Math.max(250, appStats.length * 38)}>
            <BarChart
              data={appStats}
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
                width={160}
              />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" fill={C.orange} radius={[0, 6, 6, 0]} maxBarSize={28} name="Applications" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </motion.div>
  );
}
