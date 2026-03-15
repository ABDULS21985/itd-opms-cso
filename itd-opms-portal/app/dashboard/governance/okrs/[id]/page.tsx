"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Target,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import {
  useOKR,
  useUpdateOKR,
  useCreateKeyResult,
  useUpdateKeyResult,
  useDeleteKeyResult,
} from "@/hooks/use-governance";
import type { KeyResult, OKR } from "@/types";

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                        */
/* ------------------------------------------------------------------ */

function ProgressBar({
  value,
  height = "h-2",
  className = "",
}: {
  value: number;
  height?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 70 ? "var(--success)" : pct >= 40 ? "#F59E0B" : "var(--error)";

  return (
    <div
      className={`${height} w-full rounded-full bg-[var(--surface-2)] overflow-hidden ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Level Badge                                                         */
/* ------------------------------------------------------------------ */

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    department: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
    division: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
    office: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
    unit: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  };
  const c = colors[level] || colors.unit;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {level}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OKRDetailPage() {
  const params = useParams();
  const okrId = params.id as string;

  const { data: okr, isLoading } = useOKR(okrId);
  const updateOKR = useUpdateOKR(okrId);
  const createKeyResult = useCreateKeyResult(okrId);
  const updateKeyResult = useUpdateKeyResult();
  const deleteKeyResult = useDeleteKeyResult();

  /* Key Result form */
  const [showKRForm, setShowKRForm] = useState(false);
  const [krForm, setKrForm] = useState({
    title: "",
    targetValue: "",
    unit: "",
  });

  /* Inline editing KR current_value */
  const [editingKRId, setEditingKRId] = useState<string | null>(null);
  const [editKRValue, setEditKRValue] = useState("");

  /* Delete KR */
  const [deleteKRId, setDeleteKRId] = useState<string | null>(null);

  /* Edit OKR inline */
  const [editingOKR, setEditingOKR] = useState(false);
  const [okrForm, setOkrForm] = useState({
    objective: "",
    period: "",
    status: "",
  });

  const keyResults = okr?.keyResults ?? [];
  const children = okr?.children ?? [];

  /* ------------------------------------------------------------------ */
  /*  KR handlers                                                        */
  /* ------------------------------------------------------------------ */

  function handleCreateKR(e: React.FormEvent) {
    e.preventDefault();
    if (!krForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    createKeyResult.mutate(
      {
        title: krForm.title.trim(),
        targetValue: krForm.targetValue
          ? parseFloat(krForm.targetValue)
          : undefined,
        unit: krForm.unit.trim() || undefined,
      },
      {
        onSuccess: () => {
          setKrForm({ title: "", targetValue: "", unit: "" });
          setShowKRForm(false);
        },
      },
    );
  }

  function handleUpdateKRValue(krId: string) {
    const val = parseFloat(editKRValue);
    if (isNaN(val)) {
      toast.error("Enter a valid number");
      return;
    }
    updateKeyResult.mutate(
      { id: krId, body: { currentValue: val } },
      {
        onSuccess: () => {
          setEditingKRId(null);
          setEditKRValue("");
        },
      },
    );
  }

  function handleDeleteKR() {
    if (!deleteKRId) return;
    deleteKeyResult.mutate(deleteKRId, {
      onSuccess: () => setDeleteKRId(null),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  OKR edit handlers                                                  */
  /* ------------------------------------------------------------------ */

  function startEditOKR() {
    if (!okr) return;
    setOkrForm({
      objective: okr.objective,
      period: okr.period,
      status: okr.status,
    });
    setEditingOKR(true);
  }

  function handleSaveOKR(e: React.FormEvent) {
    e.preventDefault();
    if (!okrForm.objective.trim()) {
      toast.error("Objective is required");
      return;
    }
    updateOKR.mutate(
      {
        objective: okrForm.objective.trim(),
        period: okrForm.period.trim(),
        status: okrForm.status,
      },
      {
        onSuccess: () => setEditingOKR(false),
      },
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  if (isLoading) return <PageSkeleton />;

  if (!okr) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[var(--text-secondary)]">OKR not found.</p>
        <Link
          href="/dashboard/governance/okrs"
          className="mt-4 text-sm font-medium text-[var(--primary)]"
        >
          Back to OKRs
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
              href="/dashboard/governance/okrs"
              className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              {editingOKR ? (
                <form onSubmit={handleSaveOKR} className="space-y-3">
                  <textarea
                    value={okrForm.objective}
                    onChange={(e) =>
                      setOkrForm({ ...okrForm, objective: e.target.value })
                    }
                    rows={2}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    style={{
                      backgroundColor: "var(--surface-0)",
                      borderColor: "var(--border)",
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={okrForm.period}
                      onChange={(e) =>
                        setOkrForm({ ...okrForm, period: e.target.value })
                      }
                      placeholder="Period"
                      className="rounded-xl border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      style={{
                        backgroundColor: "var(--surface-0)",
                        borderColor: "var(--border)",
                      }}
                    />
                    <select
                      value={okrForm.status}
                      onChange={(e) =>
                        setOkrForm({ ...okrForm, status: e.target.value })
                      }
                      className="rounded-xl border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                      style={{
                        backgroundColor: "var(--surface-0)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      type="submit"
                      disabled={updateOKR.isPending}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingOKR(false)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                      {okr.objective}
                    </h1>
                    <StatusBadge status={okr.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-secondary)]">
                    <LevelBadge level={okr.level} />
                    <span>{okr.period}</span>
                    <span className="text-xs font-mono">
                      Owner: {okr.ownerId.slice(0, 8)}...
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          {!editingOKR && (
            <button
              type="button"
              onClick={startEditOKR}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 hover:bg-[var(--surface-1)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
        </div>
      </motion.div>

      {/* Progress Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-xl border p-5"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Overall Progress
          </h2>
          <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {okr.progressPct ?? 0}%
          </span>
        </div>
        <ProgressBar value={okr.progressPct ?? 0} height="h-3" />
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          Scoring method: {okr.scoringMethod}
        </p>
      </motion.div>

      {/* Alignment Section */}
      {okr.parentId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="rounded-xl border p-4"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
          }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Aligned to Parent OKR
          </h2>
          <Link
            href={`/dashboard/governance/okrs/${okr.parentId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            <Target size={14} />
            View Parent OKR
            <ChevronRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* Key Results Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl border p-5"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <BarChart3 size={16} />
            Key Results
          </h2>
          <button
            type="button"
            onClick={() => setShowKRForm(!showKRForm)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Plus size={14} />
            Add Key Result
          </button>
        </div>

        {/* Key Results list */}
        {keyResults.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
            No key results defined yet. Add your first key result above.
          </p>
        ) : (
          <div className="space-y-3">
            {keyResults.map((kr: KeyResult) => {
              const progress =
                kr.targetValue && kr.targetValue > 0
                  ? Math.round(((kr.currentValue ?? 0) / kr.targetValue) * 100)
                  : 0;
              const isEditing = editingKRId === kr.id;

              return (
                <div
                  key={kr.id}
                  className="rounded-lg border p-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <span className="font-medium text-sm text-[var(--text-primary)]">
                        {kr.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={kr.status} />
                        {kr.unit && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            Unit: {kr.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKRId(kr.id);
                          setEditKRValue(String(kr.currentValue ?? 0));
                        }}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                        title="Update value"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteKRId(kr.id)}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--error-light)] hover:text-[var(--error)]"
                        title="Delete key result"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar and values */}
                  <div className="flex items-center gap-3 mt-2">
                    <ProgressBar
                      value={progress}
                      className="flex-1"
                    />
                    <span className="text-xs tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                      {kr.currentValue ?? 0} / {kr.targetValue ?? "?"}
                      {kr.unit ? ` ${kr.unit}` : ""}
                    </span>
                  </div>

                  {/* Inline value editor */}
                  {isEditing && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                      <label className="text-xs text-[var(--text-secondary)]">
                        Current value:
                      </label>
                      <input
                        type="number"
                        value={editKRValue}
                        onChange={(e) => setEditKRValue(e.target.value)}
                        className="w-24 rounded-lg border px-2.5 h-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                        style={{
                          backgroundColor: "var(--surface-0)",
                          borderColor: "var(--border)",
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateKRValue(kr.id)}
                        disabled={updateKeyResult.isPending}
                        className="rounded-lg p-1.5 text-[var(--success)] hover:bg-[var(--success-light)]"
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKRId(null);
                          setEditKRValue("");
                        }}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Key Result form */}
        {showKRForm && (
          <form
            onSubmit={handleCreateKR}
            className="mt-4 rounded-lg border p-4 space-y-3"
            style={{
              backgroundColor: "var(--surface-1)",
              borderColor: "var(--border)",
            }}
          >
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Title *
              </label>
              <input
                type="text"
                value={krForm.title}
                onChange={(e) =>
                  setKrForm({ ...krForm, title: e.target.value })
                }
                placeholder="e.g., Reduce average incident response time to < 30 min"
                className="w-full rounded-lg border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Target Value
                </label>
                <input
                  type="number"
                  value={krForm.targetValue}
                  onChange={(e) =>
                    setKrForm({ ...krForm, targetValue: e.target.value })
                  }
                  placeholder="e.g., 100"
                  className="w-full rounded-lg border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={krForm.unit}
                  onChange={(e) =>
                    setKrForm({ ...krForm, unit: e.target.value })
                  }
                  placeholder="e.g., %, minutes, count"
                  className="w-full rounded-lg border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowKRForm(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createKeyResult.isPending}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {createKeyResult.isPending ? "Adding..." : "Add Key Result"}
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* Child OKRs Section */}
      {children.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-xl border p-5"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
            <Target size={16} />
            Child OKRs
          </h2>
          <div className="space-y-3">
            {children.map((child: OKR) => (
              <Link
                key={child.id}
                href={`/dashboard/governance/okrs/${child.id}`}
                className="block rounded-lg border p-3 transition-all duration-200 hover:shadow-sm hover:bg-[var(--surface-1)]"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LevelBadge level={child.level} />
                    <span className="font-medium text-sm text-[var(--text-primary)]">
                      {child.objective}
                    </span>
                  </div>
                  <StatusBadge status={child.status} />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <ProgressBar
                    value={child.progressPct ?? 0}
                    className="flex-1"
                  />
                  <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                    {child.progressPct ?? 0}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Delete KR Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteKRId}
        onClose={() => setDeleteKRId(null)}
        onConfirm={handleDeleteKR}
        title="Delete Key Result"
        message="Are you sure you want to delete this key result? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteKeyResult.isPending}
      />
    </div>
  );
}
