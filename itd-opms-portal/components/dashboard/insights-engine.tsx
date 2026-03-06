"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  useExecutiveSummary,
  useMyTasks,
} from "@/hooks/use-reporting";
import type { ExecutiveSummary } from "@/types";
import type { MyTasksSummary } from "@/hooks/use-reporting";

/* ====================================================================== */
/*  Types                                                                    */
/* ====================================================================== */

interface InsightsEngineProps {
  className?: string;
  delay?: number;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info" | "positive";
  modules: { name: string; href: string; color: string }[];
  metric?: { label: string; value: number; suffix?: string };
  investigateHref: string;
}

/* ====================================================================== */
/*  Module Color Map                                                         */
/* ====================================================================== */

const MODULE_MAP = {
  ITSM: { name: "ITSM", href: "/dashboard/itsm", color: "#F59E0B" },
  Planning: { name: "Planning", href: "/dashboard/planning", color: "#8B5CF6" },
  GRC: { name: "GRC", href: "/dashboard/grc", color: "#EF4444" },
  People: { name: "People", href: "/dashboard/people", color: "#3B82F6" },
  Assets: { name: "Assets", href: "/dashboard/assets", color: "#F59E0B" },
  Governance: { name: "Governance", href: "/dashboard/governance", color: "#1B7340" },
} as const;

/* ====================================================================== */
/*  Severity Config                                                          */
/* ====================================================================== */

const SEVERITY_CONFIG = {
  critical: { color: "#EF4444", bg: "rgba(239, 68, 68, 0.08)", label: "Critical", Icon: AlertTriangle },
  warning: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)", label: "Warning", Icon: AlertCircle },
  info: { color: "#3B82F6", bg: "rgba(59, 130, 246, 0.08)", label: "Info", Icon: Info },
  positive: { color: "#22C55E", bg: "rgba(34, 197, 94, 0.08)", label: "Healthy", Icon: CheckCircle2 },
} as const;

const SEVERITY_ORDER: Record<Insight["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
  positive: 3,
};

const MAX_INSIGHTS = 6;

/* ====================================================================== */
/*  Insight Generation — Pure deterministic function                         */
/* ====================================================================== */

/**
 * Helper: checks if a metric has meaningful data behind it (not just default 0).
 * When modules have no data yet (e.g. no audits, no tickets), the backend
 * returns 0 — we should not fire alarming insights for unconfigured modules.
 */
function hasTicketData(s: ExecutiveSummary): boolean {
  return s.openTickets > 0 || s.openTicketsP1 > 0 || s.openTicketsP2 > 0;
}

function hasProjectData(s: ExecutiveSummary): boolean {
  return s.activeProjects > 0;
}

function hasAssetData(s: ExecutiveSummary): boolean {
  return s.activeAssets > 0;
}

function generateInsights(
  summary: ExecutiveSummary,
  myTasks: MyTasksSummary | undefined,
): Insight[] {
  const insights: Insight[] = [];

  // 1. SLA + P1 Correlation — only when there are actual tickets
  if (
    hasTicketData(summary) &&
    summary.slaCompliancePct < 95 &&
    summary.openP1Incidents > 0
  ) {
    insights.push({
      id: "sla-p1-correlation",
      title: `SLA compliance at ${summary.slaCompliancePct}% — ${summary.openP1Incidents} active P1 incident(s) impacting service levels`,
      description: `SLA compliance at ${summary.slaCompliancePct}% — ${summary.openP1Incidents} active P1 incident(s) impacting service levels`,
      severity: summary.slaCompliancePct < 85 ? "critical" : "warning",
      modules: [MODULE_MAP.ITSM],
      metric: { label: "SLA", value: summary.slaCompliancePct, suffix: "%" },
      investigateHref: "/dashboard/itsm?tab=sla",
    });
  }

  // 2. Capacity Bottleneck — only when capacity tracking is active (> 0)
  if (
    summary.teamCapacityUtilizationPct > 85 &&
    myTasks &&
    myTasks.overdueItems.count > 0
  ) {
    insights.push({
      id: "capacity-bottleneck",
      title: `Team capacity at ${summary.teamCapacityUtilizationPct}% — ${myTasks.overdueItems.count} overdue items may indicate bottleneck`,
      description: `Team capacity at ${summary.teamCapacityUtilizationPct}% — ${myTasks.overdueItems.count} overdue items may indicate bottleneck`,
      severity: summary.teamCapacityUtilizationPct > 95 ? "critical" : "warning",
      modules: [MODULE_MAP.People, MODULE_MAP.Planning],
      metric: { label: "Capacity", value: summary.teamCapacityUtilizationPct, suffix: "%" },
      investigateHref: "/dashboard/people?tab=capacity",
    });
  }

  // 3. Risk Escalation — requires both risks AND projects to exist
  if (
    summary.criticalRisks > 0 &&
    summary.projectsRagRed > 0 &&
    hasProjectData(summary)
  ) {
    insights.push({
      id: "risk-escalation",
      title: `${summary.criticalRisks} critical risk(s) with ${summary.projectsRagRed} red-status project(s) — potential linked impact`,
      description: `${summary.criticalRisks} critical risk(s) with ${summary.projectsRagRed} red-status project(s) — potential linked impact`,
      severity: "critical",
      modules: [MODULE_MAP.GRC, MODULE_MAP.Planning],
      metric: { label: "Critical Risks", value: summary.criticalRisks },
      investigateHref: "/dashboard/grc/risks?severity=critical",
    });
  }

  // 4. MTTR Elevated — only when there are tickets being resolved
  if (hasTicketData(summary) && summary.mttrMinutes > 120) {
    insights.push({
      id: "mttr-elevated",
      title: `Mean time to resolve at ${summary.mttrMinutes} min — above target threshold of 120 min`,
      description: `Mean time to resolve at ${summary.mttrMinutes} min — above target threshold of 120 min`,
      severity: summary.mttrMinutes > 240 ? "critical" : "warning",
      modules: [MODULE_MAP.ITSM],
      metric: { label: "MTTR", value: summary.mttrMinutes, suffix: " min" },
      investigateHref: "/dashboard/itsm",
    });
  }

  // 5. License Non-Compliance — requires actual assets with over-deployed licenses
  if (
    hasAssetData(summary) &&
    summary.licenseCompliancePct < 95 &&
    summary.overDeployedLicenses > 0
  ) {
    insights.push({
      id: "license-non-compliance",
      title: `License compliance at ${summary.licenseCompliancePct}% — ${summary.overDeployedLicenses} over-deployed license(s)`,
      description: `License compliance at ${summary.licenseCompliancePct}% — ${summary.overDeployedLicenses} over-deployed license(s)`,
      severity: summary.licenseCompliancePct < 80 ? "critical" : "warning",
      modules: [MODULE_MAP.Assets],
      metric: { label: "License Compliance", value: summary.licenseCompliancePct, suffix: "%" },
      investigateHref: "/dashboard/assets?tab=licenses",
    });
  }

  // 6. Audit Readiness — skip if score is 0 (module likely not configured)
  if (summary.auditReadinessScore > 0 && summary.auditReadinessScore < 70) {
    insights.push({
      id: "audit-readiness",
      title: `Audit readiness score at ${summary.auditReadinessScore}% — below organizational target`,
      description: `Audit readiness score at ${summary.auditReadinessScore}% — below organizational target`,
      severity: summary.auditReadinessScore < 50 ? "critical" : "warning",
      modules: [MODULE_MAP.GRC],
      metric: { label: "Audit Readiness", value: summary.auditReadinessScore, suffix: "%" },
      investigateHref: "/dashboard/grc",
    });
  }

  // 7. Training Gap — both overdue AND expiring must be > 0
  if (summary.overdueTrainingCerts > 0 && summary.expiringCerts > 0) {
    insights.push({
      id: "training-gap",
      title: `${summary.overdueTrainingCerts} overdue training cert(s) and ${summary.expiringCerts} expiring — compliance risk`,
      description: `${summary.overdueTrainingCerts} overdue training cert(s) and ${summary.expiringCerts} expiring — compliance risk`,
      severity: summary.overdueTrainingCerts > 5 ? "warning" : "info",
      modules: [MODULE_MAP.People],
      metric: { label: "Overdue Certs", value: summary.overdueTrainingCerts },
      investigateHref: "/dashboard/people?tab=training",
    });
  }

  // 8. Backlog Aging — only when there are tickets
  if (hasTicketData(summary) && summary.backlogOver30Days > 10) {
    insights.push({
      id: "backlog-aging",
      title: `${summary.backlogOver30Days} ticket(s) aging beyond 30 days in backlog`,
      description: `${summary.backlogOver30Days} ticket(s) aging beyond 30 days in backlog`,
      severity: summary.backlogOver30Days > 30 ? "warning" : "info",
      modules: [MODULE_MAP.ITSM],
      metric: { label: "Stale Backlog", value: summary.backlogOver30Days },
      investigateHref: "/dashboard/itsm",
    });
  }

  // 9. Project Health — requires active projects
  if (
    hasProjectData(summary) &&
    summary.projectsRagRed > 0 &&
    summary.onTimeDeliveryPct < 80
  ) {
    insights.push({
      id: "project-health",
      title: `On-time delivery at ${summary.onTimeDeliveryPct}% with ${summary.projectsRagRed} red project(s) — delivery at risk`,
      description: `On-time delivery at ${summary.onTimeDeliveryPct}% with ${summary.projectsRagRed} red project(s) — delivery at risk`,
      severity: "warning",
      modules: [MODULE_MAP.Planning],
      metric: { label: "On-Time", value: summary.onTimeDeliveryPct, suffix: "%" },
      investigateHref: "/dashboard/planning",
    });
  }

  // 10. All Clear — only meaningful when there's actual operational data
  const hasAnyOperationalData =
    hasTicketData(summary) || hasProjectData(summary) || hasAssetData(summary);

  if (
    hasAnyOperationalData &&
    summary.slaCompliancePct >= 95 &&
    summary.criticalRisks === 0 &&
    summary.openP1Incidents === 0
  ) {
    insights.push({
      id: "all-clear",
      title: `Strong operational health — SLA at ${summary.slaCompliancePct}%, no critical risks or P1 incidents`,
      description: `Strong operational health — SLA at ${summary.slaCompliancePct}%, no critical risks or P1 incidents`,
      severity: "positive",
      modules: [],
      investigateHref: "/dashboard",
    });
  }

  // Sort by severity priority: critical → warning → info → positive
  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return insights.slice(0, MAX_INSIGHTS);
}

/* ====================================================================== */
/*  Skeleton Card                                                            */
/* ====================================================================== */

function InsightSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.08 }}
      className="rounded-xl border overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "var(--border)",
      }}
    >
      <div className="p-4 space-y-3">
        {/* Badge row */}
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-16 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="h-5 w-12 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--border)" }}
          />
        </div>
        {/* Title lines */}
        <div className="space-y-2">
          <div
            className="h-4 w-full rounded animate-pulse"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="h-4 w-3/4 rounded animate-pulse"
            style={{ backgroundColor: "var(--border)" }}
          />
        </div>
        {/* Bottom row */}
        <div className="flex items-center justify-between pt-1">
          <div
            className="h-6 w-20 rounded animate-pulse"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="h-5 w-24 rounded animate-pulse"
            style={{ backgroundColor: "var(--border)" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ====================================================================== */
/*  Metric Sparkline Display                                                 */
/* ====================================================================== */

function MetricDisplay({
  metric,
  severityColor,
}: {
  metric: Insight["metric"];
  severityColor: string;
}) {
  if (!metric) return null;

  // Generate a small synthetic sparkline context from the metric value
  // to provide visual weight — shows value relative to a baseline
  const baseValue = metric.suffix === "%" ? 100 : metric.value * 1.5;
  const chartData = [
    { v: baseValue * 0.6 },
    { v: baseValue * 0.7 },
    { v: baseValue * 0.65 },
    { v: baseValue * 0.75 },
    { v: metric.value },
  ];

  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 48, height: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={severityColor}
              strokeWidth={1.5}
              dot={false}
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span
        className="text-base font-bold tabular-nums"
        style={{ color: severityColor }}
      >
        {metric.value}
        {metric.suffix ?? ""}
      </span>
      <span
        className="text-[10px] font-medium uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {metric.label}
      </span>
    </div>
  );
}

/* ====================================================================== */
/*  Insight Card                                                             */
/* ====================================================================== */

function InsightCard({
  insight,
  index,
  baseDelay,
}: {
  insight: Insight;
  index: number;
  baseDelay: number;
}) {
  const config = SEVERITY_CONFIG[insight.severity];
  const SeverityIcon = config.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: baseDelay + index * 0.08 }}
      className="rounded-xl border overflow-hidden group"
      style={{
        background: "rgba(255, 255, 255, 0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex">
        {/* Left severity stripe */}
        <div
          className="w-[3px] flex-shrink-0"
          style={{ backgroundColor: config.color }}
        />

        <div className="flex-1 p-4 space-y-3">
          {/* Top row: severity badge + module chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity pill */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: config.bg,
                color: config.color,
              }}
            >
              <SeverityIcon size={10} />
              {config.label}
            </span>

            {/* Module chips */}
            {insight.modules.map((mod) => (
              <Link key={mod.href} href={mod.href}>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium transition-opacity hover:opacity-80 cursor-pointer"
                  style={{
                    backgroundColor: `${mod.color}14`,
                    color: mod.color,
                  }}
                >
                  {mod.name}
                </span>
              </Link>
            ))}
          </div>

          {/* Title */}
          <p
            className="text-sm font-medium leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {insight.title}
          </p>

          {/* Bottom row: metric display + investigate link */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <MetricDisplay metric={insight.metric} severityColor={config.color} />

            <Link
              href={insight.investigateHref}
              className="inline-flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap"
              style={{ color: "var(--primary)" }}
            >
              Investigate
              <ArrowRight
                size={12}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ====================================================================== */
/*  Main Component                                                           */
/* ====================================================================== */

export function InsightsEngine({ className, delay = 0.6 }: InsightsEngineProps) {
  const { data: summary, isLoading: summaryLoading } = useExecutiveSummary();
  const { data: myTasks, isLoading: tasksLoading } = useMyTasks();

  const isLoading = summaryLoading || tasksLoading;

  const insights = useMemo(() => {
    if (!summary) return [];
    return generateInsights(summary, myTasks);
  }, [summary, myTasks]);

  const dataLoadedButEmpty = !isLoading && summary && insights.length === 0;
  const hasOperationalData =
    summary &&
    (hasTicketData(summary) ||
      hasProjectData(summary) ||
      hasAssetData(summary));

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "rgba(27, 115, 64, 0.08)" }}
        >
          <Brain size={18} style={{ color: "var(--primary)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              AI Insights Engine
            </h2>
            {!isLoading && insights.length > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: "rgba(27, 115, 64, 0.1)",
                  color: "var(--primary)",
                }}
              >
                {insights.length}
              </span>
            )}
          </div>
          <p
            className="text-[11px] flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            <Sparkles size={10} />
            Powered by data analysis
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <InsightSkeleton key={i} index={i} />
          ))}
        </div>
      )}

      {/* Empty State — data loaded but no threshold breaches triggered */}
      {dataLoadedButEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: delay + 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {hasOperationalData ? (
            <InsightCard
              insight={{
                id: "all-clear-fallback",
                title: "No issues detected — all monitored metrics are within healthy thresholds",
                description:
                  "No issues detected — all monitored metrics are within healthy thresholds",
                severity: "positive",
                modules: [],
                investigateHref: "/dashboard",
              }}
              index={0}
              baseDelay={delay + 0.1}
            />
          ) : (
            <div
              className="rounded-xl border p-6 flex items-center gap-4 col-span-full"
              style={{
                background: "rgba(255, 255, 255, 0.6)",
                backdropFilter: "blur(16px)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(107, 114, 128, 0.1)" }}
              >
                <Sparkles size={18} style={{ color: "var(--text-muted)" }} />
              </div>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Awaiting operational data
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Insights will appear here once modules have active tickets,
                  projects, or assets to analyze.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Insights Grid */}
      {!isLoading && insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              index={index}
              baseDelay={delay + 0.1}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
}
