"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  DatabaseZap,
  Eye,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
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

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === "completed";
  const isFailed = status === "failed";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isSuccess
          ? "bg-[var(--success-light)] text-[var(--success)]"
          : isFailed
            ? "bg-[var(--error-light)] text-[var(--error)]"
            : "bg-[var(--warning-light)] text-[var(--warning-dark)]"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={13} />
      ) : isFailed ? (
        <XCircle size={13} />
      ) : (
        <RefreshCw size={13} />
      )}
      {status}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--neutral-gray)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${tone}18`, color: tone }}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function PreviewSummary({ preview }: { preview: ERPDirectoryImportPreview }) {
  const metrics = [
    {
      label: "Employees",
      value: preview.employeesTotal,
      icon: Users,
      tone: "#2563EB",
    },
    {
      label: "Active",
      value: preview.activeEmployees,
      icon: CheckCircle2,
      tone: "#16A34A",
    },
    {
      label: "Inactive",
      value: preview.inactiveEmployees,
      icon: XCircle,
      tone: "#64748B",
    },
    {
      label: "Org Units",
      value: preview.departments + preview.divisions + preview.offices + 1,
      icon: Building2,
      tone: "#7C3AED",
    },
    {
      label: "Elevated Admins",
      value: preview.elevatedAdmins,
      icon: ShieldCheck,
      tone: "#DC2626",
    },
    {
      label: "Placeholder Emails",
      value: preview.placeholderEmails,
      icon: AlertTriangle,
      tone: "#D97706",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Hierarchy</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-[var(--neutral-gray)]">Departments</p>
              <p className="font-semibold tabular-nums">{formatNumber(preview.departments)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--neutral-gray)]">Divisions</p>
              <p className="font-semibold tabular-nums">{formatNumber(preview.divisions)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--neutral-gray)]">Offices</p>
              <p className="font-semibold tabular-nums">{formatNumber(preview.offices)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Email Quality</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-[var(--neutral-gray)]">Missing</p>
              <p className="font-semibold tabular-nums">{formatNumber(preview.missingEmails)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--neutral-gray)]">Invalid</p>
              <p className="font-semibold tabular-nums">{formatNumber(preview.invalidEmails)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--neutral-gray)]">Duplicate</p>
              <p className="font-semibold tabular-nums">{formatNumber(preview.duplicateEmails)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Source</p>
          <p className="mt-3 break-all text-xs text-[var(--neutral-gray)]">
            {preview.sourceChecksum.slice(0, 24)}...
          </p>
          <p className="mt-2 text-xs text-[var(--neutral-gray)]">
            {formatNumber(preview.totalRows)} rows, {formatNumber(preview.parseErrors)} parse errors
          </p>
        </div>
      </div>
    </div>
  );
}

function SampleUsers({ preview }: { preview: ERPDirectoryImportPreview }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-0)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sample Users</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-1)] text-left text-xs uppercase text-[var(--neutral-gray)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Job</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Org</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {preview.samples.map((sample) => (
              <tr key={sample.employeeNumber}>
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                  {sample.employeeNumber}
                </td>
                <td className="px-4 py-3 text-[var(--text-primary)]">{sample.displayName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      sample.isActive
                        ? "bg-[var(--success-light)] text-[var(--success)]"
                        : "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                    }`}
                  >
                    {sample.isActive ? "active" : "inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {sample.jobTitle}
                  {sample.isElevated && (
                    <span className="ml-2 rounded-full bg-[var(--error-light)] px-2 py-0.5 text-xs font-semibold text-[var(--error)]">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  <span className="break-all">{sample.email}</span>
                  {sample.emailQuality !== "valid" && (
                    <span className="ml-2 rounded-full bg-[var(--warning-light)] px-2 py-0.5 text-xs font-semibold text-[var(--warning-dark)]">
                      {sample.emailQuality}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {sample.office || sample.division || sample.department || "CBN"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportRuns({ runs }: { runs: ERPDirectoryImportRun[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-0)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <History size={16} className="text-[var(--neutral-gray)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Imports</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-1)] text-left text-xs uppercase text-[var(--neutral-gray)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Started</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Rows</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold">Deactivated</th>
              <th className="px-4 py-3 font-semibold">Org Units</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--neutral-gray)]">
                  No import runs yet.
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(run.startedAt)}</td>
                  <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                  <td className="px-4 py-3 tabular-nums">{formatNumber(run.totalRows)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatNumber(run.usersCreated)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatNumber(run.usersUpdated)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatNumber(run.usersDeactivated)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatNumber(run.orgUnitsUpserted)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ERPDirectoryPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "ERP Directory", href: "/dashboard/system/erp-directory" },
  ]);

  const [sourcePath, setSourcePath] = useState(DEFAULT_SOURCE_PATH);
  const [deactivateUnmatched, setDeactivateUnmatched] = useState(true);
  const [preview, setPreview] = useState<ERPDirectoryImportPreview | null>(null);
  const [lastResult, setLastResult] = useState<ERPDirectoryImportResult | null>(null);
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <UserPlus size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">ERP Directory Import</h1>
              <p className="text-sm text-[var(--neutral-gray)]">
                Reset OPMS users and organisation structure from the CBN ERP employee dump.
              </p>
            </div>
          </div>

          {lastResult && (
            <div className="rounded-lg border border-[var(--success)]/20 bg-[var(--success-light)] px-4 py-3 text-sm text-[var(--success)]">
              Completed {formatNumber(lastResult.usersCreated)} created,{" "}
              {formatNumber(lastResult.usersUpdated)} updated,{" "}
              {formatNumber(lastResult.usersDeactivated)} deactivated.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-sm font-medium text-[var(--text-primary)]">ERP SQL dump path</span>
              <input
                value={sourcePath}
                onChange={(event) => setSourcePath(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                placeholder="/path/to/erp_data_script.sql"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!canSubmit || isBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {previewMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                Preview
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!canSubmit || isBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <DatabaseZap size={16} />}
                Apply Import
              </button>
            </div>
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={deactivateUnmatched}
              onChange={(event) => setDeactivateUnmatched(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--border)]"
            />
            <span>Deactivate existing OPMS users not present in the ERP file and revoke their active roles.</span>
          </label>
        </div>

        {preview ? (
          <>
            <PreviewSummary preview={preview} />

            {preview.warnings.length > 0 && (
              <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-light)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--warning-dark)]">
                  <AlertTriangle size={16} />
                  Import warnings
                </div>
                <ul className="mt-3 space-y-2 text-sm text-[var(--warning-dark)]">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <SampleUsers preview={preview} />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-0)] p-8 text-center">
            <DatabaseZap className="mx-auto h-8 w-8 text-[var(--neutral-gray)]" />
            <h2 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">No preview loaded</h2>
            <p className="mt-1 text-sm text-[var(--neutral-gray)]">
              Run a preview to inspect counts, warnings, elevated roles, and sample users before applying.
            </p>
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
