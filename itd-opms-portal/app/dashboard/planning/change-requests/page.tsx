"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitPullRequest,
  Plus,
  Filter,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  User,
  Calendar,
  ChevronRight,
  X,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useChangeRequests } from "@/hooks/use-planning";
import type { ChangeRequest } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "implemented", label: "Implemented" },
];

const PRIORITIES = [
  { value: "", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "scope", label: "Scope" },
  { value: "schedule", label: "Schedule" },
  { value: "budget", label: "Budget" },
  { value: "resource", label: "Resource" },
  { value: "technical", label: "Technical" },
  { value: "other", label: "Other" },
];

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239,68,68,0.1)", text: "#EF4444" },
  high: { bg: "rgba(249,115,22,0.1)", text: "#F97316" },
  medium: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
  low: { bg: "rgba(16,185,129,0.1)", text: "#10B981" },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  scope: { bg: "rgba(139,92,246,0.1)", text: "#8B5CF6" },
  schedule: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" },
  budget: { bg: "rgba(16,185,129,0.1)", text: "#10B981" },
  resource: { bg: "rgba(249,115,22,0.1)", text: "#F97316" },
  technical: { bg: "rgba(236,72,153,0.1)", text: "#EC4899" },
  other: { bg: "rgba(107,114,128,0.1)", text: "#6B7280" },
};

const WORKFLOW_ORDER: Record<string, number> = {
  submitted: 0,
  under_review: 1,
  approved: 2,
  rejected: 2,
  implemented: 3,
};

const WORKFLOW_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Review" },
  { key: "approved", label: "Decision" },
  { key: "implemented", label: "Done" },
];

/* ------------------------------------------------------------------ */
/*  Badge Components                                                   */
/* ------------------------------------------------------------------ */

function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority.toLowerCase()] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {priority}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category.toLowerCase()] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {category}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflow Indicator (mini)                                           */
/* ------------------------------------------------------------------ */

function WorkflowIndicator({ status }: { status: string }) {
  const currentStep = WORKFLOW_ORDER[status.toLowerCase()] ?? 0;
  const isRejected = status.toLowerCase() === "rejected";

  return (
    <div className="flex items-center gap-1">
      {WORKFLOW_STEPS.map((step, idx) => {
        const isActive = idx <= currentStep;
        const isCurrent = idx === currentStep;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                isCurrent && isRejected
                  ? "bg-[var(--error)]"
                  : isActive
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--surface-2)]"
              }`}
              title={step.label}
            />
            {idx < WORKFLOW_STEPS.length - 1 && (
              <ArrowRight
                size={8}
                className={
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--surface-2)]"
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
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
  icon: React.ElementType;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--neutral-gray)]">{label}</p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Relative date helper                                               */
/* ------------------------------------------------------------------ */

function relativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChangeRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id") ?? undefined;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useChangeRequests(
    page,
    20,
    projectId,
    status || undefined,
    priority || undefined,
    category || undefined,
  );

  const changeRequests = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Stats (computed from current page data; ideally would be a dedicated API) ---- */
  const stats = useMemo(() => {
    const total = meta?.totalItems ?? 0;
    const pendingReview = changeRequests.filter(
      (cr) => cr.status === "submitted" || cr.status === "under_review",
    ).length;
    const approved = changeRequests.filter(
      (cr) => cr.status === "approved" || cr.status === "implemented",
    ).length;
    const rejected = changeRequests.filter(
      (cr) => cr.status === "rejected",
    ).length;
    return { total, pendingReview, approved, rejected };
  }, [changeRequests, meta]);

  const hasActiveFilters = status || priority || category;

  /* ---- Columns ---- */

  const columns: Column<ChangeRequest>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[260px]",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.1)]">
            <GitPullRequest size={16} style={{ color: "#8B5CF6" }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-[var(--neutral-gray)] line-clamp-1 max-w-[280px]">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "projectId",
      header: "Project",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.projectTitle || "--"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) =>
        item.category ? <CategoryBadge category={item.category} /> : (
          <span className="text-sm text-[var(--neutral-gray)]">--</span>
        ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (item) => <PriorityBadge priority={item.priority} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-1.5">
          <StatusBadge status={item.status} />
          <WorkflowIndicator status={item.status} />
        </div>
      ),
    },
    {
      key: "requestedBy",
      header: "Requested By",
      render: (item) => (
        <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <User size={14} className="text-[var(--neutral-gray)]" />
          {item.requestedByName || "Unknown"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (item) => (
        <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <Calendar size={14} className="text-[var(--neutral-gray)]" />
          {relativeDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: "actions" as keyof ChangeRequest,
      header: "",
      align: "center" as const,
      render: () => (
        <ChevronRight size={16} className="text-[var(--neutral-gray)]" />
      ),
    },
  ];

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(139,92,246,0.1)]">
            <GitPullRequest size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Change Requests
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Manage scope, schedule, and budget change requests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
              hasActiveFilters
                ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
                : "border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
            }`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                {[status, priority, category].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/planning/change-requests/new")
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Change Request
          </button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Requests"
          value={stats.total}
          icon={Inbox}
          color="#8B5CF6"
          delay={0.05}
        />
        <StatCard
          label="Pending Review"
          value={stats.pendingReview}
          icon={Clock}
          color="#F59E0B"
          delay={0.1}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={CheckCircle2}
          color="#10B981"
          delay={0.15}
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="#EF4444"
          delay={0.2}
        />
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
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
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  {PRIORITIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  {CATEGORIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setStatus("");
                    setPriority("");
                    setCategory("");
                    setPage(1);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
                >
                  <X size={14} />
                  Clear All
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <DataTable
          columns={columns}
          data={changeRequests}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          onRowClick={(item) =>
            router.push(`/dashboard/planning/change-requests/${item.id}`)
          }
          emptyTitle="No change requests found"
          emptyDescription="Submit a change request to modify project scope, schedule, or budget."
          emptyAction={
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/planning/change-requests/new")
              }
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New Change Request
            </button>
          }
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
    </div>
  );
}
