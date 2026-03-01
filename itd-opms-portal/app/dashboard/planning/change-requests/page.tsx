"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  GitPullRequest,
  Plus,
  Filter,
  ArrowRight,
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

const WORKFLOW_ORDER: Record<string, number> = {
  submitted: 0,
  under_review: 1,
  approved: 2,
  rejected: 2,
  implemented: 3,
};

const WORKFLOW_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Approved / Rejected" },
  { key: "implemented", label: "Implemented" },
];

/* ------------------------------------------------------------------ */
/*  Workflow Indicator                                                  */
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
              className={`h-2 w-2 rounded-full transition-colors ${
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
                size={10}
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChangeRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id") ?? undefined;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useChangeRequests(
    page,
    20,
    projectId,
    status || undefined,
  );

  const changeRequests = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Columns ---- */

  const columns: Column<ChangeRequest>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[220px]",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.1)]">
            <GitPullRequest size={16} style={{ color: "#8B5CF6" }} />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {item.title}
          </p>
        </div>
      ),
    },
    {
      key: "projectId",
      header: "Project",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.projectId ? item.projectId.slice(0, 8) + "..." : "--"}
        </span>
      ),
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
        <span className="text-sm text-[var(--text-secondary)]">
          {item.requestedBy ? item.requestedBy.slice(0, 8) + "..." : "--"}
        </span>
      ),
    },
    {
      key: "justification",
      header: "Justification",
      className: "min-w-[200px]",
      render: (item) => (
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 max-w-[300px]">
          {item.justification || "--"}
        </p>
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
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
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
          data={changeRequests}
          keyExtractor={(item) => item.id}
          loading={isLoading}
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
