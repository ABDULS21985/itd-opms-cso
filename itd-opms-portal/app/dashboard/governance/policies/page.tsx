"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Shield,
  Search,
  LayoutGrid,
  LayoutList,
  ChevronRight,
  Calendar,
  Tag,
  Clock,
  CheckCircle2,
  Eye,
  PenLine,
  Archive,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { usePolicies } from "@/hooks/use-governance";
import type { Policy } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "security", label: "Security" },
  { value: "operational", label: "Operational" },
  { value: "compliance", label: "Compliance" },
  { value: "hr", label: "Human Resources" },
];

const STATUS_TABS = [
  { value: "", label: "All", icon: FileText, color: "#6B7280" },
  { value: "draft", label: "Draft", icon: PenLine, color: "#6B7280" },
  { value: "in_review", label: "In Review", icon: Eye, color: "#F59E0B" },
  { value: "approved", label: "Approved", icon: CheckCircle2, color: "#3B82F6" },
  { value: "published", label: "Published", icon: Shield, color: "#10B981" },
  { value: "retired", label: "Retired", icon: Archive, color: "#EF4444" },
];

const CATEGORY_CONFIG: Record<string, { bg: string; text: string; gradient: string }> = {
  security: {
    bg: "rgba(239, 68, 68, 0.08)",
    text: "#EF4444",
    gradient: "linear-gradient(135deg, #FEE2E2, #FECACA)",
  },
  operational: {
    bg: "rgba(59, 130, 246, 0.08)",
    text: "#3B82F6",
    gradient: "linear-gradient(135deg, #DBEAFE, #BFDBFE)",
  },
  compliance: {
    bg: "rgba(139, 92, 246, 0.08)",
    text: "#8B5CF6",
    gradient: "linear-gradient(135deg, #EDE9FE, #DDD6FE)",
  },
  hr: {
    bg: "rgba(245, 158, 11, 0.08)",
    text: "#F59E0B",
    gradient: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
  },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#6B7280",
  in_review: "#F59E0B",
  approved: "#3B82F6",
  published: "#10B981",
  retired: "#EF4444",
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

function isOverdue(d?: string) {
  if (!d) return false;
  return new Date(d) < new Date();
}

function daysDiff(d?: string) {
  if (!d) return null;
  const diff = Math.ceil(
    (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  gradient,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  gradient: string;
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
        style={{ background: gradient }}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
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
/*  Policy Card (Grid View)                                            */
/* ------------------------------------------------------------------ */

function PolicyCard({
  policy,
  onClick,
  delay,
}: {
  policy: Policy;
  onClick: () => void;
  delay: number;
}) {
  const cat = CATEGORY_CONFIG[policy.category];
  const statusColor = STATUS_COLORS[policy.status] ?? "#6B7280";
  const reviewDays = daysDiff(policy.reviewDate);
  const reviewOverdue = isOverdue(policy.reviewDate) && policy.status === "published";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] transition-shadow hover:shadow-lg hover:shadow-black/5"
    >
      {/* Top gradient accent */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${statusColor}, ${statusColor}88)`,
        }}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {cat && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: cat.bg, color: cat.text }}
                >
                  {policy.category}
                </span>
              )}
              <span className="text-[10px] font-medium text-[var(--neutral-gray)] tabular-nums">
                v{policy.version}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
              {policy.title}
            </h3>
          </div>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-1)]"
          >
            <ArrowUpRight size={14} className="text-[var(--primary)]" />
          </div>
        </div>

        {/* Description */}
        {policy.description && (
          <p className="mt-2 text-xs text-[var(--neutral-gray)] line-clamp-2 leading-relaxed">
            {policy.description}
          </p>
        )}

        {/* Dates */}
        <div className="mt-4 flex items-center gap-4 text-[11px] text-[var(--neutral-gray)]">
          {policy.effectiveDate && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(policy.effectiveDate)}
            </span>
          )}
          {policy.reviewDate && (
            <span
              className="flex items-center gap-1"
              style={reviewOverdue ? { color: "#EF4444" } : undefined}
            >
              {reviewOverdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
              Review {formatDate(policy.reviewDate)}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
          <StatusBadge status={policy.status} />
          {reviewOverdue && (
            <span className="text-[10px] font-medium text-red-500">
              Review overdue
            </span>
          )}
          {!reviewOverdue && reviewDays !== null && reviewDays > 0 && reviewDays <= 30 && (
            <span className="text-[10px] font-medium text-amber-500">
              Review in {reviewDays}d
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PoliciesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const { data, isLoading } = usePolicies(
    page,
    20,
    category || undefined,
    status || undefined,
  );

  const policies = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Compute stats from current data ---- */
  const stats = useMemo(() => {
    const all = policies;
    return {
      total: meta?.totalItems ?? all.length,
      published: all.filter((p) => p.status === "published").length,
      inReview: all.filter((p) => p.status === "in_review").length,
      drafts: all.filter((p) => p.status === "draft").length,
    };
  }, [policies, meta]);

  /* ---- Client-side search filter ---- */
  const filtered = useMemo(() => {
    if (!search.trim()) return policies;
    const q = search.toLowerCase();
    return policies.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [policies, search]);

  /* ---- Status tab counts from current page ---- */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { "": policies.length };
    for (const p of policies) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [policies]);

  return (
    <div className="space-y-6">
      {/* ================================================ */}
      {/*  HERO HEADER                                      */}
      {/* ================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-[0.04]"
            style={{
              background:
                "radial-gradient(circle, #1B7340 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full opacity-[0.03]"
            style={{
              background:
                "radial-gradient(circle, #3B82F6 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{
                background: "linear-gradient(135deg, #1B7340, #10B981)",
              }}
            >
              <Shield size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Policy Management
              </h1>
              <p className="mt-0.5 text-sm text-[var(--neutral-gray)]">
                Manage organizational policies, approvals & attestation
                campaigns
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/governance/policies/new")
            }
            className="flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #1B7340, #10B981)",
            }}
          >
            <Plus size={16} />
            New Policy
          </button>
        </div>
      </motion.div>

      {/* ================================================ */}
      {/*  STAT CARDS                                       */}
      {/* ================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Policies"
          value={stats.total}
          icon={FileText}
          color="#6366F1"
          gradient="linear-gradient(135deg, #6366F1, #8B5CF6)"
          delay={0.05}
        />
        <StatCard
          label="Published"
          value={stats.published}
          icon={Shield}
          color="#10B981"
          gradient="linear-gradient(135deg, #10B981, #34D399)"
          delay={0.1}
        />
        <StatCard
          label="In Review"
          value={stats.inReview}
          icon={Eye}
          color="#F59E0B"
          gradient="linear-gradient(135deg, #F59E0B, #FBBF24)"
          delay={0.15}
        />
        <StatCard
          label="Drafts"
          value={stats.drafts}
          icon={PenLine}
          color="#6B7280"
          gradient="linear-gradient(135deg, #6B7280, #9CA3AF)"
          delay={0.2}
        />
      </div>

      {/* ================================================ */}
      {/*  TOOLBAR: Status Tabs + Search + View Toggle      */}
      {/* ================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="space-y-4"
      >
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
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
                style={
                  active
                    ? { backgroundColor: tab.color }
                    : undefined
                }
              >
                <Icon size={13} />
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

        {/* Search + Category + View toggle row */}
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search policies..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            {/* Category dropdown */}
            <div className="relative">
              <Tag
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
              />
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2 pl-8 pr-8 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
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
                className="h-48 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
              />
            ))}
          </motion.div>
        ) : filtered.length === 0 ? (
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
              <FileText size={28} className="text-white" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              No policies found
            </h3>
            <p className="mt-1 text-sm text-[var(--neutral-gray)]">
              {search
                ? "Try adjusting your search or filters."
                : "Get started by creating your first policy."}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/governance/policies/new")
                }
                className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #1B7340, #10B981)",
                }}
              >
                <Plus size={16} />
                New Policy
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
            {filtered.map((policy, i) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                onClick={() =>
                  router.push(
                    `/dashboard/governance/policies/${policy.id}`,
                  )
                }
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
                      Policy
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Category
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Status
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Version
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Effective
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Review Date
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((policy) => {
                    const cat = CATEGORY_CONFIG[policy.category];
                    const reviewOverdue =
                      isOverdue(policy.reviewDate) &&
                      policy.status === "published";
                    return (
                      <tr
                        key={policy.id}
                        onClick={() =>
                          router.push(
                            `/dashboard/governance/policies/${policy.id}`,
                          )
                        }
                        className="group cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface-1)]"
                      >
                        {/* Title */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                              style={{
                                background: cat?.gradient ?? "var(--surface-1)",
                              }}
                            >
                              <FileText
                                size={15}
                                style={{ color: cat?.text ?? "var(--neutral-gray)" }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors truncate max-w-[280px]">
                                {policy.title}
                              </p>
                              {policy.description && (
                                <p className="text-xs text-[var(--neutral-gray)] truncate max-w-[280px]">
                                  {policy.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                            style={{
                              backgroundColor: cat?.bg ?? "var(--surface-1)",
                              color: cat?.text ?? "var(--neutral-gray)",
                            }}
                          >
                            {policy.category}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusBadge status={policy.status} />
                        </td>

                        {/* Version */}
                        <td className="px-5 py-4 text-center">
                          <span className="text-[var(--text-secondary)] tabular-nums">
                            v{policy.version}
                          </span>
                        </td>

                        {/* Effective */}
                        <td className="px-5 py-4">
                          <span className="text-[var(--text-secondary)]">
                            {formatDate(policy.effectiveDate)}
                          </span>
                        </td>

                        {/* Review Date */}
                        <td className="px-5 py-4">
                          <span
                            className="flex items-center gap-1"
                            style={reviewOverdue ? { color: "#EF4444" } : { color: "var(--text-secondary)" }}
                          >
                            {reviewOverdue && <AlertTriangle size={13} />}
                            {formatDate(policy.reviewDate)}
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
            policies
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
