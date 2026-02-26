"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  GraduationCap,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { AnimatedButton } from "@/components/shared/animated-button";
import { showUndoToast } from "@/components/shared/undo-toast";
import { CohortFormModal } from "./cohort-form-modal";
import {
  useAdminCohorts,
  useCreateCohort,
  useUpdateCohort,
  useDeleteCohort,
} from "@/hooks/use-taxonomy";
import type { Cohort } from "@/types/taxonomy";

export function CohortsPanel() {
  const { data: cohorts, isLoading, isError } = useAdminCohorts();
  const createCohort = useCreateCohort();
  const updateCohort = useUpdateCohort();
  const deleteCohort = useDeleteCohort();

  const [search, setSearch] = useState("");
  const [modalState, setModalState] = useState<
    | { open: false }
    | { open: true; mode: "create"; cohort?: null }
    | { open: true; mode: "edit"; cohort: Cohort }
  >({ open: false });

  const filtered = (cohorts ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  function handleCreate(data: {
    name: string;
    programCycle?: string;
    startDate?: string;
    endDate?: string;
    capacity?: number;
  }) {
    createCohort.mutate(data, {
      onSuccess: () => {
        toast.success("Cohort created successfully.");
        setModalState({ open: false });
      },
      onError: () => toast.error("Failed to create cohort."),
    });
  }

  function handleUpdate(data: {
    name: string;
    programCycle?: string;
    startDate?: string;
    endDate?: string;
    capacity?: number;
  }) {
    if (!modalState.open || modalState.mode !== "edit") return;
    updateCohort.mutate(
      { id: modalState.cohort.id, ...data },
      {
        onSuccess: () => {
          toast.success("Cohort updated successfully.");
          setModalState({ open: false });
        },
        onError: () => toast.error("Failed to update cohort."),
      },
    );
  }

  function handleToggleActive(cohort: Cohort) {
    updateCohort.mutate(
      { id: cohort.id, isActive: !cohort.isActive },
      {
        onSuccess: () =>
          toast.success(
            `Cohort ${cohort.isActive ? "deactivated" : "activated"}.`,
          ),
        onError: () => toast.error("Failed to update cohort status."),
      },
    );
  }

  function handleDelete(cohort: Cohort) {
    deleteCohort.mutate(cohort.id, {
      onSuccess: () => {
        showUndoToast({
          message: `"${cohort.name}" deleted.`,
          undoAction: () => {
            createCohort.mutate({
              name: cohort.name,
              programCycle: cohort.programCycle ?? undefined,
              startDate: cohort.startDate ?? undefined,
              endDate: cohort.endDate ?? undefined,
              capacity: cohort.capacity,
            });
          },
        });
      },
      onError: () => toast.error("Failed to delete cohort."),
    });
  }

  function formatDateRange(start: string | null, end: string | null): string {
    if (!start && !end) return "Not set";
    if (start && end) return `${formatDate(start)} \u2013 ${formatDate(end)}`;
    if (start) return `From ${formatDate(start)}`;
    return `Until ${formatDate(end!)}`;
  }

  // ── Loading state ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--neutral-gray)]">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--neutral-gray)] gap-2">
        <AlertCircle size={28} />
        <p className="text-sm">Failed to load cohorts. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            type="text"
            placeholder="Search cohorts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors"
          />
        </div>
        <AnimatedButton
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setModalState({ open: true, mode: "create" })}
        >
          Add Cohort
        </AnimatedButton>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--neutral-gray)] gap-2">
          <GraduationCap size={32} strokeWidth={1.5} />
          <p className="text-sm">
            {search ? "No cohorts match your search." : "No cohorts yet. Create your first cohort."}
          </p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-gray)]">Name</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-gray)]">Program Cycle</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-gray)]">Date Range</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-gray)]">Capacity</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--neutral-gray)]">Status</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--neutral-gray)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cohort) => {
                const ratio =
                  cohort.capacity > 0
                    ? Math.min(cohort.enrolledCount / cohort.capacity, 1)
                    : 0;

                return (
                  <tr
                    key={cohort.id}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-1)]/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{cohort.name}</td>
                    <td className="px-4 py-3 text-[var(--neutral-gray)]">
                      {cohort.programCycle || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-[var(--neutral-gray)]">
                      {formatDateRange(cohort.startDate, cohort.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--success)] transition-all"
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--neutral-gray)] tabular-nums whitespace-nowrap">
                          {cohort.enrolledCount}/{cohort.capacity}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          cohort.isActive
                            ? "bg-[var(--success)]/10 text-[var(--success)]"
                            : "bg-[var(--surface-2)] text-[var(--neutral-gray)]",
                        )}
                      >
                        {cohort.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            setModalState({ open: true, mode: "edit", cohort })
                          }
                          className="p-1.5 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(cohort)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            cohort.isActive
                              ? "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                              : "text-[var(--success)] hover:bg-[var(--success)]/10",
                          )}
                          title={cohort.isActive ? "Deactivate" : "Activate"}
                        >
                          {cohort.isActive ? <X size={14} /> : <Check size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(cohort)}
                          className="p-1.5 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--error)]/10 hover:text-[var(--error)] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalState.open && (
        <CohortFormModal
          mode={modalState.mode}
          cohort={modalState.mode === "edit" ? modalState.cohort : null}
          isPending={createCohort.isPending || updateCohort.isPending}
          onSubmit={modalState.mode === "create" ? handleCreate : handleUpdate}
          onClose={() => setModalState({ open: false })}
        />
      )}
    </div>
  );
}
