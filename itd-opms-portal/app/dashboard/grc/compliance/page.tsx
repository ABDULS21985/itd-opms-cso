"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Plus,
  Scale,
  Sparkles,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useComplianceControls, useComplianceStats } from "@/hooks/use-grc";
import type { ComplianceControl, ComplianceStats } from "@/types";

const FRAMEWORKS = [
  { value: "", label: "All Frameworks" },
  { value: "ISO_27001", label: "ISO 27001" },
  { value: "COBIT", label: "COBIT" },
  { value: "CBN_IT_GUIDELINES", label: "CBN IT Standards" },
  { value: "NIST_CSF", label: "NIST CSF" },
  { value: "PCI_DSS", label: "PCI DSS" },
  { value: "SOC2", label: "SOC 2" },
  { value: "NDPR", label: "NDPR" },
] as const;

const IMPL_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "partial", label: "Partially Implemented" },
  { value: "implemented", label: "Implemented" },
  { value: "verified", label: "Verified" },
] as const;

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFrameworkLabel(value: string): string {
  const match = FRAMEWORKS.find(
    (framework) => framework.value === value || framework.label === value,
  );
  if (match) return match.label;
  return value.replace(/_/g, " ");
}

function getCompliancePct(stat: ComplianceStats): number {
  if (stat.total === 0) return 0;
  return Math.round((stat.compliantCount / stat.total) * 100);
}

function getComplianceColor(pct: number): string {
  if (pct >= 80) return "#10B981";
  if (pct >= 60) return "#F59E0B";
  if (pct >= 40) return "#F97316";
  return "#EF4444";
}

function getImplStatusLabel(status: string): string {
  const match = IMPL_STATUSES.find((item) => item.value === status);
  return match?.label ?? status.replace(/_/g, " ");
}

function getImplStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "verified":
      return { bg: "rgba(16, 185, 129, 0.15)", text: "#059669" };
    case "implemented":
      return { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" };
    case "partial":
      return { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" };
    case "not_started":
      return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" };
    default:
      return { bg: "var(--surface-2)", text: "var(--text-secondary)" };
  }
}

function compliancePosture(avgCompliance: number, attentionCount: number) {
  if (avgCompliance < 55 || attentionCount >= 8) {
    return {
      label: "Needs intervention",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "Control execution is lagging enough that the program needs focused remediation rather than passive tracking.",
    };
  }

  if (avgCompliance < 80 || attentionCount >= 4) {
    return {
      label: "In progress",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "The compliance program is moving, but several controls still need attention before posture is comfortable.",
    };
  }

  return {
    label: "Well controlled",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "Coverage, verification, and framework alignment are strong enough to show a steady program rhythm.",
  };
}

function LoadingValue({ width = "w-14" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function FrameworkStatsCard({ stat }: { stat: ComplianceStats }) {
  const pct = getCompliancePct(stat);
  const color = getComplianceColor(pct);

  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: `${color}22`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${color}14, transparent 32%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Framework
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {formatFrameworkLabel(stat.framework)}
          </h3>
        </div>
        <p className="text-3xl font-bold tabular-nums" style={{ color }}>
          {pct}%
        </p>
      </div>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] bg-[var(--surface-0)]/78 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Compliant
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {stat.compliantCount} controls
          </p>
        </div>
        <div className="rounded-[20px] bg-[var(--surface-0)]/78 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Total
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {stat.total} mapped
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ComplianceDashboardPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [framework, setFramework] = useState("");
  const [implStatus, setImplStatus] = useState("");
  const [activeFrameworkTab, setActiveFrameworkTab] = useState("");

  const { data: statsData, isLoading: statsLoading } = useComplianceStats();
  const { data, isLoading } = useComplianceControls(
    page,
    20,
    activeFrameworkTab || framework || undefined,
    implStatus || undefined,
  );

  const controls = data?.data ?? [];
  const meta = data?.meta;
  const stats = statsData ?? [];

  const programSummary = useMemo(() => {
    const frameworkCount = stats.length;
    const totalControls = stats.reduce((sum, item) => sum + item.total, 0);
    const compliantControls = stats.reduce(
      (sum, item) => sum + item.compliantCount,
      0,
    );
    const avgCompliance =
      totalControls > 0
        ? Math.round((compliantControls / totalControls) * 100)
        : 0;

    const attentionCount = controls.filter(
      (control) =>
        control.implementationStatus === "not_started" ||
        control.implementationStatus === "partial",
    ).length;

    const lastAssessed = controls
      .filter((control) => Boolean(control.lastAssessedAt))
      .sort(
        (a, b) =>
          new Date(b.lastAssessedAt ?? 0).getTime() -
          new Date(a.lastAssessedAt ?? 0).getTime(),
      )[0]?.lastAssessedAt;

    return {
      frameworkCount,
      totalControls,
      compliantControls,
      avgCompliance,
      attentionCount,
      lastAssessed,
    };
  }, [controls, stats]);

  const posture = compliancePosture(
    programSummary.avgCompliance,
    programSummary.attentionCount,
  );

  const statusMix = useMemo(() => {
    const counts = {
      verified: 0,
      implemented: 0,
      partial: 0,
      not_started: 0,
    };

    controls.forEach((control) => {
      if (control.implementationStatus in counts) {
        counts[control.implementationStatus as keyof typeof counts] += 1;
      }
    });

    return counts;
  }, [controls]);

  const focusFrameworks = useMemo(
    () =>
      [...stats]
        .sort((a, b) => getCompliancePct(a) - getCompliancePct(b))
        .slice(0, 4),
    [stats],
  );

  const columns: Column<ComplianceControl>[] = [
    {
      key: "controlId",
      header: "Control ID",
      sortable: true,
      render: (item) => (
        <span className="text-sm font-mono font-medium text-[var(--primary)]">
          {item.controlId}
        </span>
      ),
    },
    {
      key: "controlName",
      header: "Name",
      sortable: true,
      className: "min-w-[240px]",
      render: (item) => (
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {item.controlName}
        </p>
      ),
    },
    {
      key: "framework",
      header: "Framework",
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
          {formatFrameworkLabel(item.framework)}
        </span>
      ),
    },
    {
      key: "implementationStatus",
      header: "Status",
      sortable: true,
      render: (item) => {
        const tone = getImplStatusColor(item.implementationStatus);
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: tone.bg, color: tone.text }}
          >
            {getImplStatusLabel(item.implementationStatus)}
          </span>
        );
      },
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.ownerId ? `${item.ownerId.slice(0, 8)}...` : "--"}
        </span>
      ),
    },
    {
      key: "lastAssessedAt",
      header: "Last Assessed",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatDate(item.lastAssessedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(16, 185, 129, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(16,185,129,0.16), transparent 30%), radial-gradient(circle at 88% 16%, rgba(37,99,235,0.1), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(16, 185, 129, 0.25)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${posture.badgeClass}`}
              >
                <Sparkles size={14} />
                {posture.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <Scale size={14} className="text-[#10B981]" />
                Compliance command center
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                Compliance Dashboard
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                Framework mapping, control tracking, and compliance posture in a
                stronger operational view so teams can see where evidence,
                implementation, and verification are actually lagging.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/grc/compliance?action=new")
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                Add Control
              </button>
              <button
                type="button"
                onClick={() => {
                  setImplStatus("not_started");
                  setPage(1);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                <AlertTriangle size={16} />
                Show Gaps
              </button>
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Compliance pulse
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Program telemetry
                </h2>
              </div>
              <Activity size={20} className="text-[var(--primary)]" />
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {posture.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Average alignment
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {statsLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    `${programSummary.avgCompliance}%`
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Attention controls
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    programSummary.attentionCount
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Frameworks tracked
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {statsLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    programSummary.frameworkCount
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Last assessed
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {isLoading ? (
                    <LoadingValue width="w-20" />
                  ) : (
                    formatDate(programSummary.lastAssessed)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Frameworks tracked",
            value: programSummary.frameworkCount,
            helper: "Distinct compliance programs in scope.",
            color: "#2563EB",
          },
          {
            label: "Mapped controls",
            value: programSummary.totalControls,
            helper: "Total controls currently mapped across frameworks.",
            color: "#10B981",
          },
          {
            label: "Compliant controls",
            value: programSummary.compliantControls,
            helper: "Controls marked compliant in current reporting.",
            color: "#1B7340",
          },
          {
            label: "Open attention",
            value: programSummary.attentionCount,
            helper: "Visible controls still partial or not started.",
            color: "#DC2626",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[28px] border p-5"
            style={{
              borderColor: `${card.color}1f`,
              backgroundImage: `radial-gradient(circle at 100% 0%, ${card.color}14, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {card.label}
            </p>
            <p
              className="mt-3 text-3xl font-bold tabular-nums"
              style={{ color: card.color }}
            >
              {statsLoading && card.label !== "Open attention" ? (
                <LoadingValue />
              ) : isLoading && card.label === "Open attention" ? (
                <LoadingValue />
              ) : (
                card.value
              )}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {card.helper}
            </p>
          </div>
        ))}
      </div>

      {!statsLoading && stats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-4"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Framework coverage
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Control performance by framework
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat) => (
              <FrameworkStatsCard key={stat.framework} stat={stat} />
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-4">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Control register
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Live compliance control board
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {IMPL_STATUSES.map((status) => {
                  const active = implStatus === status.value;
                  return (
                    <button
                      key={status.label}
                      type="button"
                      onClick={() => {
                        setImplStatus(status.value);
                        setPage(1);
                      }}
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
                      style={{
                        borderColor: active
                          ? "var(--primary)"
                          : "var(--border)",
                        backgroundColor: active
                          ? "rgba(37, 99, 235, 0.1)"
                          : "var(--surface-0)",
                        color: active
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] pb-1">
              {[{ value: "", label: "All" }, ...FRAMEWORKS.slice(1)].map(
                (item) => {
                  const active = activeFrameworkTab === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setActiveFrameworkTab(item.value);
                        setPage(1);
                      }}
                      className={`relative whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "text-[var(--primary)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {item.label}
                      {active && (
                        <motion.div
                          layoutId="compliance-tab-indicator"
                          className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[var(--primary)]"
                        />
                      )}
                    </button>
                  );
                },
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Framework override
                </label>
                <select
                  value={framework}
                  onChange={(event) => {
                    setFramework(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  {FRAMEWORKS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFramework("");
                  setImplStatus("");
                  setActiveFrameworkTab("");
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Reset filters
              </button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-1"
          >
            <DataTable
              columns={columns}
              data={controls}
              keyExtractor={(item) => item.id}
              loading={isLoading}
              emptyTitle="No compliance controls found"
              emptyDescription="Add compliance controls to track your regulatory posture."
              emptyAction={
                <button
                  type="button"
                  onClick={() =>
                    router.push("/dashboard/grc/compliance?action=new")
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Plus size={16} />
                  Add Control
                </button>
              }
              pagination={
                meta
                  ? {
                      currentPage: meta.page,
                      totalPages: meta.totalPages,
                      totalItems: meta.totalItems,
                      pageSize: meta.pageSize,
                      onPageChange: setPage,
                    }
                  : undefined
              }
            />
          </motion.div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Visible status mix
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Current board state
                </h2>
              </div>
              <Clock3 size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  label: "Verified",
                  value: statusMix.verified,
                  color: "#059669",
                  bg: "rgba(16, 185, 129, 0.1)",
                  icon: CheckCircle2,
                },
                {
                  label: "Implemented",
                  value: statusMix.implemented,
                  color: "#10B981",
                  bg: "rgba(16, 185, 129, 0.08)",
                  icon: CheckCircle2,
                },
                {
                  label: "Partially Implemented",
                  value: statusMix.partial,
                  color: "#D97706",
                  bg: "rgba(217, 119, 6, 0.1)",
                  icon: AlertTriangle,
                },
                {
                  label: "Not Started",
                  value: statusMix.not_started,
                  color: "#DC2626",
                  bg: "rgba(220, 38, 38, 0.1)",
                  icon: AlertTriangle,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-[22px] bg-[var(--surface-1)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: item.bg, color: item.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {item.label}
                      </p>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                      {isLoading ? <LoadingValue width="w-10" /> : item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Framework watch
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Lowest performing frameworks
                </h2>
              </div>
              <ArrowRight size={18} className="text-[var(--text-secondary)]" />
            </div>

            <div className="mt-5 space-y-3">
              {statsLoading ? (
                [1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] bg-[var(--surface-1)] p-4"
                  >
                    <div className="h-5 w-1/2 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                    <div className="mt-3 h-2.5 animate-pulse rounded-full bg-[var(--surface-2)]" />
                  </div>
                ))
              ) : focusFrameworks.length === 0 ? (
                <div className="rounded-[22px] bg-[var(--surface-1)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                  No framework stats available yet. Add controls and mappings to
                  start measuring framework posture.
                </div>
              ) : (
                focusFrameworks.map((stat) => {
                  const pct = getCompliancePct(stat);
                  const color = getComplianceColor(pct);
                  return (
                    <div
                      key={stat.framework}
                      className="rounded-[22px] bg-[var(--surface-1)] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {formatFrameworkLabel(stat.framework)}
                        </p>
                        <p className="text-sm font-bold" style={{ color }}>
                          {pct}%
                        </p>
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
