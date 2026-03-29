"use client";

import { use, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Bug,
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  Plus,
  Loader2,
  Save,
  X,
  Edit,
  Trash2,
  FileText,
  Clock,
  User,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import { UserPicker } from "@/components/shared/pickers";
import {
  useProblem,
  useUpdateProblem,
  useDeleteProblem,
  useKnownErrors,
  useCreateKnownError,
  useUpdateKnownError,
  useDeleteKnownError,
  useLinkIncidentToProblem,
} from "@/hooks/use-itsm";
import type { ITSMProblem, KnownError } from "@/types";
import { useRouter } from "next/navigation";
import { PermissionGate } from "@/components/shared/permission-gate";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
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

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Known Error Card                                                   */
/* ------------------------------------------------------------------ */

function KnownErrorCard({
  ke,
  onDelete,
}: {
  ke: KnownError;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl border p-4 space-y-2"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] text-left flex-1"
        >
          <AlertTriangle size={14} style={{ color: "#F97316", flexShrink: 0 }} />
          {ke.title}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
            style={{
              backgroundColor: ke.status === "active" ? "rgba(249,115,22,0.1)" : "rgba(107,114,128,0.1)",
              color: ke.status === "active" ? "#F97316" : "#6B7280",
            }}
          >
            {ke.status}
          </span>
          <button
            onClick={() => onDelete(ke.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-[var(--surface-2)]"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {ke.description && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {ke.description}
              </p>
            )}
            {ke.workaround && (
              <div className="rounded-lg bg-[var(--surface-2)] p-3">
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Workaround</p>
                <p className="text-sm text-[var(--text-primary)]">{ke.workaround}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Known Error Form                                               */
/* ------------------------------------------------------------------ */

function AddKnownErrorForm({
  problemId,
  onClose,
}: {
  problemId: string;
  onClose: () => void;
}) {
  const createKnownError = useCreateKnownError();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workaround, setWorkaround] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createKnownError.mutate(
      {
        problemId,
        title: title.trim(),
        description: description.trim() || undefined,
        workaround: workaround.trim() || undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: "var(--primary)", backgroundColor: "var(--surface-0)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Add Known Error</p>
        <button type="button" onClick={onClose}>
          <X size={14} className="text-[var(--text-secondary)]" />
        </button>
      </div>
      <FormField label="Title" name="ke-title" value={title} onChange={setTitle} required />
      <FormField
        label="Description"
        name="ke-description"
        type="textarea"
        value={description}
        onChange={setDescription}
        rows={2}
      />
      <FormField
        label="Workaround"
        name="ke-workaround"
        type="textarea"
        value={workaround}
        onChange={setWorkaround}
        rows={2}
        placeholder="Steps to work around this known error"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createKnownError.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {createKnownError.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
      </div>
    </motion.form>
  );
}

/* ------------------------------------------------------------------ */
/*  Link Incident Form                                                 */
/* ------------------------------------------------------------------ */

function LinkIncidentForm({
  problemId,
  onClose,
}: {
  problemId: string;
  onClose: () => void;
}) {
  const linkMutation = useLinkIncidentToProblem();
  const [incidentId, setIncidentId] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!incidentId.trim()) return;
    linkMutation.mutate(
      { problemId, ticketId: incidentId.trim() },
      { onSuccess: onClose },
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: "var(--primary)", backgroundColor: "var(--surface-0)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Link Incident</p>
        <button type="button" onClick={onClose}>
          <X size={14} className="text-[var(--text-secondary)]" />
        </button>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-primary)]">
          Incident ID
        </label>
        <input
          type="text"
          value={incidentId}
          onChange={(e) => setIncidentId(e.target.value)}
          placeholder="Paste ticket / incident UUID"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={linkMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {linkMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <LinkIcon size={13} />}
          Link
        </button>
      </div>
    </motion.form>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Problem Form                                                  */
/* ------------------------------------------------------------------ */

function EditProblemForm({
  problem,
  onClose,
}: {
  problem: ITSMProblem;
  onClose: () => void;
}) {
  const updateMutation = useUpdateProblem(problem.id);
  const [title, setTitle] = useState(problem.title);
  const [description, setDescription] = useState(problem.description ?? "");
  const [status, setStatus] = useState(problem.status);
  const [rootCause, setRootCause] = useState(problem.rootCause ?? "");
  const [workaround, setWorkaround] = useState(problem.workaround ?? "");
  const [permanentFix, setPermanentFix] = useState(problem.permanentFix ?? "");
  const [ownerId, setOwnerId] = useState(problem.ownerId ?? "");
  const [ownerDisplay, setOwnerDisplay] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(
      {
        title: title || undefined,
        description: description || undefined,
        status: status || undefined,
        rootCause: rootCause || undefined,
        workaround: workaround || undefined,
        permanentFix: permanentFix || undefined,
        ownerId: ownerId || undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Edit Problem</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--surface-2)]">
            <X size={16} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        <FormField label="Title" name="title" value={title} onChange={setTitle} required />

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-primary)]">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={description}
          onChange={setDescription}
          rows={3}
        />

        <FormField
          label="Root Cause"
          name="root-cause"
          type="textarea"
          value={rootCause}
          onChange={setRootCause}
          rows={3}
          placeholder="What is the identified root cause?"
        />

        <FormField
          label="Workaround"
          name="workaround"
          type="textarea"
          value={workaround}
          onChange={setWorkaround}
          rows={2}
          placeholder="Temporary workaround for affected users"
        />

        <FormField
          label="Permanent Fix"
          name="permanent-fix"
          type="textarea"
          value={permanentFix}
          onChange={setPermanentFix}
          rows={2}
          placeholder="Planned permanent resolution"
        />

        <UserPicker
          label="Owner"
          value={ownerId || undefined}
          displayValue={ownerDisplay}
          onChange={(id, name) => {
            setOwnerId(id ?? "");
            setOwnerDisplay(name);
          }}
          placeholder="Search for owner"
        />

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {updateMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Changes
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: problem, isLoading } = useProblem(id);
  const { data: knownErrorsData, isLoading: keLoading } = useKnownErrors(id);
  const deleteProblem = useDeleteProblem();
  const deleteKnownError = useDeleteKnownError();

  const [showEdit, setShowEdit] = useState(false);
  const [showAddKE, setShowAddKE] = useState(false);
  const [showLinkIncident, setShowLinkIncident] = useState(false);

  const knownErrors: KnownError[] = knownErrorsData ?? [];

  const handleDeleteProblem = useCallback(() => {
    if (!window.confirm("Delete this problem record? This cannot be undone.")) return;
    deleteProblem.mutate(id, {
      onSuccess: () => router.push("/dashboard/itsm/problems"),
    });
  }, [deleteProblem, id, router]);

  const handleDeleteKE = useCallback(
    (keId: string) => {
      if (!window.confirm("Delete this known error?")) return;
      deleteKnownError.mutate(keId);
    },
    [deleteKnownError],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Bug size={32} className="text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-secondary)]">Problem not found.</p>
        <Link
          href="/dashboard/itsm/problems"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          Back to Problems
        </Link>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[problem.status] ?? { bg: "rgba(107,114,128,0.1)", text: "#6B7280" };

  return (
    <PermissionGate permission="itsm.view">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6 pb-8 max-w-4xl"
      >
        {/* Breadcrumb */}
        <Link
          href="/dashboard/itsm/problems"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Problems
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.08)" }}
            >
              <Bug size={22} style={{ color: "#EF4444" }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-[var(--text-tertiary)]">
                  {problem.problemNumber}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                  style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                >
                  {problem.status.replace(/_/g, " ")}
                </span>
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mt-1 leading-tight">
                {problem.title}
              </h1>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Created {formatDate(problem.createdAt)} &middot; Last updated {formatDate(problem.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <Edit size={14} />
              Edit
            </button>
            <button
              onClick={handleDeleteProblem}
              disabled={deleteProblem.isPending}
              className="flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
            >
              {deleteProblem.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column — main content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            {problem.description && (
              <div
                className="rounded-xl border p-5"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
              >
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <FileText size={15} style={{ color: "var(--primary)" }} />
                  Description
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {problem.description}
                </p>
              </div>
            )}

            {/* Root Cause Analysis */}
            <div
              className="rounded-xl border p-5 space-y-4"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
            >
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <AlertTriangle size={15} style={{ color: "#F59E0B" }} />
                Root Cause Analysis
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                    Root Cause
                  </p>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {problem.rootCause || (
                      <span className="italic text-[var(--text-tertiary)]">Not yet identified</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                    Workaround
                  </p>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {problem.workaround || (
                      <span className="italic text-[var(--text-tertiary)]">No workaround documented</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                    Permanent Fix
                  </p>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {problem.permanentFix || (
                      <span className="italic text-[var(--text-tertiary)]">No permanent fix planned yet</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Known Errors */}
            <div
              className="rounded-xl border p-5 space-y-4"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <AlertTriangle size={15} style={{ color: "#F97316" }} />
                  Known Errors
                  {knownErrors.length > 0 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
                      {knownErrors.length}
                    </span>
                  )}
                </h2>
                <PermissionGate permission="itsm.manage" fallback={null}>
                  <button
                    onClick={() => setShowAddKE((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </PermissionGate>
              </div>

              <AnimatePresence>
                {showAddKE && (
                  <AddKnownErrorForm problemId={id} onClose={() => setShowAddKE(false)} />
                )}
              </AnimatePresence>

              {keLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                  ))}
                </div>
              ) : knownErrors.length === 0 && !showAddKE ? (
                <p className="text-sm text-[var(--text-tertiary)] text-center py-6">
                  No known errors documented for this problem.
                </p>
              ) : (
                <div className="space-y-2">
                  {knownErrors.map((ke) => (
                    <KnownErrorCard key={ke.id} ke={ke} onDelete={handleDeleteKE} />
                  ))}
                </div>
              )}
            </div>

            {/* Linked Incidents */}
            <div
              className="rounded-xl border p-5 space-y-4"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <LinkIcon size={15} style={{ color: "#3B82F6" }} />
                  Linked Incidents
                  {problem.linkedIncidentIds?.length > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600">
                      {problem.linkedIncidentIds.length}
                    </span>
                  )}
                </h2>
                <PermissionGate permission="itsm.manage" fallback={null}>
                  <button
                    onClick={() => setShowLinkIncident((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <Plus size={12} />
                    Link
                  </button>
                </PermissionGate>
              </div>

              <AnimatePresence>
                {showLinkIncident && (
                  <LinkIncidentForm problemId={id} onClose={() => setShowLinkIncident(false)} />
                )}
              </AnimatePresence>

              {!problem.linkedIncidentIds?.length && !showLinkIncident ? (
                <p className="text-sm text-[var(--text-tertiary)] text-center py-6">
                  No incidents linked to this problem.
                </p>
              ) : (
                <div className="space-y-2">
                  {(problem.linkedIncidentIds ?? []).map((incidentId) => (
                    <Link
                      key={incidentId}
                      href={`/dashboard/itsm/tickets/${incidentId}`}
                      className="flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--surface-1)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <LinkIcon size={13} />
                      <span className="font-mono text-xs">{incidentId}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — metadata */}
          <div className="space-y-4">
            <div
              className="rounded-xl border p-5 space-y-4"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
            >
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Details</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Status</dt>
                  <dd className="mt-1">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                      style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                    >
                      {problem.status.replace(/_/g, " ")}
                    </span>
                  </dd>
                </div>
                {problem.ownerId && (
                  <div>
                    <dt className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Owner</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-2)]">
                        <User size={12} className="text-[var(--text-secondary)]" />
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)] font-mono">
                        {problem.ownerId.slice(0, 8)}...
                      </span>
                    </dd>
                  </div>
                )}
                {problem.linkedChangeId && (
                  <div>
                    <dt className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Linked Change</dt>
                    <dd className="mt-1">
                      <Link
                        href={`/dashboard/planning/change-requests/${problem.linkedChangeId}`}
                        className="text-sm font-medium text-[var(--primary)] hover:underline font-mono"
                      >
                        {problem.linkedChangeId.slice(0, 8)}...
                      </Link>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Created</dt>
                  <dd className="mt-1 text-sm text-[var(--text-secondary)]">
                    {formatDate(problem.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Updated</dt>
                  <dd className="mt-1 text-sm text-[var(--text-secondary)]">
                    {formatDate(problem.updatedAt)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Quick Status Change */}
            <PermissionGate permission="itsm.manage" fallback={null}>
              <div
                className="rounded-xl border p-5 space-y-3"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
              >
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Quick Status Update</h2>
                <div className="space-y-1.5">
                  {STATUS_OPTIONS.filter((s) => s.value !== problem.status).map((s) => {
                    const color = STATUS_COLORS[s.value] ?? { bg: "rgba(107,114,128,0.1)", text: "#6B7280" };
                    return (
                      <button
                        key={s.value}
                        onClick={() => {
                          /* useUpdateProblem directly */
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-1)]"
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: color.text }}
                        />
                        <span className="capitalize">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </PermissionGate>
          </div>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {showEdit && <EditProblemForm problem={problem} onClose={() => setShowEdit(false)} />}
        </AnimatePresence>
      </motion.div>
    </PermissionGate>
  );
}
