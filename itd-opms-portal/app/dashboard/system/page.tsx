"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Shield,
  ScrollText,
  Settings,
  Activity,
  MonitorSmartphone,
  HardDrive,
  Building2,
  Network,
  Mail,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  usePlatformHealth,
  useSystemStats,
  useAuditLogs,
} from "@/hooks/use-system";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface SummaryCard {
  title: string;
  icon: LucideIcon;
  value: string | number | undefined;
  loading: boolean;
  href: string;
  color: string;
  bgColor: string;
}

interface QuickLink {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

/* ------------------------------------------------------------------ */
/*  Relative time helper                                                */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Service status icon                                                 */
/* ------------------------------------------------------------------ */

function ServiceStatusIcon({ status }: { status: string }) {
  if (status === "healthy") {
    return <CheckCircle size={18} style={{ color: "var(--success)" }} />;
  }
  if (status === "degraded") {
    return <AlertTriangle size={18} style={{ color: "var(--warning)" }} />;
  }
  return <XCircle size={18} style={{ color: "var(--error)" }} />;
}

/* ------------------------------------------------------------------ */
/*  Quick Links data                                                    */
/* ------------------------------------------------------------------ */

const quickLinks: QuickLink[] = [
  {
    label: "Users",
    description: "Manage user accounts and permissions",
    href: "/dashboard/system/users",
    icon: Users,
  },
  {
    label: "Roles",
    description: "Configure roles and permission sets",
    href: "/dashboard/system/roles",
    icon: Shield,
  },
  {
    label: "Audit Logs",
    description: "View the full audit trail",
    href: "/dashboard/system/audit-logs",
    icon: ScrollText,
  },
  {
    label: "Settings",
    description: "Platform configuration",
    href: "/dashboard/system/settings",
    icon: Settings,
  },
  {
    label: "Health",
    description: "Platform health monitoring",
    href: "/dashboard/system/health",
    icon: Activity,
  },
  {
    label: "Sessions",
    description: "Active user sessions",
    href: "/dashboard/system/sessions",
    icon: MonitorSmartphone,
  },
  {
    label: "Email Templates",
    description: "Notification email templates",
    href: "/dashboard/system/email-templates",
    icon: Mail,
  },
  {
    label: "Tenants",
    description: "Manage tenant organizations",
    href: "/dashboard/system/tenants",
    icon: Building2,
  },
  {
    label: "Org Structure",
    description: "Organizational hierarchy",
    href: "/dashboard/system/org-structure",
    icon: Network,
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SystemOverviewPage() {
  const { user } = useAuth();

  const { data: platformHealth, isLoading: healthLoading } =
    usePlatformHealth();
  const { data: systemStats, isLoading: statsLoading } = useSystemStats();
  const { data: recentAuditData, isLoading: auditLoading } = useAuditLogs(
    1,
    5,
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Summary cards                                                     */
  /* ---------------------------------------------------------------- */

  const summaryCards: SummaryCard[] = [
    {
      title: "Total Users",
      icon: Users,
      value: systemStats?.users?.totalUsers,
      loading: statsLoading,
      href: "/dashboard/system/users",
      color: "#1B7340",
      bgColor: "rgba(27, 115, 64, 0.1)",
    },
    {
      title: "Active Sessions",
      icon: MonitorSmartphone,
      value: systemStats?.sessions?.activeSessions,
      loading: statsLoading,
      href: "/dashboard/system/sessions",
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      title: "Audit Events Today",
      icon: ScrollText,
      value: systemStats?.auditEvents?.eventsToday,
      loading: statsLoading,
      href: "/dashboard/system/audit-logs",
      color: "#8B5CF6",
      bgColor: "rgba(139, 92, 246, 0.1)",
    },
    {
      title: "Database Size",
      icon: HardDrive,
      value: systemStats?.database?.size,
      loading: statsLoading,
      href: "/dashboard/system/health",
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)",
    },
  ];

  /* ---------------------------------------------------------------- */
  /*  Resolve recent audit events from paginated response               */
  /* ---------------------------------------------------------------- */

  const recentAuditEvents = useMemo(() => {
    if (!recentAuditData) return [];
    // Handle both paginated envelope and raw array
    if (Array.isArray(recentAuditData)) return recentAuditData;
    if ("data" in recentAuditData && Array.isArray(recentAuditData.data)) {
      return recentAuditData.data;
    }
    return [];
  }, [recentAuditData]);

  /* ---------------------------------------------------------------- */
  /*  Service health color mapping                                      */
  /* ---------------------------------------------------------------- */

  function serviceStatusBg(status: string): string {
    if (status === "healthy") return "rgba(34, 197, 94, 0.08)";
    if (status === "degraded") return "rgba(245, 158, 11, 0.08)";
    return "rgba(239, 68, 68, 0.08)";
  }

  function serviceStatusBorder(status: string): string {
    if (status === "healthy") return "rgba(34, 197, 94, 0.25)";
    if (status === "degraded") return "rgba(245, 158, 11, 0.25)";
    return "rgba(239, 68, 68, 0.25)";
  }

  return (
    <div className="space-y-8 pb-8">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
          >
            <Settings size={20} style={{ color: "#6366F1" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              System Administration
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {greeting}, {user?.displayName || "User"}. Manage users, roles,
              settings, and platform health.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  Summary Cards                                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.07 }}
            >
              <Link
                href={card.href}
                className="group block rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.bgColor }}
                  >
                    <Icon
                      size={20}
                      style={{ color: card.color }}
                      className="transition-transform duration-200 group-hover:scale-110"
                    />
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                  />
                </div>
                <div>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: card.color }}
                  >
                    {card.loading ? (
                      <span className="inline-block w-8 h-7 rounded bg-[var(--surface-2)] animate-pulse" />
                    ) : (
                      (card.value ?? "--")
                    )}
                  </p>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mt-0.5">
                    {card.title}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/*  Platform Health                                              */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Platform Health
          </h2>
          {platformHealth && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
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
              <ServiceStatusIcon status={platformHealth.status} />
              {platformHealth.status}
            </span>
          )}
        </div>

        {healthLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border p-4 animate-pulse"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="h-5 w-20 rounded bg-[var(--surface-2)] mb-2" />
                <div className="h-4 w-12 rounded bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        ) : platformHealth?.services && platformHealth.services.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {platformHealth.services.map((service) => (
              <div
                key={service.name}
                className="rounded-xl border p-4 transition-all duration-200"
                style={{
                  backgroundColor: serviceStatusBg(service.status),
                  borderColor: serviceStatusBorder(service.status),
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                    {service.name}
                  </span>
                  <ServiceStatusIcon status={service.status} />
                </div>
                <p className="text-xs text-[var(--text-secondary)] capitalize">
                  {service.status}
                </p>
                {service.latency && (
                  <p className="text-xs text-[var(--neutral-gray)] tabular-nums mt-0.5">
                    {service.latency}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl border p-6 text-center text-sm text-[var(--neutral-gray)]"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            No health data available
          </div>
        )}
      </motion.div>

      {/* ============================================================ */}
      {/*  Quick Links                                                  */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          System Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="group block rounded-xl border p-5 transition-all duration-200 hover:shadow-sm"
                style={{
                  backgroundColor: "var(--surface-1)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <Icon size={20} className="text-[var(--primary)]" />
                  <ArrowRight
                    size={16}
                    className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                  />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {link.label}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {link.description}
                </p>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  Recent Audit Events                                          */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Recent Audit Events
          </h2>
          <Link
            href="/dashboard/system/audit-logs"
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            View all
          </Link>
        </div>
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          {auditLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-6 w-20 animate-pulse rounded-md bg-[var(--surface-2)]" />
                  <div className="h-4 w-32 animate-pulse rounded-md bg-[var(--surface-2)]" />
                  <div className="flex-1" />
                  <div className="h-4 w-40 animate-pulse rounded-md bg-[var(--surface-2)]" />
                  <div className="h-4 w-16 animate-pulse rounded-md bg-[var(--surface-2)]" />
                </div>
              ))}
            </div>
          ) : recentAuditEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b text-left"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Action
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Entity
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Actor
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] text-right">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {recentAuditEvents.map(
                    (
                      event: {
                        id: string;
                        action: string;
                        entityType: string;
                        actorEmail?: string;
                        actorDisplayName?: string;
                        createdAt: string;
                      },
                      index: number,
                    ) => (
                      <tr
                        key={event.id ?? index}
                        className="hover:bg-[var(--surface-1)] transition-colors duration-150"
                      >
                        <td className="px-5 py-3">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: "var(--surface-2)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {event.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[var(--text-primary)]">
                          {event.entityType}
                        </td>
                        <td className="px-5 py-3 text-[var(--neutral-gray)]">
                          {event.actorDisplayName || event.actorEmail || "--"}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-[var(--neutral-gray)] tabular-nums">
                          {relativeTime(event.createdAt)}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-[var(--neutral-gray)]">
              No recent audit events
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
