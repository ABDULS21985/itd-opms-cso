"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Filter,
  ArrowRight,
  Calendar,
  Loader2,
  Building2,
  Upload,
  LayoutGrid,
  List,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { BulkUploadModal } from "@/components/planning/bulk-upload-modal";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useProjects, usePortfolios } from "@/hooks/use-planning";
import type { Project } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROJECT_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const RAG_STATUSES = [
  { value: "", label: "All RAG" },
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "red", label: "Red" },
];

const RAG_COLORS: Record<string, string> = {
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  grey: "#9CA3AF",
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  high: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  medium: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  low: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type ViewMode = "tiles" | "grid";

/* ------------------------------------------------------------------ */
/*  Table columns for grid view                                        */
/* ------------------------------------------------------------------ */

const PROJECT_COLUMNS: Column<Project>[] = [
  {
    key: "code",
    header: "Code",
    sortable: true,
    className: "min-w-[90px]",
    render: (p) => (
      <span className="text-xs font-mono text-[var(--neutral-gray)]">
        {p.code}
      </span>
    ),
  },
  {
    key: "title",
    header: "Project",
    sortable: true,
    className: "min-w-[220px]",
    render: (p) => (
      <div className="flex items-center gap-2.5">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            backgroundColor:
              RAG_COLORS[p.ragStatus?.toLowerCase()] ?? RAG_COLORS.grey,
          }}
          title={`RAG: ${p.ragStatus}`}
        />
        <span className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
          {p.title}
        </span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (p) => <StatusBadge status={p.status} />,
  },
  {
    key: "priority",
    header: "Priority",
    sortable: true,
    render: (p) => {
      const c = PRIORITY_COLORS[p.priority] ?? {
        bg: "var(--surface-2)",
        text: "var(--neutral-gray)",
      };
      return (
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
          style={{ backgroundColor: c.bg, color: c.text }}
        >
          {p.priority}
        </span>
      );
    },
  },
  {
    key: "completionPct",
    header: "Progress",
    sortable: true,
    align: "center",
    className: "min-w-[120px]",
    render: (p) => {
      const pct = p.completionPct ?? 0;
      const rag =
        RAG_COLORS[p.ragStatus?.toLowerCase()] ?? RAG_COLORS.grey;
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: rag }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-[var(--text-primary)] w-9 text-right">
            {pct}%
          </span>
        </div>
      );
    },
  },
  {
    key: "divisionName",
    header: "Division",
    sortable: true,
    render: (p) =>
      p.divisionName ? (
        <div className="flex items-center gap-1.5">
          <Building2 size={12} className="text-[var(--primary)]" />
          <span className="text-xs font-medium text-[var(--primary)]">
            {p.divisionName}
          </span>
        </div>
      ) : (
        <span className="text-xs text-[var(--neutral-gray)]">—</span>
      ),
  },
  {
    key: "plannedStart",
    header: "Timeline",
    render: (p) => (
      <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-gray)]">
        <Calendar size={12} />
        <span>
          {p.plannedStart
            ? new Date(p.plannedStart).toLocaleDateString()
            : "TBD"}
        </span>
        <span>–</span>
        <span>
          {p.plannedEnd
            ? new Date(p.plannedEnd).toLocaleDateString()
            : "TBD"}
        </span>
      </div>
    ),
  },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [portfolioId, setPortfolioId] = useState("");
  const [status, setStatus] = useState("");
  const [ragStatus, setRagStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("tiles");

  const { data, isLoading } = useProjects(
    page,
    20,
    portfolioId || undefined,
    status || undefined,
    ragStatus || undefined,
  );

  const { data: portfoliosData } = usePortfolios(1, 100);

  const projects = data?.data ?? [];
  const meta = data?.meta;
  const portfolios = portfoliosData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
            <Briefcase size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Projects
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Manage project lifecycles, timelines, and budgets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-[var(--border)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("tiles")}
              className={`flex items-center justify-center rounded-lg p-1.5 transition-colors ${
                viewMode === "tiles"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
              }`}
              title="Tile view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center justify-center rounded-lg p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
              }`}
              title="Grid view"
            >
              <List size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Upload size={16} />
            Bulk Upload
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/projects/new")}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Portfolio
            </label>
            <select
              value={portfolioId}
              onChange={(e) => {
                setPortfolioId(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">All Portfolios</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              RAG Status
            </label>
            <select
              value={ragStatus}
              onChange={(e) => {
                setRagStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {RAG_STATUSES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2
              size={24}
              className="animate-spin text-[var(--primary)]"
            />
            <p className="text-sm text-[var(--neutral-gray)]">
              Loading projects...
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center justify-center py-24 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] mb-4">
            <Briefcase size={24} className="text-[var(--neutral-gray)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No projects found
          </p>
          <p className="text-sm text-[var(--neutral-gray)] mt-1 mb-4">
            Get started by creating your first project.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/projects/new")}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Project
          </button>
        </motion.div>
      )}

      {/* Project Tiles */}
      {!isLoading && projects.length > 0 && viewMode === "tiles" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {projects.map((project: Project, index: number) => {
            const priorityColor = PRIORITY_COLORS[project.priority] ?? {
              bg: "var(--surface-2)",
              text: "var(--neutral-gray)",
            };
            const rag =
              RAG_COLORS[project.ragStatus?.toLowerCase()] ??
              RAG_COLORS.grey;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  href={`/dashboard/planning/projects/${project.id}`}
                  className="group block rounded-xl border p-5 transition-all duration-200 hover:shadow-md"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                >
                  {/* Top row: RAG dot + code + arrow */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: rag }}
                        title={`RAG: ${project.ragStatus}`}
                      />
                      <span className="text-xs font-mono text-[var(--neutral-gray)]">
                        {project.code}
                      </span>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                    />
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 line-clamp-2">
                    {project.title}
                  </h3>

                  {/* Status + Priority */}
                  <div className="flex items-center gap-2 mb-3">
                    <StatusBadge status={project.status} />
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                      style={{
                        backgroundColor: priorityColor.bg,
                        color: priorityColor.text,
                      }}
                    >
                      {project.priority}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--neutral-gray)]">
                        Progress
                      </span>
                      <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
                        {project.completionPct ?? 0}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${project.completionPct ?? 0}%`,
                          backgroundColor: rag,
                        }}
                      />
                    </div>
                  </div>

                  {/* Division */}
                  {project.divisionName && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <Building2
                        size={12}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-medium text-[var(--primary)]">
                        {project.divisionName}
                      </span>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-3 text-xs text-[var(--neutral-gray)]">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>
                        {project.plannedStart
                          ? new Date(
                              project.plannedStart,
                            ).toLocaleDateString()
                          : "TBD"}
                      </span>
                    </div>
                    <span>-</span>
                    <span>
                      {project.plannedEnd
                        ? new Date(
                            project.plannedEnd,
                          ).toLocaleDateString()
                        : "TBD"}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Project Grid (Table) */}
      {!isLoading && projects.length > 0 && viewMode === "grid" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <DataTable<Project>
            columns={PROJECT_COLUMNS}
            data={projects}
            keyExtractor={(p) => p.id}
            onRowClick={(p) =>
              router.push(`/dashboard/planning/projects/${p.id}`)
            }
            emptyTitle="No projects found"
            emptyDescription="Get started by creating your first project."
            pagination={
              meta && meta.totalPages > 1
                ? {
                    currentPage: page,
                    totalPages: meta.totalPages,
                    totalItems: meta.totalItems,
                    pageSize: 20,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        </motion.div>
      )}

      {/* Pagination (tiles view only) */}
      {viewMode === "tiles" && meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-[var(--neutral-gray)]">
            {meta.totalItems} result{meta.totalItems !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[var(--neutral-gray)] tabular-nums">
              {page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
      />
    </div>
  );
}
