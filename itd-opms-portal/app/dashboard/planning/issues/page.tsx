"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  Plus,
  Filter,
  ArrowUpCircle,
  Calendar,
  User,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useIssues } from "@/hooks/use-planning";
import type { ProjectIssue } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SEVERITIES = [
  { value: "", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  high: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" },
  medium: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  low: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
};

/* ------------------------------------------------------------------ */
/*  Severity Badge                                                     */
/* ------------------------------------------------------------------ */

function SeverityBadge({ severity }: { severity: string }) {
  const color = SEVERITY_COLORS[severity.toLowerCase()] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {severity}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function IssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id") ?? undefined;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useIssues(
    page,
    20,
    projectId,
    status || undefined,
    severity || undefined,
  );

  const issues = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Columns ---- */

  const columns: Column<ProjectIssue>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[220px]",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(249,115,22,0.1)]">
            <AlertOctagon size={16} style={{ color: "#F97316" }} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-[var(--neutral-gray)] line-clamp-1 max-w-[250px]">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
          {item.category ?? "--"}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      render: (item) => <SeverityBadge severity={item.severity} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "assigneeId",
      header: "Assignee",
      render: (item) => (
        <span className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
          <User size={14} />
          {item.assigneeId ? item.assigneeId.slice(0, 8) + "..." : "--"}
        </span>
      ),
    },
    {
      key: "escalationLevel",
      header: "Escalation",
      align: "center",
      render: (item) => (
        <span className="flex items-center justify-center gap-1 text-sm text-[var(--text-secondary)]">
          <ArrowUpCircle
            size={14}
            className={
              item.escalationLevel > 0
                ? "text-[#F97316]"
                : "text-[var(--neutral-gray)]"
            }
          />
          L{item.escalationLevel}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (item) => (
        <span className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
          <Calendar size={14} />
          {item.dueDate
            ? new Date(item.dueDate).toLocaleDateString()
            : "--"}
        </span>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(249,115,22,0.1)]">
            <AlertOctagon size={20} style={{ color: "#F97316" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Issues
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Track, manage, and resolve project issues
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() =>
              router.push("/dashboard/planning/issues/new")
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Issue
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
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={issues}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No issues found"
          emptyDescription="No issues have been reported yet."
          emptyAction={
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/planning/issues/new")
              }
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New Issue
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
