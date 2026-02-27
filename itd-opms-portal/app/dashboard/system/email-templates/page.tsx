"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useEmailTemplates,
  useDeleteTemplate,
} from "@/hooks/use-system";
import type { EmailTemplate } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "onboarding", label: "Onboarding" },
  { value: "password-reset", label: "Password Reset" },
  { value: "notifications", label: "Notifications" },
  { value: "alerts", label: "Alerts" },
  { value: "reports", label: "Reports" },
  { value: "system", label: "System" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  onboarding: { bg: "rgba(16, 185, 129, 0.12)", text: "#059669" },
  "password-reset": { bg: "rgba(239, 68, 68, 0.12)", text: "#DC2626" },
  notifications: { bg: "rgba(59, 130, 246, 0.12)", text: "#2563EB" },
  alerts: { bg: "rgba(245, 158, 11, 0.12)", text: "#D97706" },
  reports: { bg: "rgba(139, 92, 246, 0.12)", text: "#7C3AED" },
  system: { bg: "rgba(107, 114, 128, 0.12)", text: "#6B7280" },
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EmailTemplatesPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useEmailTemplates(page, 20, categoryFilter || undefined);
  const deleteMutation = useDeleteTemplate();

  const allTemplates = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if ("data" in data && Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  const meta = useMemo(() => {
    if (!data || Array.isArray(data)) return undefined;
    return "meta" in data ? data.meta : undefined;
  }, [data]);

  // Client-side search filter on top of server category filter
  const templates = useMemo(() => {
    if (!debouncedSearch) return allTemplates;
    const q = debouncedSearch.toLowerCase();
    return allTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q),
    );
  }, [allTemplates, debouncedSearch]);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  }

  const columns: Column<EmailTemplate>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      className: "min-w-[200px]",
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
          {item.tenantId ? (
            <span className="text-[10px] text-[var(--warning)]">Tenant Override</span>
          ) : (
            <span className="text-[10px] text-[var(--neutral-gray)]">Global</span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) => {
        const color = getCategoryColor(item.category);
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {item.category.replace(/-/g, " ")}
          </span>
        );
      },
    },
    {
      key: "subject",
      header: "Subject",
      className: "min-w-[260px]",
      render: (item) => (
        <span className="text-sm text-[var(--text-primary)] truncate block max-w-xs">{item.subject}</span>
      ),
    },
    {
      key: "isActive",
      header: "Active",
      align: "center",
      render: (item) => (
        <StatusBadge status={item.isActive ? "active" : "inactive"} />
      ),
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (item) => (
        <span className="text-xs text-[var(--neutral-gray)] tabular-nums">{formatDate(item.updatedAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/system/email-templates/${item.id}`);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(item);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium text-[var(--error)] transition-colors hover:bg-red-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
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
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <Mail size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Email Templates
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              {meta ? `${meta.totalItems} template${meta.totalItems !== 1 ? "s" : ""}` : "Manage notification email templates"}
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
            onClick={() => router.push("/dashboard/system/email-templates/new")}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Create Template
          </button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-3"
      >
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search templates by name or subject..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>

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
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={templates}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No email templates found"
          emptyDescription="Create your first email template to get started."
          onRowClick={(item) => router.push(`/dashboard/system/email-templates/${item.id}`)}
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

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Email Template"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? "this template"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
