"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Monitor,
  Search,
  Users,
  Activity,
  Smartphone,
  Laptop,
  Globe,
  Trash2,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useSessions,
  useSessionStats,
  useRevokeSession,
  useRevokeAllUserSessions,
} from "@/hooks/use-system";
import type { ActiveSession } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
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

function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "Unknown";
  let os = "Unknown";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os };
}

function getDeviceIcon(ua: string) {
  if (ua.includes("iPhone") || ua.includes("Android") || ua.includes("Mobile")) {
    return Smartphone;
  }
  return Laptop;
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {value}
          </p>
          <p className="text-xs text-[var(--neutral-gray)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Device Distribution                                                */
/* ------------------------------------------------------------------ */

function DeviceDistribution({ sessions }: { sessions: ActiveSession[] }) {
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      const { os } = parseUserAgent(s.userAgent || "");
      counts[os] = (counts[os] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [sessions]);

  const total = sessions.length || 1;
  const COLORS = ["#1B7340", "#2563EB", "#D97706", "#DC2626", "#8B5CF6"];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Sessions by Device</h3>
      <div className="space-y-2">
        {distribution.map(([os, count], i) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div key={os}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[var(--text-primary)] font-medium">{os}</span>
                <span className="text-[var(--neutral-gray)] tabular-nums">{count} ({pct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
            </div>
          );
        })}
        {distribution.length === 0 && (
          <p className="text-xs text-[var(--neutral-gray)]">No session data</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SessionsPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Sessions", href: "/dashboard/system/sessions" },
  ]);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<ActiveSession | null>(null);
  const [forceLogoutUserId, setForceLogoutUserId] = useState<string | null>(null);
  const [forceLogoutUserName, setForceLogoutUserName] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, refetch } = useSessions(page, 20);
  const { data: statsData } = useSessionStats();
  const revokeMutation = useRevokeSession();
  const revokeAllMutation = useRevokeAllUserSessions();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => refetch(), 30_000);
    return () => clearInterval(interval);
  }, [refetch]);

  const allSessions = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if ("data" in data && Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  const meta = useMemo(() => {
    if (!data || Array.isArray(data)) return undefined;
    return "meta" in data ? data.meta : undefined;
  }, [data]);

  // Client-side search filter
  const sessions = useMemo(() => {
    if (!debouncedSearch) return allSessions;
    const q = debouncedSearch.toLowerCase();
    return allSessions.filter(
      (s) =>
        s.userName?.toLowerCase().includes(q) ||
        s.userEmail?.toLowerCase().includes(q),
    );
  }, [allSessions, debouncedSearch]);

  const stats = useMemo(() => {
    if (!statsData) return { activeSessions: 0, uniqueUsers: 0 };
    return statsData;
  }, [statsData]);

  function handleRevoke() {
    if (!revokeTarget) return;
    revokeMutation.mutate(revokeTarget.id, {
      onSettled: () => setRevokeTarget(null),
    });
  }

  function handleForceLogout() {
    if (!forceLogoutUserId) return;
    revokeAllMutation.mutate(forceLogoutUserId, {
      onSettled: () => {
        setForceLogoutUserId(null);
        setForceLogoutUserName("");
      },
    });
  }

  const columns: Column<ActiveSession>[] = [
    {
      key: "user",
      header: "User",
      className: "min-w-[220px]",
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.userName}</p>
          <p className="text-xs text-[var(--neutral-gray)] truncate">{item.userEmail}</p>
        </div>
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (item) => (
        <span className="text-sm text-[var(--text-primary)] tabular-nums">{item.ipAddress || "\u2014"}</span>
      ),
    },
    {
      key: "device",
      header: "Device / Browser",
      render: (item) => {
        const { browser, os } = parseUserAgent(item.userAgent || "");
        const DeviceIcon = getDeviceIcon(item.userAgent || "");
        return (
          <div className="flex items-center gap-2">
            <DeviceIcon size={14} className="text-[var(--neutral-gray)]" />
            <span className="text-sm text-[var(--text-primary)]">{browser} / {os}</span>
          </div>
        );
      },
    },
    {
      key: "location",
      header: "Location",
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Globe size={12} className="text-[var(--neutral-gray)]" />
          <span className="text-sm text-[var(--text-primary)]">{item.location || "\u2014"}</span>
        </div>
      ),
    },
    {
      key: "lastActive",
      header: "Last Active",
      render: (item) => (
        <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
          {relativeTime(item.lastActive)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Started",
      render: (item) => (
        <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (item) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRevokeTarget(item);
            }}
            title="Revoke session"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium text-[var(--error)] transition-colors hover:bg-red-50"
          >
            <Trash2 size={12} />
            Revoke
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setForceLogoutUserId(item.userId);
              setForceLogoutUserName(item.userName);
            }}
            title="Force logout all sessions for this user"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium text-[var(--warning)] transition-colors hover:bg-amber-50"
          >
            <LogOut size={12} />
            All
          </button>
        </div>
      ),
    },
  ];

  return (
    <PermissionGate permission="system.manage">
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
            <Monitor size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Session Management
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Monitor and manage active user sessions
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <StatCard icon={Activity} label="Active Sessions" value={stats.activeSessions} color="#1B7340" />
        <StatCard icon={Users} label="Unique Users Online" value={stats.uniqueUsers} color="#2563EB" />
        <DeviceDistribution sessions={allSessions} />
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by user name or email..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={sessions}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No active sessions"
          emptyDescription="There are currently no active sessions to display."
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

      {/* Revoke Session Dialog */}
      <ConfirmDialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke Session"
        message={`Revoke this session for ${revokeTarget?.userName ?? "this user"}? They will be logged out immediately.`}
        confirmLabel="Revoke"
        variant="danger"
        loading={revokeMutation.isPending}
      />

      {/* Force Logout All Dialog */}
      <ConfirmDialog
        open={forceLogoutUserId !== null}
        onClose={() => {
          setForceLogoutUserId(null);
          setForceLogoutUserName("");
        }}
        onConfirm={handleForceLogout}
        title="Force Logout User"
        message={`Revoke ALL sessions for ${forceLogoutUserName || "this user"}? They will be logged out of all devices immediately.`}
        confirmLabel="Force Logout All"
        variant="warning"
        loading={revokeAllMutation.isPending}
      />
    </div>
    </PermissionGate>
  );
}
