"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  FolderOpen,
  Edit,
  Trash2,
  Loader2,
  Briefcase,
  DollarSign,
  TrendingUp,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  usePortfolio,
  usePortfolioRoadmap,
  usePortfolioAnalytics,
  useUpdatePortfolio,
  useDeletePortfolio,
} from "@/hooks/use-planning";
import type { Project } from "@/types";

/* ------------------------------------------------------------------ */
/*  RAG color mapping                                                  */
/* ------------------------------------------------------------------ */

const RAG_COLORS: Record<string, string> = {
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  grey: "#9CA3AF",
};

function ragColor(ragStatus: string): string {
  return RAG_COLORS[ragStatus?.toLowerCase()] ?? RAG_COLORS.grey;
}

/* ------------------------------------------------------------------ */
/*  Roadmap Bar Component                                              */
/* ------------------------------------------------------------------ */

function RoadmapBar({
  project,
  minDate,
  maxDate,
}: {
  project: Project;
  minDate: number;
  maxDate: number;
}) {
  const range = maxDate - minDate || 1;
  const start = project.plannedStart
    ? new Date(project.plannedStart).getTime()
    : minDate;
  const end = project.plannedEnd
    ? new Date(project.plannedEnd).getTime()
    : maxDate;

  const leftPct = ((start - minDate) / range) * 100;
  const widthPct = Math.max(((end - start) / range) * 100, 2);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-48 shrink-0">
        <Link
          href={`/dashboard/planning/projects/${project.id}`}
          className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors line-clamp-1"
        >
          {project.title}
        </Link>
        <p className="text-xs text-[var(--neutral-gray)]">{project.code}</p>
      </div>
      <div className="flex-1 relative h-7 bg-[var(--surface-2)] rounded-lg overflow-hidden">
        <div
          className="absolute top-1 bottom-1 rounded-md transition-all duration-300"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            backgroundColor: ragColor(project.ragStatus),
            opacity: 0.85,
          }}
        />
      </div>
      <div className="w-16 shrink-0 text-right">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full mr-1"
          style={{ backgroundColor: ragColor(project.ragStatus) }}
        />
        <span className="text-xs text-[var(--neutral-gray)] capitalize">
          {project.ragStatus}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: portfolio, isLoading } = usePortfolio(id);
  const { data: roadmapProjects } = usePortfolioRoadmap(id);
  const { data: analytics } = usePortfolioAnalytics(id);
  const updatePortfolio = useUpdatePortfolio(id);
  const deletePortfolio = useDeletePortfolio();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading portfolio...
          </p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">
          Portfolio not found.
        </p>
      </div>
    );
  }

  /* ---- Roadmap date range ---- */

  const projects = roadmapProjects ?? [];
  const allDates = projects.flatMap((p) => {
    const dates: number[] = [];
    if (p.plannedStart) dates.push(new Date(p.plannedStart).getTime());
    if (p.plannedEnd) dates.push(new Date(p.plannedEnd).getTime());
    return dates;
  });
  const minDate =
    allDates.length > 0 ? Math.min(...allDates) : Date.now();
  const maxDate =
    allDates.length > 0
      ? Math.max(...allDates)
      : Date.now() + 365 * 24 * 60 * 60 * 1000;

  /* ---- Handlers ---- */

  function startEdit() {
    if (!portfolio) return;
    setEditName(portfolio.name);
    setEditDescription(portfolio.description ?? "");
    setIsEditing(true);
  }

  function handleSaveEdit() {
    updatePortfolio.mutate(
      {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      },
      {
        onSuccess: () => setIsEditing(false),
      },
    );
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this portfolio?")) return;
    deletePortfolio.mutate(id, {
      onSuccess: () => router.push("/dashboard/planning/portfolios"),
    });
  }

  /* ---- Format currency ---- */

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/planning/portfolios")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Portfolios
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
            <FolderOpen size={24} style={{ color: "#1B7340" }} />
          </div>
          <div>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-bold text-[var(--text-primary)] bg-[var(--surface-0)] border border-[var(--border)] rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full text-sm text-[var(--text-secondary)] bg-[var(--surface-0)] border border-[var(--border)] rounded-xl px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={updatePortfolio.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {updatePortfolio.isPending && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  {portfolio.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={portfolio.status} />
                  <span className="text-xs text-[var(--neutral-gray)]">
                    FY {portfolio.fiscalYear}
                  </span>
                </div>
                {portfolio.description && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-xl">
                    {portfolio.description}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePortfolio.isPending}
              className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-700 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {deletePortfolio.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Delete
            </button>
          </div>
        )}
      </motion.div>

      {/* Analytics Section */}
      {analytics && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
            Portfolio Analytics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={16} className="text-[var(--primary)]" />
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Total Projects
                </p>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {analytics.totalProjects}
              </p>
              <p className="text-xs text-[var(--neutral-gray)] mt-1">
                {analytics.activeProjects} active, {analytics.completedProjects}{" "}
                completed
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} style={{ color: "#1B7340" }} />
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Avg. Completion
                </p>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {analytics.avgCompletionPct.toFixed(0)}%
              </p>
              <p className="text-xs text-[var(--neutral-gray)] mt-1">
                On-time delivery: {analytics.onTimeDeliveryPct.toFixed(0)}%
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} style={{ color: "#C9A84C" }} />
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Budget Approved
                </p>
              </div>
              <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                {formatCurrency(analytics.totalBudgetApproved)}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} style={{ color: "#EF4444" }} />
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Budget Spent
                </p>
              </div>
              <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                {formatCurrency(analytics.totalBudgetSpent)}
              </p>
              {analytics.totalBudgetApproved > 0 && (
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((analytics.totalBudgetSpent / analytics.totalBudgetApproved) * 100, 100)}%`,
                        backgroundColor:
                          analytics.totalBudgetSpent /
                            analytics.totalBudgetApproved >
                          0.9
                            ? "#EF4444"
                            : "#1B7340",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RAG Summary */}
          {analytics.ragSummary &&
            Object.keys(analytics.ragSummary).length > 0 && (
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  RAG Summary:
                </span>
                {Object.entries(analytics.ragSummary).map(
                  ([rag, count]) => (
                    <div key={rag} className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: ragColor(rag) }}
                      />
                      <span className="text-sm text-[var(--text-primary)] capitalize">
                        {rag}: {count}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
        </motion.div>
      )}

      {/* Roadmap Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Project Roadmap
          </h2>
          {allDates.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-[var(--neutral-gray)]">
              <Calendar size={12} />
              <span>
                {new Date(minDate).toLocaleDateString()} -{" "}
                {new Date(maxDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-[var(--neutral-gray)] py-8 text-center">
            No projects in this portfolio yet.
          </p>
        ) : (
          <div className="space-y-1 divide-y divide-[var(--border)]">
            {projects.map((project) => (
              <RoadmapBar
                key={project.id}
                project={project}
                minDate={minDate}
                maxDate={maxDate}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Projects Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Projects
          </h2>
          <Link
            href="/dashboard/planning/projects/new"
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            + Add Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-[var(--neutral-gray)] py-8 text-center">
            No projects found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Project
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    RAG
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Progress
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Planned End
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]" />
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--surface-1)] cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/dashboard/planning/projects/${project.id}`,
                      )
                    }
                  >
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {project.title}
                        </p>
                        <p className="text-xs text-[var(--neutral-gray)]">
                          {project.code}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: ragColor(project.ragStatus),
                        }}
                        title={project.ragStatus}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--primary)] rounded-full transition-all"
                            style={{
                              width: `${project.completionPct ?? 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
                          {project.completionPct ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                      {project.plannedEnd
                        ? new Date(project.plannedEnd).toLocaleDateString()
                        : "--"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <ArrowRight
                        size={14}
                        className="text-[var(--neutral-gray)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
