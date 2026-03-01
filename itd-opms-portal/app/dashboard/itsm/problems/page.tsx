"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  Plus,
  Filter,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  FileText,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import {
  useProblems,
  useKnownErrors,
  useCreateProblem,
  useCreateKnownError,
} from "@/hooks/use-itsm";
import type { ITSMProblem, KnownError } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROBLEM_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "logged", label: "Logged" },
  { value: "investigating", label: "Investigating" },
  { value: "root_cause_identified", label: "Root Cause Identified" },
  { value: "known_error", label: "Known Error" },
  { value: "resolved", label: "Resolved" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  logged: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  investigating: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  root_cause_identified: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  known_error: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" },
  resolved: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
};

/* ------------------------------------------------------------------ */
/*  Known Error List                                                   */
/* ------------------------------------------------------------------ */

function KnownErrorList({ problemId }: { problemId: string }) {
  const { data: knownErrors, isLoading } = useKnownErrors(problemId);
  const createKnownError = useCreateKnownError();

  const [showForm, setShowForm] = useState(false);
  const [keTitle, setKeTitle] = useState("");
  const [keDescription, setKeDescription] = useState("");
  const [keWorkaround, setKeWorkaround] = useState("");

  const errors: KnownError[] = knownErrors ?? [];

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keTitle.trim()) return;
    createKnownError.mutate(
      {
        problemId,
        title: keTitle.trim(),
        description: keDescription.trim() || undefined,
        workaround: keWorkaround.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setKeTitle("");
          setKeDescription("");
          setKeWorkaround("");
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 size={14} className="animate-spin text-[var(--neutral-gray)]" />
        <span className="text-xs text-[var(--neutral-gray)]">Loading known errors...</span>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
          Known Errors ({errors.length})
        </h4>
        <button
          type="button"
          onClick={() => setShowForm((f) => !f)}
          className="flex items-center gap-1 text-[10px] font-medium text-[var(--primary)] hover:underline"
        >
          <Plus size={10} />
          Add Known Error
        </button>
      </div>

      {/* Known error form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleCreate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3"
          >
            <FormField
              label="Title"
              name="keTitle"
              value={keTitle}
              onChange={setKeTitle}
              placeholder="Known error title"
              required
            />
            <FormField
              label="Description"
              name="keDescription"
              type="textarea"
              value={keDescription}
              onChange={setKeDescription}
              placeholder="Describe the known error"
              rows={2}
            />
            <FormField
              label="Workaround"
              name="keWorkaround"
              type="textarea"
              value={keWorkaround}
              onChange={setKeWorkaround}
              placeholder="Temporary workaround for users"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={createKnownError.isPending || !keTitle.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {createKnownError.isPending && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Known error list */}
      {errors.length === 0 ? (
        <p className="text-xs text-[var(--neutral-gray)] italic py-1">
          No known errors recorded yet
        </p>
      ) : (
        <div className="space-y-2">
          {errors.map((ke) => (
            <div
              key={ke.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {ke.title}
                </p>
                <StatusBadge status={ke.status} />
              </div>
              {ke.description && (
                <p className="text-[11px] text-[var(--text-secondary)] mb-1">
                  {ke.description}
                </p>
              )}
              {ke.workaround && (
                <div className="mt-1 rounded-md p-2 text-[11px]" style={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}>
                  <span className="font-medium" style={{ color: "#3B82F6" }}>
                    Workaround:{" "}
                  </span>
                  <span className="text-[var(--text-secondary)]">{ke.workaround}</span>
                </div>
              )}
              {ke.kbArticleId && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--neutral-gray)]">
                  <FileText size={10} />
                  KB Article: {ke.kbArticleId.slice(0, 8)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Problem Row                                                        */
/* ------------------------------------------------------------------ */

function ProblemRow({
  problem,
  index,
}: {
  problem: ITSMProblem;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = STATUS_COLORS[problem.status] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
    >
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-[var(--surface-1)]"
      >
        <div className="shrink-0">
          {expanded ? (
            <ChevronDown size={16} className="text-[var(--neutral-gray)]" />
          ) : (
            <ChevronRight size={16} className="text-[var(--neutral-gray)]" />
          )}
        </div>

        {/* Problem number */}
        <span className="text-xs font-mono text-[var(--neutral-gray)] w-24 shrink-0">
          {problem.problemNumber}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-[var(--text-primary)] line-clamp-1">
          {problem.title}
        </span>

        {/* Status */}
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize shrink-0"
          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
        >
          {problem.status.replace(/_/g, " ")}
        </span>

        {/* Linked incidents count */}
        <div className="flex items-center gap-1 text-xs text-[var(--neutral-gray)] w-20 shrink-0 justify-end">
          <LinkIcon size={12} />
          {problem.linkedIncidentIds.length} incident
          {problem.linkedIncidentIds.length !== 1 ? "s" : ""}
        </div>

        {/* Owner */}
        <span className="text-xs text-[var(--neutral-gray)] w-20 shrink-0 text-right">
          {problem.ownerId ? problem.ownerId.slice(0, 8) + "..." : "Unassigned"}
        </span>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[var(--border)] bg-[var(--surface-1)] px-4 py-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Root Cause */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1">
                  Root Cause
                </p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {problem.rootCause || "Not yet identified"}
                </p>
              </div>

              {/* Workaround */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1">
                  Workaround
                </p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {problem.workaround || "None documented"}
                </p>
              </div>

              {/* Permanent Fix */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1">
                  Permanent Fix
                </p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {problem.permanentFix || "Not yet determined"}
                </p>
              </div>
            </div>

            {/* Description */}
            {problem.description && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1">
                  Description
                </p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {problem.description}
                </p>
              </div>
            )}

            {/* Linked Change */}
            {problem.linkedChangeId && (
              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--neutral-gray)]">
                <LinkIcon size={12} />
                Linked Change: {problem.linkedChangeId.slice(0, 8)}...
              </div>
            )}

            {/* Metadata */}
            <div className="mt-3 flex items-center gap-4 text-[10px] text-[var(--neutral-gray)]">
              <span>Created: {new Date(problem.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(problem.updatedAt).toLocaleDateString()}</span>
            </div>

            {/* Known Errors */}
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <KnownErrorList problemId={problem.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProblemsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data, isLoading } = useProblems(page, 20, status || undefined);
  const createProblem = useCreateProblem();

  const problems = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Create problem form state ---- */
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  function handleCreateProblem(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!newTitle.trim()) errs.title = "Title is required";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    createProblem.mutate(
      {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        ownerId: newOwnerId.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewTitle("");
          setNewDescription("");
          setNewOwnerId("");
          setFormErrors({});
        },
      },
    );
  }

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
            <Bug size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Problem Management
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Track root causes, known errors, and permanent fixes
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
            onClick={() => setShowCreateForm((f) => !f)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Problem
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <AnimatePresence>
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
                {PROBLEM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Problem Form (inline) */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.form
            onSubmit={handleCreateProblem}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Create Problem Record
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)]"
              >
                <X size={16} />
              </button>
            </div>

            <FormField
              label="Title"
              name="newTitle"
              value={newTitle}
              onChange={setNewTitle}
              placeholder="Brief description of the problem"
              required
              error={formErrors.title}
            />

            <FormField
              label="Description"
              name="newDescription"
              type="textarea"
              value={newDescription}
              onChange={setNewDescription}
              placeholder="Detailed description of the problem, symptoms, and affected services"
              rows={3}
            />

            <FormField
              label="Owner ID"
              name="newOwnerId"
              value={newOwnerId}
              onChange={setNewOwnerId}
              placeholder="User UUID of the problem owner (optional)"
            />

            <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProblem.isPending}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {createProblem.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Create Problem
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
            <p className="text-sm text-[var(--neutral-gray)]">Loading problems...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && problems.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center justify-center py-24 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] mb-4">
            <Bug size={24} className="text-[var(--neutral-gray)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No problems found
          </p>
          <p className="text-sm text-[var(--neutral-gray)] mt-1 mb-4">
            Create a problem record to track root causes and known errors.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Problem
          </button>
        </motion.div>
      )}

      {/* Problem List */}
      {!isLoading && problems.length > 0 && (
        <div className="space-y-3">
          {problems.map((problem: ITSMProblem, index: number) => (
            <ProblemRow key={problem.id} problem={problem} index={index} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-[var(--neutral-gray)]">
            {meta.totalItems} problem{meta.totalItems !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[var(--neutral-gray)] tabular-nums">
              {page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
