"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Gauge,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useSLAComplianceStats, useSLAPolicies } from "@/hooks/use-itsm";
import type { SLAPolicy } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function complianceColor(pct: number): string {
  if (pct >= 90) return "#22C55E";
  if (pct >= 75) return "#F59E0B";
  return "#EF4444";
}

function complianceBg(pct: number): string {
  if (pct >= 90) return "rgba(34, 197, 94, 0.1)";
  if (pct >= 75) return "rgba(245, 158, 11, 0.1)";
  return "rgba(239, 68, 68, 0.1)";
}

function complianceLabel(pct: number): string {
  if (pct >= 90) return "Healthy";
  if (pct >= 75) return "At Risk";
  return "Critical";
}

/* ------------------------------------------------------------------ */
/*  Progress Bar Component                                              */
/* ------------------------------------------------------------------ */

function ComplianceBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const color = complianceColor(pct);
  const bg = complianceBg(pct);
  const status = complianceLabel(pct);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium rounded-full px-2 py-0.5"
            style={{ backgroundColor: bg, color }}
          >
            {status}
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color }}
          >
            {pct}%
          </span>
        </div>
      </div>
      <div
        className="w-full h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--surface-2)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        {value} of {total} tickets met target
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Policy Priority Targets Table                                       */
/* ------------------------------------------------------------------ */

function PolicyTargetsTable({ policy }: { policy: SLAPolicy }) {
  const priorities = Object.entries(policy.priorityTargets || {});

  if (priorities.length === 0) {
    return (
      <p className="text-xs text-[var(--text-secondary)]">
        No priority targets configured.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr
            className="border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <th className="text-left py-2 pr-4 font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Priority
            </th>
            <th className="text-right py-2 px-4 font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Response
            </th>
            <th className="text-right py-2 pl-4 font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Resolution
            </th>
          </tr>
        </thead>
        <tbody>
          {priorities.map(([priority, targets]) => (
            <tr
              key={priority}
              className="border-b last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <td className="py-2 pr-4 text-[var(--text-primary)] font-medium capitalize">
                {priority}
              </td>
              <td className="py-2 px-4 text-right text-[var(--text-secondary)] tabular-nums">
                {targets.response_minutes} min
              </td>
              <td className="py-2 pl-4 text-right text-[var(--text-secondary)] tabular-nums">
                {targets.resolution_minutes} min
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SLADashboardPage() {
  const { data: compliance, isLoading: complianceLoading } =
    useSLAComplianceStats();
  const { data: policiesData, isLoading: policiesLoading } =
    useSLAPolicies(1, 50);

  const policies = useMemo(() => {
    if (!policiesData) return [];
    if (Array.isArray(policiesData)) return policiesData as SLAPolicy[];
    return (policiesData as { data?: SLAPolicy[] }).data || [];
  }, [policiesData]);

  const responsePct =
    compliance && compliance.totalTickets > 0
      ? Math.round(
          (compliance.responseMet / compliance.totalTickets) * 100,
        )
      : 0;

  const resolutionPct =
    compliance && compliance.totalTickets > 0
      ? Math.round(
          (compliance.resolutionMet / compliance.totalTickets) * 100,
        )
      : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
          >
            <Gauge size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              SLA Dashboard
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Monitor service level agreement compliance and performance
              targets.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Overall Compliance Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Tickets */}
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
              >
                <Clock size={18} style={{ color: "#3B82F6" }} />
              </div>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Total Tracked
              </span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
              {complianceLoading ? (
                <span className="inline-block w-12 h-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : (
                (compliance?.totalTickets ?? "--")
              )}
            </p>
          </div>

          {/* Response Compliance */}
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: complianceBg(responsePct),
                }}
              >
                <CheckCircle2
                  size={18}
                  style={{ color: complianceColor(responsePct) }}
                />
              </div>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Response Compliance
              </span>
            </div>
            <p
              className="text-3xl font-bold tabular-nums"
              style={{ color: complianceColor(responsePct) }}
            >
              {complianceLoading ? (
                <span className="inline-block w-12 h-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : compliance ? (
                `${responsePct}%`
              ) : (
                "--"
              )}
            </p>
          </div>

          {/* Resolution Compliance */}
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: complianceBg(resolutionPct),
                }}
              >
                <ShieldCheck
                  size={18}
                  style={{ color: complianceColor(resolutionPct) }}
                />
              </div>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Resolution Compliance
              </span>
            </div>
            <p
              className="text-3xl font-bold tabular-nums"
              style={{ color: complianceColor(resolutionPct) }}
            >
              {complianceLoading ? (
                <span className="inline-block w-12 h-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : compliance ? (
                `${resolutionPct}%`
              ) : (
                "--"
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Compliance Progress Bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div
          className="rounded-xl border p-6 space-y-6"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Compliance Breakdown
          </h2>
          {complianceLoading ? (
            <div className="space-y-4">
              <div className="h-16 rounded-lg bg-[var(--surface-2)] animate-pulse" />
              <div className="h-16 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            </div>
          ) : compliance ? (
            <div className="space-y-6">
              <ComplianceBar
                label="First Response SLA"
                value={compliance.responseMet}
                total={compliance.totalTickets}
              />
              <ComplianceBar
                label="Resolution SLA"
                value={compliance.resolutionMet}
                total={compliance.totalTickets}
              />
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              No compliance data available yet.
            </p>
          )}
        </div>
      </motion.div>

      {/* SLA Policies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          SLA Policies
        </h2>
        {policiesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-[var(--surface-2)] animate-pulse"
              />
            ))}
          </div>
        ) : policies.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-xl border"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <Gauge
              size={48}
              className="text-[var(--text-secondary)] mb-4 opacity-40"
            />
            <p className="text-[var(--text-secondary)] text-sm">
              No SLA policies configured yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((policy, index) => (
              <motion.div
                key={policy.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.3 + index * 0.05,
                }}
                className="rounded-xl border p-5"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {policy.name}
                      </h3>
                      {policy.isDefault && (
                        <span
                          className="text-xs font-medium rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor:
                              "rgba(59, 130, 246, 0.1)",
                            color: "#3B82F6",
                          }}
                        >
                          Default
                        </span>
                      )}
                      <span
                        className="text-xs font-medium rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor: policy.isActive
                            ? "rgba(34, 197, 94, 0.1)"
                            : "rgba(156, 163, 175, 0.1)",
                          color: policy.isActive
                            ? "#22C55E"
                            : "#9CA3AF",
                        }}
                      >
                        {policy.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {policy.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {policy.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <PolicyTargetsTable policy={policy} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
