"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clipboard,
  ClipboardCheck,
  DatabaseZap,
  Eye,
  FileCode2,
  Fingerprint,
  History,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useApplyERPDirectory,
  useERPDirectoryRuns,
  usePreviewERPDirectory,
} from "@/hooks/use-system";
import type {
  ERPDirectoryImportPreview,
  ERPDirectoryImportRun,
  ERPDirectoryImportResult,
} from "@/types";

const DEFAULT_SOURCE_PATH = "/Users/mac/Downloads/erp_data_script 1.sql";

const PATH_PRESETS: { label: string; value: string }[] = [
  { label: "Default download", value: DEFAULT_SOURCE_PATH },
  { label: "Repo docs", value: "/Users/mac/codes/itd-opms/docs/erp_data_script 1.sql" },
];

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat("en-NG").format(value ?? 0);
}

function formatDate(value?: string) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(value?: string) {
  if (!value) return null;
  const then = new Date(value).getTime();
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function initialsOf(name: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

const RUN_STATUS_TONES: Record<
  string,
  { bg: string; fg: string; icon: LucideIcon; label?: string }
> = {
  completed: {
    bg: "var(--success-light)",
    fg: "var(--success-dark)",
    icon: CheckCircle2,
  },
  failed: {
    bg: "var(--error-light)",
    fg: "var(--error-dark)",
    icon: XCircle,
  },
  running: {
    bg: "var(--info-light)",
    fg: "var(--info-dark)",
    icon: RefreshCw,
  },
  preview: {
    bg: "var(--surface-2)",
    fg: "var(--text-secondary)",
    icon: Eye,
  },
};

function StatusBadge({ status }: { status: string }) {
  const tone = RUN_STATUS_TONES[status] ?? RUN_STATUS_TONES["running"]!;
  const Icon = tone.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
      style={{ background: tone.bg, color: tone.fg }}
    >
      <Icon
        size={13}
        className={status === "running" ? "animate-spin" : ""}
      />
      {status}
    </span>
  );
}

/* ============================================================== */
/* HERO                                                            */
/* ============================================================== */

function PageHero({
  lastRun,
  onRefresh,
  refreshing,
}: {
  lastRun?: ERPDirectoryImportRun;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const lastRel = formatRelative(lastRun?.completedAt ?? lastRun?.startedAt);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] p-6 lg:p-7"
      style={{
        background:
          "linear-gradient(135deg, rgba(27,115,64,0.06) 0%, rgba(139,111,46,0.05) 60%, var(--surface-0) 100%)",
      }}
    >
      <div
        className="absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "rgba(27,115,64,0.10)" }}
      />
      <div
        className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full blur-3xl"
        style={{ background: "rgba(139,111,46,0.08)" }}
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(27,115,64,0.2)] shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, rgba(27,115,64,0.14), rgba(139,111,46,0.10))",
            }}
          >
            <UserPlus size={24} className="text-[var(--primary)]" />
          </div>
          <div className="min-w-0">
            <div className="login-form-pill mb-2">
              <Sparkles className="h-3 w-3" />
              ERP Sync
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] lg:text-[1.75rem]">
              ERP Directory Import
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--neutral-gray)]">
              Reset OPMS users and the CBN organisation structure from the
              authoritative ERP employee dump. Preview the diff before applying
              — every run is checksummed and audited.
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-stretch gap-2 lg:items-end">
          {lastRun ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bento-dot-pulse"
                  style={{
                    background:
                      lastRun.status === "completed"
                        ? "var(--success)"
                        : lastRun.status === "failed"
                          ? "var(--error)"
                          : "var(--warning)",
                  }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Last run
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {lastRel ?? formatDate(lastRun.completedAt)}
                </span>
                <StatusBadge status={lastRun.status} />
              </div>
              <div className="mt-1 text-xs text-[var(--neutral-gray)]">
                {formatNumber(lastRun.usersCreated + lastRun.usersUpdated)}{" "}
                users synced · {formatNumber(lastRun.orgUnitsUpserted)} org
                units
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-xs text-[var(--neutral-gray)]">
              No imports run yet for this tenant.
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-1)] disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh history
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================== */
/* WORKFLOW STEPPER                                                */
/* ============================================================== */

function WorkflowStepper({
  step,
}: {
  step: 1 | 2 | 3;
}) {
  const steps = [
    { id: 1, label: "Configure source", icon: FileCode2 },
    { id: 2, label: "Preview diff", icon: Eye },
    { id: 3, label: "Apply import", icon: DatabaseZap },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 shadow-sm sm:gap-3">
      {steps.map((s, idx) => {
        const isDone = step > s.id;
        const isActive = step === s.id;
        const Icon = s.icon;
        return (
          <div key={s.id} className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isDone
                  ? "bg-[var(--success-light)] text-[var(--success-dark)]"
                  : isActive
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "bg-[var(--surface-1)] text-[var(--neutral-gray)]"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isDone
                    ? "bg-[var(--success)] text-white"
                    : isActive
                      ? "bg-white/25 text-white"
                      : "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                }`}
              >
                {isDone ? <CheckCircle2 size={12} /> : s.id}
              </span>
              <Icon size={13} />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight
                size={14}
                className="text-[var(--neutral-gray)]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================== */
/* SOURCE CONFIG CARD                                              */
/* ============================================================== */

function SourceCard({
  sourcePath,
  setSourcePath,
  deactivateUnmatched,
  setDeactivateUnmatched,
  onPreview,
  onApply,
  hasPreview,
  isPreviewLoading,
  isApplyLoading,
  canSubmit,
}: {
  sourcePath: string;
  setSourcePath: (v: string) => void;
  deactivateUnmatched: boolean;
  setDeactivateUnmatched: (v: boolean) => void;
  onPreview: () => void;
  onApply: () => void;
  hasPreview: boolean;
  isPreviewLoading: boolean;
  isApplyLoading: boolean;
  canSubmit: boolean;
}) {
  const isBusy = isPreviewLoading || isApplyLoading;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setSourcePath(text.trim());
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "rgba(27,115,64,0.1)" }}
        >
          <UploadCloud size={16} className="text-[var(--primary)]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Source configuration
          </h2>
          <p className="text-xs text-[var(--neutral-gray)]">
            Point to the SQL dump on the server's local filesystem.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <label
            htmlFor="source-path"
            className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]"
          >
            <span>ERP SQL dump path</span>
            {sourcePath && (
              <button
                type="button"
                onClick={() => setSourcePath("")}
                className="inline-flex items-center gap-1 text-[10px] font-semibold normal-case tracking-normal text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
              >
                <RotateCcw size={11} />
                Clear
              </button>
            )}
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="relative flex flex-1 items-center">
              <FileCode2
                size={16}
                className="pointer-events-none absolute left-3 text-[var(--neutral-gray)]"
              />
              <input
                id="source-path"
                value={sourcePath}
                onChange={(event) => setSourcePath(event.target.value)}
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] pl-9 pr-3 py-2.5 font-mono text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                placeholder="/path/to/erp_data_script.sql"
              />
            </div>
            <button
              type="button"
              onClick={handlePaste}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-1)]"
              title="Paste path from clipboard"
            >
              <Clipboard size={13} />
              Paste
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
              Quick paths
            </span>
            {PATH_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setSourcePath(preset.value)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  sourcePath === preset.value
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[var(--primary)]" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Deactivate unmatched users
                </p>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--neutral-gray)]">
                Existing OPMS users absent from this ERP file will be
                deactivated and their active role bindings revoked. Audit and
                history references stay intact.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={deactivateUnmatched}
              onClick={() => setDeactivateUnmatched(!deactivateUnmatched)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                deactivateUnmatched
                  ? "bg-[var(--primary)]"
                  : "bg-[var(--surface-3)]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                  deactivateUnmatched ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--neutral-gray)]">
            <Info size={12} />
            Preview is read-only — no writes happen until you confirm Apply.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPreview}
              disabled={!canSubmit || isBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPreviewLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Eye size={15} />
              )}
              {hasPreview ? "Re-preview" : "Preview diff"}
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={!canSubmit || isBusy || !hasPreview}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-50"
              title={
                !hasPreview
                  ? "Run a preview before applying"
                  : "Apply ERP directory import"
              }
            >
              {isApplyLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <DatabaseZap size={15} />
              )}
              Apply Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================== */
/* APPLY RESULT BANNER                                             */
/* ============================================================== */

function ApplyResultBanner({
  result,
  onDismiss,
}: {
  result: ERPDirectoryImportResult;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="overflow-hidden rounded-2xl border p-5 shadow-sm"
      style={{
        background:
          "linear-gradient(135deg, var(--success-light) 0%, var(--surface-0) 80%)",
        borderColor: "rgba(16,185,129,0.3)",
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: "var(--success)" }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success-dark)]">
              Import applied
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-[var(--text-primary)]">
              {formatNumber(result.usersCreated)} created ·{" "}
              {formatNumber(result.usersUpdated)} updated ·{" "}
              {formatNumber(result.usersDeactivated)} deactivated
            </h3>
            <p className="mt-1 text-xs text-[var(--neutral-gray)]">
              Run <span className="font-mono">{result.runId.slice(0, 8)}</span>{" "}
              · {formatNumber(result.orgUnitsUpserted)} org units ·{" "}
              {formatNumber(result.roleBindingsAdded)} role bindings ·{" "}
              completed {formatRelative(result.completedAt) ?? "just now"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
        >
          <XCircle size={13} />
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

/* ============================================================== */
/* PREVIEW PANELS                                                   */
/* ============================================================== */

function PrimaryMetricTile({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: string;
  hint?: string;
}) {
  return (
    <div
      className="card-interactive group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      style={{
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(15,23,42,0.04)",
      }}
    >
      <div
        className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `${tone}40` }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
            {label}
          </p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {hint && (
            <p className="mt-1 text-[11px] text-[var(--neutral-gray)]">
              {hint}
            </p>
          )}
        </div>
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${tone}18`, color: tone }}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function HierarchyPanel({ preview }: { preview: ERPDirectoryImportPreview }) {
  const total = Math.max(
    preview.departments + preview.divisions + preview.offices,
    1,
  );
  const rows = [
    {
      label: "Departments",
      value: preview.departments,
      tone: "#1B7340",
    },
    {
      label: "Divisions",
      value: preview.divisions,
      tone: "#8B6F2E",
    },
    {
      label: "Offices",
      value: preview.offices,
      tone: "#3B82F6",
    },
  ];
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-[var(--primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Org hierarchy
          </h3>
        </div>
        <span className="text-xs font-semibold text-[var(--neutral-gray)]">
          {formatNumber(total)} units
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((row) => {
          const pct = (row.value / total) * 100;
          return (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-secondary)]">
                  {row.label}
                </span>
                <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatNumber(row.value)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: row.tone }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-4">
        <div className="rounded-lg bg-[var(--surface-1)] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
            Supervisors
          </p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--text-primary)]">
            {formatNumber(preview.supervisors)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-1)] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
            Heads of division
          </p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--text-primary)]">
            {formatNumber(preview.headsOfDivision)}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailQualityPanel({
  preview,
}: {
  preview: ERPDirectoryImportPreview;
}) {
  const total = Math.max(preview.employeesTotal, 1);
  const issues =
    preview.missingEmails + preview.invalidEmails + preview.duplicateEmails;
  const valid = Math.max(total - issues, 0);
  const rows = [
    { label: "Valid", value: valid, tone: "var(--success)" },
    {
      label: "Missing",
      value: preview.missingEmails,
      tone: "var(--neutral-gray)",
    },
    {
      label: "Invalid",
      value: preview.invalidEmails,
      tone: "var(--warning)",
    },
    {
      label: "Duplicate",
      value: preview.duplicateEmails,
      tone: "var(--error)",
    },
    {
      label: "Placeholder",
      value: preview.placeholderEmails,
      tone: "#7C3AED",
    },
  ];
  const validPct = Math.round((valid / total) * 100);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-[var(--primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Email quality
          </h3>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{
            background:
              validPct >= 90
                ? "var(--success-light)"
                : validPct >= 70
                  ? "var(--warning-light)"
                  : "var(--error-light)",
            color:
              validPct >= 90
                ? "var(--success-dark)"
                : validPct >= 70
                  ? "var(--warning-dark)"
                  : "var(--error-dark)",
          }}
        >
          {validPct}% valid
        </span>
      </div>

      {/* Stacked bar */}
      <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        {rows.map((row) => {
          const pct = (row.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <motion.div
              key={row.label}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: row.tone }}
              title={`${row.label}: ${formatNumber(row.value)}`}
            />
          );
        })}
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: row.tone }}
              />
              {row.label}
            </span>
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">
              {formatNumber(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourcePanel({ preview }: { preview: ERPDirectoryImportPreview }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preview.sourceChecksum);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Fingerprint size={15} className="text-[var(--primary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Source integrity
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
            Path
          </p>
          <p className="mt-1 break-all rounded-lg bg-[var(--surface-1)] px-3 py-2 font-mono text-[11px] text-[var(--text-secondary)]">
            {preview.sourcePath}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
              SHA-256
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
            >
              {copied ? (
                <>
                  <ClipboardCheck size={11} className="text-[var(--success)]" />
                  Copied
                </>
              ) : (
                <>
                  <Clipboard size={11} />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="mt-1 break-all rounded-lg bg-[var(--surface-1)] px-3 py-2 font-mono text-[11px] text-[var(--text-secondary)]">
            {preview.sourceChecksum}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
              Total rows
            </p>
            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--text-primary)]">
              {formatNumber(preview.totalRows)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
              Parse errors
            </p>
            <p
              className={`mt-0.5 text-base font-bold tabular-nums ${
                preview.parseErrors > 0
                  ? "text-[var(--error)]"
                  : "text-[var(--text-primary)]"
              }`}
            >
              {formatNumber(preview.parseErrors)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewSummary({ preview }: { preview: ERPDirectoryImportPreview }) {
  const orgUnitTotal =
    preview.departments + preview.divisions + preview.offices + 1;
  const metrics = [
    {
      label: "Employees",
      value: preview.employeesTotal,
      icon: Users,
      tone: "#2563EB",
      hint: `${formatNumber(preview.loginEligibleEmployees)} login-eligible`,
    },
    {
      label: "Active",
      value: preview.activeEmployees,
      icon: CheckCircle2,
      tone: "#16A34A",
      hint: `${formatNumber(preview.inactiveEmployees)} inactive`,
    },
    {
      label: "Org units",
      value: orgUnitTotal,
      icon: Building2,
      tone: "#7C3AED",
      hint: "Departments · Divisions · Offices",
    },
    {
      label: "Supervisors",
      value: preview.supervisors,
      icon: Users,
      tone: "#0E7490",
      hint: `${formatNumber(preview.headsOfDivision)} heads of division`,
    },
    {
      label: "Elevated admins",
      value: preview.elevatedAdmins,
      icon: ShieldCheck,
      tone: "#DC2626",
      hint: "Will receive admin role",
    },
    {
      label: "Email issues",
      value:
        preview.missingEmails +
        preview.invalidEmails +
        preview.duplicateEmails,
      icon: AlertTriangle,
      tone: "#D97706",
      hint: `${formatNumber(preview.placeholderEmails)} placeholders`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <PrimaryMetricTile key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HierarchyPanel preview={preview} />
        <EmailQualityPanel preview={preview} />
        <SourcePanel preview={preview} />
      </div>
    </div>
  );
}

/* ============================================================== */
/* SAMPLE USERS                                                    */
/* ============================================================== */

const AVATAR_TONES = [
  "#1B7340",
  "#8B6F2E",
  "#0E7490",
  "#7C3AED",
  "#DC2626",
  "#D97706",
  "#2563EB",
  "#0F766E",
];
function avatarTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
}

function SampleUsers({ preview }: { preview: ERPDirectoryImportPreview }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "elevated" | "issues">(
    "all",
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return preview.samples.filter((s) => {
      if (filter === "active" && !s.isActive) return false;
      if (filter === "elevated" && !s.isElevated) return false;
      if (filter === "issues" && s.emailQuality === "valid") return false;
      if (!q) return true;
      return (
        s.displayName.toLowerCase().includes(q) ||
        s.employeeNumber.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.jobTitle.toLowerCase().includes(q) ||
        (s.office || "").toLowerCase().includes(q) ||
        (s.division || "").toLowerCase().includes(q) ||
        (s.department || "").toLowerCase().includes(q)
      );
    });
  }, [preview.samples, search, filter]);

  const filterChips: { id: typeof filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: preview.samples.length },
    {
      id: "active",
      label: "Active",
      count: preview.samples.filter((s) => s.isActive).length,
    },
    {
      id: "elevated",
      label: "Elevated",
      count: preview.samples.filter((s) => s.isElevated).length,
    },
    {
      id: "issues",
      label: "Email issues",
      count: preview.samples.filter((s) => s.emailQuality !== "valid").length,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Sample users
          </h2>
          <p className="text-xs text-[var(--neutral-gray)]">
            A representative slice of the dataset for spot-checks before apply.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, email, org…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-1)] px-5 py-2.5">
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              filter === chip.id
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface-0)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {chip.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                filter === chip.id
                  ? "bg-white/20 text-white"
                  : "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
              }`}
            >
              {chip.count}
            </span>
          </button>
        ))}
        <span className="ml-auto text-[11px] text-[var(--neutral-gray)]">
          Showing {filtered.length} of {preview.samples.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface-1)] text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
            <tr>
              <th className="px-5 py-3">Employee</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Job</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Organisation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-sm text-[var(--neutral-gray)]"
                >
                  No samples match the current search/filter.
                </td>
              </tr>
            ) : (
              filtered.map((sample) => {
                const tone = avatarTone(sample.employeeNumber);
                const orgChain = [
                  sample.department,
                  sample.division,
                  sample.office,
                ].filter(Boolean);
                return (
                  <tr
                    key={sample.employeeNumber}
                    className="transition hover:bg-[var(--surface-1)]"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                          style={{ background: tone }}
                          aria-hidden
                        >
                          {initialsOf(sample.displayName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--text-primary)]">
                            {sample.displayName}
                          </p>
                          <p className="text-[11px] text-[var(--neutral-gray)]">
                            #{sample.employeeNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            sample.isActive
                              ? "bg-[var(--success-light)] text-[var(--success-dark)]"
                              : "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              sample.isActive
                                ? "bg-[var(--success)]"
                                : "bg-[var(--neutral-gray)]"
                            }`}
                          />
                          {sample.isActive ? "active" : "inactive"}
                        </span>
                        {sample.isElevated && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--error-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--error-dark)]">
                            <ShieldCheck size={10} />
                            admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">
                      {sample.jobTitle || (
                        <span className="text-[var(--neutral-gray)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="break-all font-mono text-[12px] text-[var(--text-secondary)]">
                          {sample.email || "—"}
                        </span>
                        {sample.emailQuality !== "valid" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warning-dark)]">
                            <AlertTriangle size={10} />
                            {sample.emailQuality}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">
                      {orgChain.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 text-[12px]">
                          {orgChain.map((seg, i) => (
                            <span key={i} className="inline-flex items-center gap-1">
                              <span
                                className={
                                  i === orgChain.length - 1
                                    ? "font-medium text-[var(--text-primary)]"
                                    : "text-[var(--neutral-gray)]"
                                }
                              >
                                {seg}
                              </span>
                              {i < orgChain.length - 1 && (
                                <ChevronRight
                                  size={11}
                                  className="text-[var(--neutral-gray)]"
                                />
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--neutral-gray)]">CBN</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================== */
/* RUN HISTORY (TIMELINE)                                          */
/* ============================================================== */

function RunRow({ run, isLast }: { run: ERPDirectoryImportRun; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const tone = RUN_STATUS_TONES[run.status] ?? RUN_STATUS_TONES["running"]!;
  const Icon = tone.icon;

  return (
    <div className="relative pl-9">
      {!isLast && (
        <span
          className="absolute left-[14px] top-9 bottom-0 w-px"
          style={{ background: "var(--border)" }}
        />
      )}
      <span
        className="absolute left-0 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface-0)]"
        style={{ background: tone.bg, color: tone.fg }}
      >
        <Icon
          size={13}
          className={run.status === "running" ? "animate-spin" : ""}
        />
      </span>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-left transition hover:border-[var(--primary)]/30 hover:bg-[var(--surface-1)]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={run.status} />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {formatRelative(run.completedAt ?? run.startedAt) ??
                formatDate(run.startedAt)}
            </span>
            <span className="text-[11px] text-[var(--neutral-gray)]">
              · {run.mode}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--neutral-gray)]">
            <span className="font-semibold text-[var(--text-secondary)]">
              {formatNumber(run.totalRows)}
            </span>{" "}
            rows ·{" "}
            <span className="font-semibold text-[var(--success-dark)]">
              +{formatNumber(run.usersCreated)}
            </span>{" "}
            ·{" "}
            <span className="font-semibold text-[var(--info-dark)]">
              ~{formatNumber(run.usersUpdated)}
            </span>{" "}
            ·{" "}
            <span className="font-semibold text-[var(--neutral-gray)]">
              −{formatNumber(run.usersDeactivated)}
            </span>
            {run.warningsCount > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-[var(--warning-dark)]">
                  {formatNumber(run.warningsCount)} warnings
                </span>
              </>
            )}
            {run.errorsCount > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-[var(--error-dark)]">
                  {formatNumber(run.errorsCount)} errors
                </span>
              </>
            )}
          </p>
        </div>
        <ChevronDown
          size={15}
          className={`mt-1 flex-shrink-0 text-[var(--neutral-gray)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Started", value: formatDate(run.startedAt) },
                {
                  label: "Completed",
                  value: run.completedAt ? formatDate(run.completedAt) : "—",
                },
                {
                  label: "Org units upserted",
                  value: formatNumber(run.orgUnitsUpserted),
                },
                {
                  label: "Role bindings added",
                  value: formatNumber(run.roleBindingsAdded),
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                    {item.value}
                  </p>
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Source path
                </p>
                <p className="mt-0.5 break-all font-mono text-xs text-[var(--text-secondary)]">
                  {run.sourcePath}
                </p>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Checksum
                </p>
                <p className="mt-0.5 break-all font-mono text-xs text-[var(--text-secondary)]">
                  {run.sourceChecksum}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImportRuns({ runs }: { runs: ERPDirectoryImportRun[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center gap-2">
          <History size={15} className="text-[var(--primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Recent imports
          </h2>
        </div>
        <span className="text-xs text-[var(--neutral-gray)]">
          {runs.length} run{runs.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="p-5">
        {runs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] py-10 text-center">
            <History
              size={28}
              className="mx-auto text-[var(--neutral-gray)]"
            />
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              No import runs yet
            </p>
            <p className="mt-1 text-xs text-[var(--neutral-gray)]">
              The first preview/apply will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run, idx) => (
              <RunRow
                key={run.id}
                run={run}
                isLast={idx === runs.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================== */
/* PAGE                                                             */
/* ============================================================== */

export default function ERPDirectoryPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "ERP Directory", href: "/dashboard/system/erp-directory" },
  ]);

  const [sourcePath, setSourcePath] = useState(DEFAULT_SOURCE_PATH);
  const [deactivateUnmatched, setDeactivateUnmatched] = useState(true);
  const [preview, setPreview] = useState<ERPDirectoryImportPreview | null>(null);
  const [lastResult, setLastResult] = useState<ERPDirectoryImportResult | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const previewMutation = usePreviewERPDirectory();
  const applyMutation = useApplyERPDirectory();
  const runsQuery = useERPDirectoryRuns(10);

  const requestBody = useMemo(
    () => ({ sourcePath: sourcePath.trim(), deactivateUnmatched }),
    [sourcePath, deactivateUnmatched],
  );

  const canSubmit = sourcePath.trim().length > 0;
  const isBusy = previewMutation.isPending || applyMutation.isPending;
  const lastRun = runsQuery.data?.[0];

  const step: 1 | 2 | 3 = useMemo(() => {
    if (lastResult) return 3;
    if (preview) return 2;
    return 1;
  }, [preview, lastResult]);

  // Clear preview when source path or toggle changes — stale state would mislead users
  useEffect(() => {
    setPreview(null);
    setLastResult(null);
  }, [sourcePath, deactivateUnmatched]);

  const handlePreview = () => {
    if (!canSubmit) return;
    previewMutation.mutate(requestBody, {
      onSuccess: (data) => {
        setPreview(data);
        setLastResult(null);
      },
    });
  };

  const handleApply = () => {
    if (!canSubmit) return;
    applyMutation.mutate(requestBody, {
      onSuccess: (data) => {
        setPreview(data.preview);
        setLastResult(data);
        setConfirmOpen(false);
      },
    });
  };

  return (
    <PermissionGate permission="system.manage">
      <div className="space-y-6">
        <PageHero
          lastRun={lastRun}
          onRefresh={() => runsQuery.refetch()}
          refreshing={runsQuery.isFetching}
        />

        <WorkflowStepper step={step} />

        <SourceCard
          sourcePath={sourcePath}
          setSourcePath={setSourcePath}
          deactivateUnmatched={deactivateUnmatched}
          setDeactivateUnmatched={setDeactivateUnmatched}
          onPreview={handlePreview}
          onApply={() => setConfirmOpen(true)}
          hasPreview={!!preview}
          isPreviewLoading={previewMutation.isPending}
          isApplyLoading={applyMutation.isPending}
          canSubmit={canSubmit}
        />

        <AnimatePresence>
          {lastResult && (
            <ApplyResultBanner
              key={lastResult.runId}
              result={lastResult}
              onDismiss={() => setLastResult(null)}
            />
          )}
        </AnimatePresence>

        {preview ? (
          <motion.div
            key="preview-block"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <PreviewSummary preview={preview} />

            {preview.warnings.length > 0 && (
              <div
                className="rounded-2xl border p-5 shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, var(--warning-light) 0%, var(--surface-0) 70%)",
                  borderColor: "rgba(245,158,11,0.3)",
                }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--warning-dark)]">
                  <AlertTriangle size={16} />
                  Import warnings ({preview.warnings.length})
                </div>
                <ul className="mt-3 grid gap-2 text-sm text-[var(--warning-dark)] sm:grid-cols-2">
                  {preview.warnings.map((warning) => (
                    <li
                      key={warning}
                      className="flex items-start gap-2 rounded-lg bg-[var(--surface-0)]/60 px-3 py-2"
                    >
                      <AlertTriangle
                        size={13}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <SampleUsers preview={preview} />
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] p-10 text-center">
            <div className="float-empty mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
              <DatabaseZap className="h-7 w-7 text-[var(--neutral-gray)]" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              No preview loaded
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--neutral-gray)]">
              Run a preview to inspect employee counts, org hierarchy, email
              quality, elevated roles, and sample users before applying.
            </p>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!canSubmit || isBusy}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Eye size={15} />
              )}
              Run preview
            </button>
          </div>
        )}

        <ImportRuns runs={runsQuery.data ?? []} />

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleApply}
          title="Apply ERP directory import?"
          message="This will upsert ERP employees, rebuild the CBN org structure, assign derived roles, deactivate unmatched users when selected, and preserve existing audit/history references."
          confirmLabel="Apply Import"
          variant="warning"
          loading={applyMutation.isPending}
        />
      </div>
    </PermissionGate>
  );
}
