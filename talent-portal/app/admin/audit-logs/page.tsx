"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText,
  Shield,
  User,
  Building2,
  Clock,
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  Download,
  LayoutList,
  GitCommitVertical,
  RefreshCw,
  Briefcase,
  TrendingUp,
  FileText,
  Key,
  Settings,
  UserCog,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  ArrowUpRight,
  Bell,
  X,
} from "lucide-react";
import { useAuditLogs } from "@/hooks/use-admin";
import type { AuditLog } from "@/hooks/use-admin";
import { useAdminTable } from "@/hooks/use-admin-table";
import { AdminDataTable, type AdminColumn } from "@/components/admin/admin-data-table";
import { formatRelativeTime } from "@/lib/date-utils";
import { cn, formatDate } from "@/lib/utils";
import { colorAlpha } from "@/lib/color-utils";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ══════════════════════════════════════════════════════════
   Constants & Config
   ══════════════════════════════════════════════════════════ */

type Severity = "info" | "warning" | "critical";

const SEVERITY_CONFIG: Record<Severity, { label: string; dot: string; bg: string; text: string; icon: typeof Info }> = {
  info:     { label: "Info",     dot: "bg-[var(--badge-blue-dot)]",   bg: "bg-[var(--badge-blue-bg)]",   text: "text-[var(--badge-blue-text)]",   icon: Info },
  warning:  { label: "Warning",  dot: "bg-[var(--badge-amber-dot)]",  bg: "bg-[var(--badge-amber-bg)]",  text: "text-[var(--badge-amber-text)]",  icon: AlertCircle },
  critical: { label: "Critical", dot: "bg-[var(--badge-red-dot)]",    bg: "bg-[var(--badge-red-bg)]",    text: "text-[var(--badge-red-text)]",    icon: AlertTriangle },
};

const ACTION_ICONS: Record<string, typeof Activity> = {
  PROFILE_APPROVED: CheckCircle2,
  PROFILE_REJECTED: XCircle,
  PROFILE_SUSPENDED: Shield,
  PROFILE_CREATED: Plus,
  PROFILE_UPDATED: Pencil,
  PROFILE_SUBMITTED: ArrowUpRight,
  EMPLOYER_VERIFIED: CheckCircle2,
  EMPLOYER_REJECTED: XCircle,
  EMPLOYER_REGISTERED: Building2,
  JOB_PUBLISHED: CheckCircle2,
  JOB_CLOSED: XCircle,
  JOB_REJECTED: XCircle,
  JOB_CREATED: Plus,
  INTRO_APPROVED: CheckCircle2,
  INTRO_DECLINED: XCircle,
  INTRO_REQUESTED: FileText,
  PLACEMENT_CREATED: Plus,
  PLACEMENT_UPDATED: Pencil,
  ROLE_CHANGED: Key,
  REPORT_EXPORTED: Download,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  SETTINGS_UPDATED: Settings,
  USER_SUSPENDED: Shield,
  USER_ACTIVATED: UserCog,
};

const ACTION_SEVERITY: Record<string, Severity> = {
  PROFILE_REJECTED: "warning",
  PROFILE_SUSPENDED: "critical",
  EMPLOYER_REJECTED: "warning",
  JOB_REJECTED: "warning",
  INTRO_DECLINED: "warning",
  USER_SUSPENDED: "critical",
  ROLE_CHANGED: "warning",
};

const ENTITY_ICONS: Record<string, typeof Activity> = {
  CandidateProfile: User,
  candidate: User,
  EmployerOrg: Building2,
  employer: Building2,
  JobPost: Briefcase,
  job: Briefcase,
  PlacementRecord: TrendingUp,
  placement: TrendingUp,
  IntroRequest: FileText,
  intro: FileText,
  TalentUser: UserCog,
  user: UserCog,
  Settings: Settings,
  settings: Settings,
};

function getSeverity(action: string): Severity {
  return ACTION_SEVERITY[action] || "info";
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ══════════════════════════════════════════════════════════
   Stat Card
   ══════════════════════════════════════════════════════════ */

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  color: string;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: colorAlpha(color, 0.07) }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight leading-none tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-[var(--text-secondary)] mt-1.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Security Alerts Panel
   ══════════════════════════════════════════════════════════ */

interface SecurityAlert {
  id: string;
  severity: Severity;
  title: string;
  description: string;
}

function SecurityAlertsPanel({ logs }: { logs: AuditLog[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts: SecurityAlert[] = useMemo(() => {
    const result: SecurityAlert[] = [];
    const criticalActions = logs.filter((l) => getSeverity(l.action) === "critical");
    const warningActions = logs.filter((l) => getSeverity(l.action) === "warning");

    if (criticalActions.length > 0) {
      result.push({
        id: "critical-actions",
        severity: "critical",
        title: `${criticalActions.length} critical action${criticalActions.length !== 1 ? "s" : ""} detected`,
        description: "Suspensions and critical security events in the current log view",
      });
    }

    if (warningActions.length > 3) {
      result.push({
        id: "many-warnings",
        severity: "warning",
        title: `${warningActions.length} warning events`,
        description: "Multiple rejection and role change events detected",
      });
    }

    const roleChanges = logs.filter((l) => l.action === "ROLE_CHANGED");
    if (roleChanges.length > 2) {
      result.push({
        id: "role-changes",
        severity: "warning",
        title: `${roleChanges.length} role changes`,
        description: "Multiple permission changes detected — verify these are authorized",
      });
    }

    return result.filter((a) => !dismissed.has(a.id));
  }, [logs, dismissed]);

  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden"
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-1)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--badge-red-bg)] flex items-center justify-center">
            <Bell size={16} className="text-[var(--badge-red-text)]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Security Alerts
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[var(--badge-red-bg)] text-[var(--badge-red-text)] text-[11px] font-bold">
                {alerts.length}
              </span>
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={cn("text-[var(--text-muted)] transition-transform", collapsed && "-rotate-90")}
        />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-2">
              {alerts.map((alert) => {
                const sevConf = SEVERITY_CONFIG[alert.severity];
                const SevIcon = sevConf.icon;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border",
                      alert.severity === "critical" ? "border-[var(--error)]/20 bg-[var(--badge-red-bg)]/50" :
                      alert.severity === "warning" ? "border-[var(--warning)]/20 bg-[var(--badge-amber-bg)]/50" :
                      "border-[var(--info)]/20 bg-[var(--badge-blue-bg)]/50",
                    )}
                  >
                    <SevIcon size={16} className={sevConf.text} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold", sevConf.text)}>{alert.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{alert.description}</p>
                    </div>
                    <button
                      onClick={() => setDismissed((prev) => { const next = new Set(prev); next.add(alert.id); return next; })}
                      className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Activity Volume Chart
   ══════════════════════════════════════════════════════════ */

function ActivityVolumeChart({ logs }: { logs: AuditLog[] }) {
  const chartData = useMemo(() => {
    const buckets: Record<string, { total: number; critical: number }> = {};
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(d.getHours() - i, 0, 0, 0);
      const key = d.toLocaleTimeString("en-US", { hour: "2-digit", hour12: true });
      buckets[key] = { total: 0, critical: 0 };
    }

    for (const log of logs) {
      const d = new Date(log.createdAt);
      const key = d.toLocaleTimeString("en-US", { hour: "2-digit", hour12: true });
      if (buckets[key]) {
        buckets[key].total++;
        if (getSeverity(log.action) === "critical") {
          buckets[key].critical++;
        }
      }
    }

    return Object.entries(buckets).map(([hour, data]) => ({
      hour,
      events: data.total,
      critical: data.critical,
    }));
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
            <Activity size={18} className="text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">Event Volume</h2>
            <p className="text-xs text-[var(--text-secondary)]">Last 24 hours</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--primary)]" /> Events</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--error)]" /> Critical</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
          <defs>
            <linearGradient id="auditGradientEvents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="auditGradientCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--error)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--error)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-0)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "12px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
              padding: "10px 14px",
            }}
          />
          <Area type="monotone" dataKey="events" stroke="var(--primary)" fill="url(#auditGradientEvents)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="critical" stroke="var(--error)" fill="url(#auditGradientCritical)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Timeline View
   ══════════════════════════════════════════════════════════ */

function TimelineView({ logs }: { logs: AuditLog[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, AuditLog[]> = {};
    for (const log of logs) {
      const day = new Date(log.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    }
    return Object.entries(groups);
  }, [logs]);

  return (
    <div className="space-y-6">
      {grouped.map(([day, dayLogs]) => (
        <div key={day}>
          <div className="sticky top-0 z-10 bg-[var(--surface-1)]/80 backdrop-blur-sm py-2 mb-3">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{day}</h3>
          </div>
          <div className="relative ml-4">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--border)]" />
            <div className="space-y-1">
              {dayLogs.map((log, i) => {
                const severity = getSeverity(log.action);
                const sevConf = SEVERITY_CONFIG[severity];
                const ActionIcon = ACTION_ICONS[log.action] || Activity;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.3 }}
                    className={cn(
                      "relative pl-8 py-2.5 rounded-lg hover:bg-[var(--surface-1)]/50 transition-colors",
                      severity === "critical" && "bg-[var(--badge-red-bg)]/30",
                      severity === "warning" && "bg-[var(--badge-amber-bg)]/20",
                    )}
                  >
                    <div className={cn(
                      "absolute left-[-5px] top-3.5 w-[10px] h-[10px] rounded-full border-2 border-[var(--surface-1)] z-10",
                      sevConf.dot,
                    )} />

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          severity === "critical" ? "bg-[var(--badge-red-bg)]" :
                          severity === "warning" ? "bg-[var(--badge-amber-bg)]" :
                          "bg-[var(--surface-1)]",
                        )}>
                          <ActionIcon size={14} className={cn(
                            severity === "critical" ? "text-[var(--badge-red-text)]" :
                            severity === "warning" ? "text-[var(--badge-amber-text)]" :
                            "text-[var(--text-secondary)]",
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--text-secondary)]">
                            <span className="font-semibold">{formatAction(log.action)}</span>
                            {log.entity && (
                              <>
                                <span className="text-[var(--text-muted)]"> on </span>
                                <span className="text-[var(--text-secondary)] font-medium">
                                  {log.entity.replace(/([A-Z])/g, " $1").trim()}
                                </span>
                              </>
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[var(--text-muted)]">
                            <span>{new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                            {log.userId && <span>by {log.userId.slice(0, 8)}...</span>}
                            {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold",
                        sevConf.bg,
                        sevConf.text,
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", sevConf.dot)} />
                        {sevConf.label}
                      </span>
                    </div>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 ml-11">
                        <pre className="text-[10px] bg-[var(--surface-1)] rounded-lg p-2.5 overflow-x-auto text-[var(--text-secondary)] font-mono max-h-[100px]">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {grouped.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ScrollText size={32} className="text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-muted)]">No audit logs to display</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Date Preset Selector
   ══════════════════════════════════════════════════════════ */

function DatePresets({ onSelect }: { onSelect: (from: string, to: string) => void }) {
  const presets = [
    { label: "Today", getDays: () => 0 },
    { label: "Last 24h", getDays: () => 1 },
    { label: "Last 7d", getDays: () => 7 },
    { label: "Last 30d", getDays: () => 30 },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => {
            const now = new Date();
            const from = new Date(now.getTime() - p.getDays() * 24 * 60 * 60 * 1000);
            onSelect(from.toISOString().split("T")[0], now.toISOString().split("T")[0]);
          }}
          className="px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Column Definitions
   ══════════════════════════════════════════════════════════ */

const getAuditColumns = (): AdminColumn<AuditLog>[] => [
  {
    key: "severity",
    header: "",
    minWidth: 40,
    render: (log) => {
      const severity = getSeverity(log.action);
      const conf = SEVERITY_CONFIG[severity];
      return (
        <div className="flex justify-center">
          <span className={cn("w-2.5 h-2.5 rounded-full", conf.dot)} title={conf.label} />
        </div>
      );
    },
  },
  {
    key: "createdAt",
    header: "Timestamp",
    sortable: true,
    minWidth: 150,
    render: (log) => (
      <div>
        <p className="text-sm text-[var(--text-secondary)] font-medium tabular-nums">
          {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
          {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>
    ),
  },
  {
    key: "userId",
    header: "Actor",
    minWidth: 140,
    render: (log) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--surface-1)] flex items-center justify-center shrink-0">
          <User size={12} className="text-[var(--text-secondary)]" />
        </div>
        <span className="text-xs text-[var(--text-secondary)] font-mono truncate max-w-[100px]">
          {log.userId ?? "System"}
        </span>
      </div>
    ),
  },
  {
    key: "action",
    header: "Action",
    sortable: true,
    minWidth: 200,
    filter: {
      type: "select",
      options: [
        { value: "PROFILE_APPROVED", label: "Profile Approved" },
        { value: "PROFILE_REJECTED", label: "Profile Rejected" },
        { value: "PROFILE_SUSPENDED", label: "Profile Suspended" },
        { value: "EMPLOYER_VERIFIED", label: "Employer Verified" },
        { value: "EMPLOYER_REJECTED", label: "Employer Rejected" },
        { value: "JOB_PUBLISHED", label: "Job Published" },
        { value: "JOB_REJECTED", label: "Job Rejected" },
        { value: "INTRO_APPROVED", label: "Intro Approved" },
        { value: "INTRO_DECLINED", label: "Intro Declined" },
        { value: "PLACEMENT_CREATED", label: "Placement Created" },
        { value: "PLACEMENT_UPDATED", label: "Placement Updated" },
        { value: "ROLE_CHANGED", label: "Role Changed" },
        { value: "REPORT_EXPORTED", label: "Report Exported" },
      ],
    },
    render: (log) => {
      const ActionIcon = ACTION_ICONS[log.action] || Activity;
      const severity = getSeverity(log.action);
      return (
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            severity === "critical" ? "bg-[var(--badge-red-bg)]" :
            severity === "warning" ? "bg-[var(--badge-amber-bg)]" :
            "bg-[var(--surface-1)]",
          )}>
            <ActionIcon size={13} className={cn(
              severity === "critical" ? "text-[var(--badge-red-text)]" :
              severity === "warning" ? "text-[var(--badge-amber-text)]" :
              "text-[var(--text-secondary)]",
            )} />
          </div>
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {formatAction(log.action)}
          </span>
        </div>
      );
    },
  },
  {
    key: "entity",
    header: "Resource",
    minWidth: 160,
    filter: {
      type: "select",
      options: [
        { value: "CandidateProfile", label: "Candidate" },
        { value: "EmployerOrg", label: "Employer" },
        { value: "JobPost", label: "Job" },
        { value: "PlacementRecord", label: "Placement" },
        { value: "IntroRequest", label: "Intro Request" },
        { value: "TalentUser", label: "User" },
      ],
    },
    render: (log) => {
      const EntIcon = ENTITY_ICONS[log.entity] || ENTITY_ICONS[log.entity?.toLowerCase()] || Activity;
      return (
        <div className="flex items-center gap-2">
          <EntIcon size={13} className="text-[var(--text-muted)] shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-[var(--text-secondary)]">
              {log.entity ? log.entity.replace(/([A-Z])/g, " $1").trim() : "-"}
            </p>
            {log.entityId && (
              <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{log.entityId}</p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    key: "ipAddress",
    header: "IP Address",
    minWidth: 120,
    defaultVisible: false,
    render: (log) => (
      <span className="text-xs font-mono text-[var(--text-muted)]">{log.ipAddress || "-"}</span>
    ),
  },
  {
    key: "details",
    header: "Details",
    minWidth: 140,
    render: (log) => (
      <p className="text-sm text-[var(--text-muted)] max-w-[200px] truncate">
        {log.details ? JSON.stringify(log.details).slice(0, 50) : "-"}
      </p>
    ),
  },
];

/* ══════════════════════════════════════════════════════════
   Page Content
   ══════════════════════════════════════════════════════════ */

type ViewMode = "table" | "timeline";

function AuditLogsContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const columns = useMemo(() => getAuditColumns(), []);

  const table = useAdminTable({
    tableId: "audit-logs",
    columns,
    defaultSort: { key: "createdAt", direction: "desc" },
    defaultPageSize: 50,
  });

  const { data, isLoading, error, refetch } = useAuditLogs(table.queryFilters, {
    refetchInterval: 30000,
  });

  const logs: AuditLog[] = data?.data ?? [];
  const meta = data?.meta;

  // Compute stats
  const stats = useMemo(() => {
    const total = meta?.total ?? logs.length;
    const warningCount = logs.filter((l) => getSeverity(l.action) === "warning").length;
    const criticalCount = logs.filter((l) => getSeverity(l.action) === "critical").length;
    const userCounts: Record<string, number> = {};
    for (const log of logs) {
      if (log.userId) {
        userCounts[log.userId] = (userCounts[log.userId] ?? 0) + 1;
      }
    }
    const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];
    return { total, warningCount, criticalCount, topUser: topUser ? { id: topUser[0], count: topUser[1] } : null };
  }, [logs, meta]);

  const handleDatePreset = useCallback((from: string, to: string) => {
    table.setFilterValue("dateFrom", from);
    table.setFilterValue("dateTo", to);
  }, [table]);

  const handleExport = useCallback((format: "csv" | "xlsx" | "pdf") => {
    toast.info(`Exporting ${meta?.total ?? logs.length} audit logs as ${format.toUpperCase()}`);
  }, [logs.length, meta?.total]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Audit Logs</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Security console — track all actions and monitor platform activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === "table" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)]",
              )}
            >
              <LayoutList size={14} />
              Table
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === "timeline" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)]",
              )}
            >
              <GitCommitVertical size={14} />
              Timeline
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Security Alerts */}
      <SecurityAlertsPanel logs={logs} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={stats.total} icon={Activity} color="var(--primary)" sub="In current view" />
        <StatCard label="Warnings" value={stats.warningCount} icon={AlertCircle} color="var(--warning)" sub="Rejections & role changes" />
        <StatCard label="Critical" value={stats.criticalCount} icon={AlertTriangle} color="var(--error)" sub="Suspensions & security events" />
        <StatCard label="Most Active" value={stats.topUser ? stats.topUser.count.toString() : "-"} icon={UserCog} color="var(--badge-purple-dot)" sub={stats.topUser ? `User ${stats.topUser.id.slice(0, 8)}...` : "No activity"} />
      </div>

      {/* Activity Volume Chart */}
      <ActivityVolumeChart logs={logs} />

      {/* Date Presets + Live indicator */}
      <div className="flex items-center justify-between">
        <DatePresets onSelect={handleDatePreset} />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-[10px] text-[var(--text-muted)] font-medium">Auto-refresh every 30s</span>
        </div>
      </div>

      {/* Table or Timeline View */}
      <AnimatePresence mode="wait">
        {viewMode === "table" ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <AdminDataTable<AuditLog>
              tableId="audit-logs"
              columns={columns}
              data={logs}
              keyExtractor={(log) => log.id}
              loading={isLoading}
              error={error instanceof Error ? error : null}
              onRetry={refetch}
              sort={table.sort}
              onSort={table.setSort}
              pagination={meta ? {
                currentPage: meta.page,
                totalPages: meta.totalPages,
                totalItems: meta.total,
                pageSize: table.pageSize,
              } : undefined}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
              pageSizeOptions={[20, 50, 100]}
              searchValue={table.searchValue}
              onSearch={table.setSearch}
              searchPlaceholder="Search by action, entity, or user..."
              filters={table.filters}
              onFilterChange={table.setFilterValue}
              onClearFilters={table.clearFilters}
              activeFilters={table.activeFilterChips}
              emptyIcon={ScrollText}
              emptyTitle="No audit logs found"
              emptyDescription="Try adjusting your filters or date range."
              onExport={handleExport}
              renderExpandedRow={(log) => (
                <div className="space-y-3 py-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Actor</p>
                      <p className="text-sm font-mono text-[var(--text-secondary)]">{log.userId ?? "System"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">IP Address</p>
                      <p className="text-sm font-mono text-[var(--text-secondary)]">{log.ipAddress || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Entity ID</p>
                      <p className="text-sm font-mono text-[var(--text-secondary)]">{log.entityId || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Severity</p>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold",
                        SEVERITY_CONFIG[getSeverity(log.action)].bg,
                        SEVERITY_CONFIG[getSeverity(log.action)].text,
                      )}>
                        {SEVERITY_CONFIG[getSeverity(log.action)].label}
                      </span>
                    </div>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Full Details</p>
                      <pre className="text-xs bg-[var(--surface-1)] rounded-lg p-3 overflow-x-auto text-[var(--text-secondary)] font-mono max-h-[200px]">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            />
          </motion.div>
        ) : (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 overflow-hidden"
          >
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-2)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-3/4 h-3 bg-[var(--surface-2)] rounded" />
                      <div className="w-1/3 h-2 bg-[var(--surface-2)] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <TimelineView logs={logs} />
            )}

            {meta && meta.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => table.setPage(Math.max(1, table.page - 1))}
                  disabled={table.page <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-secondary)] disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-[var(--text-muted)]">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  onClick={() => table.setPage(Math.min(meta.totalPages, table.page + 1))}
                  disabled={table.page >= meta.totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-secondary)] disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Page Export
   ══════════════════════════════════════════════════════════ */

export default function AdminAuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      }
    >
      <AuditLogsContent />
    </Suspense>
  );
}
