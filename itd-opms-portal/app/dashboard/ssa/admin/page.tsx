"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  LayoutList,
  ChevronRight,
  ArrowUpRight,
  HardDrive,
  Cpu,
  MemoryStick,
  Activity,
  TrendingUp,
  X,
  Plus,
  Filter,
} from "lucide-react";
import {
  useSSARequests,
  useSSARequestStats,
} from "@/hooks/use-ssa";
import {
  SSAHero,
  SSAHeroChip,
  SSAHeroInsight,
  SSAStatCard,
} from "../_components/ssa-ui";
import type { SSARequest, SSARequestStats } from "@/types/ssa";
import {
  SSA_STATUS_LABELS,
  SSA_STATUS_COLORS,
  SSA_STATUSES,
} from "@/types/ssa";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLOR_MAP: Record<string, string> = {
  neutral: "#6B7280",
  blue: "#3B82F6",
  amber: "#F59E0B",
  green: "#10B981",
  teal: "#14B8A6",
  red: "#EF4444",
};

const STATUS_GROUP_TABS = [
  { value: "", label: "All Requests", color: "#6366F1" },
  { value: "SUBMITTED", label: "Submitted", color: "#3B82F6" },
  { value: "pending", label: "Pending Approval", color: "#F59E0B" },
  { value: "FULLY_APPROVED", label: "Approved", color: "#10B981" },
  { value: "DCO_CREATED", label: "Completed", color: "#14B8A6" },
  { value: "REJECTED", label: "Rejected", color: "#EF4444" },
];

const PENDING_STATUSES = new Set([
  "HOO_ENDORSED",
  "ASD_ASSESSED",
  "QCMD_ANALYSED",
  "APPR_DC_PENDING",
  "APPR_SSO_PENDING",
  "APPR_IMD_PENDING",
  "APPR_ASD_PENDING",
  "APPR_SCAO_PENDING",
  "SAN_PROVISIONED",
]);

const SERVER_COLORS: Record<string, { color: string; bg: string }> = {
  physical: { color: "#6366F1", bg: "rgba(99, 102, 241, 0.08)" },
  virtual: { color: "#3B82F6", bg: "rgba(59, 130, 246, 0.08)" },
  cloud: { color: "#10B981", bg: "rgba(16, 185, 129, 0.08)" },
  storage: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusColor(status: string): string {
  return COLOR_MAP[SSA_STATUS_COLORS[status]] ?? "#6B7280";
}

function getStatusLabel(status: string): string {
  return SSA_STATUS_LABELS[status] ?? status;
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
    >
      <div
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.07]"
        style={{ background: `radial-gradient(circle, ${color}, transparent)` }}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {value}
          </p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}14` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Breakdown Panel                                             */
/* ------------------------------------------------------------------ */

function StatusBreakdown({ stats }: { stats: SSARequestStats }) {
  const items = [
    { label: "Draft", count: stats.draft, color: "#6B7280" },
    { label: "Submitted", count: stats.submitted, color: "#3B82F6" },
    { label: "In Progress", count: stats.inProgress, color: "#F59E0B" },
    { label: "Approved", count: stats.approved, color: "#10B981" },
    { label: "Completed", count: stats.completed, color: "#14B8A6" },
    { label: "Rejected", count: stats.rejected, color: "#EF4444" },
    { label: "Cancelled", count: stats.cancelled, color: "#9CA3AF" },
  ];

  const total = stats.total || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Status Breakdown
        </h3>
        <Activity size={14} className="text-[var(--neutral-gray)]" />
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full mb-4">
        {items
          .filter((i) => i.count > 0)
          .map((item) => (
            <motion.div
              key={item.label}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ backgroundColor: item.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.count / total) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              title={`${item.label}: ${item.count}`}
            />
          ))}
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {item.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                {item.count}
              </span>
              <span className="text-[10px] text-[var(--neutral-gray)] tabular-nums w-8 text-right">
                {Math.round((item.count / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Request Card (Grid View)                                           */
/* ------------------------------------------------------------------ */

function RequestCard({
  request,
  onClick,
  delay,
}: {
  request: SSARequest;
  onClick: () => void;
  delay: number;
}) {
  const statusColor = getStatusColor(request.status);
  const serverConf = SERVER_COLORS[request.serverType?.toLowerCase()] ?? {
    color: "#6B7280",
    bg: "rgba(107, 114, 128, 0.08)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] transition-shadow hover:shadow-lg hover:shadow-black/5"
    >
      {/* Status accent */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${statusColor}, ${statusColor}88)`,
        }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <code className="text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/8 px-1.5 py-0.5 rounded">
                {request.referenceNo}
              </code>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: serverConf.bg,
                  color: serverConf.color,
                }}
              >
                {request.serverType}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
              {request.appName}
            </h3>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-1)]">
            <ArrowUpRight size={14} className="text-[var(--primary)]" />
          </div>
        </div>

        {/* Requestor & Division */}
        <div className="mt-2 text-xs text-[var(--neutral-gray)]">
          <span>{request.requestorName}</span>
          <span className="mx-1.5">&middot;</span>
          <span>{request.divisionOffice}</span>
        </div>

        {/* Resource specs */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[var(--surface-1)] px-2 py-1.5 text-center">
            <Cpu size={11} className="mx-auto text-[var(--neutral-gray)] mb-0.5" />
            <p className="text-[10px] text-[var(--neutral-gray)]">vCPU</p>
            <p className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
              {request.vcpuCount}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--surface-1)] px-2 py-1.5 text-center">
            <MemoryStick size={11} className="mx-auto text-[var(--neutral-gray)] mb-0.5" />
            <p className="text-[10px] text-[var(--neutral-gray)]">RAM</p>
            <p className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
              {request.memoryGb}GB
            </p>
          </div>
          <div className="rounded-lg bg-[var(--surface-1)] px-2 py-1.5 text-center">
            <HardDrive size={11} className="mx-auto text-[var(--neutral-gray)] mb-0.5" />
            <p className="text-[10px] text-[var(--neutral-gray)]">Storage</p>
            <p className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
              {request.spaceGb}GB
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: `${statusColor}14`,
              color: statusColor,
            }}
          >
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            {getStatusLabel(request.status)}
          </span>
          <span className="text-[11px] text-[var(--neutral-gray)]">
            {formatDate(request.submittedAt || request.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SSAAdminPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [division, setDivision] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* Resolve the actual API status filter */
  const resolvedStatus = useMemo(() => {
    if (status === "pending") return undefined; // client-side filter
    return status || undefined;
  }, [status]);

  const { data: listData, isLoading } = useSSARequests(
    page,
    20,
    resolvedStatus,
    division || undefined,
    debouncedSearch || undefined,
  );
  const { data: stats } = useSSARequestStats();

  const rawRequests: SSARequest[] = listData?.data ?? [];
  const meta = listData?.meta;

  /* Client-side filtering for "pending" group */
  const requests = useMemo(() => {
    if (status === "pending") {
      return rawRequests.filter((r) => PENDING_STATUSES.has(r.status));
    }
    return rawRequests;
  }, [rawRequests, status]);

  /* Status counts from current page */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { "": rawRequests.length };
    for (const r of rawRequests) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (PENDING_STATUSES.has(r.status)) {
        counts["pending"] = (counts["pending"] ?? 0) + 1;
      }
    }
    return counts;
  }, [rawRequests]);

  const hasFilters = !!(status || division || searchQuery);

  const handleClearFilters = useCallback(() => {
    setStatus("");
    setDivision("");
    setSearchQuery("");
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SSAHero
          icon={Server}
          eyebrow="SSA Administration"
          title="Manage the full SSA portfolio from one operational command view."
          description="Switch between portfolio states, inspect requests in grid or table format, and keep the lifecycle from submission through provisioning under tighter control."
          accent="emerald"
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/dashboard/ssa/new")}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0D4A29] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <Plus size={16} />
                New Request
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/ssa/approvals")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:border-white/28 hover:bg-white/14"
              >
                Open approvals
              </button>
            </>
          }
          chips={
            <>
              <SSAHeroChip>{stats?.total ?? 0} total requests</SSAHeroChip>
              <SSAHeroChip>{status ? STATUS_GROUP_TABS.find((tab) => tab.value === status)?.label ?? status : "All request states"}</SSAHeroChip>
              <SSAHeroChip>{viewMode === "grid" ? "Grid view active" : "Table view active"}</SSAHeroChip>
              {division ? <SSAHeroChip>{division}</SSAHeroChip> : null}
            </>
          }
          aside={
            <>
              <SSAHeroInsight
                icon={Clock}
                eyebrow="Pipeline"
                accent="amber"
                title={`${stats?.inProgress ?? 0} active requests`}
                description="Monitor the current working load still moving through technical review, approvals, or provisioning."
              />
              <SSAHeroInsight
                icon={CheckCircle2}
                eyebrow="Delivered"
                accent="emerald"
                title={`${stats?.completed ?? 0} completed`}
                description="Keep completed allocations visible for validation, support history, and downstream audit reference."
              />
              <SSAHeroInsight
                icon={TrendingUp}
                eyebrow="Oversight"
                accent="cyan"
                title="Grid and table control"
                description="Choose the visual density you need, then filter the book by status, division, and request search."
              />
            </>
          }
        />
      </motion.div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SSAStatCard
              label="Total Requests"
              value={stats.total}
              helper="Full population currently represented in the SSA register."
              icon={FileText}
              accent="indigo"
            />
            <SSAStatCard
              label="In Progress"
              value={stats.inProgress}
              helper="Requests still in the active review and fulfillment lifecycle."
              icon={Clock}
              accent="amber"
            />
            <SSAStatCard
              label="Completed"
              value={stats.completed}
              helper="Successfully fulfilled allocations available for later lookup."
              icon={CheckCircle2}
              accent="emerald"
            />
            <SSAStatCard
              label="Rejected"
              value={stats.rejected}
              helper="Requests requiring follow-up, clarification, or rework."
              icon={XCircle}
              accent="rose"
            />
          </div>
          <div className="lg:col-span-4">
            <StatusBreakdown stats={stats} />
          </div>
        </div>
      )}

      {/* ================================================ */}
      {/*  TOOLBAR                                          */}
      {/* ================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="space-y-4"
      >
        {/* Status group tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_GROUP_TABS.map((tab) => {
            const active = status === tab.value;
            const count = statusCounts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-transparent text-white shadow-sm"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                }`}
                style={active ? { backgroundColor: tab.color } : undefined}
              >
                {tab.label}
                {tab.value !== "" && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + Division + View toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            {/* Search */}
            <div className="relative max-w-xs flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search requests..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            {/* Division filter */}
            <div className="relative">
              <Filter
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
              />
              <input
                type="text"
                value={division}
                onChange={(e) => {
                  setDivision(e.target.value);
                  setPage(1);
                }}
                placeholder="Division..."
                className="w-36 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--error)] hover:border-[var(--error)]/30"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
              }`}
            >
              <LayoutGrid size={13} />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
              }`}
            >
              <LayoutList size={13} />
              Table
            </button>
          </div>
        </div>
      </motion.div>

      {/* ================================================ */}
      {/*  CONTENT                                          */}
      {/* ================================================ */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
              />
            ))}
          </motion.div>
        ) : requests.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] py-20"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #1B7340, #10B981)",
              }}
            >
              <Server size={28} className="text-white" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              No requests found
            </h3>
            <p className="mt-1 text-sm text-[var(--neutral-gray)]">
              {hasFilters
                ? "Try adjusting your search or filters."
                : "No server/storage allocation requests yet."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </motion.div>
        ) : viewMode === "grid" ? (
          /* ---------- GRID VIEW ---------- */
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {requests.map((req, i) => (
              <RequestCard
                key={req.id}
                request={req}
                onClick={() => router.push(`/dashboard/ssa/${req.id}`)}
                delay={Math.min(i * 0.04, 0.3)}
              />
            ))}
          </motion.div>
        ) : (
          /* ---------- TABLE VIEW ---------- */
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Reference
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Application
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Requestor
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Division
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Status
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Resources
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Submitted
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const statusColor = getStatusColor(req.status);
                    const serverConf = SERVER_COLORS[
                      req.serverType?.toLowerCase()
                    ] ?? { color: "#6B7280", bg: "rgba(107, 114, 128, 0.08)" };

                    return (
                      <tr
                        key={req.id}
                        onClick={() =>
                          router.push(`/dashboard/ssa/${req.id}`)
                        }
                        className="group cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface-1)]"
                      >
                        {/* Reference */}
                        <td className="px-5 py-4">
                          <code className="text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/8 px-1.5 py-0.5 rounded">
                            {req.referenceNo}
                          </code>
                        </td>

                        {/* Application */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: serverConf.bg }}
                            >
                              <Server
                                size={14}
                                style={{ color: serverConf.color }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors truncate max-w-[180px]">
                                {req.appName}
                              </p>
                              <span
                                className="text-[10px] font-semibold uppercase tracking-wider"
                                style={{ color: serverConf.color }}
                              >
                                {req.serverType}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Requestor */}
                        <td className="px-5 py-4">
                          <span className="text-[var(--text-secondary)]">
                            {req.requestorName}
                          </span>
                        </td>

                        {/* Division */}
                        <td className="px-5 py-4">
                          <span className="text-[var(--text-secondary)]">
                            {req.divisionOffice}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${statusColor}14`,
                              color: statusColor,
                            }}
                          >
                            <div
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: statusColor }}
                            />
                            {getStatusLabel(req.status)}
                          </span>
                        </td>

                        {/* Resources */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-3 text-xs text-[var(--text-secondary)] tabular-nums">
                            <span title="vCPU" className="flex items-center gap-0.5">
                              <Cpu size={11} className="text-[var(--neutral-gray)]" />
                              {req.vcpuCount}
                            </span>
                            <span title="RAM (GB)" className="flex items-center gap-0.5">
                              <MemoryStick size={11} className="text-[var(--neutral-gray)]" />
                              {req.memoryGb}
                            </span>
                            <span title="Storage (GB)" className="flex items-center gap-0.5">
                              <HardDrive size={11} className="text-[var(--neutral-gray)]" />
                              {req.spaceGb}
                            </span>
                          </div>
                        </td>

                        {/* Submitted */}
                        <td className="px-5 py-4">
                          <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                            {formatDate(req.submittedAt || req.createdAt)}
                          </span>
                        </td>

                        {/* Arrow */}
                        <td className="px-5 py-4">
                          <ChevronRight
                            size={16}
                            className="text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================ */}
      {/*  PAGINATION                                       */}
      {/* ================================================ */}
      {meta && meta.totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-5 py-3"
        >
          <p className="text-xs text-[var(--neutral-gray)]">
            Showing{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {(meta.page - 1) * meta.pageSize + 1}
            </span>
            –
            <span className="font-medium text-[var(--text-primary)]">
              {Math.min(meta.page * meta.pageSize, meta.totalItems)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {meta.totalItems}
            </span>{" "}
            requests
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
