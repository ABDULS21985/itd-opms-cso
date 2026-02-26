"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { Cohort } from "@/types/taxonomy";

interface CohortFormModalProps {
  mode: "create" | "edit";
  cohort?: Cohort | null;
  isPending: boolean;
  onSubmit: (data: {
    name: string;
    programCycle?: string;
    startDate?: string;
    endDate?: string;
    capacity?: number;
  }) => void;
  onClose: () => void;
}

export function CohortFormModal({
  mode,
  cohort,
  isPending,
  onSubmit,
  onClose,
}: CohortFormModalProps) {
  const [name, setName] = useState(cohort?.name ?? "");
  const [programCycle, setProgramCycle] = useState(cohort?.programCycle ?? "");
  const [startDate, setStartDate] = useState(cohort?.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(cohort?.endDate?.slice(0, 10) ?? "");
  const [capacity, setCapacity] = useState(cohort?.capacity?.toString() ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setError("End date must be after start date.");
      return;
    }

    onSubmit({
      name: trimmedName,
      ...(programCycle.trim() ? { programCycle: programCycle.trim() } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(capacity ? { capacity: Number(capacity) } : {}),
    });
  }

  const labelClass = "block text-sm font-medium text-[var(--text-primary)] mb-1";
  const inputClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--surface-0)] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {mode === "create" ? "Create Cohort" : "Edit Cohort"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-[var(--error)] bg-[var(--error)]/8 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label className={labelClass}>Name *</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cohort 5" />
          </div>

          <div>
            <label className={labelClass}>Program Cycle</label>
            <input className={inputClass} value={programCycle} onChange={(e) => setProgramCycle(e.target.value)} placeholder="e.g. 2025-Q2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Date</label>
              <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Capacity</label>
            <input type="number" min={0} className={inputClass} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 30" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {mode === "create" ? "Create" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
