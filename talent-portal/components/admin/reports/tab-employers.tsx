"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  ShieldCheck,
  Clock,
  Briefcase,
  FileText,
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
import { C, CHART_COLORS, tooltipStyle, fmt, pct } from "./shared";
import type { ReportsOverview, EmployerReport } from "@/hooks/use-reports";

interface TabEmployersProps {
  overview: ReportsOverview;
  employerReport?: EmployerReport;
}

export function TabEmployers({ overview, employerReport }: TabEmployersProps) {
  const totalEmployers = overview.employers?.total ?? 0;
  const verifiedEmployers = overview.employers?.verified ?? 0;
  const pendingEmployers = employerReport?.pendingEmployers ?? 0;
  const verificationRate = pct(verifiedEmployers, totalEmployers);
  const totalJobsPosted = employerReport?.totalJobsPosted ?? 0;
  const totalIntroRequests = employerReport?.totalIntroRequests ?? 0;

  // Sector distribution
  const sectorData = useMemo(() => {
    if (!employerReport?.bySector) return [];
    return employerReport.bySector
      .map((s, i) => ({
        name: s.sector || "Other",
        value: parseInt(String(s.count), 10),
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [employerReport]);

  // Status distribution (derived)
  const statusData = useMemo(() => {
    const verified = verifiedEmployers;
    const pending = pendingEmployers;
    const other = Math.max(0, totalEmployers - verified - pending);
    const items = [
      { name: "Verified", value: verified, fill: C.green },
      { name: "Pending", value: pending, fill: C.orange },
    ];
    if (other > 0) items.push({ name: "Other", value: other, fill: C.slate });
    return items.filter((i) => i.value > 0);
  }, [totalEmployers, verifiedEmployers, pendingEmployers]);

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
          { label: "Total Employers", value: totalEmployers.toLocaleString(), color: C.orange, icon: Building2 },
          { label: "Verified", value: verifiedEmployers.toLocaleString(), color: C.green, icon: ShieldCheck },
          { label: "Pending Review", value: pendingEmployers.toLocaleString(), color: C.amber, icon: Clock },
          { label: "Jobs Posted", value: totalJobsPosted.toLocaleString(), color: C.primaryLight, icon: Briefcase },
          { label: "Verification Rate", value: `${verificationRate}%`, color: C.emerald, icon: BarChart3 },
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

      {/* Verification status + Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Verification Status" subtitle="Employer approval distribution" icon={PieIcon}>
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
              No employer status data
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Employer Distribution by Sector"
          subtitle={`${sectorData.length} sectors represented`}
          icon={Building2}
        >
          {sectorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(250, sectorData.length * 36)}>
              <BarChart
                data={sectorData.slice(0, 10)}
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
                  width={120}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" fill={C.primary} radius={[0, 6, 6, 0]} maxBarSize={28} name="Employers" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
              No sector data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Engagement metrics */}
      <ChartCard title="Employer Engagement" subtitle="Activity summary across employers" icon={FileText}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-2">
          {[
            { label: "Jobs Posted", value: totalJobsPosted, color: C.primaryLight, desc: "Total across all employers" },
            { label: "Intro Requests", value: totalIntroRequests, color: C.purple, desc: "Total intro requests received" },
            { label: "Avg. Jobs / Employer", value: totalEmployers > 0 ? (totalJobsPosted / totalEmployers).toFixed(1) : "0", color: C.orange, desc: "Average posting frequency" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">{stat.label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{stat.desc}</p>
            </div>
          ))}
        </div>
      </ChartCard>
    </motion.div>
  );
}
