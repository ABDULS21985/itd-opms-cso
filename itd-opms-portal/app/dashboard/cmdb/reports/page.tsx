"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Package,
  FileKey,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  useAssetStats,
  useLicenseComplianceStats,
  useExpiringWarranties,
} from "@/hooks/use-cmdb";

/* ------------------------------------------------------------------ */
/*  Stat Card Component                                                */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  color,
  icon: Icon,
  loading,
  subtext,
}: {
  label: string;
  value: string | number | undefined;
  color: string;
  icon: typeof Package;
  loading: boolean;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {loading ? (
          <span className="inline-block w-8 h-7 rounded bg-[var(--surface-2)] animate-pulse" />
        ) : (
          (value ?? "--")
        )}
      </p>
      {subtext && (
        <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{subtext}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const { data: assetStats, isLoading: assetLoading } = useAssetStats();
  const { data: complianceStats, isLoading: complianceLoading } =
    useLicenseComplianceStats();
  const { data: expiring30, isLoading: exp30Loading } = useExpiringWarranties(30);
  const { data: expiring60, isLoading: exp60Loading } = useExpiringWarranties(60);
  const { data: expiring90, isLoading: exp90Loading } = useExpiringWarranties(90);

  /* ---- Derived values ---- */
  const totalAssets = assetStats?.total ?? 0;
  const activePct =
    totalAssets > 0
      ? Math.round(((assetStats?.activeCount ?? 0) / totalAssets) * 100)
      : 0;
  const maintenancePct =
    totalAssets > 0
      ? Math.round(((assetStats?.maintenanceCount ?? 0) / totalAssets) * 100)
      : 0;
  const retiredPct =
    totalAssets > 0
      ? Math.round(((assetStats?.retiredCount ?? 0) / totalAssets) * 100)
      : 0;
  const otherPct = totalAssets > 0 ? 100 - activePct - maintenancePct - retiredPct : 0;

  const compliancePct =
    complianceStats && complianceStats.total > 0
      ? Math.round((complianceStats.compliant / complianceStats.total) * 100)
      : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <BarChart3 size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Asset Analytics &amp; Reports
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Overview of assets, license compliance, and warranty status
            </p>
          </div>
        </div>
      </motion.div>

      {/* Section: Asset Distribution by Type */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Asset Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Assets"
            value={assetStats?.total}
            color="#1B7340"
            icon={Package}
            loading={assetLoading}
          />
          <StatCard
            label="Active"
            value={assetStats?.activeCount}
            color="#10B981"
            icon={CheckCircle}
            loading={assetLoading}
            subtext={totalAssets > 0 ? `${activePct}% of total` : undefined}
          />
          <StatCard
            label="Maintenance"
            value={assetStats?.maintenanceCount}
            color="#F59E0B"
            icon={AlertTriangle}
            loading={assetLoading}
            subtext={totalAssets > 0 ? `${maintenancePct}% of total` : undefined}
          />
          <StatCard
            label="Retired"
            value={assetStats?.retiredCount}
            color="#6B7280"
            icon={Clock}
            loading={assetLoading}
            subtext={totalAssets > 0 ? `${retiredPct}% of total` : undefined}
          />
        </div>
      </motion.div>

      {/* Section: Asset Status Breakdown (bar visualization) */}
      {assetStats && totalAssets > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Asset Status Breakdown
          </h3>
          <div className="flex h-6 rounded-full overflow-hidden">
            {activePct > 0 && (
              <div
                className="transition-all duration-500"
                style={{ width: `${activePct}%`, backgroundColor: "#10B981" }}
                title={`Active: ${activePct}%`}
              />
            )}
            {maintenancePct > 0 && (
              <div
                className="transition-all duration-500"
                style={{ width: `${maintenancePct}%`, backgroundColor: "#F59E0B" }}
                title={`Maintenance: ${maintenancePct}%`}
              />
            )}
            {retiredPct > 0 && (
              <div
                className="transition-all duration-500"
                style={{ width: `${retiredPct}%`, backgroundColor: "#6B7280" }}
                title={`Retired: ${retiredPct}%`}
              />
            )}
            {otherPct > 0 && (
              <div
                className="transition-all duration-500"
                style={{ width: `${otherPct}%`, backgroundColor: "#3B82F6" }}
                title={`Other: ${otherPct}%`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#10B981" }} />
              <span className="text-xs text-[var(--text-secondary)]">Active ({activePct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
              <span className="text-xs text-[var(--text-secondary)]">Maintenance ({maintenancePct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#6B7280" }} />
              <span className="text-xs text-[var(--text-secondary)]">Retired ({retiredPct}%)</span>
            </div>
            {otherPct > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#3B82F6" }} />
                <span className="text-xs text-[var(--text-secondary)]">Other ({otherPct}%)</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Section: License Compliance Overview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          License Compliance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Licenses"
            value={complianceStats?.total}
            color="#8B5CF6"
            icon={FileKey}
            loading={complianceLoading}
          />
          <StatCard
            label="Compliant"
            value={complianceStats?.compliant}
            color="#10B981"
            icon={CheckCircle}
            loading={complianceLoading}
            subtext={
              complianceStats && complianceStats.total > 0
                ? `${compliancePct}% compliance rate`
                : undefined
            }
          />
          <StatCard
            label="Over Deployed"
            value={complianceStats?.overDeployed}
            color="#EF4444"
            icon={XCircle}
            loading={complianceLoading}
            subtext="Requires immediate attention"
          />
          <StatCard
            label="Under Utilized"
            value={complianceStats?.underUtilized}
            color="#F59E0B"
            icon={AlertTriangle}
            loading={complianceLoading}
            subtext="Optimization opportunity"
          />
        </div>

        {/* Compliance bar */}
        {complianceStats && complianceStats.total > 0 && (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Overall Compliance Rate
              </p>
              <p
                className="text-sm font-bold tabular-nums"
                style={{
                  color:
                    compliancePct >= 90
                      ? "#10B981"
                      : compliancePct >= 70
                        ? "#F59E0B"
                        : "#EF4444",
                }}
              >
                {compliancePct}%
              </p>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${compliancePct}%`,
                  backgroundColor:
                    compliancePct >= 90
                      ? "#10B981"
                      : compliancePct >= 70
                        ? "#F59E0B"
                        : "#EF4444",
                }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Section: Warranty Expiry Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Warranty Expiry Timeline
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: "rgba(239, 68, 68, 0.3)",
              backgroundColor: "rgba(239, 68, 68, 0.03)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} style={{ color: "#EF4444" }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#EF4444" }}>
                Next 30 Days
              </p>
            </div>
            <p className="text-3xl font-bold tabular-nums" style={{ color: "#EF4444" }}>
              {exp30Loading ? (
                <span className="inline-block w-8 h-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : (
                (expiring30?.length ?? 0)
              )}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              warranties expiring
            </p>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: "rgba(245, 158, 11, 0.3)",
              backgroundColor: "rgba(245, 158, 11, 0.03)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} style={{ color: "#F59E0B" }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#F59E0B" }}>
                Next 60 Days
              </p>
            </div>
            <p className="text-3xl font-bold tabular-nums" style={{ color: "#F59E0B" }}>
              {exp60Loading ? (
                <span className="inline-block w-8 h-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : (
                (expiring60?.length ?? 0)
              )}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              warranties expiring
            </p>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: "rgba(59, 130, 246, 0.3)",
              backgroundColor: "rgba(59, 130, 246, 0.03)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} style={{ color: "#3B82F6" }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#3B82F6" }}>
                Next 90 Days
              </p>
            </div>
            <p className="text-3xl font-bold tabular-nums" style={{ color: "#3B82F6" }}>
              {exp90Loading ? (
                <span className="inline-block w-8 h-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : (
                (expiring90?.length ?? 0)
              )}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              warranties expiring
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
