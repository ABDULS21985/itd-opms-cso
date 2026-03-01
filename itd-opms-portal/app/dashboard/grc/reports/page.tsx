"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  ShieldAlert,
  CheckCircle,
  TrendingUp,
  Scale,
  FileSearch,
} from "lucide-react";
import {
  useRisks,
  useRiskHeatMap,
  useGRCAudits,
  useComplianceStats,
  useComplianceControls,
} from "@/hooks/use-grc";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number): string {
  if (score <= 4) return "#10B981";
  if (score <= 9) return "#F59E0B";
  if (score <= 16) return "#F97316";
  return "#EF4444";
}

function getComplianceColor(pct: number): string {
  if (pct >= 80) return "#10B981";
  if (pct >= 60) return "#F59E0B";
  if (pct >= 40) return "#F97316";
  return "#EF4444";
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  title,
  value,
  loading,
  icon: Icon,
  color,
  bgColor,
  subtitle,
}: {
  title: string;
  value: string | number | undefined;
  loading: boolean;
  icon: typeof BarChart3;
  color: string;
  bgColor: string;
  subtitle?: string;
}) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color }}
      >
        {loading ? (
          <span className="inline-block w-8 h-7 rounded bg-[var(--surface-2)] animate-pulse" />
        ) : (
          (value ?? "--")
        )}
      </p>
      <p className="text-sm font-medium text-[var(--text-secondary)] mt-0.5">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GRCReportsPage() {
  const { data: risksData, isLoading: risksLoading } = useRisks(1, 1000);
  const { data: heatMap } = useRiskHeatMap();
  const { data: auditsData, isLoading: auditsLoading } = useGRCAudits(1, 1000);
  const { data: statsData, isLoading: statsLoading } = useComplianceStats();
  const { data: controlsData, isLoading: _controlsLoading } =
    useComplianceControls(1, 1);

  const risks = risksData?.data ?? [];
  const audits = auditsData?.data ?? [];
  const stats = statsData ?? [];

  // Computed metrics
  const totalRisks = risks.length;
  const avgRiskScore =
    totalRisks > 0
      ? Math.round(
          risks.reduce((sum, r) => sum + r.riskScore, 0) / totalRisks,
        )
      : 0;
  const openFindings = audits.reduce(
    (_, a) => a.status !== "completed" && a.status !== "cancelled" ? _ + 1 : _,
    0,
  );
  // Compliance rate
  const totalCompliant = stats.reduce((sum, s) => sum + s.compliantCount, 0);
  const totalControlsFromStats = stats.reduce((sum, s) => sum + s.total, 0);
  const complianceRate =
    totalControlsFromStats > 0
      ? Math.round((totalCompliant / totalControlsFromStats) * 100)
      : 0;

  // Risk distribution by category
  const riskByCategory: Record<string, number> = {};
  for (const risk of risks) {
    riskByCategory[risk.category] = (riskByCategory[risk.category] || 0) + 1;
  }

  // Risk distribution by status
  const riskByStatus: Record<string, number> = {};
  for (const risk of risks) {
    riskByStatus[risk.status] = (riskByStatus[risk.status] || 0) + 1;
  }

  // Finding severity summary from heat map
  const heatMapEntries = heatMap ?? [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.1)]">
            <BarChart3 size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              GRC Analytics
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Risk trends, compliance posture, and audit readiness
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          title="Total Risks"
          value={totalRisks}
          loading={risksLoading}
          icon={ShieldAlert}
          color="#EF4444"
          bgColor="rgba(239, 68, 68, 0.1)"
        />
        <StatCard
          title="Avg Risk Score"
          value={avgRiskScore}
          loading={risksLoading}
          icon={TrendingUp}
          color={getScoreColor(avgRiskScore)}
          bgColor={`${getScoreColor(avgRiskScore)}15`}
        />
        <StatCard
          title="Open Audits"
          value={openFindings}
          loading={auditsLoading}
          icon={FileSearch}
          color="#3B82F6"
          bgColor="rgba(59, 130, 246, 0.1)"
        />
        <StatCard
          title="Compliance Rate"
          value={`${complianceRate}%`}
          loading={statsLoading}
          icon={CheckCircle}
          color={getComplianceColor(complianceRate)}
          bgColor={`${getComplianceColor(complianceRate)}15`}
        />
      </motion.div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Risks by Category
          </h2>
          {Object.keys(riskByCategory).length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] text-center py-8">
              No risk data available.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(riskByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const pct =
                    totalRisks > 0
                      ? Math.round((count / totalRisks) * 100)
                      : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                          {cat}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#EF4444] transition-all duration-500"
                          style={{ width: `${pct}%`, opacity: 0.7 }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </motion.div>

        {/* By Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Risks by Status
          </h2>
          {Object.keys(riskByStatus).length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] text-center py-8">
              No risk data available.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(riskByStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([statusKey, count]) => {
                  const pct =
                    totalRisks > 0
                      ? Math.round((count / totalRisks) * 100)
                      : 0;
                  const statusColors: Record<string, string> = {
                    identified: "#3B82F6",
                    assessed: "#8B5CF6",
                    mitigating: "#F59E0B",
                    accepted: "#10B981",
                    escalated: "#EF4444",
                    closed: "#6B7280",
                  };
                  const barColor = statusColors[statusKey] ?? "#6B7280";
                  return (
                    <div key={statusKey}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                          {statusKey.replace("_", " ")}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Compliance Posture by Framework */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Compliance Posture by Framework
        </h2>
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          </div>
        ) : stats.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] text-center py-8">
            No compliance data available. Add compliance controls to see posture.
          </p>
        ) : (
          <div className="space-y-4">
            {stats.map((stat) => {
              const pct =
                stat.total > 0
                  ? Math.round((stat.compliantCount / stat.total) * 100)
                  : 0;
              const color = getComplianceColor(pct);
              return (
                <div key={stat.framework}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Scale size={14} style={{ color }} />
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {stat.framework}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span>{stat.compliantCount} / {stat.total} controls</span>
                      <span
                        className="font-bold tabular-nums"
                        style={{ color }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Audit Readiness Overview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Audit Readiness Overview
        </h2>
        {auditsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          </div>
        ) : audits.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] text-center py-8">
            No audits scheduled. Create an audit to track readiness.
          </p>
        ) : (
          <div className="space-y-3">
            {audits.slice(0, 10).map((audit) => {
              const readinessColor =
                audit.readinessScore >= 80
                  ? "#10B981"
                  : audit.readinessScore >= 60
                    ? "#F59E0B"
                    : audit.readinessScore >= 40
                      ? "#F97316"
                      : "#EF4444";
              return (
                <div
                  key={audit.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--surface-1)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {audit.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--text-secondary)] capitalize">
                        {audit.auditType}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {audit.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-24 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(audit.readinessScore, 100)}%`,
                          backgroundColor: readinessColor,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-bold tabular-nums w-10 text-right"
                      style={{ color: readinessColor }}
                    >
                      {audit.readinessScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
