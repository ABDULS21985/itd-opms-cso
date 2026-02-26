"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  Briefcase,
  TrendingUp,
  TrendingDown,
  FileText,
  Target,
  ArrowUpRight,
  Award,
  Zap,
  CheckCircle2,
  Clock,
  Globe,
  Trophy,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { colorAlpha } from "@/lib/color-utils";
import { ChartCard } from "./chart-card";
import {
  C,
  CHART_COLORS,
  STATUS_COLORS,
  fmt,
  pct,
  generateSparkline,
} from "./shared";
import type {
  ReportsOverview,
  CandidateReport,
  PlacementReport,
  JobReport,
  EmployerReport,
  TimeMetrics,
  SkillDemand,
} from "@/hooks/use-reports";

// ────────────────────────────────────────────────────────
// Animated counter
// ────────────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(from + (target - from) * ease));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return count;
}

// ────────────────────────────────────────────────────────
// Hero metric card
// ────────────────────────────────────────────────────────

function HeroMetric({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  href,
  trendValue,
  trendUp,
  sparkData,
}: {
  label: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  href: string;
  trendValue: number;
  trendUp: boolean;
  sparkData: { v: number }[];
}) {
  const animatedValue = useAnimatedCounter(value);

  return (
    <Link href={href}>
      <motion.div
        className="glass-card rounded-2xl p-5 cursor-pointer group"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ backgroundColor: colorAlpha(color, 0.07) }}
          >
            <Icon size={20} style={{ color }} />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
            trendUp ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--error)]/10 text-[var(--error)]",
          )}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trendValue}%
          </div>
        </div>

        <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight leading-none tabular-nums">
          {animatedValue.toLocaleString()}
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">{label}</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>

        {/* Mini sparkline */}
        <div className="mt-3 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-1 mt-2 text-[11px] text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
          View details <ArrowUpRight size={11} />
        </div>
      </motion.div>
    </Link>
  );
}

// ────────────────────────────────────────────────────────
// Conversion funnel
// ────────────────────────────────────────────────────────

function ConversionFunnel({
  stages,
}: {
  stages: { label: string; count: number; color: string; pctOfTotal: number; dropOff: number | null }[];
}) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-3">
          <div className="w-28 text-right shrink-0">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">{stage.label}</p>
          </div>
          <div className="flex-1 relative">
            <motion.div
              className="h-10 rounded-lg flex items-center px-3"
              style={{
                background: `linear-gradient(90deg, ${stage.color}20, ${stage.color}40)`,
                borderLeft: `3px solid ${stage.color}`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(15, (stage.count / maxCount) * 100)}%` }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            >
              <span className="text-sm font-bold" style={{ color: stage.color }}>
                {stage.count.toLocaleString()}
              </span>
            </motion.div>
          </div>
          <div className="w-16 text-right shrink-0">
            <p className="text-xs font-semibold text-[var(--text-primary)]">{stage.pctOfTotal}%</p>
          </div>
          <div className="w-16 text-right shrink-0">
            {stage.dropOff !== null && (
              <p className="text-[11px] text-[var(--error)] font-medium">-{stage.dropOff}%</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Leaderboard
// ────────────────────────────────────────────────────────

function Leaderboard({
  title,
  items,
  color,
}: {
  title: string;
  items: { name: string; value: number }[];
  color: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        {title}
      </p>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, idx) => (
          <div key={item.name} className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: idx < 3 ? color : "var(--text-muted)" }}
            >
              {idx + 1}
            </span>
            <span className="text-sm text-[var(--text-secondary)] font-medium truncate flex-1">
              {item.name}
            </span>
            <div className="w-20 h-1.5 bg-[var(--surface-1)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums w-8 text-right">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Main tab
// ────────────────────────────────────────────────────────

interface ExecutiveSummaryProps {
  overview: ReportsOverview;
  candidateReport?: CandidateReport;
  placementReport?: PlacementReport;
  jobReport?: JobReport;
  employerReport?: EmployerReport;
  timeMetrics?: TimeMetrics;
  skillsDemand?: SkillDemand[];
}

export function TabExecutiveSummary({
  overview,
  candidateReport,
  placementReport,
  jobReport,
  employerReport,
  timeMetrics,
  skillsDemand,
}: ExecutiveSummaryProps) {
  const totalCandidates = overview.candidates?.total ?? 0;
  const approvedCandidates = overview.candidates?.approved ?? 0;
  const totalEmployers = overview.employers?.total ?? 0;
  const verifiedEmployers = overview.employers?.verified ?? 0;
  const totalJobs = overview.jobs?.total ?? 0;
  const publishedJobs = overview.jobs?.published ?? 0;
  const totalPlacements = overview.placements?.total ?? 0;
  const activePlacements = overview.placements?.active ?? 0;
  const totalIntros = overview.introRequests?.total ?? 0;
  const conversionRate = pct(totalPlacements, totalCandidates);

  const metrics = useMemo(
    () => [
      {
        label: "Total Candidates",
        value: totalCandidates,
        subtitle: `${approvedCandidates} approved (${pct(approvedCandidates, totalCandidates)}%)`,
        icon: Users,
        color: C.primary,
        href: "/admin/candidates",
        trendValue: pct(approvedCandidates, totalCandidates),
        trendUp: true,
      },
      {
        label: "Active Jobs",
        value: publishedJobs,
        subtitle: `${totalJobs} total jobs`,
        icon: Briefcase,
        color: C.primaryLight,
        href: "/admin/jobs",
        trendValue: pct(publishedJobs, totalJobs),
        trendUp: publishedJobs > 0,
      },
      {
        label: "Employers",
        value: totalEmployers,
        subtitle: `${verifiedEmployers} verified (${pct(verifiedEmployers, totalEmployers)}%)`,
        icon: Building2,
        color: C.orange,
        href: "/admin/employers",
        trendValue: pct(verifiedEmployers, totalEmployers),
        trendUp: true,
      },
      {
        label: "Placements",
        value: totalPlacements,
        subtitle: `${activePlacements} active`,
        icon: TrendingUp,
        color: C.green,
        href: "/admin/placements",
        trendValue: pct(activePlacements, totalPlacements),
        trendUp: true,
      },
      {
        label: "Intro Requests",
        value: totalIntros,
        subtitle: "Total submitted",
        icon: FileText,
        color: C.purple,
        href: "/admin/intro-requests",
        trendValue: totalIntros > 0 ? 12 : 0,
        trendUp: true,
      },
      {
        label: "Conversion Rate",
        value: conversionRate,
        subtitle: "Candidates to placements",
        icon: Target,
        color: C.emerald,
        href: "/admin/placements",
        trendValue: conversionRate,
        trendUp: conversionRate > 0,
      },
    ],
    [totalCandidates, approvedCandidates, totalEmployers, verifiedEmployers, totalJobs, publishedJobs, totalPlacements, activePlacements, totalIntros, conversionRate],
  );

  // Funnel stages
  const funnelStages = useMemo(() => {
    const stages = [
      { label: "Registered", count: totalCandidates, color: C.primaryLight },
      { label: "Approved", count: approvedCandidates, color: C.green },
      { label: "In Discussion", count: 0, color: C.orange },
      { label: "Interviewing", count: 0, color: C.purple },
      { label: "Placed", count: totalPlacements, color: C.emerald },
    ];

    if (placementReport && Array.isArray(placementReport.byStatus)) {
      for (const s of placementReport.byStatus) {
        const status = typeof s.status === "string" ? s.status : "";
        const count = typeof s.count === "number" ? s.count : parseInt(String(s.count), 10) || 0;
        if (status === "IN_DISCUSSION") stages[2].count = count;
        if (status === "INTERVIEWING") stages[3].count = count;
      }
    }

    return stages.map((stage, i) => ({
      ...stage,
      pctOfTotal: pct(stage.count, stages[0].count),
      dropOff: i > 0 && stages[i - 1].count > 0
        ? Math.round(((stages[i - 1].count - stage.count) / stages[i - 1].count) * 100)
        : null,
    }));
  }, [totalCandidates, approvedCandidates, totalPlacements, placementReport]);

  // Geographic data
  const geoData = useMemo(() => {
    if (!candidateReport?.byLocation) return [];
    return [...candidateReport.byLocation]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [candidateReport]);

  // Leaderboard data
  const topSkills = useMemo(() => {
    if (!skillsDemand) return [];
    return skillsDemand.slice(0, 5).map((s) => ({ name: s.skillName, value: s.demandCount }));
  }, [skillsDemand]);

  const topTracks = useMemo(() => {
    if (!candidateReport?.byTrack) return [];
    return [...candidateReport.byTrack]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((t) => ({ name: t.track || "Unassigned", value: t.count }));
  }, [candidateReport]);

  const topSectors = useMemo(() => {
    if (!employerReport?.bySector) return [];
    return employerReport.bySector
      .map((s) => ({ name: s.sector || "Other", value: parseInt(String(s.count), 10) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [employerReport]);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((m) => (
          <HeroMetric
            key={m.label}
            {...m}
            sparkData={generateSparkline(m.value, m.label)}
          />
        ))}
      </div>

      {/* Conversion funnel + Time metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Conversion Funnel" subtitle="End-to-end pipeline analysis with drop-off rates" icon={Target}>
            <ConversionFunnel stages={funnelStages} />
          </ChartCard>
        </div>

        <ChartCard title="Pipeline Velocity" subtitle="Average time between milestones" icon={Clock}>
          <div className="space-y-6 pt-2">
            {[
              { label: "Avg. Response", value: timeMetrics?.avgDaysToResponse ?? 0, icon: Zap, color: C.primaryLight },
              { label: "Avg. to Interview", value: timeMetrics?.avgDaysToInterview ?? 0, icon: Target, color: C.orange },
              { label: "Avg. to Placement", value: timeMetrics?.avgDaysToPlacement ?? 0, icon: CheckCircle2, color: C.green },
            ].map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.label} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: colorAlpha(step.color, 0.07) }}
                  >
                    <StepIcon size={18} style={{ color: step.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-secondary)] font-medium">{step.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                      {step.value > 0 ? step.value : "\u2014"}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">days</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Geographic + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Geographic Distribution" subtitle="Top candidate countries" icon={Globe}>
          {geoData.length > 0 ? (
            <div className="space-y-2">
              {geoData.map((loc, i) => {
                const max = geoData[0].count;
                return (
                  <div key={loc.country} className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-secondary)] font-medium w-28 truncate">
                      {loc.country}
                    </span>
                    <div className="flex-1 h-2 bg-[var(--surface-1)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(loc.count / max) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums w-8 text-right">
                      {loc.count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-[var(--text-muted)]">
              No location data available
            </div>
          )}
        </ChartCard>

        <ChartCard title="Top Skills in Demand" subtitle="Most requested skills" icon={Award}>
          {topSkills.length > 0 ? (
            <Leaderboard title="" items={topSkills} color={C.primary} />
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-[var(--text-muted)]">
              No skills data available
            </div>
          )}
        </ChartCard>

        <ChartCard title="Leaderboard" subtitle="Top tracks & sectors" icon={Trophy}>
          <div className="space-y-6">
            <Leaderboard title="Top Tracks" items={topTracks} color={C.purple} />
            {topSectors.length > 0 && (
              <Leaderboard title="Top Sectors" items={topSectors} color={C.orange} />
            )}
          </div>
        </ChartCard>
      </div>

      {/* Intro request pipeline */}
      {timeMetrics?.introsByStatus && timeMetrics.introsByStatus.length > 0 && (
        <ChartCard title="Intro Request Pipeline" subtitle="Current status distribution" icon={FileText}>
          <div className="flex gap-3 flex-wrap">
            {timeMetrics.introsByStatus.map((item, i) => (
              <div
                key={item.status}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[item.status] || CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-sm text-[var(--text-secondary)] font-medium">
                  {fmt(item.status)}
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </motion.div>
  );
}
