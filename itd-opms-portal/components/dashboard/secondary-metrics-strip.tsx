"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Timer,
  Archive,
  CheckCircle,
  ClipboardCheck,
  Users,
  GraduationCap,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

interface SecondaryMetricsStripProps {
  mttrMinutes: number | undefined;
  mttaMinutes: number | undefined;
  backlogOver30Days: number | undefined;
  licenseCompliancePct: number | undefined;
  auditReadinessScore: number | undefined;
  teamCapacityUtilizationPct: number | undefined;
  overdueTrainingCerts: number | undefined;
  warrantiesExpiring90Days: number | undefined;
  isLoading: boolean;
  delay?: number;
}

const STATUS_COLORS = {
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
} as const;

type StatusColor = (typeof STATUS_COLORS)[keyof typeof STATUS_COLORS];

function getStatusColor(
  value: number | undefined,
  evaluate: (v: number) => StatusColor
): StatusColor {
  if (value === undefined) return STATUS_COLORS.green;
  return evaluate(value);
}

interface MetricConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  value: number | undefined;
  suffix: string;
  colorFn: (v: number) => StatusColor;
}

export function SecondaryMetricsStrip({
  mttrMinutes,
  mttaMinutes,
  backlogOver30Days,
  licenseCompliancePct,
  auditReadinessScore,
  teamCapacityUtilizationPct,
  overdueTrainingCerts,
  warrantiesExpiring90Days,
  isLoading,
  delay = 0.5,
}: SecondaryMetricsStripProps) {
  const metrics: MetricConfig[] = [
    {
      key: "mttr",
      label: "MTTR",
      icon: Clock,
      value: mttrMinutes,
      suffix: "min",
      colorFn: (v) =>
        v <= 60
          ? STATUS_COLORS.green
          : v <= 120
            ? STATUS_COLORS.amber
            : STATUS_COLORS.red,
    },
    {
      key: "mtta",
      label: "MTTA",
      icon: Timer,
      value: mttaMinutes,
      suffix: "min",
      colorFn: (v) =>
        v <= 15
          ? STATUS_COLORS.green
          : v <= 30
            ? STATUS_COLORS.amber
            : STATUS_COLORS.red,
    },
    {
      key: "backlog",
      label: "Backlog >30d",
      icon: Archive,
      value: backlogOver30Days,
      suffix: "",
      colorFn: (v) =>
        v === 0
          ? STATUS_COLORS.green
          : v <= 5
            ? STATUS_COLORS.amber
            : STATUS_COLORS.red,
    },
    {
      key: "license",
      label: "License Compliance",
      icon: CheckCircle,
      value: licenseCompliancePct,
      suffix: "%",
      colorFn: (v) =>
        v >= 95
          ? STATUS_COLORS.green
          : v >= 85
            ? STATUS_COLORS.amber
            : STATUS_COLORS.red,
    },
    {
      key: "audit",
      label: "Audit Readiness",
      icon: ClipboardCheck,
      value: auditReadinessScore,
      suffix: "%",
      colorFn: (v) =>
        v >= 90
          ? STATUS_COLORS.green
          : v >= 70
            ? STATUS_COLORS.amber
            : STATUS_COLORS.red,
    },
    {
      key: "capacity",
      label: "Team Capacity",
      icon: Users,
      value: teamCapacityUtilizationPct,
      suffix: "%",
      colorFn: (v) =>
        v >= 60 && v <= 85
          ? STATUS_COLORS.green
          : (v > 85 && v <= 95) || (v >= 40 && v < 60)
            ? STATUS_COLORS.amber
            : STATUS_COLORS.red,
    },
    {
      key: "training",
      label: "Overdue Training",
      icon: GraduationCap,
      value: overdueTrainingCerts,
      suffix: "",
      colorFn: (v) =>
        v === 0
          ? STATUS_COLORS.green
          : v <= 3
            ? STATUS_COLORS.amber
            : STATUS_COLORS.red,
    },
    {
      key: "warranties",
      label: "Warranties Expiring",
      icon: ShieldAlert,
      value: warrantiesExpiring90Days,
      suffix: "",
      colorFn: (v) =>
        v === 0
          ? STATUS_COLORS.green
          : v <= 5
            ? STATUS_COLORS.amber
            : STATUS_COLORS.red,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-xl border overflow-x-auto"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex flex-nowrap">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const color = getStatusColor(metric.value, metric.colorFn);
          const isLast = index === metrics.length - 1;

          return (
            <div
              key={metric.key}
              className={[
                "flex flex-col items-center justify-center gap-1 px-4 py-3 min-w-[100px] flex-1",
                !isLast ? "border-r" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                borderColor: !isLast ? "var(--border)" : undefined,
              }}
            >
              <Icon size={12} style={{ color: "var(--text-muted)" }} />

              {isLoading ? (
                <div className="h-4 w-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : (
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color }}
                >
                  {metric.value !== undefined
                    ? `${metric.value}${metric.suffix}`
                    : "--"}
                </span>
              )}

              <span
                className="text-[10px] font-medium uppercase tracking-wider whitespace-nowrap"
                style={{ color: "var(--text-muted)" }}
              >
                {metric.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
