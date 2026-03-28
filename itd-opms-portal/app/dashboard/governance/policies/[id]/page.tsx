"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Edit,
  GitCompare,
  ShieldCheck,
  Clock,
  Loader2,
  Send,
  CheckCircle,
  Globe,
  Archive,
  Calendar,
  Tag,
  User,
  BookOpen,
  History,
  ChevronDown,
  ChevronRight,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  usePolicy,
  usePolicyVersions,
  useSubmitPolicy,
  useApprovePolicy,
  usePublishPolicy,
  useRetirePolicy,
} from "@/hooks/use-governance";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(dateStr: string | undefined | null) {
  if (!dateStr) return null;
  const diff = Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

const STATUS_FLOW = ["draft", "in_review", "approved", "published", "retired"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [contentExpanded, setContentExpanded] = useState(true);

  const { data: policy, isLoading } = usePolicy(id);
  const { data: versions } = usePolicyVersions(id);

  const submitPolicy = useSubmitPolicy();
  const approvePolicy = useApprovePolicy();
  const publishPolicy = usePublishPolicy();
  const retirePolicy = useRetirePolicy();

  const isActing =
    submitPolicy.isPending ||
    approvePolicy.isPending ||
    publishPolicy.isPending ||
    retirePolicy.isPending;

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--neutral-gray)]">Loading policy...</p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">Policy not found.</p>
      </div>
    );
  }

  const status = policy.status.toLowerCase();
  const currentStepIdx = STATUS_FLOW.indexOf(status);
  const reviewDays = daysUntil(policy.reviewDate);
  const expiryDays = daysUntil(policy.expiryDate);

  return (
    <div className="pb-8">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-5"
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/governance/policies")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Policies
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.03 }}
        className="mb-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <FileText size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
                {policy.title}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={policy.status} />
                <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                  v{policy.version}
                </span>
                {policy.category && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-700 dark:text-indigo-300">
                    <Layers size={11} />
                    {policy.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <StatusAction
              status={status}
              isActing={isActing}
              isPending={{
                submit: submitPolicy.isPending,
                approve: approvePolicy.isPending,
                publish: publishPolicy.isPending,
                retire: retirePolicy.isPending,
              }}
              onSubmit={() => submitPolicy.mutate(policy.id)}
              onApprove={() => approvePolicy.mutate(policy.id)}
              onPublish={() => publishPolicy.mutate(policy.id)}
              onRetire={() => retirePolicy.mutate(policy.id)}
            />
            <button
              type="button"
              onClick={() => router.push(`/dashboard/governance/policies/${id}/edit`)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <Edit size={15} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/governance/policies/${id}/diff`)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <GitCompare size={15} />
              Diff
            </button>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/governance/policies/${id}/attestations`)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <ShieldCheck size={15} />
              Attestations
            </button>
          </div>
        </div>
      </motion.div>

      {/* Status pipeline */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
        className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-6 py-4"
      >
        <div className="flex items-center">
          {STATUS_FLOW.map((s, i) => {
            const isCurrent = i === currentStepIdx;
            const isDone = i < currentStepIdx;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                      isCurrent
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                        : isDone
                          ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                    }`}
                  >
                    {isDone ? <Check size={14} strokeWidth={3} /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  <span className={`text-xs font-medium capitalize hidden sm:block ${
                    isCurrent ? "text-[var(--primary)]" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--neutral-gray)]"
                  }`}>
                    {s.replace("_", " ")}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className="flex-1 mx-2">
                    <div className="h-0.5 rounded-full bg-[var(--border)] overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500"
                        initial={false}
                        animate={{ width: isDone ? "100%" : "0%" }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Two-panel layout */}
      <div className="flex gap-6 items-start flex-col lg:flex-row">
        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Description */}
          {policy.description && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.09 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
            >
              <h2 className="mb-2.5 text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <BookOpen size={14} className="text-[var(--text-secondary)]" />
                Description
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {policy.description}
              </p>
            </motion.div>
          )}

          {/* Tags */}
          {policy.tags && policy.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.11 }}
              className="flex flex-wrap gap-2"
            >
              {policy.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-0)] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                >
                  <Tag size={11} className="text-[var(--neutral-gray)]" />
                  {tag}
                </span>
              ))}
            </motion.div>
          )}

          {/* Policy Content */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.13 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setContentExpanded(!contentExpanded)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-1)]/50 transition-colors"
            >
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FileText size={14} className="text-[var(--text-secondary)]" />
                Policy Content
              </h2>
              {contentExpanded ? (
                <ChevronDown size={16} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronRight size={16} className="text-[var(--text-secondary)]" />
              )}
            </button>
            {contentExpanded && (
              <div className="border-t border-[var(--border)] px-5 py-5">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)] max-w-none prose-sm">
                  {policy.content}
                </div>
              </div>
            )}
          </motion.div>

          {/* Version History */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <History size={14} className="text-[var(--text-secondary)]" />
              Version History
            </h2>
            {!versions || versions.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={32} className="mx-auto mb-2 text-[var(--neutral-gray)]/40" />
                <p className="text-sm text-[var(--neutral-gray)]">
                  No version history yet.
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--border)]" />

                <div className="space-y-4">
                  {versions.map((v, i) => (
                    <div key={v.id} className="relative flex items-start gap-4 pl-1">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 ${
                        i === 0
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                      }`}>
                        <Clock size={13} />
                      </div>
                      <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/30 p-3 -mt-0.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            Version {v.version}
                          </span>
                          <span className="text-xs text-[var(--neutral-gray)]">
                            {formatDate(v.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                          {v.title}
                        </p>
                        {v.changesSummary && (
                          <p className="mt-1.5 text-xs text-[var(--neutral-gray)] bg-[var(--surface-1)] rounded-lg px-2.5 py-1.5 inline-block">
                            {v.changesSummary}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Sidebar ── */}
        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="w-full lg:w-80 shrink-0 lg:sticky lg:top-6 space-y-4"
        >
          {/* Date cards */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)]/40">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Calendar size={13} className="text-[var(--text-secondary)]" />
                Key Dates
              </h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              <DateRow
                label="Effective Date"
                date={formatDate(policy.effectiveDate)}
              />
              <DateRow
                label="Review Date"
                date={formatDate(policy.reviewDate)}
                warning={reviewDays !== null && reviewDays >= 0 && reviewDays <= 30
                  ? `Due in ${reviewDays} days`
                  : reviewDays !== null && reviewDays < 0
                    ? `Overdue by ${Math.abs(reviewDays)} days`
                    : undefined
                }
                isOverdue={reviewDays !== null && reviewDays < 0}
              />
              <DateRow
                label="Expiry Date"
                date={formatDate(policy.expiryDate)}
                warning={expiryDays !== null && expiryDays >= 0 && expiryDays <= 60
                  ? `Expires in ${expiryDays} days`
                  : expiryDays !== null && expiryDays < 0
                    ? `Expired ${Math.abs(expiryDays)} days ago`
                    : undefined
                }
                isOverdue={expiryDays !== null && expiryDays < 0}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)]/40">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <User size={13} className="text-[var(--text-secondary)]" />
                Details
              </h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              <MetaRow label="Scope Type" value={policy.scopeType} capitalize />
              <MetaRow label="Owner" value={policy.ownerId ? policy.ownerId.slice(0, 8) + "..." : "Not assigned"} />
              <MetaRow label="Created By" value={policy.createdBy ? policy.createdBy.slice(0, 8) + "..." : "\u2014"} />
              <MetaRow label="Last Updated" value={new Date(policy.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
              <MetaRow label="Created" value={formatDate(policy.createdAt) || "\u2014"} />
            </div>
          </div>

          {/* Quick actions (sidebar) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <SidebarAction
              icon={<Edit size={15} />}
              label="Edit Policy"
              onClick={() => router.push(`/dashboard/governance/policies/${id}/edit`)}
            />
            <SidebarAction
              icon={<GitCompare size={15} />}
              label="Compare Versions"
              onClick={() => router.push(`/dashboard/governance/policies/${id}/diff`)}
            />
            <SidebarAction
              icon={<ShieldCheck size={15} />}
              label="View Attestations"
              onClick={() => router.push(`/dashboard/governance/policies/${id}/attestations`)}
            />
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Check({ size, strokeWidth }: { size: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StatusAction({
  status,
  isActing,
  isPending,
  onSubmit,
  onApprove,
  onPublish,
  onRetire,
}: {
  status: string;
  isActing: boolean;
  isPending: { submit: boolean; approve: boolean; publish: boolean; retire: boolean };
  onSubmit: () => void;
  onApprove: () => void;
  onPublish: () => void;
  onRetire: () => void;
}) {
  if (status === "draft") {
    return (
      <button type="button" disabled={isActing} onClick={onSubmit}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-600/25 disabled:opacity-50">
        {isPending.submit ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Submit for Review
      </button>
    );
  }
  if (status === "in_review") {
    return (
      <button type="button" disabled={isActing} onClick={onApprove}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-emerald-600/25 disabled:opacity-50">
        {isPending.approve ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        Approve
      </button>
    );
  }
  if (status === "approved") {
    return (
      <button type="button" disabled={isActing} onClick={onPublish}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-600/25 disabled:opacity-50">
        {isPending.publish ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
        Publish
      </button>
    );
  }
  if (status === "published") {
    return (
      <button type="button" disabled={isActing} onClick={onRetire}
        className="flex items-center gap-2 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-5 py-2 text-sm font-semibold text-red-700 dark:text-red-300 transition-all hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50">
        {isPending.retire ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
        Retire
      </button>
    );
  }
  return null;
}

function DateRow({
  label,
  date,
  warning,
  isOverdue,
}: {
  label: string;
  date: string | null;
  warning?: string;
  isOverdue?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-[var(--neutral-gray)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
        {date || "Not set"}
      </p>
      {warning && (
        <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${isOverdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
          <AlertTriangle size={11} />
          {warning}
        </p>
      )}
    </div>
  );
}

function MetaRow({
  label,
  value,
  capitalize: cap,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-2">
      <span className="text-xs text-[var(--neutral-gray)] shrink-0">{label}</span>
      <span className={`text-sm text-[var(--text-primary)] font-medium text-right truncate ${cap ? "capitalize" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function SidebarAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
    >
      <span className="text-[var(--neutral-gray)]">{icon}</span>
      {label}
    </button>
  );
}
