"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Plus, Filter, Shield } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
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

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "retired", label: "Retired" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  security: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  operational: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  compliance: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  hr: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PoliciesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = usePolicies(
    page,
    20,
    category || undefined,
    status || undefined,
  );

  const policies = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Columns ---- */

  const columns: Column<Policy>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[240px]",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
            <FileText size={16} className="text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-[var(--neutral-gray)] line-clamp-1 max-w-[300px]">
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
      sortable: true,
      render: (item) => {
        const color = CATEGORY_COLORS[item.category] ?? {
          bg: "var(--surface-2)",
          text: "var(--neutral-gray)",
        };
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {item.category}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "version",
      header: "Version",
      align: "center",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)] tabular-nums">
          v{item.version}
        </span>
      ),
    },
    {
      key: "effectiveDate",
      header: "Effective Date",
      sortable: true,
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.effectiveDate
            ? new Date(item.effectiveDate).toLocaleDateString()
            : "--"}
        </span>
      ),
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.ownerId ? item.ownerId.slice(0, 8) + "..." : "--"}
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
            <Shield size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Policies
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Manage organizational policies, approvals, and attestations
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
              router.push("/dashboard/governance/policies/new")
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Policy
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
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
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
          data={policies}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No policies found"
          emptyDescription="Get started by creating your first policy."
          emptyAction={
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/governance/policies/new")
              }
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New Policy
            </button>
          }
          onRowClick={(item) =>
            router.push(`/dashboard/governance/policies/${item.id}`)
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
