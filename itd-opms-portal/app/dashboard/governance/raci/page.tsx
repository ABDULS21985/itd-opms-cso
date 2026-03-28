"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Grid3X3,
  Search,
  LayoutGrid,
  LayoutList,
  ChevronRight,
  ArrowUpRight,
  Users,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Layers,
  Shield,
  PieChart,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useRACIMatrices,
  useDeleteRACIMatrix,
  useRACICoverageSummary,
} from "@/hooks/use-governance";
import { formatDate } from "@/lib/utils";
import type { RACIMatrix } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ENTITY_CONFIG: Record<string, { color: string; gradient: string; icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }> }> = {
  process: {
    color: "#6366F1",
    gradient: "linear-gradient(135deg, #6366F1, #818CF8)",
    icon: Layers,
  },
  project: {
    color: "#3B82F6",
    gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
    icon: BarChart3,
  },
  service: {
    color: "#10B981",
    gradient: "linear-gradient(135deg, #10B981, #34D399)",
    icon: Shield,
  },
  policy: {
    color: "#F59E0B",
    gradient: "linear-gradient(135deg, #F59E0B, #FBBF24)",
    icon: Shield,
  },
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  suffix,
  delay,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  suffix?: string;
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
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            {value}
            {suffix && (
              <span className="text-sm font-medium text-[var(--neutral-gray)] ml-0.5">
                {suffix}
              </span>
            )}
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
/*  Coverage Bar                                                       */
/* ------------------------------------------------------------------ */

function CoverageBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span
        className="text-[11px] font-semibold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Matrix Card (Grid View)                                            */
/* ------------------------------------------------------------------ */

function MatrixCard({
  matrix,
  onClick,
  onDelete,
  delay,
}: {
  matrix: RACIMatrix;
  onClick: () => void;
  onDelete: () => void;
  delay: number;
}) {
  const entity = ENTITY_CONFIG[matrix.entityType] ?? {
    color: "#6B7280",
    gradient: "linear-gradient(135deg, #6B7280, #9CA3AF)",
    icon: Grid3X3,
  };
  const EntityIcon = entity.icon;
  const entryCount = matrix.entries?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] transition-shadow hover:shadow-lg hover:shadow-black/5"
    >
      {/* Top accent */}
      <div
        className="h-1"
        style={{ background: entity.gradient }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${entity.color}14` }}
            >
              <EntityIcon size={18} style={{ color: entity.color }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
                {matrix.title}
              </h3>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider mt-1"
                style={{
                  backgroundColor: `${entity.color}14`,
                  color: entity.color,
                }}
              >
                {matrix.entityType}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-1)]">
              <ArrowUpRight size={13} className="text-[var(--primary)]" />
            </div>
          </div>
        </div>

        {/* Description */}
        {matrix.description && (
          <p className="mt-3 text-xs text-[var(--neutral-gray)] line-clamp-2 leading-relaxed">
            {matrix.description}
          </p>
        )}

        {/* RACI role indicators */}
        <div className="mt-4 flex items-center gap-2">
          {["R", "A", "C", "I"].map((role) => {
            const colors: Record<string, string> = {
              R: "#3B82F6",
              A: "#EF4444",
              C: "#F59E0B",
              I: "#10B981",
            };
            return (
              <div
                key={role}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: colors[role] }}
              >
                {role}
              </div>
            );
          })}
          {entryCount > 0 && (
            <span className="ml-auto text-xs text-[var(--neutral-gray)]">
              {entryCount} {entryCount === 1 ? "activity" : "activities"}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
          <StatusBadge status={matrix.status} />
          <span className="text-[11px] text-[var(--neutral-gray)]">
            {formatDate(matrix.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RACIMatrixListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const { data, isLoading } = useRACIMatrices(page, 20);
  const { data: coverageSummary } = useRACICoverageSummary();
  const deleteMutation = useDeleteRACIMatrix();

  const matrices = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Client-side filters ---- */
  const filtered = useMemo(() => {
    let result = matrices;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.entityType.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      result = result.filter((m) => m.status === statusFilter);
    }
    return result;
  }, [matrices, search, statusFilter]);

  /* ---- Status counts ---- */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { "": matrices.length };
    for (const m of matrices) {
      counts[m.status] = (counts[m.status] ?? 0) + 1;
    }
    return counts;
  }, [matrices]);

  function handleDelete() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  }

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
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-[0.04]"
            style={{
              background:
                "radial-gradient(circle, #6366F1 0%, transparent 70%)",
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
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              }}
            >
              <Grid3X3 size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                RACI Matrices
              </h1>
              <p className="mt-0.5 text-sm text-[var(--neutral-gray)]">
                Manage responsibility assignment matrices for processes,
                projects & services
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/governance/raci/new")}
            className="flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            }}
          >
            <Plus size={16} />
            New Matrix
          </button>
        </div>
      </motion.div>

      {/* ================================================ */}
      {/*  STAT CARDS                                       */}
      {/* ================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Matrices"
          value={coverageSummary?.totalMatrices ?? meta?.totalItems ?? matrices.length}
          icon={Grid3X3}
          color="#6366F1"
          delay={0.05}
        />
        <StatCard
          label="Avg Coverage"
          value={Math.round(coverageSummary?.avgCoveragePct ?? 0)}
          icon={PieChart}
          color="#10B981"
          suffix="%"
          delay={0.1}
        />
        <StatCard
          label="Fully Covered"
          value={coverageSummary?.fullyCoveredCount ?? 0}
          icon={CheckCircle2}
          color="#3B82F6"
          delay={0.15}
        />
        <StatCard
          label="With Gaps"
          value={coverageSummary?.matricesWithGaps ?? 0}
          icon={AlertTriangle}
          color={
            (coverageSummary?.matricesWithGaps ?? 0) > 0
              ? "#F59E0B"
              : "#6B7280"
          }
          delay={0.2}
        />
      </div>

      {/* ================================================ */}
      {/*  TOOLBAR                                          */}
      {/* ================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="space-y-4"
      >
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((tab) => {
            const active = statusFilter === tab.value;
            const count = statusCounts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                }`}
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

        {/* Search + View toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search matrices..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

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
                className="h-52 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
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
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              }}
            >
              <Grid3X3 size={28} className="text-white" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              No RACI matrices found
            </h3>
            <p className="mt-1 text-sm text-[var(--neutral-gray)]">
              {search || statusFilter
                ? "Try adjusting your search or filters."
                : "Create your first RACI matrix to define responsibility assignments."}
            </p>
            {!search && !statusFilter && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/governance/raci/new")}
                className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                }}
              >
                <Plus size={16} />
                New Matrix
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
            {filtered.map((matrix, i) => (
              <MatrixCard
                key={matrix.id}
                matrix={matrix}
                onClick={() =>
                  router.push(`/dashboard/governance/raci/${matrix.id}`)
                }
                onDelete={() => setDeleteId(matrix.id)}
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
                      Matrix
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Entity Type
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Status
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      RACI
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                      Created
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((matrix) => {
                    const entity = ENTITY_CONFIG[matrix.entityType] ?? {
                      color: "#6B7280",
                      gradient: "linear-gradient(135deg, #6B7280, #9CA3AF)",
                      icon: Grid3X3,
                    };
                    const EntityIcon = entity.icon;
                    return (
                      <tr
                        key={matrix.id}
                        onClick={() =>
                          router.push(
                            `/dashboard/governance/raci/${matrix.id}`,
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
                                backgroundColor: `${entity.color}14`,
                              }}
                            >
                              <EntityIcon
                                size={15}
                                style={{ color: entity.color }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors truncate max-w-[260px]">
                                {matrix.title}
                              </p>
                              {matrix.description && (
                                <p className="text-xs text-[var(--neutral-gray)] truncate max-w-[260px]">
                                  {matrix.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Entity Type */}
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider capitalize"
                            style={{
                              backgroundColor: `${entity.color}14`,
                              color: entity.color,
                            }}
                          >
                            {matrix.entityType}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusBadge status={matrix.status} />
                        </td>

                        {/* RACI Badges */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1">
                            {["R", "A", "C", "I"].map((role) => {
                              const colors: Record<string, string> = {
                                R: "#3B82F6",
                                A: "#EF4444",
                                C: "#F59E0B",
                                I: "#10B981",
                              };
                              return (
                                <div
                                  key={role}
                                  className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white"
                                  style={{
                                    backgroundColor: colors[role],
                                  }}
                                >
                                  {role}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Created */}
                        <td className="px-5 py-4">
                          <span className="text-[var(--text-secondary)]">
                            {formatDate(matrix.createdAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(matrix.id);
                              }}
                              className="rounded-lg p-1.5 text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                            <ChevronRight
                              size={16}
                              className="text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </div>
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
            matrices
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

      {/* ================================================ */}
      {/*  DELETE CONFIRM                                    */}
      {/* ================================================ */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete RACI Matrix"
        message="Are you sure you want to delete this RACI matrix? This action cannot be undone and all associated entries will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
