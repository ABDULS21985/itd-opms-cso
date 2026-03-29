"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Calendar,
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Target,
  CheckCircle2,
  Clock3,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useGRCAudits, useCreateGRCAudit } from "@/hooks/use-grc";
import { AUDIT_STATUS, AUDIT_TYPE } from "@/types/grc";
import type { GRCAudit, CreateGRCAuditRequest } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "planned", label: "Planned" },
  { value: "preparing", label: "Preparing" },
  { value: "in_progress", label: "In Progress" },
  { value: "findings_review", label: "Findings Review" },
  { value: "completed", label: "Completed" },
];

const AUDIT_TYPES = [
  { value: "", label: "All Types" },
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
  { value: "regulatory", label: "Regulatory" },
];

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

function formatStatusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  helper,
  color,
  loading,
}: {
  label: string;
  value: number | string;
  helper: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        borderColor: `${color}1f`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${color}14, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color }}>
        {loading ? (
          <span className="inline-flex h-8 w-14 animate-pulse rounded-xl bg-[var(--surface-2)]" />
        ) : (
          value
        )}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function SpotlightCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent,
  className = "",
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-white/12 bg-white/10 p-4 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12"
          style={{ backgroundColor: `${accent}20` }}
        >
          <Icon size={18} className="text-white" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52">
          {eyebrow}
        </span>
      </div>
      <h2 className="mt-5 text-lg font-semibold leading-6 text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-emerald-50/72">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Audit Modal                                                 */
/* ------------------------------------------------------------------ */

function CreateAuditModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createAudit = useCreateGRCAudit();
  const [form, setForm] = useState<CreateGRCAuditRequest>({
    title: "",
    auditType: "internal",
    scope: "",
    auditor: "",
    auditBody: "",
    scheduledStart: "",
    scheduledEnd: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    createAudit.mutate(
      {
        ...form,
        scheduledStart: form.scheduledStart
          ? new Date(form.scheduledStart + "T00:00:00Z").toISOString()
          : undefined,
        scheduledEnd: form.scheduledEnd
          ? new Date(form.scheduledEnd + "T00:00:00Z").toISOString()
          : undefined,
      },
      {
        onSuccess: () => {
          setForm({
            title: "",
            auditType: "internal",
            scope: "",
            auditor: "",
            auditBody: "",
            scheduledStart: "",
            scheduledEnd: "",
          });
          onClose();
        },
      },
    );
  };

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
          className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Schedule New Audit
            </h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--surface-2)] transition-colors">
              <X size={18} className="text-[var(--text-secondary)]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Audit Title <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. ISO 27001 Annual Internal Audit"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Audit Type <span className="text-[var(--error)]">*</span>
                </label>
                <select
                  value={form.auditType}
                  onChange={(e) => setForm((f) => ({ ...f, auditType: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                  <option value="regulatory">Regulatory</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Auditor
                </label>
                <input
                  type="text"
                  value={form.auditor ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, auditor: e.target.value }))}
                  placeholder="Lead auditor name"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Audit Body
              </label>
              <input
                type="text"
                value={form.auditBody ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, auditBody: e.target.value }))}
                placeholder="e.g. External Audit Firm, CBN Examiners"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Scope
              </label>
              <textarea
                rows={3}
                value={form.scope ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                placeholder="Describe the audit scope, objectives, and areas to be covered..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Scheduled Start
                </label>
                <input
                  type="date"
                  value={form.scheduledStart ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledStart: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Scheduled End
                </label>
                <input
                  type="date"
                  value={form.scheduledEnd ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledEnd: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAudit.isPending || !form.title.trim()}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {createAudit.isPending ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Schedule Audit
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GRCAuditsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [auditType, setAuditType] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGRCAudits(
    page,
    20,
    status || undefined,
    auditType || undefined,
  );

  const audits = data?.data ?? [];
  const meta = data?.meta;
  const selectedStatusLabel = STATUSES.find((option) => option.value === status)?.label ?? "All Statuses";
  const selectedTypeLabel = AUDIT_TYPES.find((option) => option.value === auditType)?.label ?? "All Types";
  const hasFilters = !!(search.trim() || status || auditType);

  // Filter by search text client-side
  const filtered = useMemo(() => {
    if (!search.trim()) return audits;
    const q = search.toLowerCase();
    return audits.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.auditor?.toLowerCase().includes(q) ||
        a.auditBody?.toLowerCase().includes(q),
    );
  }, [audits, search]);

  // Summary stats
  const stats = useMemo(() => {
    const all = audits;
    return {
      total: meta?.totalItems ?? all.length,
      active: all.filter((a) =>
        ["in_progress", "preparing", "findings_review"].includes(a.status),
      ).length,
      completed: all.filter((a) => a.status === AUDIT_STATUS.COMPLETED).length,
      avgReadiness:
        all.length > 0
          ? Math.round(all.reduce((s, a) => s + a.readinessScore, 0) / all.length)
          : 0,
    };
  }, [audits, meta]);
  const strongestAudit = useMemo(
    () => [...audits].sort((a, b) => b.readinessScore - a.readinessScore)[0],
    [audits],
  );
  const weakestAudit = useMemo(
    () => [...audits].sort((a, b) => a.readinessScore - b.readinessScore)[0],
    [audits],
  );
  const typeCounts = useMemo(
    () => ({
      internal: audits.filter((audit) => audit.auditType === AUDIT_TYPE.INTERNAL).length,
      external: audits.filter((audit) => audit.auditType === AUDIT_TYPE.EXTERNAL).length,
      regulatory: audits.filter((audit) => audit.auditType === AUDIT_TYPE.REGULATORY).length,
    }),
    [audits],
  );

  const columns: Column<GRCAudit>[] = [
    {
      key: "title",
      header: "Audit",
      sortable: true,
      className: "min-w-[260px]",
      render: (item) => {
        const tb = getTypeBadge(item.auditType);
        const TypeIcon = tb.icon;
        return (
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: tb.bg }}
            >
              <TypeIcon size={16} style={{ color: tb.text }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {item.title}
              </p>
              <p className="text-xs text-[var(--text-secondary)] capitalize">
                {item.auditType} Audit
              </p>
            </div>
          </div>
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
      key: "readinessScore",
      header: "Readiness",
      sortable: true,
      align: "center",
      render: (item) => {
        const color = getReadinessColor(item.readinessScore);
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(item.readinessScore, 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color }}>
              {item.readinessScore}%
            </span>
          </div>
        );
      },
    },
    {
      key: "auditor",
      header: "Lead Auditor",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.auditor || "--"}
        </span>
      ),
    },
    {
      key: "scheduledStart",
      header: "Schedule",
      sortable: true,
      render: (item) => (
        <div className="text-xs text-[var(--text-secondary)]">
          <p>{formatDate(item.scheduledStart)}</p>
          {item.scheduledEnd && (
            <p className="text-[var(--neutral-gray)]">
              to {formatDate(item.scheduledEnd)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/grc/audits/${item.id}`);
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[2rem] border border-[rgba(59,130,246,0.14)] bg-[linear-gradient(135deg,_rgba(7,26,58,0.98),_rgba(17,65,128,0.94)_48%,_rgba(59,130,246,0.9))] p-6 shadow-[0_28px_72px_rgba(15,23,42,0.12)] sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12),_transparent_24%),radial-gradient(circle_at_18%_18%,_rgba(255,255,255,0.08),_transparent_26%)]" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.32),_transparent_68%)] opacity-70" />
        <div className="pointer-events-none absolute -bottom-12 left-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.26),_transparent_68%)] opacity-60" />

        <div className="relative grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78 backdrop-blur-xl">
              GRC audit operations
            </div>

            <div className="mt-6 flex items-start gap-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-white/12 bg-white/10 shadow-lg shadow-blue-500/10">
                <ClipboardList className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-[-0.045em] text-white sm:text-[2.6rem]">
                  Audit management with clearer readiness signals and tighter flow control.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                  Schedule audits, understand readiness at a glance, and keep internal,
                  external, and regulatory workstreams visible in one operational surface.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#1E3A8A] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <Plus size={16} />
                Schedule Audit
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/grc/reports")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:border-white/28 hover:bg-white/14"
              >
                Open GRC analytics
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                `${stats.total} total audits`,
                `${stats.active} active workstreams`,
                `${stats.avgReadiness}% average readiness`,
                selectedStatusLabel,
                selectedTypeLabel,
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium tracking-[0.08em] text-white/82"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SpotlightCard
              icon={ShieldCheck}
              eyebrow="Strongest readiness"
              accent="#10B981"
              title={
                strongestAudit
                  ? `${strongestAudit.readinessScore}% ${strongestAudit.title}`
                  : "No audits scheduled"
              }
              description={
                strongestAudit
                  ? "Highest readiness currently in the book. Use it as the benchmark for evidence quality."
                  : "Schedule your first audit to start measuring readiness."
              }
            />
            <SpotlightCard
              icon={ShieldAlert}
              eyebrow="Most at risk"
              accent="#EF4444"
              title={
                weakestAudit
                  ? `${weakestAudit.readinessScore}% ${weakestAudit.title}`
                  : "No readiness gaps yet"
              }
              description={
                weakestAudit
                  ? "This audit has the lowest readiness score and should be prioritized for evidence follow-up."
                  : "Once audits exist, the lowest-readiness item will surface here."
              }
            />
            <SpotlightCard
              icon={Target}
              eyebrow="Type mix"
              accent="#F59E0B"
              className="sm:col-span-2"
              title={`${typeCounts.internal} internal, ${typeCounts.external} external, ${typeCounts.regulatory} regulatory`}
              description="Balance the audit portfolio across operating assurance, outside scrutiny, and regulatory oversight."
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Total Audits"
          value={stats.total}
          helper="Full audit inventory currently being tracked."
          color="#3B82F6"
          loading={isLoading}
        />
        <MetricCard
          label="Active"
          value={stats.active}
          helper="Preparing, in progress, or currently in findings review."
          color="#F59E0B"
          loading={isLoading}
        />
        <MetricCard
          label="Completed"
          value={stats.completed}
          helper="Audits closed with the workflow fully completed."
          color="#10B981"
          loading={isLoading}
        />
        <MetricCard
          label="Avg Readiness"
          value={`${stats.avgReadiness}%`}
          helper="Average evidence and readiness coverage across the active book."
          color={getReadinessColor(stats.avgReadiness)}
          loading={isLoading}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="overflow-hidden rounded-[1.8rem] border border-[var(--border)]/80 bg-white/94 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">
              Audit Register
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
              Filter and review the active audit book
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Narrow by lifecycle status and audit type, then open the exact record you need
              for readiness work, scope updates, or evidence collection.
            </p>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("");
                setAuditType("");
                setPage(1);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--primary)]/20 hover:bg-[var(--primary)]/6 hover:text-[var(--primary)]"
            >
              <X size={15} />
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative max-w-xl flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by audit title, auditor, or audit body..."
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] shadow-sm outline-none transition-all placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={auditType}
            onChange={(e) => {
              setAuditType(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
          >
            {AUDIT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(a) => a.id}
          loading={isLoading}
          emptyTitle="No audits found"
          emptyDescription="Schedule your first audit to begin tracking."
          emptyAction={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              Schedule Audit
            </button>
          }
          pagination={
            meta && meta.totalPages > 1
              ? {
                  currentPage: page,
                  totalPages: meta.totalPages,
                  totalItems: meta.totalItems,
                  pageSize: 20,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      </motion.div>

      <CreateAuditModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
