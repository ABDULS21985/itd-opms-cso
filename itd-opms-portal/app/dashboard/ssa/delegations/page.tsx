"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Lightbulb,
  Info,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useSSADelegations,
  useCreateDelegation,
  useDeleteDelegation,
} from "@/hooks/use-ssa";
import { UserPicker } from "@/components/shared/pickers";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { SSADelegation } from "@/types/ssa";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DELEGATION_STAGES = [
  { value: "HOO_ENDORSEMENT", label: "HOO Endorsement", group: "Endorsement" },
  { value: "ASD_ASSESSMENT", label: "ASD Assessment", group: "Assessment" },
  { value: "QCMD_ANALYSIS", label: "QCMD Analysis", group: "Assessment" },
  { value: "APPR_DC", label: "Head Data Centre", group: "Approval" },
  { value: "APPR_SSO", label: "Head SSO", group: "Approval" },
  { value: "APPR_IMD", label: "Head IMD", group: "Approval" },
  { value: "APPR_ASD", label: "Head ASD", group: "Approval" },
  { value: "APPR_SCAO", label: "Head SCAO", group: "Approval" },
  { value: "SAN_PROVISIONING", label: "SAN Provisioning", group: "Provisioning" },
  { value: "DCO_SERVER", label: "DCO Server Creation", group: "Provisioning" },
];

const STAGE_COLORS: Record<string, { color: string; bg: string }> = {
  HOO_ENDORSEMENT: { color: "#6366F1", bg: "rgba(99, 102, 241, 0.08)" },
  ASD_ASSESSMENT: { color: "#3B82F6", bg: "rgba(59, 130, 246, 0.08)" },
  QCMD_ANALYSIS: { color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.08)" },
  APPR_DC: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)" },
  APPR_SSO: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)" },
  APPR_IMD: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)" },
  APPR_ASD: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)" },
  APPR_SCAO: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)" },
  SAN_PROVISIONING: { color: "#10B981", bg: "rgba(16, 185, 129, 0.08)" },
  DCO_SERVER: { color: "#14B8A6", bg: "rgba(20, 184, 166, 0.08)" },
};

const STATUS_TABS = [
  { value: "all", label: "All", color: "#6366F1" },
  { value: "active", label: "Active", color: "#10B981" },
  { value: "scheduled", label: "Scheduled", color: "#F59E0B" },
  { value: "expired", label: "Expired", color: "#6B7280" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDelegationStatus(d: SSADelegation): "active" | "scheduled" | "expired" | "inactive" {
  const now = new Date();
  const from = new Date(d.effectiveFrom);
  const to = new Date(d.effectiveTo);
  if (!d.isActive) return "inactive";
  if (to < now) return "expired";
  if (from > now) return "scheduled";
  return "active";
}

function getDaysRemaining(d: SSADelegation): number | null {
  const to = new Date(d.effectiveTo);
  const diff = Math.ceil((to.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
    >
      <div
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.07]"
        style={{ background: `radial-gradient(circle, ${color}, transparent)` }}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {value}
          </p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}14` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Delegation Form                                             */
/* ------------------------------------------------------------------ */

function CreateDelegationForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [delegateId, setDelegateId] = useState("");
  const [delegateDisplay, setDelegateDisplay] = useState("");
  const [stage, setStage] = useState(DELEGATION_STAGES[0].value);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [reason, setReason] = useState("");

  const createDelegation = useCreateDelegation();

  const stageConf = STAGE_COLORS[stage] ?? { color: "#6B7280", bg: "rgba(107,114,128,0.08)" };

  const handleSubmit = () => {
    if (!delegateId.trim()) {
      toast.error("Please select a delegate");
      return;
    }
    if (!effectiveFrom || !effectiveTo) {
      toast.error("Both effective dates are required");
      return;
    }
    if (new Date(effectiveTo) <= new Date(effectiveFrom)) {
      toast.error("End date must be after start date");
      return;
    }

    createDelegation.mutate(
      {
        delegateId: delegateId.trim(),
        stage,
        effectiveFrom: `${effectiveFrom}T00:00:00Z`,
        effectiveTo: `${effectiveTo}T00:00:00Z`,
        reason: reason.trim() || undefined,
      } as Partial<SSADelegation>,
      {
        onSuccess: () => {
          setDelegateId("");
          setDelegateDisplay("");
          setStage(DELEGATION_STAGES[0].value);
          setEffectiveFrom("");
          setEffectiveTo("");
          setReason("");
          onCreated();
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-1)]/50 px-6 py-3">
        <ArrowRightLeft size={15} className="text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Create New Delegation
        </span>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Delegate picker */}
          <UserPicker
            label="Delegate"
            value={delegateId || undefined}
            displayValue={delegateDisplay}
            onChange={(id, name) => {
              setDelegateId(id ?? "");
              setDelegateDisplay(name);
            }}
            placeholder="Search for a user..."
            description="The person who will act on your behalf"
          />

          {/* Stage selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Approval Stage <span className="text-[var(--error)]">*</span>
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {DELEGATION_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: stageConf.color }}
              />
              <span className="text-[11px] text-[var(--neutral-gray)]">
                {DELEGATION_STAGES.find((s) => s.value === stage)?.group ?? "Stage"} stage
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Effective From <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 h-10 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Effective To <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 h-10 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason for this delegation (e.g., annual leave, training)..."
            rows={2}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] resize-none focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] bg-[var(--surface-1)]/30 px-6 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createDelegation.isPending}
          className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
          }}
        >
          {createDelegation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Create Delegation
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delegation Card                                                    */
/* ------------------------------------------------------------------ */

function DelegationCard({
  delegation,
  onDelete,
  delay,
}: {
  delegation: SSADelegation;
  onDelete: () => void;
  delay: number;
}) {
  const dlgStatus = getDelegationStatus(delegation);
  const days = getDaysRemaining(delegation);
  const stageConf = STAGE_COLORS[delegation.stage] ?? { color: "#6B7280", bg: "rgba(107,114,128,0.08)" };
  const stageLabel =
    DELEGATION_STAGES.find((s) => s.value === delegation.stage)?.label ??
    delegation.stage;

  const statusConfig = {
    active: { color: "#10B981", bg: "rgba(16,185,129,0.1)", label: "Active", icon: CheckCircle2 },
    scheduled: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", label: "Scheduled", icon: Calendar },
    expired: { color: "#6B7280", bg: "rgba(107,114,128,0.1)", label: "Expired", icon: Clock },
    inactive: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", label: "Inactive", icon: XCircle },
  }[dlgStatus];

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] transition-shadow hover:shadow-md hover:shadow-black/5"
    >
      {/* Accent bar */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${statusConfig.color}, ${statusConfig.color}66)`,
        }}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Left: stage + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: stageConf.bg, color: stageConf.color }}
              >
                <Shield size={10} />
                {stageLabel}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
              >
                <StatusIcon size={10} />
                {statusConfig.label}
              </span>
              {dlgStatus === "active" && days !== null && days <= 7 && days > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600">
                  <AlertTriangle size={10} />
                  Expires in {days}d
                </span>
              )}
            </div>

            {/* Delegate info */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-bold text-[var(--primary)]">
                {delegation.delegateId.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {delegation.delegateId}
                </p>
                <p className="text-[11px] text-[var(--neutral-gray)]">
                  Delegated authority
                </p>
              </div>
            </div>

            {/* Date range */}
            <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-[var(--neutral-gray)]" />
                <span className="tabular-nums">{formatDate(delegation.effectiveFrom)}</span>
              </div>
              <span className="text-[var(--neutral-gray)]">→</span>
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-[var(--neutral-gray)]" />
                <span className="tabular-nums">{formatDate(delegation.effectiveTo)}</span>
              </div>
            </div>

            {/* Reason */}
            {delegation.reason && (
              <p className="mt-2 text-xs text-[var(--neutral-gray)] italic line-clamp-2">
                &ldquo;{delegation.reason}&rdquo;
              </p>
            )}
          </div>

          {/* Delete button */}
          {delegation.isActive && (
            <button
              type="button"
              onClick={onDelete}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              title="Remove delegation"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SSADelegationsPage() {
  const { data: delegations, isLoading } = useSSADelegations();
  const deleteDelegation = useDeleteDelegation();
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const stageLabel = (stage: string) =>
    DELEGATION_STAGES.find((s) => s.value === stage)?.label ?? stage;

  /* ---- Filter delegations ---- */
  const filtered = useMemo(() => {
    if (!delegations) return [];
    let result = delegations;

    if (statusFilter !== "all") {
      result = result.filter((d) => getDelegationStatus(d) === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.delegateId.toLowerCase().includes(q) ||
          d.stage.toLowerCase().includes(q) ||
          stageLabel(d.stage).toLowerCase().includes(q) ||
          d.reason?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [delegations, statusFilter, searchQuery]);

  /* ---- Stats ---- */
  const stats = useMemo(() => {
    if (!delegations) return { total: 0, active: 0, scheduled: 0, expired: 0 };
    let active = 0, scheduled = 0, expired = 0;
    for (const d of delegations) {
      const s = getDelegationStatus(d);
      if (s === "active") active++;
      else if (s === "scheduled") scheduled++;
      else if (s === "expired") expired++;
    }
    return { total: delegations.length, active, scheduled, expired };
  }, [delegations]);

  /* ---- Status filter counts ---- */
  const statusCounts = useMemo(() => {
    return {
      all: delegations?.length ?? 0,
      active: stats.active,
      scheduled: stats.scheduled,
      expired: stats.expired,
    };
  }, [delegations, stats]);

  function handleDelete() {
    if (!deleteId) return;
    deleteDelegation.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  }

  return (
    <div className="space-y-6">
      {/* ================================================ */}
      {/*  HERO HEADER                                      */}
      {/* ================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-[0.04]"
            style={{
              background: "radial-gradient(circle, #6366F1 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full opacity-[0.03]"
            style={{
              background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              }}
            >
              <ArrowRightLeft size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                SSA Delegations
              </h1>
              <p className="mt-0.5 text-sm text-[var(--neutral-gray)]">
                Manage approval delegations for SSA workflow stages
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((f) => !f)}
            className="flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            }}
          >
            {showForm ? <ChevronUp size={16} /> : <Plus size={16} />}
            {showForm ? "Hide Form" : "New Delegation"}
          </button>
        </div>
      </motion.div>

      {/* ================================================ */}
      {/*  STAT CARDS                                       */}
      {/* ================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Delegations"
          value={stats.total}
          icon={Users}
          color="#6366F1"
          delay={0.05}
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={CheckCircle2}
          color="#10B981"
          delay={0.1}
        />
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          icon={Calendar}
          color="#F59E0B"
          delay={0.15}
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          icon={Clock}
          color="#6B7280"
          delay={0.2}
        />
      </div>

      {/* ================================================ */}
      {/*  CREATE FORM                                      */}
      {/* ================================================ */}
      <AnimatePresence>
        {showForm && (
          <CreateDelegationForm
            onCreated={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* ================================================ */}
      {/*  TOOLBAR                                          */}
      {/* ================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="space-y-4"
      >
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            const count = statusCounts[tab.value as keyof typeof statusCounts] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-transparent text-white shadow-sm"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                }`}
                style={active ? { backgroundColor: tab.color } : undefined}
              >
                {tab.label}
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delegations..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      </motion.div>

      {/* ================================================ */}
      {/*  DELEGATIONS LIST                                 */}
      {/* ================================================ */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
              />
            ))}
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] py-20"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              }}
            >
              <ArrowRightLeft size={28} className="text-white" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              {statusFilter !== "all" || searchQuery
                ? "No matching delegations"
                : "No Delegations"}
            </h3>
            <p className="mt-1 text-sm text-[var(--neutral-gray)]">
              {statusFilter !== "all" || searchQuery
                ? "Try adjusting your filters or search."
                : "Create a delegation to allow someone else to act on your behalf."}
            </p>
            {!showForm && statusFilter === "all" && !searchQuery && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                }}
              >
                <Plus size={16} />
                New Delegation
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {filtered.map((d, i) => (
              <DelegationCard
                key={d.id}
                delegation={d}
                onDelete={() => setDeleteId(d.id)}
                delay={Math.min(i * 0.04, 0.3)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================ */}
      {/*  TIPS SIDEBAR (inline for this page)              */}
      {/* ================================================ */}
      {!isLoading && (delegations?.length ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border p-4"
          style={{
            borderColor: "rgba(99, 102, 241, 0.15)",
            backgroundColor: "rgba(99, 102, 241, 0.03)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} style={{ color: "#6366F1" }} />
            <span className="text-xs font-semibold" style={{ color: "#4F46E5" }}>
              About Delegations
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-[var(--text-secondary)] leading-relaxed">
            <div className="flex items-start gap-1.5">
              <Info size={10} className="mt-0.5 shrink-0 text-indigo-400" />
              Active delegations allow the delegate to approve/act on the specified SSA stage
            </div>
            <div className="flex items-start gap-1.5">
              <Info size={10} className="mt-0.5 shrink-0 text-indigo-400" />
              Scheduled delegations activate automatically on the start date
            </div>
            <div className="flex items-start gap-1.5">
              <Info size={10} className="mt-0.5 shrink-0 text-indigo-400" />
              Expired delegations are retained for audit trail but cannot be used
            </div>
          </div>
        </motion.div>
      )}

      {/* ================================================ */}
      {/*  DELETE CONFIRM                                    */}
      {/* ================================================ */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove Delegation"
        message="Are you sure you want to remove this delegation? The delegate will immediately lose the ability to act on this stage."
        confirmLabel="Remove"
        variant="danger"
        loading={deleteDelegation.isPending}
      />
    </div>
  );
}
