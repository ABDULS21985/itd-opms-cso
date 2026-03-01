"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import {
  useRACIMatrix,
  useAddRACIEntry,
  useUpdateRACIEntry,
  useDeleteRACIEntry,
} from "@/hooks/use-governance";
import { truncate } from "@/lib/utils";
import type { RACIEntry } from "@/types";

/* ------------------------------------------------------------------ */
/*  Entry Form State                                                    */
/* ------------------------------------------------------------------ */

interface EntryFormState {
  activity: string;
  responsibleIds: string;
  accountableId: string;
  consultedIds: string;
  informedIds: string;
  notes: string;
}

const emptyForm: EntryFormState = {
  activity: "",
  responsibleIds: "",
  accountableId: "",
  consultedIds: "",
  informedIds: "",
  notes: "",
};

/* ------------------------------------------------------------------ */
/*  Helper: parse comma-separated UUIDs                                 */
/* ------------------------------------------------------------------ */

function parseIds(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RACIMatrixDetailPage() {
  const params = useParams();
  const matrixId = params.id as string;

  const { data: matrix, isLoading } = useRACIMatrix(matrixId);
  const addEntry = useAddRACIEntry(matrixId);
  const updateEntry = useUpdateRACIEntry();
  const deleteEntry = useDeleteRACIEntry();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EntryFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const entries = matrix?.entries ?? [];

  /* ------------------------------------------------------------------ */
  /*  Validation                                                         */
  /* ------------------------------------------------------------------ */

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.activity.trim()) errs.activity = "Activity is required";
    if (!form.accountableId.trim())
      errs.accountableId = "Exactly one Accountable ID is required";
    else if (form.accountableId.trim().includes(","))
      errs.accountableId = "Only one Accountable ID is allowed";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Submit (add or edit)                                               */
  /* ------------------------------------------------------------------ */

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const body: Partial<RACIEntry> = {
      activity: form.activity.trim(),
      responsibleIds: parseIds(form.responsibleIds),
      accountableId: form.accountableId.trim(),
      consultedIds: parseIds(form.consultedIds),
      informedIds: parseIds(form.informedIds),
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      updateEntry.mutate(
        { entryId: editingId, body },
        {
          onSuccess: () => {
            resetForm();
          },
        },
      );
    } else {
      addEntry.mutate(body, {
        onSuccess: () => {
          resetForm();
        },
      });
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setFormErrors({});
  }

  function startEdit(entry: RACIEntry) {
    setForm({
      activity: entry.activity,
      responsibleIds: entry.responsibleIds.join(", "),
      accountableId: entry.accountableId,
      consultedIds: entry.consultedIds?.join(", ") ?? "",
      informedIds: entry.informedIds?.join(", ") ?? "",
      notes: entry.notes ?? "",
    });
    setEditingId(entry.id);
    setShowForm(true);
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteEntry.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  if (isLoading) return <PageSkeleton />;

  if (!matrix) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[var(--text-secondary)]">Matrix not found.</p>
        <Link
          href="/dashboard/governance/raci"
          className="mt-4 text-sm font-medium text-[var(--primary)]"
        >
          Back to RACI Matrices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/governance/raci"
              className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  {matrix.title}
                </h1>
                <StatusBadge status={matrix.status} />
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                <span className="capitalize">{matrix.entityType}</span>
                {matrix.entityId && (
                  <span>
                    {" "}
                    &middot; Entity: {truncate(matrix.entityId, 12)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Plus size={16} />
            Add Entry
          </button>
        </div>
        {matrix.description && (
          <p className="text-sm text-[var(--text-secondary)] mt-3 ml-10">
            {matrix.description}
          </p>
        )}
      </motion.div>

      {/* RACI Grid Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{
                  backgroundColor: "var(--surface-1)",
                  borderColor: "var(--border)",
                }}
              >
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Activity
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#3B82F6" }}
                  >
                    R
                  </span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#EF4444" }}
                  >
                    A
                  </span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#F59E0B" }}
                  >
                    C
                  </span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#6B7280" }}
                  >
                    I
                  </span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Notes
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-[var(--text-secondary)]"
                  >
                    <Users
                      size={32}
                      className="mx-auto mb-2 text-[var(--text-secondary)] opacity-40"
                    />
                    <p>No entries yet. Add your first RACI entry above.</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b last:border-b-0 transition-colors hover:bg-[var(--surface-1)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)] max-w-[200px]">
                      {entry.activity}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {entry.responsibleIds.map((id) => (
                          <span
                            key={id}
                            className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-xs font-mono"
                            style={{ color: "#3B82F6" }}
                            title={id}
                          >
                            {truncate(id, 8)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-block rounded bg-red-50 px-1.5 py-0.5 text-xs font-mono"
                        style={{ color: "#EF4444" }}
                        title={entry.accountableId}
                      >
                        {truncate(entry.accountableId, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {(entry.consultedIds ?? []).map((id) => (
                          <span
                            key={id}
                            className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs font-mono"
                            style={{ color: "#F59E0B" }}
                            title={id}
                          >
                            {truncate(id, 8)}
                          </span>
                        ))}
                        {(!entry.consultedIds ||
                          entry.consultedIds.length === 0) && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            --
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {(entry.informedIds ?? []).map((id) => (
                          <span
                            key={id}
                            className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono"
                            style={{ color: "#6B7280" }}
                            title={id}
                          >
                            {truncate(id, 8)}
                          </span>
                        ))}
                        {(!entry.informedIds ||
                          entry.informedIds.length === 0) && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            --
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[160px] truncate">
                      {entry.notes || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                          title="Edit entry"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(entry.id)}
                          className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--error-light)] hover:text-[var(--error)]"
                          title="Delete entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add / Edit Entry Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border p-6"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {editingId ? "Edit Entry" : "Add Entry"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Activity <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                value={form.activity}
                onChange={(e) =>
                  setForm({ ...form, activity: e.target.value })
                }
                placeholder="e.g., Initiate change request"
                className="w-full rounded-xl border px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: formErrors.activity
                    ? "var(--error)"
                    : "var(--border)",
                }}
              />
              {formErrors.activity && (
                <p className="text-xs text-[var(--error)] mt-1">
                  {formErrors.activity}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Responsible IDs (R)
                </label>
                <input
                  type="text"
                  value={form.responsibleIds}
                  onChange={(e) =>
                    setForm({ ...form, responsibleIds: e.target.value })
                  }
                  placeholder="Comma-separated UUIDs"
                  className="w-full rounded-xl border px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Who does the work
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Accountable ID (A){" "}
                  <span className="text-[var(--error)]">*</span>
                </label>
                <input
                  type="text"
                  value={form.accountableId}
                  onChange={(e) =>
                    setForm({ ...form, accountableId: e.target.value })
                  }
                  placeholder="Single UUID (exactly one)"
                  className="w-full rounded-xl border px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: formErrors.accountableId
                      ? "var(--error)"
                      : "var(--border)",
                  }}
                />
                {formErrors.accountableId && (
                  <p className="text-xs text-[var(--error)] mt-1">
                    {formErrors.accountableId}
                  </p>
                )}
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Who is ultimately answerable
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Consulted IDs (C)
                </label>
                <input
                  type="text"
                  value={form.consultedIds}
                  onChange={(e) =>
                    setForm({ ...form, consultedIds: e.target.value })
                  }
                  placeholder="Comma-separated UUIDs"
                  className="w-full rounded-xl border px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Who provides input
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Informed IDs (I)
                </label>
                <input
                  type="text"
                  value={form.informedIds}
                  onChange={(e) =>
                    setForm({ ...form, informedIds: e.target.value })
                  }
                  placeholder="Comma-separated UUIDs"
                  className="w-full rounded-xl border px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Who is kept updated
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes or context..."
                rows={3}
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-1)]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addEntry.isPending || updateEntry.isPending}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <Check size={16} />
                {editingId ? "Update Entry" : "Add Entry"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete RACI Entry"
        message="Are you sure you want to remove this entry from the RACI matrix?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleteEntry.isPending}
      />
    </div>
  );
}
