"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSearch,
  Gauge,
  Layers3,
  Radar,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  useGRCAudits,
  useComplianceStats,
  useRiskHeatMap,
  useRisks,
} from "@/hooks/use-grc";

const likelihoodScale = ["very_low", "low", "medium", "high", "very_high"] as const;
const impactScale = ["very_high", "high", "medium", "low", "very_low"] as const;

function formatLabel(value: string) {
  return value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function shortScaleLabel(value: string) {
  return value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
}

function getScoreTone(score: number) {
  if (score <= 4) {
    return {
      color: "#10B981",
      soft: "rgba(16, 185, 129, 0.14)",
      ring: "rgba(16, 185, 129, 0.24)",
      label: "Low exposure",
    };
  }
  if (score <= 9) {
    return {
      color: "#F59E0B",
      soft: "rgba(245, 158, 11, 0.14)",
      ring: "rgba(245, 158, 11, 0.24)",
      label: "Moderate exposure",
    };
  }
  if (score <= 16) {
    return {
      color: "#F97316",
      soft: "rgba(249, 115, 22, 0.14)",
      ring: "rgba(249, 115, 22, 0.24)",
      label: "Elevated exposure",
    };
  }
  return {
    color: "#EF4444",
    soft: "rgba(239, 68, 68, 0.14)",
    ring: "rgba(239, 68, 68, 0.24)",
    label: "Critical exposure",
  };
}

function getComplianceTone(pct: number) {
  if (pct >= 80) {
    return {
      color: "#10B981",
      soft: "rgba(16, 185, 129, 0.14)",
      ring: "rgba(16, 185, 129, 0.24)",
      label: "Healthy posture",
    };
  }
  if (pct >= 60) {
    return {
      color: "#F59E0B",
      soft: "rgba(245, 158, 11, 0.14)",
      ring: "rgba(245, 158, 11, 0.24)",
      label: "Watch posture",
    };
  }
  if (pct >= 40) {
    return {
      color: "#F97316",
      soft: "rgba(249, 115, 22, 0.14)",
      ring: "rgba(249, 115, 22, 0.24)",
      label: "Recovery posture",
    };
  }
  return {
    color: "#EF4444",
    soft: "rgba(239, 68, 68, 0.14)",
    ring: "rgba(239, 68, 68, 0.24)",
    label: "At-risk posture",
  };
}

function getAuditTone(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

function MetricCard({
  title,
  value,
  loading,
  icon: Icon,
  accent,
  accentSoft,
  note,
}: {
  title: string;
  value: string | number | undefined;
  loading: boolean;
  icon: LucideIcon;
  accent: string;
  accentSoft: string;
  note: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.6rem] border border-[var(--border)]/80 bg-white/92 p-5 shadow-[0_18px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_45px_rgba(15,23,42,0.08)]">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-4">
        <div
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border"
          style={{ backgroundColor: accentSoft, borderColor: `${accent}22` }}
        >
          <Icon size={19} style={{ color: accent }} />
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: accent, backgroundColor: accentSoft }}
        >
          Snapshot
        </span>
      </div>
      <div className="mt-6">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
        <p className="mt-2 text-4xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
          {loading ? (
            <span className="inline-block h-9 w-16 animate-pulse rounded-xl bg-[var(--surface-2)]" />
          ) : (
            value ?? "--"
          )}
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{note}</p>
      </div>
    </div>
  );
}

function SpotlightCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent,
  className = "",
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-white/12 bg-white/10 p-4 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12"
          style={{ backgroundColor: `${accent}1A` }}
        >
          <Icon size={18} style={{ color: accent }} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52">
          {eyebrow}
        </span>
      </div>
      <h2 className="mt-5 text-lg font-semibold leading-6 text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-emerald-50/72">{description}</p>
    </div>
  );
}

function DistributionBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium capitalize text-[var(--text-primary)]">
          {label}
        </span>
        <span className="text-xs tabular-nums text-[var(--text-secondary)]">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}CC)`,
          }}
        />
      </div>
    </div>
  );
}

export default function GRCReportsPage() {
  const { data: risksData, isLoading: risksLoading } = useRisks(1, 1000);
  const { data: heatMapData, isLoading: heatMapLoading } = useRiskHeatMap();
  const { data: auditsData, isLoading: auditsLoading } = useGRCAudits(1, 1000);
  const { data: statsData, isLoading: statsLoading } = useComplianceStats();

  const risks = risksData?.data ?? [];
  const audits = auditsData?.data ?? [];
  const stats = statsData ?? [];
  const heatMap = heatMapData ?? [];

  const totalRisks = risks.length;
  const avgRiskScore =
    totalRisks > 0
      ? Math.round(risks.reduce((sum, risk) => sum + risk.riskScore, 0) / totalRisks)
      : 0;
  const openAudits = audits.reduce(
    (sum, audit) => (audit.status !== "completed" ? sum + 1 : sum),
    0,
  );
  const averageReadiness =
    audits.length > 0
      ? Math.round(
          audits.reduce((sum, audit) => sum + audit.readinessScore, 0) / audits.length,
        )
      : 0;
  const totalCompliant = stats.reduce((sum, stat) => sum + stat.compliantCount, 0);
  const totalControlsFromStats = stats.reduce((sum, stat) => sum + stat.total, 0);
  const complianceRate =
    totalControlsFromStats > 0
      ? Math.round((totalCompliant / totalControlsFromStats) * 100)
      : 0;

  const riskByCategory: Record<string, number> = {};
  const riskByStatus: Record<string, number> = {};

  for (const risk of risks) {
    riskByCategory[risk.category] = (riskByCategory[risk.category] || 0) + 1;
    riskByStatus[risk.status] = (riskByStatus[risk.status] || 0) + 1;
  }

  const categoryEntries = Object.entries(riskByCategory).sort((a, b) => b[1] - a[1]);
  const statusEntries = Object.entries(riskByStatus).sort((a, b) => b[1] - a[1]);
  const scoreTone = getScoreTone(avgRiskScore);
  const complianceTone = getComplianceTone(complianceRate);
  const highExposureRisks = risks.filter((risk) => risk.riskScore >= 16).length;
  const escalatedRisks = risks.filter((risk) => risk.status === "escalated").length;
  const readyAudits = audits.filter((audit) => audit.readinessScore >= 80).length;
  const attentionAudits = audits.filter(
    (audit) => audit.status !== "completed" && audit.readinessScore < 60,
  ).length;

  const frameworkPosture = stats
    .map((stat) => {
      const pct = stat.total > 0 ? Math.round((stat.compliantCount / stat.total) * 100) : 0;
      return {
        ...stat,
        pct,
        tone: getComplianceTone(pct),
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const strongestFramework = frameworkPosture[0];
  const weakestFramework = frameworkPosture[frameworkPosture.length - 1];

  const heatLookup = new Map(
    heatMap.map((entry) => [`${entry.likelihood}-${entry.impact}`, entry.count] as const),
  );
  const maxHeatCount = heatMap.reduce((max, entry) => Math.max(max, entry.count), 1);
  const activeHeatCells = heatMap.filter((entry) => entry.count > 0).length;

  const priorityAudits = [...audits]
    .sort((a, b) => {
      const aPriority = a.status === "completed" ? 1000 + a.readinessScore : a.readinessScore;
      const bPriority = b.status === "completed" ? 1000 + b.readinessScore : b.readinessScore;
      return aPriority - bPriority;
    })
    .slice(0, 6);

  const statusPalette: Record<string, string> = {
    identified: "#3B82F6",
    assessed: "#8B5CF6",
    mitigating: "#F59E0B",
    accepted: "#10B981",
    escalated: "#EF4444",
    closed: "#64748B",
  };

  return (
    <div className="space-y-8 pb-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2rem] border border-[rgba(27,115,64,0.12)] bg-[linear-gradient(135deg,_rgba(7,31,20,0.98),_rgba(13,74,41,0.95)_48%,_rgba(27,115,64,0.92))] p-6 shadow-[0_28px_70px_rgba(7,31,20,0.18)] sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(217,197,138,0.22),_transparent_28%),radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.08),_transparent_26%)]" />
        <div className="pointer-events-none absolute right-[-10%] top-[-12%] h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute bottom-[-18%] left-[-6%] h-48 w-48 rounded-full border border-white/8" />

        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm text-emerald-50/90 backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-[#D9C58A]" />
              Governance, risk, and audit posture in one surface
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/10">
                  <BarChart3 className="h-6 w-6 text-[#9AD7B2]" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/58">
                    GRC Analytics
                  </p>
                  <h1 className="mt-1 text-3xl font-bold tracking-[-0.045em] text-white sm:text-[2.6rem]">
                    Upgrade the page from static reports to an executive control view.
                  </h1>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-base leading-8 text-emerald-50/78">
                Monitor the live balance between risk exposure, compliance depth, and audit
                readiness with clearer hierarchy, stronger signals, and faster decision support.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/dashboard/grc/risks"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0D4A29] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                Open risk register
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/grc/audits"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:border-white/28 hover:bg-white/14"
              >
                Review audit queue
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/grc/compliance"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-transparent px-4 py-3 text-sm font-semibold text-emerald-50/88 transition-all duration-200 hover:border-white/24 hover:bg-white/8"
              >
                Inspect compliance posture
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {[
                `${highExposureRisks} high-exposure risks`,
                `${attentionAudits} audits needing attention`,
                `${frameworkPosture.length} frameworks tracked`,
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium tracking-[0.08em] text-emerald-50/82"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            <SpotlightCard
              icon={Radar}
              eyebrow="Dominant category"
              accent="#F6C86A"
              title={categoryEntries[0] ? formatLabel(categoryEntries[0][0]) : "Awaiting risk data"}
              description={
                categoryEntries[0]
                  ? `${categoryEntries[0][1]} risks currently cluster in this domain.`
                  : "Create and classify risks to surface category concentration."
              }
            />
            <SpotlightCard
              icon={ShieldCheck}
              eyebrow="Control strength"
              accent={strongestFramework?.tone.color ?? "#9AD7B2"}
              title={strongestFramework ? strongestFramework.framework : "No framework posture yet"}
              description={
                strongestFramework
                  ? `${strongestFramework.pct}% compliant coverage makes this the strongest framework today.`
                  : "Add compliance controls to compare framework performance."
              }
            />
            <SpotlightCard
              icon={Gauge}
              eyebrow="Readiness pulse"
              accent={getAuditTone(averageReadiness)}
              className="sm:col-span-2"
              title={`${averageReadiness}% average audit readiness`}
              description={
                audits.length > 0
                  ? `${readyAudits} audits are at or above 80% readiness while ${attentionAudits} need focused remediation.`
                  : "Schedule audits to activate readiness tracking and monitoring."
              }
            />
          </div>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          title="Total Risks"
          value={totalRisks}
          loading={risksLoading}
          icon={ShieldAlert}
          accent="#EF4444"
          accentSoft="rgba(239, 68, 68, 0.12)"
          note={`${highExposureRisks} risks currently sit in the highest exposure band.`}
        />
        <MetricCard
          title="Average Risk Score"
          value={avgRiskScore}
          loading={risksLoading}
          icon={TrendingUp}
          accent={scoreTone.color}
          accentSoft={scoreTone.soft}
          note={`${scoreTone.label} across the active risk inventory.`}
        />
        <MetricCard
          title="Open Audits"
          value={openAudits}
          loading={auditsLoading}
          icon={FileSearch}
          accent="#3B82F6"
          accentSoft="rgba(59, 130, 246, 0.12)"
          note={`${attentionAudits} in-flight audits require readiness follow-through.`}
        />
        <MetricCard
          title="Compliance Rate"
          value={`${complianceRate}%`}
          loading={statsLoading}
          icon={CheckCircle2}
          accent={complianceTone.color}
          accentSoft={complianceTone.soft}
          note={`${complianceTone.label} across ${totalControlsFromStats} mapped controls.`}
        />
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="overflow-hidden rounded-[1.8rem] border border-[var(--border)]/80 bg-white/92 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">
                Risk Landscape
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
                Where exposure is accumulating
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                View category concentration and the current operating mix of identified,
                assessed, mitigating, accepted, and escalated risks.
              </p>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              {categoryEntries.length} categories tracked
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-4 rounded-[1.4rem] border border-[var(--border)]/70 bg-[var(--surface-0)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Category distribution</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Highest concentration: {categoryEntries[0] ? formatLabel(categoryEntries[0][0]) : "n/a"}
                  </p>
                </div>
                <Layers3 className="h-4 w-4 text-[var(--primary)]" />
              </div>

              {categoryEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-secondary)]">
                  No risk categories are available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryEntries.slice(0, 6).map(([category, count], index) => (
                    <DistributionBar
                      key={category}
                      label={formatLabel(category)}
                      count={count}
                      total={totalRisks}
                      color={["#EF4444", "#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#0EA5E9"][index] ?? "#64748B"}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.4rem] border border-[var(--border)]/70 bg-[linear-gradient(180deg,_rgba(248,250,252,0.95),_rgba(255,255,255,0.92))] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Status pulse</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Escalated risks: {escalatedRisks}
                  </p>
                </div>
                <Activity className="h-4 w-4 text-[var(--primary)]" />
              </div>

              {statusEntries.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-secondary)]">
                  Status distribution will appear when risks are logged.
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  {statusEntries.map(([status, count]) => (
                    <div
                      key={status}
                      className="min-w-[8.5rem] flex-1 rounded-[1.2rem] border border-[var(--border)]/70 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="inline-flex h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: statusPalette[status] ?? "#64748B" }}
                        />
                        <span className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                          {count}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium capitalize text-[var(--text-primary)]">
                        {formatLabel(status)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {totalRisks > 0 ? Math.round((count / totalRisks) * 100) : 0}% of risk inventory
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="overflow-hidden rounded-[1.8rem] border border-[var(--border)]/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(245,247,250,0.9))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">
                Heat Map
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
                Risk concentration by likelihood and impact
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                Reveal where risk density is clustering so escalation and treatment plans target
                the hottest cells first.
              </p>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              {activeHeatCells} active cells
            </div>
          </div>

          {heatMapLoading ? (
            <div className="mt-8 flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          ) : heatMap.length === 0 ? (
            <div className="mt-8 rounded-[1.4rem] border border-dashed border-[var(--border)] p-10 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">No heat map data available</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Run risk assessments to populate the likelihood-impact matrix.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 lg:grid-cols-[auto_1fr]">
              <div className="hidden items-center justify-center lg:flex">
                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  Impact
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-[5rem_repeat(5,minmax(0,1fr))] gap-2">
                  <div />
                  {likelihoodScale.map((likelihood) => (
                    <div
                      key={likelihood}
                      className="rounded-full bg-[var(--surface-1)] px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                    >
                      {shortScaleLabel(likelihood)}
                    </div>
                  ))}

                  {impactScale.map((impact) => (
                    <motion.div
                      key={impact}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="contents"
                    >
                      <div className="flex items-center justify-end pr-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        {formatLabel(impact)}
                      </div>
                      {likelihoodScale.map((likelihood) => {
                        const count = heatLookup.get(`${likelihood}-${impact}`) ?? 0;
                        const intensity = count > 0 ? 0.16 + (count / maxHeatCount) * 0.46 : 0;
                        return (
                          <div
                            key={`${impact}-${likelihood}`}
                            className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-[1.1rem] border text-center transition-all duration-300 hover:-translate-y-0.5"
                            style={{
                              borderColor:
                                count > 0 ? `rgba(27, 115, 64, ${0.14 + intensity * 0.55})` : "rgba(15, 23, 42, 0.06)",
                              backgroundColor:
                                count > 0 ? `rgba(27, 115, 64, ${intensity})` : "rgba(255, 255, 255, 0.82)",
                            }}
                          >
                            <span className="text-xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                              {count}
                            </span>
                            <span className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                              {count > 0 ? "active" : "clear"}
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--border)]/80 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Likelihood</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Left to right from very low to very high
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span>Low density</span>
                    <div className="flex gap-1">
                      {[0.18, 0.32, 0.46, 0.6].map((opacity) => (
                        <span
                          key={opacity}
                          className="h-3 w-3 rounded-full border border-[rgba(27,115,64,0.14)]"
                          style={{ backgroundColor: `rgba(27, 115, 64, ${opacity})` }}
                        />
                      ))}
                    </div>
                    <span>High density</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="overflow-hidden rounded-[1.8rem] border border-[var(--border)]/80 bg-white/94 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">
                Compliance Posture
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
                Framework-by-framework control strength
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Compare healthy and weak frameworks quickly, then pivot into detailed control
                remediation where posture is lagging.
              </p>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              {frameworkPosture.length} frameworks
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-[var(--border)]/70 bg-[linear-gradient(180deg,_rgba(240,253,244,0.9),_rgba(255,255,255,0.96))] p-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.12)]">
                  <ShieldCheck className="h-5 w-5 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]/70">
                    Strongest framework
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {strongestFramework ? strongestFramework.framework : "No data yet"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                {strongestFramework
                  ? `${strongestFramework.pct}% coverage with ${strongestFramework.compliantCount} of ${strongestFramework.total} controls compliant.`
                  : "Control posture will appear here once frameworks are assessed."}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-[var(--border)]/70 bg-[linear-gradient(180deg,_rgba(254,242,242,0.95),_rgba(255,255,255,0.96))] p-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(239,68,68,0.12)]">
                  <Scale className="h-5 w-5 text-[#EF4444]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]/70">
                    Weakest framework
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {weakestFramework ? weakestFramework.framework : "No data yet"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                {weakestFramework
                  ? `${weakestFramework.pct}% posture suggests this framework should be prioritized next.`
                  : "Track frameworks to expose the weakest posture domain."}
              </p>
            </div>
          </div>

          {statsLoading ? (
            <div className="mt-8 flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          ) : frameworkPosture.length === 0 ? (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-[var(--border)] p-10 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">No compliance posture data available</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Add compliance controls to generate framework posture analytics.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {frameworkPosture.map((framework) => (
                <div
                  key={framework.framework}
                  className="rounded-[1.35rem] border border-[var(--border)]/70 bg-[var(--surface-0)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Scale size={15} style={{ color: framework.tone.color }} />
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          {framework.framework}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {framework.compliantCount} of {framework.total} controls compliant
                      </p>
                    </div>
                    <div
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        color: framework.tone.color,
                        backgroundColor: framework.tone.soft,
                        boxShadow: `inset 0 0 0 1px ${framework.tone.ring}`,
                      }}
                    >
                      {framework.pct}% {framework.tone.label}
                    </div>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${framework.pct}%`,
                        background: `linear-gradient(90deg, ${framework.tone.color}, ${framework.tone.color}CC)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="overflow-hidden rounded-[1.8rem] border border-[var(--border)]/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.97),_rgba(248,250,252,0.92))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">
                Audit Readiness
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
                Priority queue for the next audit conversations
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                The lowest-readiness active audits surface first so follow-up and evidence
                collection can move before issues compound.
              </p>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              {openAudits} open audits
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Average readiness",
                value: `${averageReadiness}%`,
                icon: Gauge,
                color: getAuditTone(averageReadiness),
              },
              {
                label: "Audit-ready",
                value: readyAudits,
                icon: ShieldCheck,
                color: "#10B981",
              },
              {
                label: "Needs intervention",
                value: attentionAudits,
                icon: ShieldAlert,
                color: "#EF4444",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.3rem] border border-[var(--border)]/70 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <item.icon size={18} style={{ color: item.color }} />
                  <span className="text-2xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                    {item.value}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
              </div>
            ))}
          </div>

          {auditsLoading ? (
            <div className="mt-8 flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          ) : priorityAudits.length === 0 ? (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-[var(--border)] p-10 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">No audits scheduled</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Create an audit to activate readiness tracking and prioritization.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {priorityAudits.map((audit, index) => {
                const readinessColor = getAuditTone(audit.readinessScore);
                return (
                  <div
                    key={audit.id}
                    className="rounded-[1.35rem] border border-[var(--border)]/70 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold"
                        style={{
                          color: readinessColor,
                          backgroundColor: `${readinessColor}14`,
                        }}
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                              {audit.title}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <span className="rounded-full bg-[var(--surface-1)] px-2.5 py-1 capitalize">
                                {audit.auditType}
                              </span>
                              <span className="rounded-full bg-[var(--surface-1)] px-2.5 py-1">
                                {formatLabel(audit.status)}
                              </span>
                            </div>
                          </div>
                          <div
                            className="rounded-full px-3 py-1 text-xs font-semibold"
                            style={{
                              color: readinessColor,
                              backgroundColor: `${readinessColor}14`,
                            }}
                          >
                            {audit.readinessScore}% readiness
                          </div>
                        </div>

                        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(audit.readinessScore, 100)}%`,
                              background: `linear-gradient(90deg, ${readinessColor}, ${readinessColor}CC)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
