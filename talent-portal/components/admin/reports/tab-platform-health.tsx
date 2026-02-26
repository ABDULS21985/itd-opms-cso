"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ShieldCheck,
  Users,
  Building2,
  Briefcase,
  TrendingUp,
  Award,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { colorAlpha } from "@/lib/color-utils";
import { ChartCard } from "./chart-card";
import { C, CHART_COLORS, tooltipStyle, pct } from "./shared";
import type {
  ReportsOverview,
  CandidateReport,
  EmployerReport,
  SkillDemand,
} from "@/hooks/use-reports";

interface TabPlatformHealthProps {
  overview: ReportsOverview;
  candidateReport?: CandidateReport;
  employerReport?: EmployerReport;
  skillsDemand?: SkillDemand[];
}

function HealthGauge({
  label,
  value,
  color,
  icon: Icon,
  description,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
  description: string;
}) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <motion.div
      className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative w-28 h-28 mx-auto mb-4">
        <svg width="112" height="112" viewBox="0 0 112 112" className="transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <motion.circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon size={18} style={{ color }} className="mb-0.5" />
          <span className="text-xl font-bold text-[var(--text-primary)]">{value}%</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
    </motion.div>
  );
}

export function TabPlatformHealth({
  overview,
  candidateReport,
  employerReport,
  skillsDemand,
}: TabPlatformHealthProps) {
  const totalCandidates = overview.candidates?.total ?? 0;
  const approvedCandidates = overview.candidates?.approved ?? 0;
  const totalEmployers = overview.employers?.total ?? 0;
  const verifiedEmployers = overview.employers?.verified ?? 0;
  const totalJobs = overview.jobs?.total ?? 0;
  const publishedJobs = overview.jobs?.published ?? 0;
  const totalPlacements = overview.placements?.total ?? 0;
  const activePlacements = overview.placements?.active ?? 0;

  const approvalRate = pct(approvedCandidates, totalCandidates);
  const verificationRate = pct(verifiedEmployers, totalEmployers);
  const pubRate = pct(publishedJobs, totalJobs);
  const placementRate = pct(activePlacements, totalPlacements);

  // Skills demand bar chart
  const skillsData = useMemo(() => {
    if (!skillsDemand) return [];
    return skillsDemand.slice(0, 10).map((s) => ({
      name: s.skillName.length > 12 ? s.skillName.slice(0, 12) + "..." : s.skillName,
      required: s.requiredCount,
      niceToHave: s.niceToHaveCount,
    }));
  }, [skillsDemand]);

  // Platform summary stats
  const summaryStats = [
    { label: "Total Candidates", value: totalCandidates, color: C.primary },
    { label: "Total Employers", value: totalEmployers, color: C.orange },
    { label: "Total Jobs", value: totalJobs, color: C.primaryLight },
    { label: "Total Placements", value: totalPlacements, color: C.green },
    { label: "Intro Requests", value: overview.introRequests?.total ?? 0, color: C.purple },
  ];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Health gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthGauge
          label="Candidate Approval"
          value={approvalRate}
          color={C.green}
          icon={Users}
          description={`${approvedCandidates} of ${totalCandidates}`}
        />
        <HealthGauge
          label="Employer Verification"
          value={verificationRate}
          color={C.primaryLight}
          icon={Building2}
          description={`${verifiedEmployers} of ${totalEmployers}`}
        />
        <HealthGauge
          label="Job Publication"
          value={pubRate}
          color={C.purple}
          icon={Briefcase}
          description={`${publishedJobs} of ${totalJobs}`}
        />
        <HealthGauge
          label="Active Placements"
          value={placementRate}
          color={C.orange}
          icon={TrendingUp}
          description={`${activePlacements} of ${totalPlacements}`}
        />
      </div>

      {/* Platform totals */}
      <ChartCard title="Platform Summary" subtitle="Aggregate platform statistics" icon={Activity}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 py-2">
          {summaryStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Skills demand */}
      {skillsData.length > 0 && (
        <ChartCard title="Skills Demand Overview" subtitle="Required vs nice-to-have across active jobs" icon={Award}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={skillsData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="required" stackId="a" fill={C.primary} radius={[0, 0, 0, 0]} maxBarSize={36} name="Required" />
              <Bar dataKey="niceToHave" stackId="a" fill="#93c5fd" radius={[6, 6, 0, 0]} maxBarSize={36} name="Nice to Have" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[var(--primary)]" />
              <span className="text-xs text-[var(--text-secondary)]">Required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#93c5fd]" />
              <span className="text-xs text-[var(--text-secondary)]">Nice to Have</span>
            </div>
          </div>
        </ChartCard>
      )}

      {/* Health rates grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Candidate Approval Rate", value: `${approvalRate}%`, icon: ShieldCheck, color: C.green },
          { label: "Employer Verification Rate", value: `${verificationRate}%`, icon: Activity, color: C.primaryLight },
          { label: "Job Publication Rate", value: `${pubRate}%`, icon: Briefcase, color: C.purple },
          { label: "Active Placement Rate", value: `${placementRate}%`, icon: TrendingUp, color: C.orange },
        ].map((card) => {
          const CIcon = card.icon;
          return (
            <motion.div
              key={card.label}
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-5 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: colorAlpha(card.color, 0.06) }}
              >
                <CIcon size={22} style={{ color: card.color }} />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{card.value}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">{card.label}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
