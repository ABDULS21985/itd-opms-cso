"use client";

import { use, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  FileSearch,
  FolderArchive,
  Calendar,
  User,
  CheckCircle,
  CheckCircle2,
  Plus,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Target,
  Clock3,
  ExternalLink,
  ArrowRightCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useGRCAudit,
  useUpdateGRCAudit,
  useDeleteGRCAudit,
  useAuditFindings,
  useCreateAuditFinding,
  useUpdateAuditFinding,
  useCloseAuditFinding,
  useEvidenceCollections,
  useCreateEvidenceCollection,
  useUpdateEvidenceCollection,
  useApproveEvidenceCollection,
} from "@/hooks/use-grc";
import {
  AUDIT_STATUS,
  AUDIT_TYPE,
  FINDING_STATUS,
  FINDING_SEVERITY,
  EVIDENCE_STATUS,
} from "@/types/grc";
import type {
  GRCAudit,
  AuditFinding,
  EvidenceCollection,
  CreateAuditFindingRequest,
  UpdateAuditFindingRequest,
  CreateEvidenceCollectionRequest,
  UpdateEvidenceCollectionRequest,
  UpdateGRCAuditRequest,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getReadinessColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

function getSeverityColor(severity: string): { bg: string; text: string } {
  switch (severity) {
    case "critical":
      return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" };
    case "high":
      return { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" };
    case "medium":
      return { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" };
    case "low":
      return { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" };
    default:
      return { bg: "var(--surface-2)", text: "var(--text-secondary)" };
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case "internal":
      return { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", icon: Shield };
    case "external":
      return { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6", icon: ShieldCheck };
    case "regulatory":
      return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", icon: ShieldAlert };
    default:
      return { bg: "var(--surface-2)", text: "var(--text-secondary)", icon: Shield };
  }
}

/** Audit status lifecycle transitions */
const AUDIT_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  planned: [{ label: "Start Preparation", next: "preparing" }],
  preparing: [{ label: "Begin Audit", next: "in_progress" }],
  in_progress: [{ label: "Move to Findings Review", next: "findings_review" }],
  findings_review: [{ label: "Mark Complete", next: "completed" }],
  completed: [],
};

/** Finding status lifecycle transitions */
const FINDING_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  open: [
    { label: "Plan Remediation", next: "remediation_planned" },
    { label: "Accept Risk", next: "accepted" },
  ],
  remediation_planned: [
    { label: "Start Remediation", next: "in_remediation" },
  ],
  in_remediation: [
    { label: "Close Finding", next: "closed" },
  ],
  closed: [],
  accepted: [],
};

/** Evidence status lifecycle transitions */
const EVIDENCE_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  pending: [{ label: "Start Collecting", next: "collecting" }],
  collecting: [{ label: "Submit for Review", next: "submitted" }],
  submitted: [{ label: "Begin Review", next: "review" }],
  review: [], // approve is separate action
  approved: [],
};

function formatStatusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Tab Button                                                         */
/* ------------------------------------------------------------------ */

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "text-[var(--primary)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className="ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs tabular-nums"
          style={{
            backgroundColor: active
              ? "rgba(var(--primary-rgb, 59, 130, 246), 0.1)"
              : "var(--surface-2)",
            color: active ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          {count}
        </span>
      )}
      {active && (
        <motion.div
          layoutId="audit-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full"
        />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal Shell                                                        */
/* ------------------------------------------------------------------ */

function ModalShell({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-2xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--surface-2)] transition-colors">
              <X size={18} className="text-[var(--text-secondary)]" />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline input classes                                               */
/* ------------------------------------------------------------------ */

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

/* ------------------------------------------------------------------ */
/*  Edit Audit Modal                                                   */
/* ------------------------------------------------------------------ */

function EditAuditModal({
  open,
  onClose,
  audit,
}: {
  open: boolean;
  onClose: () => void;
  audit: GRCAudit;
}) {
  const updateAudit = useUpdateGRCAudit(audit.id);
  const [form, setForm] = useState({
    title: audit.title,
    scope: audit.scope ?? "",
    auditor: audit.auditor ?? "",
    auditBody: audit.auditBody ?? "",
    scheduledStart: audit.scheduledStart?.split("T")[0] ?? "",
    scheduledEnd: audit.scheduledEnd?.split("T")[0] ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAudit.mutate(
      {
        title: form.title,
        scope: form.scope || undefined,
        auditor: form.auditor || undefined,
        auditBody: form.auditBody || undefined,
        scheduledStart: form.scheduledStart
          ? new Date(form.scheduledStart + "T00:00:00Z").toISOString()
          : undefined,
        scheduledEnd: form.scheduledEnd
          ? new Date(form.scheduledEnd + "T00:00:00Z").toISOString()
          : undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Edit Audit">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Title</label>
          <input type="text" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Scope</label>
          <textarea rows={3} value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} className={`${inputCls} resize-none`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Auditor</label>
            <input type="text" value={form.auditor} onChange={(e) => setForm((f) => ({ ...f, auditor: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Audit Body</label>
            <input type="text" value={form.auditBody} onChange={(e) => setForm((f) => ({ ...f, auditBody: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Start Date</label>
            <input type="date" value={form.scheduledStart} onChange={(e) => setForm((f) => ({ ...f, scheduledStart: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">End Date</label>
            <input type="date" value={form.scheduledEnd} onChange={(e) => setForm((f) => ({ ...f, scheduledEnd: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={updateAudit.isPending} className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {updateAudit.isPending && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Finding Modal                                               */
/* ------------------------------------------------------------------ */

function CreateFindingModal({
  open,
  onClose,
  auditId,
}: {
  open: boolean;
  onClose: () => void;
  auditId: string;
}) {
  const createFinding = useCreateAuditFinding(auditId);
  const [form, setForm] = useState<CreateAuditFindingRequest>({
    title: "",
    description: "",
    severity: "medium",
    remediationPlan: "",
    dueDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFinding.mutate(
      {
        ...form,
        dueDate: form.dueDate
          ? new Date(form.dueDate + "T00:00:00Z").toISOString()
          : undefined,
      },
      {
        onSuccess: () => {
          setForm({ title: "", description: "", severity: "medium", remediationPlan: "", dueDate: "" });
          onClose();
        },
      },
    );
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Add Finding">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Title <span className="text-[var(--error)]">*</span>
          </label>
          <input type="text" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Missing access control logs" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Description</label>
          <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Detailed description of the finding..." className={`${inputCls} resize-none`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Severity <span className="text-[var(--error)]">*</span>
            </label>
            <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Due Date</label>
            <input type="date" value={form.dueDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Remediation Plan</label>
          <textarea rows={2} value={form.remediationPlan ?? ""} onChange={(e) => setForm((f) => ({ ...f, remediationPlan: e.target.value }))} placeholder="Steps to remediate this finding..." className={`${inputCls} resize-none`} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors">Cancel</button>
          <button type="submit" disabled={createFinding.isPending || !form.title.trim()} className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {createFinding.isPending && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            Add Finding
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Finding Detail Modal (view + edit + status transitions)            */
/* ------------------------------------------------------------------ */

function FindingDetailModal({
  open,
  onClose,
  finding,
  auditId,
}: {
  open: boolean;
  onClose: () => void;
  finding: AuditFinding;
  auditId: string;
}) {
  const updateFinding = useUpdateAuditFinding(auditId, finding.id);
  const closeFinding = useCloseAuditFinding(auditId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: finding.title,
    description: finding.description ?? "",
    severity: finding.severity,
    remediationPlan: finding.remediationPlan ?? "",
    dueDate: finding.dueDate?.split("T")[0] ?? "",
  });

  const transitions = FINDING_TRANSITIONS[finding.status] ?? [];

  const handleSave = () => {
    updateFinding.mutate(
      {
        title: form.title,
        description: form.description || undefined,
        severity: form.severity,
        remediationPlan: form.remediationPlan || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate + "T00:00:00Z").toISOString() : undefined,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleTransition = (nextStatus: string) => {
    if (nextStatus === "closed") {
      closeFinding.mutate(finding.id, { onSuccess: onClose });
    } else {
      updateFinding.mutate({ status: nextStatus }, { onSuccess: onClose });
    }
  };

  const sevColor = getSeverityColor(finding.severity);

  return (
    <ModalShell open={open} onClose={onClose} title={`Finding ${finding.findingNumber}`} wide>
      <div className="p-6 space-y-5">
        {/* Status + Severity header */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={finding.status} />
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize" style={{ backgroundColor: sevColor.bg, color: sevColor.text }}>
            {finding.severity}
          </span>
          {finding.dueDate && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Calendar size={12} />
              Due: {formatDate(finding.dueDate)}
            </span>
          )}
          {finding.closedAt && (
            <span className="flex items-center gap-1 text-xs text-[#10B981]">
              <CheckCircle2 size={12} />
              Closed: {formatDate(finding.closedAt)}
            </span>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${inputCls} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Severity</label>
                <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} className={inputCls}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Remediation Plan</label>
              <textarea rows={3} value={form.remediationPlan} onChange={(e) => setForm((f) => ({ ...f, remediationPlan: e.target.value }))} className={`${inputCls} resize-none`} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]">Cancel</button>
              <button type="button" onClick={handleSave} disabled={updateFinding.isPending} className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">Save</button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{finding.title}</h3>
              {finding.description && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{finding.description}</p>
              )}
            </div>
            {finding.remediationPlan && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Remediation Plan</p>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{finding.remediationPlan}</p>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-2 flex-wrap border-t border-[var(--border)] pt-4">
            {finding.status !== "closed" && finding.status !== "accepted" && (
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors">
                <Pencil size={13} /> Edit
              </button>
            )}
            {transitions.map((t) => (
              <button
                key={t.next}
                type="button"
                onClick={() => handleTransition(t.next)}
                disabled={updateFinding.isPending || closeFinding.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <ArrowRightCircle size={13} /> {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Evidence Modal                                              */
/* ------------------------------------------------------------------ */

function CreateEvidenceModal({
  open,
  onClose,
  auditId,
}: {
  open: boolean;
  onClose: () => void;
  auditId: string;
}) {
  const createEvidence = useCreateEvidenceCollection(auditId);
  const [form, setForm] = useState<CreateEvidenceCollectionRequest>({
    title: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEvidence.mutate(form, {
      onSuccess: () => {
        setForm({ title: "", description: "" });
        onClose();
      },
    });
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Add Evidence Collection">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Title <span className="text-[var(--error)]">*</span>
          </label>
          <input type="text" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Access Control Policy Documentation" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Description</label>
          <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe the evidence to be collected..." className={`${inputCls} resize-none`} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]">Cancel</button>
          <button type="submit" disabled={createEvidence.isPending || !form.title.trim()} className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {createEvidence.isPending && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            Add Collection
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirm Modal                                               */
/* ------------------------------------------------------------------ */

function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <ModalShell open={open} onClose={onClose} title="Delete Audit">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Are you sure you want to delete this audit?
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              This will permanently remove the audit and all associated findings and evidence collections. This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={pending} className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {pending && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            Delete Audit
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GRCAuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"overview" | "findings" | "evidence">("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCreateFinding, setShowCreateFinding] = useState(false);
  const [showCreateEvidence, setShowCreateEvidence] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);

  const { data: audit, isLoading } = useGRCAudit(id);
  const updateAudit = useUpdateGRCAudit(id);
  const deleteAudit = useDeleteGRCAudit();
  const { data: findingsData, isLoading: findingsLoading } = useAuditFindings(id, 1, 100);
  const { data: evidenceData, isLoading: evidenceLoading } = useEvidenceCollections(id);
  const updateEvidence = useUpdateEvidenceCollection(id, undefined);
  const approveEvidence = useApproveEvidenceCollection(id);

  const findings = findingsData?.data ?? [];
  const evidence = evidenceData ?? [];

  // Finding stats
  const findingStats = useMemo(() => {
    const open = findings.filter((f) => f.status === "open").length;
    const inRemediation = findings.filter((f) => f.status === "in_remediation" || f.status === "remediation_planned").length;
    const closed = findings.filter((f) => f.status === "closed").length;
    const accepted = findings.filter((f) => f.status === "accepted").length;
    const critical = findings.filter((f) => f.severity === "critical").length;
    const high = findings.filter((f) => f.severity === "high").length;
    return { open, inRemediation, closed, accepted, critical, high, total: findings.length };
  }, [findings]);

  // Evidence stats
  const evidenceStats = useMemo(() => {
    const pending = evidence.filter((e) => e.status === "pending").length;
    const collecting = evidence.filter((e) => e.status === "collecting").length;
    const inReview = evidence.filter((e) => e.status === "review" || e.status === "submitted").length;
    const approved = evidence.filter((e) => e.status === "approved").length;
    return { pending, collecting, inReview, approved, total: evidence.length };
  }, [evidence]);

  const handleStatusTransition = useCallback(
    (nextStatus: string) => {
      updateAudit.mutate({ status: nextStatus });
    },
    [updateAudit],
  );

  const handleDeleteConfirm = () => {
    deleteAudit.mutate(id, {
      onSuccess: () => router.push("/dashboard/grc/audits"),
    });
  };

  const handleEvidenceTransition = (evidenceId: string, nextStatus: string) => {
    // Create a one-off mutation for this specific evidence
    const body: UpdateEvidenceCollectionRequest = { status: nextStatus };
    // We use the apiClient directly through a hook that was already set up
    // but since useUpdateEvidenceCollection needs a fixed id, we'll use a workaround
    updateEvidence.mutate(body);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-secondary)]">Audit not found.</p>
        <Link href="/dashboard/grc/audits" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline">
          <ArrowLeft size={16} /> Back to Audits
        </Link>
      </div>
    );
  }

  const readinessColor = getReadinessColor(audit.readinessScore);
  const typeBadge = getTypeBadge(audit.auditType);
  const TypeIcon = typeBadge.icon;
  const transitions = AUDIT_TRANSITIONS[audit.status] ?? [];

  return (
    <div className="space-y-6 pb-8">
      {/* Back link */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Link href="/dashboard/grc/audits" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={16} /> Back to Audits
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: typeBadge.bg }}>
              <TypeIcon size={22} style={{ color: typeBadge.text }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <StatusBadge status={audit.status} />
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize" style={{ backgroundColor: typeBadge.bg, color: typeBadge.text }}>
                  {audit.auditType}
                </span>
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{audit.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)] flex-wrap">
                {audit.auditor && (
                  <span className="flex items-center gap-1"><User size={12} /> {audit.auditor}</span>
                )}
                {audit.auditBody && (
                  <span className="flex items-center gap-1"><Shield size={12} /> {audit.auditBody}</span>
                )}
                {audit.scheduledStart && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {formatDate(audit.scheduledStart)}
                    {audit.scheduledEnd && ` - ${formatDate(audit.scheduledEnd)}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Readiness score + actions */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-[var(--text-secondary)]">Readiness</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-20 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(audit.readinessScore, 100)}%`, backgroundColor: readinessColor }} />
                </div>
                <span className="text-lg font-bold tabular-nums" style={{ color: readinessColor }}>
                  {audit.readinessScore}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)] flex-wrap">
          <button type="button" onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors">
            <Pencil size={13} /> Edit
          </button>
          {transitions.map((t) => (
            <button
              key={t.next}
              type="button"
              onClick={() => handleStatusTransition(t.next)}
              disabled={updateAudit.isPending}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <ArrowRightCircle size={13} /> {t.label}
            </button>
          ))}
          <div className="flex-1" />
          {audit.status !== "completed" && (
            <button type="button" onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="border-b border-[var(--border)] flex">
        <TabButton active={activeTab === "overview"} label="Overview" onClick={() => setActiveTab("overview")} />
        <TabButton active={activeTab === "findings"} label="Findings" count={findingStats.total} onClick={() => setActiveTab("findings")} />
        <TabButton active={activeTab === "evidence"} label="Evidence" count={evidenceStats.total} onClick={() => setActiveTab("evidence")} />
      </motion.div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* ============ OVERVIEW ============ */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Scope */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Scope</h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {audit.scope || "No scope defined."}
                </p>
              </div>

              {/* Finding summary */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Findings Summary</h2>
                  <button type="button" onClick={() => setActiveTab("findings")} className="text-xs text-[var(--primary)] font-medium hover:underline">
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-red-50 p-3 text-center">
                    <p className="text-2xl font-bold text-red-600 tabular-nums">{findingStats.open}</p>
                    <p className="text-xs text-red-600/70 font-medium mt-0.5">Open</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600 tabular-nums">{findingStats.inRemediation}</p>
                    <p className="text-xs text-amber-600/70 font-medium mt-0.5">In Remediation</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600 tabular-nums">{findingStats.closed}</p>
                    <p className="text-xs text-emerald-600/70 font-medium mt-0.5">Closed</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600 tabular-nums">{findingStats.accepted}</p>
                    <p className="text-xs text-blue-600/70 font-medium mt-0.5">Accepted</p>
                  </div>
                </div>
                {(findingStats.critical > 0 || findingStats.high > 0) && (
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    {findingStats.critical > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle size={12} /> {findingStats.critical} critical
                      </span>
                    )}
                    {findingStats.high > 0 && (
                      <span className="flex items-center gap-1 text-orange-600">
                        <AlertTriangle size={12} /> {findingStats.high} high
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Evidence summary */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Evidence Progress</h2>
                  <button type="button" onClick={() => setActiveTab("evidence")} className="text-xs text-[var(--primary)] font-medium hover:underline">
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-600 tabular-nums">{evidenceStats.pending}</p>
                    <p className="text-xs text-slate-600/70 font-medium mt-0.5">Pending</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600 tabular-nums">{evidenceStats.collecting}</p>
                    <p className="text-xs text-blue-600/70 font-medium mt-0.5">Collecting</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600 tabular-nums">{evidenceStats.inReview}</p>
                    <p className="text-xs text-amber-600/70 font-medium mt-0.5">In Review</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600 tabular-nums">{evidenceStats.approved}</p>
                    <p className="text-xs text-emerald-600/70 font-medium mt-0.5">Approved</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Schedule */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 space-y-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Schedule</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Start</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(audit.scheduledStart)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">End</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(audit.scheduledEnd)}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 space-y-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Details</h2>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Lead Auditor</p>
                    <p className="text-sm text-[var(--text-primary)]">{audit.auditor || "--"}</p>
                  </div>
                  {audit.auditBody && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">Audit Body</p>
                      <p className="text-sm text-[var(--text-primary)]">{audit.auditBody}</p>
                    </div>
                  )}
                  <div className="border-t border-[var(--border)] pt-2.5">
                    <p className="text-xs text-[var(--text-secondary)]">Created</p>
                    <p className="text-sm text-[var(--text-primary)]">{formatDate(audit.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Last Updated</p>
                    <p className="text-sm text-[var(--text-primary)]">{formatDate(audit.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Lifecycle Pipeline */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Lifecycle</h2>
                <div className="space-y-1">
                  {["planned", "preparing", "in_progress", "findings_review", "completed"].map((step, i) => {
                    const isCurrent = audit.status === step;
                    const isPast =
                      ["planned", "preparing", "in_progress", "findings_review", "completed"].indexOf(audit.status) > i;
                    return (
                      <div key={step} className="flex items-center gap-2.5">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isPast
                              ? "bg-[#10B981] text-white"
                              : isCurrent
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {isPast ? <CheckCircle2 size={12} /> : i + 1}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            isCurrent
                              ? "text-[var(--primary)]"
                              : isPast
                                ? "text-[#10B981]"
                                : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {formatStatusLabel(step)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ FINDINGS ============ */}
        {activeTab === "findings" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                {findingStats.total} finding{findingStats.total !== 1 ? "s" : ""} recorded
              </p>
              <button
                type="button"
                onClick={() => setShowCreateFinding(true)}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <Plus size={14} /> Add Finding
              </button>
            </div>

            {findingsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
              </div>
            ) : findings.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
                <FileSearch size={36} className="mx-auto text-[var(--text-secondary)] mb-2" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No findings yet</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-3">Record findings as the audit progresses.</p>
                <button type="button" onClick={() => setShowCreateFinding(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                  <Plus size={14} /> Add Finding
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Finding #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Severity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Due Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((finding: AuditFinding) => {
                      const sevColor = getSeverityColor(finding.severity);
                      const fTransitions = FINDING_TRANSITIONS[finding.status] ?? [];
                      return (
                        <tr
                          key={finding.id}
                          className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
                          onClick={() => setSelectedFinding(finding)}
                        >
                          <td className="px-4 py-3 text-sm font-mono text-[var(--primary)]">{finding.findingNumber}</td>
                          <td className="px-4 py-3 text-sm text-[var(--text-primary)] max-w-[240px]">
                            <p className="truncate">{finding.title}</p>
                            {finding.description && (
                              <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{finding.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize" style={{ backgroundColor: sevColor.bg, color: sevColor.text }}>
                              {finding.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={finding.status} /></td>
                          <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatDate(finding.dueDate)}</td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {fTransitions.slice(0, 1).map((t) => (
                                <button
                                  key={t.next}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFinding(finding);
                                  }}
                                  className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============ EVIDENCE ============ */}
        {activeTab === "evidence" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <span>{evidenceStats.total} collection{evidenceStats.total !== 1 ? "s" : ""}</span>
                <span className="text-emerald-600">{evidenceStats.approved} approved</span>
                <span className="text-amber-600">{evidenceStats.inReview} in review</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEvidence(true)}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <Plus size={14} /> Add Collection
              </button>
            </div>

            {evidenceLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
              </div>
            ) : evidence.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
                <FolderArchive size={36} className="mx-auto text-[var(--text-secondary)] mb-2" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No evidence collections</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-3">Create evidence collections to track audit documentation.</p>
                <button type="button" onClick={() => setShowCreateEvidence(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                  <Plus size={14} /> Add Collection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evidence.map((collection: EvidenceCollection) => {
                  const eTransitions = EVIDENCE_TRANSITIONS[collection.status] ?? [];
                  return (
                    <div key={collection.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex-1 mr-2">{collection.title}</h3>
                        <StatusBadge status={collection.status} />
                      </div>
                      {collection.description && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">{collection.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-3">
                        <span>{collection.evidenceItemIds.length} item{collection.evidenceItemIds.length !== 1 ? "s" : ""}</span>
                        {collection.approvedAt && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 size={12} /> Approved {formatDate(collection.approvedAt)}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {eTransitions.map((t) => (
                          <EvidenceTransitionButton
                            key={t.next}
                            auditId={id}
                            evidenceId={collection.id}
                            nextStatus={t.next}
                            label={t.label}
                          />
                        ))}
                        {(collection.status === "submitted" || collection.status === "review") && (
                          <button
                            type="button"
                            onClick={() => approveEvidence.mutate(collection.id)}
                            disabled={approveEvidence.isPending}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                        )}
                      </div>

                      {collection.checksum && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                          <p className="text-xs text-[var(--text-secondary)] font-mono truncate">
                            SHA-256: {collection.checksum}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      {showEdit && audit && (
        <EditAuditModal open={showEdit} onClose={() => setShowEdit(false)} audit={audit} />
      )}
      <DeleteConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteConfirm}
        pending={deleteAudit.isPending}
      />
      <CreateFindingModal open={showCreateFinding} onClose={() => setShowCreateFinding(false)} auditId={id} />
      <CreateEvidenceModal open={showCreateEvidence} onClose={() => setShowCreateEvidence(false)} auditId={id} />
      {selectedFinding && (
        <FindingDetailModal
          open={!!selectedFinding}
          onClose={() => setSelectedFinding(null)}
          finding={selectedFinding}
          auditId={id}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Evidence Transition Button (needs its own hook instance)           */
/* ------------------------------------------------------------------ */

function EvidenceTransitionButton({
  auditId,
  evidenceId,
  nextStatus,
  label,
}: {
  auditId: string;
  evidenceId: string;
  nextStatus: string;
  label: string;
}) {
  const updateEvidence = useUpdateEvidenceCollection(auditId, evidenceId);

  return (
    <button
      type="button"
      onClick={() => updateEvidence.mutate({ status: nextStatus })}
      disabled={updateEvidence.isPending}
      className="flex items-center gap-1 rounded-lg border border-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/5 disabled:opacity-50 transition-colors"
    >
      <ArrowRightCircle size={12} /> {label}
    </button>
  );
}
