"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useRACIMatrices, useDeleteRACIMatrix } from "@/hooks/use-governance";
import { formatDate } from "@/lib/utils";
import type { RACIMatrix } from "@/types";

export default function RACIMatrixListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useRACIMatrices(page, 20);
  const deleteMutation = useDeleteRACIMatrix();

  const matrices = data?.data ?? [];
  const meta = data?.meta;

  const columns: Column<RACIMatrix>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-[var(--text-primary)]">
          {item.title}
        </span>
      ),
    },
    {
      key: "entityType",
      header: "Entity Type",
      render: (item) => (
        <span className="capitalize text-[var(--text-secondary)]">
          {item.entityType}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (item) => (
        <span className="text-[var(--text-secondary)]">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/governance/raci/${item.id}`);
            }}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(item.id);
            }}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--error-light)] hover:text-[var(--error)]"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  function handleDelete() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/governance"
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              RACI Matrices
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Manage responsibility assignment matrices for processes, projects,
              and services.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/governance/raci/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Plus size={16} />
          New Matrix
        </Link>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={matrices}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No RACI matrices found"
          emptyDescription="Create your first RACI matrix to define responsibility assignments."
          emptyAction={
            <Link
              href="/dashboard/governance/raci/new"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Plus size={16} />
              New Matrix
            </Link>
          }
          onRowClick={(item) =>
            router.push(`/dashboard/governance/raci/${item.id}`)
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

      {/* Delete Confirm Dialog */}
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
