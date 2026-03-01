"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  HeartPulse,
  Database,
  HardDrive,
  Radio,
  Server,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  ArrowDownCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  usePlatformHealth,
  useSystemStats,
  useDirectorySyncStatus,
} from "@/hooks/use-system";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type { ServiceHealth, SyncRun } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SERVICE_ICONS: Record<string, React.ElementType> = {
  postgres: Database,
  postgresql: Database,
  redis: Server,
  minio: HardDrive,
  nats: Radio,
};

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  up: { dot: "#10B981", bg: "rgba(16, 185, 129, 0.08)", text: "#059669" },
  healthy: { dot: "#10B981", bg: "rgba(16, 185, 129, 0.08)", text: "#059669" },
  degraded: { dot: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)", text: "#D97706" },
  down: { dot: "#EF4444", bg: "rgba(239, 68, 68, 0.08)", text: "#DC2626" },
  unhealthy: { dot: "#EF4444", bg: "rgba(239, 68, 68, 0.08)", text: "#DC2626" },
};

function getStatusColor(status: string) {
  const lower = status.toLowerCase();
  return STATUS_COLORS[lower] ?? STATUS_COLORS.degraded;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Overall Health Badge                                               */
/* ------------------------------------------------------------------ */

function OverallHealthBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  let Icon = CheckCircle2;
  let color = "#10B981";
  let label = "Healthy";

  if (lower === "degraded") {
    Icon = AlertTriangle;
    color = "#F59E0B";
    label = "Degraded";
  } else if (lower === "down" || lower === "unhealthy") {
    Icon = XCircle;
    color = "#EF4444";
    label = "Unhealthy";
  }

  return (
    <div className="flex items-center gap-2 rounded-xl px-4 py-2" style={{ backgroundColor: `${color}12` }}>
      <Icon size={20} style={{ color }} />
      <span className="text-sm font-bold" style={{ color }}>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Service Card                                                       */
/* ------------------------------------------------------------------ */

function ServiceCard({ service }: { service: ServiceHealth }) {
  const Icon = SERVICE_ICONS[service.name.toLowerCase()] ?? Server;
  const statusColor = getStatusColor(service.status);

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 transition-all hover:shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: statusColor.dot }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: statusColor.bg }}
          >
            <Icon size={18} style={{ color: statusColor.text }} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] capitalize">{service.name}</h4>
            <p className="text-xs text-[var(--neutral-gray)]">{service.details || "Service"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: statusColor.dot }}
          />
          <span className="text-xs font-medium capitalize" style={{ color: statusColor.text }}>
            {service.status}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--neutral-gray)]">
        <div className="flex items-center gap-1">
          <Clock size={10} />
          <span>{service.latency || "N/A"}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Block                                                         */
/* ------------------------------------------------------------------ */

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <p className="text-xs text-[var(--neutral-gray)] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[var(--neutral-gray)] mt-0.5">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Connection Gauge                                                   */
/* ------------------------------------------------------------------ */

function ConnectionGauge({ active, max }: { active: number; max: number }) {
  const pct = max > 0 ? Math.round((active / max) * 100) : 0;
  const color = pct > 80 ? "#EF4444" : pct > 60 ? "#F59E0B" : "#10B981";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <p className="text-xs text-[var(--neutral-gray)] mb-2">DB Connections</p>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{active}</span>
        <span className="text-sm text-[var(--neutral-gray)] mb-0.5">/ {max}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-2)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-[var(--neutral-gray)] mt-1 tabular-nums">{pct}% utilization</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sync History Row                                                   */
/* ------------------------------------------------------------------ */

function SyncHistoryRow({ run }: { run: SyncRun }) {
  return (
    <tr className="border-b border-[var(--border)] last:border-b-0">
      <td className="px-4 py-2.5">
        <StatusBadge status={run.status} />
      </td>
      <td className="px-4 py-2.5 text-xs text-[var(--text-primary)] tabular-nums">{formatDate(run.startedAt)}</td>
      <td className="px-4 py-2.5 text-xs text-[var(--text-primary)] tabular-nums">{run.completedAt ? formatDate(run.completedAt) : "\u2014"}</td>
      <td className="px-4 py-2.5 text-center">
        <span className="text-xs text-[var(--success)] font-medium tabular-nums">+{run.usersAdded}</span>
      </td>
      <td className="px-4 py-2.5 text-center">
        <span className="text-xs text-[var(--info)] font-medium tabular-nums">{run.usersUpdated}</span>
      </td>
      <td className="px-4 py-2.5 text-center">
        <span className="text-xs text-[var(--error)] font-medium tabular-nums">-{run.usersRemoved}</span>
      </td>
      <td className="px-4 py-2.5 text-center">
        {run.errors > 0 ? (
          <span className="text-xs text-[var(--error)] font-medium tabular-nums" title={run.errorDetails}>{run.errors}</span>
        ) : (
          <span className="text-xs text-[var(--neutral-gray)]">0</span>
        )}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HealthPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Platform Health", href: "/dashboard/system/health" },
  ]);

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = usePlatformHealth();
  const { data: statsData, isLoading: statsLoading } = useSystemStats();
  const [syncPage] = useState(1);
  const { data: syncData, refetch: refetchSync } = useDirectorySyncStatus(syncPage, 10);
  const [triggeringSync, setTriggeringSync] = useState(false);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchHealth();
    }, 30_000);
    return () => clearInterval(interval);
  }, [refetchHealth]);

  const services = useMemo(() => {
    if (!healthData?.services) return [];
    return healthData.services;
  }, [healthData]);

  const overallStatus = healthData?.status ?? "unknown";

  const syncHistory = useMemo(() => {
    if (!syncData?.syncHistory) return [];
    return syncData.syncHistory;
  }, [syncData]);

  async function handleTriggerSync() {
    setTriggeringSync(true);
    try {
      await apiClient.post("/system/health/directory-sync/trigger");
      toast.success("Directory sync triggered");
      refetchSync();
    } catch {
      toast.error("Failed to trigger directory sync");
    } finally {
      setTriggeringSync(false);
    }
  }

  return (
    <PermissionGate permission="system.view">
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <HeartPulse size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Platform Health
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              {healthData?.version ? `v${healthData.version}` : "Infrastructure monitoring"}{" "}
              {healthData?.uptime ? `\u2022 Uptime: ${healthData.uptime}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <OverallHealthBadge status={overallStatus} />
          <button
            type="button"
            onClick={() => refetchHealth()}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Service Status Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Server size={14} />
          Service Status
        </h2>
        {healthLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--surface-1)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((svc) => (
              <ServiceCard key={svc.name} service={svc} />
            ))}
          </div>
        )}
      </motion.div>

      {/* System Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Layers size={14} />
          System Statistics
        </h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--surface-1)]" />
            ))}
          </div>
        ) : statsData ? (
          <div className="space-y-4">
            {/* Users Row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <StatBlock label="Total Users" value={statsData.users?.totalUsers ?? 0} />
              <StatBlock label="Active Users" value={statsData.users?.activeUsers ?? 0} />
              <StatBlock label="Inactive Users" value={statsData.users?.inactiveUsers ?? 0} />
              <StatBlock label="Online Now" value={statsData.users?.onlineNow ?? 0} />
              <StatBlock label="New This Month" value={statsData.users?.newThisMonth ?? 0} />
            </div>
            {/* Database Row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatBlock label="Database Size" value={statsData.database?.size ?? "N/A"} />
              <StatBlock label="Tables" value={statsData.database?.tableCount ?? 0} />
              <ConnectionGauge
                active={statsData.database?.activeConnections ?? 0}
                max={statsData.database?.maxConnections ?? 100}
              />
              <StatBlock label="Audit Events" value={statsData.auditEvents?.totalEvents ?? 0} sub={`${statsData.auditEvents?.eventsToday ?? 0} today`} />
            </div>
            {/* Storage Row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatBlock label="Storage Objects" value={statsData.storage?.totalObjects ?? 0} />
              <StatBlock label="Total Size" value={statsData.storage?.totalSize ?? "N/A"} />
              <StatBlock label="Evidence Items" value={statsData.storage?.evidenceItems ?? 0} />
              <StatBlock label="Attachments" value={statsData.storage?.attachments ?? 0} />
            </div>
            {/* Module Stats */}
            {statsData.modules && statsData.modules.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">Module Record Counts</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">Module</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--neutral-gray)]">Records</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--neutral-gray)]">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.modules.map((m) => (
                      <tr key={m.name} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] capitalize">{m.name}</td>
                        <td className="px-4 py-2 text-right text-sm text-[var(--text-primary)] tabular-nums">{m.recordCount}</td>
                        <td className="px-4 py-2 text-right text-sm text-[var(--text-primary)] tabular-nums">{m.activeItems}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--neutral-gray)]">Unable to load statistics</p>
        )}
      </motion.div>

      {/* Directory Sync */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ArrowDownCircle size={14} />
            Directory Sync
          </h2>
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={triggeringSync}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Play size={14} />
            {triggeringSync ? "Triggering..." : "Trigger Sync"}
          </button>
        </div>

        {/* Sync Status */}
        {syncData && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <p className="text-xs text-[var(--neutral-gray)] mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: syncData.enabled ? "#10B981" : "#6B7280" }}
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {syncData.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
            <StatBlock label="Last Sync" value={syncData.lastSync ? formatDate(syncData.lastSync) : "Never"} />
            <StatBlock label="Next Scheduled" value={syncData.nextScheduled ? formatDate(syncData.nextScheduled) : "N/A"} />
            <StatBlock label="Last Result" value={syncData.lastSyncStatus || "N/A"} />
          </div>
        )}

        {/* Sync History */}
        {syncHistory.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">Sync History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">Started</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">Completed</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-[var(--neutral-gray)]">Added</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-[var(--neutral-gray)]">Updated</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-[var(--neutral-gray)]">Removed</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-[var(--neutral-gray)]">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {syncHistory.map((run) => (
                    <SyncHistoryRow key={run.id} run={run} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
    </PermissionGate>
  );
}
