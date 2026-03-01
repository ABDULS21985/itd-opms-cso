"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Users,
  ScrollText,
  Settings,
  Activity,
  MonitorSmartphone,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  usePlatformHealth,
  useSystemStats,
  useAuditLogs,
  useAuditStats,
  useSessionStats,
  useRoles,
  useExportAuditLogs,
} from "@/hooks/use-system";
import { apiClient } from "@/lib/api-client";
import type { AuditEventDetail, RoleDetail } from "@/types";

/* ================================================================== */
/*  Constants                                                           */
/* ================================================================== */

const ACTION_COLORS: Record<string, { bg: string; text: string; chart: string }> = {
  create:  { bg: "rgba(34,197,94,0.12)",  text: "var(--success)",      chart: "#22C55E" },
  update:  { bg: "rgba(59,130,246,0.12)",  text: "var(--info)",         chart: "#3B82F6" },
  delete:  { bg: "rgba(239,68,68,0.12)",   text: "var(--error)",        chart: "#EF4444" },
  login:   { bg: "rgba(107,114,128,0.12)", text: "var(--neutral-gray)", chart: "#9CA3AF" },
  approve: { bg: "rgba(34,197,94,0.12)",   text: "var(--success)",      chart: "#22C55E" },
  assign:  { bg: "rgba(139,92,246,0.12)",  text: "#8B5CF6",             chart: "#8B5CF6" },
  logout:  { bg: "rgba(107,114,128,0.12)", text: "var(--neutral-gray)", chart: "#D1D5DB" },
};

const MODULE_COLORS = [
  "#1B7340", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899",
];

const AUDIT_FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "user", label: "User Changes" },
  { key: "role", label: "Role Changes" },
  { key: "setting", label: "Settings" },
  { key: "login", label: "Logins" },
] as const;

type AuditFilterKey = (typeof AUDIT_FILTER_TABS)[number]["key"];

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function actionColor(a: string) {
  return ACTION_COLORS[a.toLowerCase()] ?? { bg: "rgba(107,114,128,0.1)", text: "var(--neutral-gray)", chart: "#9CA3AF" };
}

/* ================================================================== */
/*  Sub-components                                                      */
/* ================================================================== */

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  loading,
  href,
  color,
  trend,
  sparkData,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number | undefined;
  subtitle?: string;
  loading: boolean;
  href: string;
  color: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  sparkData?: number[];
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon
            size={20}
            style={{ color }}
            className="transition-transform duration-200 group-hover:scale-110"
          />
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span
              className="flex items-center gap-0.5 text-[11px] font-semibold"
              style={{
                color:
                  trend.direction === "up"
                    ? "var(--success)"
                    : trend.direction === "down"
                      ? "var(--error)"
                      : "var(--neutral-gray)",
              }}
            >
              {trend.direction === "up" ? (
                <ArrowUp size={12} />
              ) : trend.direction === "down" ? (
                <ArrowDown size={12} />
              ) : null}
              {trend.label}
            </span>
          )}
          <ArrowRight
            size={16}
            className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
          />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {loading ? (
              <span className="inline-block w-12 h-7 rounded bg-[var(--surface-2)] animate-pulse" />
            ) : (
              (value ?? "--")
            )}
          </p>
          <p className="text-sm font-medium text-[var(--text-secondary)] mt-0.5">
            {label}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {sparkData && sparkData.length > 0 && (
          <div className="w-20 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData.map((v, i) => ({ v, i }))}>
                <defs>
                  <linearGradient id={`spark-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#spark-${label.replace(/\s/g, "")})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Link>
  );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 animate-pulse">
      <div className="h-5 w-40 rounded bg-[var(--surface-2)] mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-[var(--surface-2)]" style={{ width: `${80 - i * 15}%` }} />
        ))}
      </div>
    </div>
  );
}

function SectionError({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 text-center">
      <AlertTriangle size={20} className="mx-auto mb-2 text-[var(--warning)]" />
      <p className="text-sm text-[var(--neutral-gray)]">Failed to load {title}</p>
    </div>
  );
}

function ServiceStatusDot({ status }: { status: string }) {
  const color =
    status === "healthy"
      ? "var(--success)"
      : status === "degraded"
        ? "var(--warning)"
        : "var(--error)";
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/* ================================================================== */
/*  Custom Tooltip                                                      */
/* ================================================================== */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-[var(--neutral-gray)]">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-semibold text-[var(--text-primary)]">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export default function SystemOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [auditFilter, setAuditFilter] = useState<AuditFilterKey>("all");
  const [syncingDir, setSyncingDir] = useState(false);

  /* ---- Breadcrumbs ---- */
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
  ]);

  // ---------- Data hooks ----------
  const { data: platformHealth, isLoading: healthLoading, isError: healthError } = usePlatformHealth();
  const { data: systemStats, isLoading: statsLoading, isError: statsError } = useSystemStats();
  const { data: auditStatsData, isLoading: auditStatsLoading, isError: auditStatsError } = useAuditStats();
  const { data: sessionStats, isLoading: sessionStatsLoading } = useSessionStats();
  const { data: rolesData, isLoading: rolesLoading, isError: rolesError } = useRoles();
  const { data: recentAuditData, isLoading: auditLoading, isError: auditError } = useAuditLogs(1, 10);
  const exportAuditMutation = useExportAuditLogs();

  // ---------- Greeting ----------
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // ---------- User trend ----------
  const userTrend = useMemo(() => {
    if (!systemStats?.users) return undefined;
    const { newThisMonth, totalUsers } = systemStats.users;
    if (totalUsers === 0) return { direction: "flat" as const, label: "0%" };
    const pct = Math.round((newThisMonth / totalUsers) * 100);
    if (pct > 0) return { direction: "up" as const, label: `+${pct}% this month` };
    return { direction: "flat" as const, label: "No change" };
  }, [systemStats]);

  // ---------- Sparkline from audit stats (last 7 days) ----------
  const auditSparkline = useMemo(() => {
    if (!auditStatsData?.eventsPerDay) return undefined;
    return auditStatsData.eventsPerDay.slice(-7).map((d) => d.count);
  }, [auditStatsData]);

  // ---------- Healthy services count ----------
  const healthySummary = useMemo(() => {
    if (!platformHealth?.services) return undefined;
    const total = platformHealth.services.length;
    const healthy = platformHealth.services.filter((s) => s.status === "healthy").length;
    return `${healthy}/${total} healthy`;
  }, [platformHealth]);

  // ---------- Roles chart data ----------
  const roleChartData = useMemo(() => {
    if (!rolesData) return [];
    const roles = Array.isArray(rolesData) ? rolesData : [];
    return roles
      .filter((r: RoleDetail) => r.userCount > 0)
      .sort((a: RoleDetail, b: RoleDetail) => b.userCount - a.userCount)
      .slice(0, 8)
      .map((r: RoleDetail) => ({
        name: r.name.replace(/_/g, " "),
        users: r.userCount,
      }));
  }, [rolesData]);

  // ---------- Audit timeline chart data (last 30 days) ----------
  const auditTimelineData = useMemo(() => {
    if (!auditStatsData?.eventsPerDay) return [];
    return auditStatsData.eventsPerDay.slice(-30).map((d) => ({
      date: formatShortDate(d.date),
      events: d.count,
    }));
  }, [auditStatsData]);

  // ---------- Module record counts chart data ----------
  const moduleChartData = useMemo(() => {
    if (!systemStats?.modules) return [];
    return systemStats.modules.map((m) => ({
      name: m.name,
      records: m.recordCount,
      active: m.activeItems,
    }));
  }, [systemStats]);

  // ---------- Recent audit events ----------
  const allRecentEvents = useMemo((): AuditEventDetail[] => {
    if (!recentAuditData) return [];
    if (Array.isArray(recentAuditData)) return recentAuditData;
    if ("data" in recentAuditData && Array.isArray(recentAuditData.data)) {
      return recentAuditData.data;
    }
    return [];
  }, [recentAuditData]);

  const filteredEvents = useMemo(() => {
    if (auditFilter === "all") return allRecentEvents;
    return allRecentEvents.filter((e) => {
      switch (auditFilter) {
        case "user":
          return e.entityType === "user";
        case "role":
          return e.entityType === "role" || e.action === "assign" || e.action === "revoke";
        case "setting":
          return e.entityType === "setting" || e.entityType === "tenant";
        case "login":
          return e.action === "login" || e.action === "logout";
        default:
          return true;
      }
    });
  }, [allRecentEvents, auditFilter]);

  // ---------- Quick Actions ----------
  const handleDirectorySync = useCallback(async () => {
    setSyncingDir(true);
    try {
      await apiClient.post("/system/health/directory-sync/trigger");
      toast.success("Directory sync triggered");
    } catch {
      toast.error("Failed to trigger directory sync");
    } finally {
      setSyncingDir(false);
    }
  }, []);

  const handleExportAudit = useCallback(() => {
    exportAuditMutation.mutate({ format: "csv" });
  }, [exportAuditMutation]);

  // ---------- Audit table columns ----------
  const auditColumns: Column<AuditEventDetail>[] = [
    {
      key: "action",
      header: "Action",
      render: (item) => {
        const c = actionColor(item.action);
        return (
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize"
            style={{ backgroundColor: c.bg, color: c.text }}
          >
            {item.action}
          </span>
        );
      },
    },
    {
      key: "entityType",
      header: "Entity",
      render: (item) => (
        <span className="text-sm text-[var(--text-primary)] capitalize">
          {item.entityType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "actorName",
      header: "Actor",
      render: (item) => (
        <span className="text-sm text-[var(--neutral-gray)] truncate block max-w-[180px]">
          {item.actorName || "--"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Time",
      align: "right" as const,
      render: (item) => (
        <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
          {relativeTime(item.createdAt)}
        </span>
      ),
    },
  ];

  // ---------- Quick action items ----------
  const quickActions: Array<{
    label: string;
    icon: LucideIcon;
    color: string;
    onClick: () => void;
    loading?: boolean;
  }> = [
    {
      label: "Manage Users",
      icon: Users,
      color: "#1B7340",
      onClick: () => router.push("/dashboard/system/users"),
    },
    {
      label: "View Audit Logs",
      icon: ScrollText,
      color: "#8B5CF6",
      onClick: () => router.push("/dashboard/system/audit-logs"),
    },
    {
      label: "System Settings",
      icon: Settings,
      color: "#6366F1",
      onClick: () => router.push("/dashboard/system/settings"),
    },
    {
      label: "Check Health",
      icon: Activity,
      color: "#06B6D4",
      onClick: () => router.push("/dashboard/system/health"),
    },
    {
      label: "Run Directory Sync",
      icon: RefreshCw,
      color: "#F59E0B",
      onClick: handleDirectorySync,
      loading: syncingDir,
    },
    {
      label: "Export Audit Report",
      icon: Download,
      color: "#EC4899",
      onClick: handleExportAudit,
      loading: exportAuditMutation.isPending,
    },
  ];

  return (
    <PermissionGate permission="system.view">
    <div className="space-y-6 pb-8">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
          >
            <Zap size={20} style={{ color: "#6366F1" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              System Administration
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {greeting}, {user?.displayName || "Administrator"}. Here&#39;s your platform overview.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  Row 1: Key Metrics Cards                                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: "Total Users",
            value: systemStats?.users?.totalUsers,
            subtitle: systemStats?.users
              ? `${Math.round((systemStats.users.activeUsers / Math.max(systemStats.users.totalUsers, 1)) * 100)}% active`
              : undefined,
            loading: statsLoading,
            href: "/dashboard/system/users",
            color: "#1B7340",
            trend: userTrend,
          },
          {
            icon: MonitorSmartphone,
            label: "Active Sessions",
            value: sessionStats?.activeSessions ?? systemStats?.sessions?.activeSessions,
            subtitle: systemStats?.users?.onlineNow
              ? `${systemStats.users.onlineNow} online now`
              : undefined,
            loading: statsLoading && sessionStatsLoading,
            href: "/dashboard/system/sessions",
            color: "#3B82F6",
          },
          {
            icon: ScrollText,
            label: "Audit Events Today",
            value: systemStats?.auditEvents?.eventsToday,
            subtitle: systemStats?.auditEvents?.eventsThisWeek
              ? `${systemStats.auditEvents.eventsThisWeek} this week`
              : undefined,
            loading: statsLoading,
            href: "/dashboard/system/audit-logs",
            color: "#8B5CF6",
            sparkData: auditSparkline,
          },
          {
            icon: Activity,
            label: "Platform Health",
            value: platformHealth?.status
              ? platformHealth.status.charAt(0).toUpperCase() + platformHealth.status.slice(1)
              : undefined,
            subtitle: healthySummary,
            loading: healthLoading,
            href: "/dashboard/system/health",
            color:
              platformHealth?.status === "healthy"
                ? "#22C55E"
                : platformHealth?.status === "degraded"
                  ? "#F59E0B"
                  : "#EF4444",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 + i * 0.06 }}
          >
            <MetricCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  Row 2: Users & Access (2 charts side by side)                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users by Role */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Users by Role
            </h2>
            <Link
              href="/dashboard/system/roles"
              className="text-xs font-medium text-[var(--primary)] hover:underline"
            >
              View roles
            </Link>
          </div>
          {rolesLoading ? (
            <div className="h-48 animate-pulse rounded bg-[var(--surface-2)]" />
          ) : rolesError ? (
            <SectionError title="role data" />
          ) : roleChartData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleChartData} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--neutral-gray)" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--text-primary)" }}
                    width={120}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="users" fill="#1B7340" radius={[0, 4, 4, 0]} barSize={18} name="Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[var(--neutral-gray)] text-center py-12">No role data</p>
          )}
        </motion.div>

        {/* Platform Services Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Service Status
            </h2>
            {platformHealth && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                style={{
                  backgroundColor:
                    platformHealth.status === "healthy"
                      ? "rgba(34, 197, 94, 0.1)"
                      : platformHealth.status === "degraded"
                        ? "rgba(245, 158, 11, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                  color:
                    platformHealth.status === "healthy"
                      ? "var(--success)"
                      : platformHealth.status === "degraded"
                        ? "var(--warning)"
                        : "var(--error)",
                }}
              >
                {platformHealth.status === "healthy" ? (
                  <CheckCircle size={12} />
                ) : platformHealth.status === "degraded" ? (
                  <AlertTriangle size={12} />
                ) : (
                  <XCircle size={12} />
                )}
                {platformHealth.status}
              </span>
            )}
          </div>
          {healthLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--surface-2)]" />
              ))}
            </div>
          ) : healthError ? (
            <SectionError title="health data" />
          ) : platformHealth?.services && platformHealth.services.length > 0 ? (
            <div className="space-y-2.5">
              {platformHealth.services.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <ServiceStatusDot status={service.status} />
                    <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                      {service.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {service.latency && (
                      <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
                        {service.latency}
                      </span>
                    )}
                    <span
                      className="text-[11px] font-semibold capitalize"
                      style={{
                        color:
                          service.status === "healthy"
                            ? "var(--success)"
                            : service.status === "degraded"
                              ? "var(--warning)"
                              : "var(--error)",
                      }}
                    >
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
              {platformHealth.uptime && (
                <p className="text-xs text-[var(--neutral-gray)] text-right mt-1">
                  Uptime: {platformHealth.uptime}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--neutral-gray)] text-center py-12">No health data</p>
          )}
        </motion.div>
      </div>

      {/* ============================================================ */}
      {/*  Row 3: Audit Activity Timeline (full width)                  */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Audit Events Timeline
            </h2>
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
              Last 30 days
            </p>
          </div>
          <Link
            href="/dashboard/system/audit-logs"
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            View all
          </Link>
        </div>
        {auditStatsLoading ? (
          <div className="h-56 animate-pulse rounded bg-[var(--surface-2)]" />
        ) : auditStatsError ? (
          <SectionError title="audit timeline" />
        ) : auditTimelineData.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={auditTimelineData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="auditGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--neutral-gray)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--neutral-gray)" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#auditGrad)"
                  name="Events"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-[var(--neutral-gray)] text-center py-12">No audit data available</p>
        )}

        {/* Top Actions breakdown */}
        {auditStatsData?.topActions && auditStatsData.topActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--border)]">
            {auditStatsData.topActions.slice(0, 6).map((a) => {
              const c = actionColor(a.action);
              return (
                <span
                  key={a.action}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize"
                  style={{ backgroundColor: c.bg, color: c.text }}
                >
                  {a.action}
                  <span className="tabular-nums opacity-70">{a.count}</span>
                </span>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ============================================================ */}
      {/*  Row 4: Module Usage + Quick Actions                          */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Module Record Counts (2/3 width) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Module Record Counts
          </h2>
          {statsLoading ? (
            <div className="h-52 animate-pulse rounded bg-[var(--surface-2)]" />
          ) : statsError ? (
            <SectionError title="module data" />
          ) : moduleChartData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moduleChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--text-primary)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--neutral-gray)" }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="records"
                    name="Total Records"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  >
                    {moduleChartData.map((_entry, index) => (
                      <rect
                        key={`cell-${index}`}
                        fill={MODULE_COLORS[index % MODULE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[var(--neutral-gray)] text-center py-12">No module data</p>
          )}
        </motion.div>

        {/* Quick Actions (1/3 width) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.loading}
                  className="group flex items-center gap-3 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-left transition-all duration-200 hover:bg-[var(--surface-1)] disabled:opacity-50"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${action.color}18` }}
                  >
                    <Icon
                      size={16}
                      style={{ color: action.color }}
                      className={action.loading ? "animate-spin" : ""}
                    />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {action.label}
                  </span>
                  <ArrowRight
                    size={14}
                    className="ml-auto text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ============================================================ */}
      {/*  Row 5: Recent Activity (full width)                          */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Recent System Activity
            </h2>
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
              Last 10 system-level events
            </p>
          </div>
          <Link
            href="/dashboard/system/audit-logs"
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            View all logs
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {AUDIT_FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setAuditFilter(tab.key)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor:
                  auditFilter === tab.key
                    ? "rgba(27, 115, 64, 0.1)"
                    : "transparent",
                color:
                  auditFilter === tab.key
                    ? "var(--primary)"
                    : "var(--neutral-gray)",
                border: `1px solid ${auditFilter === tab.key ? "rgba(27, 115, 64, 0.3)" : "var(--border)"}`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {auditLoading ? (
          <SectionSkeleton rows={5} />
        ) : auditError ? (
          <SectionError title="recent activity" />
        ) : (
          <DataTable
            columns={auditColumns}
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            loading={false}
            emptyTitle="No matching events"
            emptyDescription="No events match the selected filter."
          />
        )}
      </motion.div>
    </div>
    </PermissionGate>
  );
}
