"use client";

import { useMemo, useState, type ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  ArrowRightLeft,
  ListChecks,
  Sparkles,
  Activity,
  FileDown,
  RotateCcw,
  BadgeCheck,
  CheckSquare,
} from "lucide-react";
import {
  useSSARequests,
  useBulkApprove,
  useBulkStatusUpdate,
  useBulkExport,
} from "@/hooks/use-ssa";
import type {
  SSARequest,
  BulkOperationSummary,
  ExportedRequest,
} from "@/types/ssa";
import {
  SSA_STATUS_LABELS,
  SSA_STATUS_COLORS,
  APPROVAL_STAGES,
} from "@/types/ssa";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLOR_MAP: Record<string, string> = {
  neutral: "var(--text-secondary)",
  blue: "#3B82F6",
  amber: "#F59E0B",
  green: "#22C55E",
  teal: "#14B8A6",
  red: "#EF4444",
};

const STAGE_TO_STATUS: Record<string, string> = {
  APPR_DC: "APPR_DC_PENDING",
  APPR_SSO: "APPR_SSO_PENDING",
  APPR_IMD: "APPR_IMD_PENDING",
  APPR_ASD: "APPR_ASD_PENDING",
  APPR_SCAO: "APPR_SCAO_PENDING",
};

const ALLOWED_TRANSITIONS = [
  {
    fromStatus: "REJECTED",
    toStatus: "DRAFT",
    label: "Return rejected to draft",
  },
  {
    fromStatus: "DRAFT",
    toStatus: "CANCELLED",
    label: "Cancel draft requests",
  },
] as const;

const TAB_COPY = {
  approve: {
    title: "Bulk Approve",
    description:
      "Move approval queues in controlled batches without losing stage discipline.",
    accent: "#16A34A",
    icon: CheckCircle2,
  },
  status: {
    title: "Status Update",
    description:
      "Repair request-state drift safely when a batch needs a governed return path.",
    accent: "#D97706",
    icon: ArrowRightLeft,
  },
  export: {
    title: "Export",
    description:
      "Extract governed request portfolios for reporting, audit, and offline review.",
    accent: "#2563EB",
    icon: Download,
  },
} as const;

type TabKey = keyof typeof TAB_COPY;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusPill(status: string) {
  const label = SSA_STATUS_LABELS[status] || status;
  const color = COLOR_MAP[SSA_STATUS_COLORS[status]] || "var(--text-secondary)";

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{
        backgroundColor: `${color}14`,
        color,
      }}
    >
      {label}
    </span>
  );
}

function LoadingValue({ width = "w-16" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function HeroActionButton({
  icon: Icon,
  label,
  primary,
  onClick,
}: {
  icon: ElementType;
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
        primary
          ? "text-white hover:opacity-90"
          : "border text-[var(--text-primary)] hover:-translate-y-0.5 hover:shadow-md"
      }`}
      style={
        primary
          ? { backgroundColor: "#166534" }
          : {
              borderColor: "rgba(255,255,255,0.62)",
              backgroundColor: "rgba(255,255,255,0.74)",
              backdropFilter: "blur(18px)",
            }
      }
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function BulkResultSummary({
  result,
  accent,
  title,
}: {
  result: BulkOperationSummary;
  accent: string;
  title: string;
}) {
  const failedResults = result.results.filter((entry) => !entry.success);

  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: `${accent}28`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${accent}14, transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Operation result
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
        </div>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: `${accent}14`,
            color: accent,
          }}
        >
          <BadgeCheck size={12} />
          {result.succeeded}/{result.totalRequested} successful
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Total"
          value={result.totalRequested}
          helper="Requests included in the submitted batch."
        />
        <MetricCard
          label="Succeeded"
          value={result.succeeded}
          helper="Requests completed cleanly with no follow-up needed."
        />
        <MetricCard
          label="Failed"
          value={result.failed}
          helper="Requests that still require manual review."
        />
      </div>

      {failedResults.length > 0 && (
        <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Exceptions
          </p>
          <div className="mt-3 space-y-2">
            {failedResults.map((entry) => (
              <div
                key={entry.requestId}
                className="flex items-start gap-2 rounded-2xl bg-[var(--surface-1)] p-3 text-sm"
              >
                <XCircle size={16} className="mt-0.5 shrink-0 text-[#EF4444]" />
                <div className="min-w-0">
                  <p className="font-mono text-xs text-[var(--text-primary)]">
                    {entry.requestId}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {entry.error ||
                      "Operation failed without a returned reason."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/78 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function SelectionMetricCard({
  label,
  value,
  helper,
  accent,
  loading,
}: {
  label: string;
  value: number;
  helper: string;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      {loading ? (
        <div className="mt-3">
          <LoadingValue width="w-14" />
        </div>
      ) : (
        <p
          className="mt-3 text-2xl font-bold tabular-nums"
          style={{ color: accent }}
        >
          {value}
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function SelectionTable({
  requests,
  selected,
  loading,
  title,
  description,
  emptyTitle,
  emptyDescription,
  onToggleAll,
  onToggle,
}: {
  requests: SSARequest[];
  selected: Set<string>;
  loading: boolean;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  onToggleAll: () => void;
  onToggle: (id: string) => void;
}) {
  const allSelected = requests.length > 0 && selected.size === requests.length;

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)]">
      <div className="border-b border-[var(--border)] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Eligible requests
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            {selected.size} selected
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={22} className="animate-spin text-[var(--primary)]" />
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center">
          <CheckSquare
            size={28}
            className="mx-auto text-[var(--text-secondary)]"
          />
          <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
            {emptyTitle}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-[var(--surface-1)]">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    aria-label="Select all requests"
                  />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Application
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Division
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Revisions
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="transition-colors hover:bg-[var(--surface-1)]/60"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(request.id)}
                      onChange={() => onToggle(request.id)}
                      aria-label={`Select ${request.referenceNo}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-[var(--primary)]">
                    {request.referenceNo}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {request.appName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {request.serverType} • {request.vcpuCount} vCPU /{" "}
                        {request.memoryGb}GB
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {request.divisionOffice}
                  </td>
                  <td className="px-4 py-3">{statusPill(request.status)}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {request.revisionCount}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {formatDate(request.submittedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Approve Tab                                                        */
/* ------------------------------------------------------------------ */

function BulkApproveTab() {
  const [stage, setStage] = useState(APPROVAL_STAGES[0].value);
  const [remarks, setRemarks] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkOperationSummary | null>(null);

  const expectedStatus = STAGE_TO_STATUS[stage] || "";
  const stageLabel =
    APPROVAL_STAGES.find((entry) => entry.value === stage)?.label ?? stage;
  const { data, isLoading } = useSSARequests(1, 100, expectedStatus);
  const requests = data?.data ?? [];
  const bulkApprove = useBulkApprove();

  const stats = useMemo(() => {
    const revisionCount = requests.filter(
      (request) => request.revisionCount > 0,
    ).length;
    const divisions = new Set(requests.map((request) => request.divisionOffice))
      .size;
    return {
      eligible: requests.length,
      selected: selected.size,
      revised: revisionCount,
      divisions,
    };
  }, [requests, selected]);

  function toggleSelect(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === requests.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(requests.map((request) => request.id)));
  }

  async function handleApprove() {
    if (selected.size === 0) return;
    const response = await bulkApprove.mutateAsync({
      stage,
      requestIds: Array.from(selected),
      remarks: remarks || undefined,
    });
    setResult(response);
    setSelected(new Set());
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div
          className="rounded-[32px] border p-6 lg:p-7"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "rgba(22, 163, 74, 0.16)",
            backgroundImage:
              "radial-gradient(circle at 14% 18%, rgba(22,163,74,0.18), transparent 30%), radial-gradient(circle at 86% 14%, rgba(37,99,235,0.1), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                <BadgeCheck size={14} />
                Approval lane
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                Run controlled approvals
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] lg:text-base">
                Approve batches for the active SSA approval stage with clearer
                eligibility signals, tighter selection discipline, and a visible
                audit trail of what changed.
              </p>
            </div>

            <button
              type="button"
              onClick={handleApprove}
              disabled={selected.size === 0 || bulkApprove.isPending}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#16A34A" }}
            >
              {bulkApprove.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Approve {selected.size > 0 ? `(${selected.size})` : ""}
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Approval Stage
              </label>
              <select
                value={stage}
                onChange={(event) => {
                  setStage(event.target.value);
                  setSelected(new Set());
                  setResult(null);
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {APPROVAL_STAGES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Approval remarks..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/75 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Stage focus
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {stageLabel}
                </p>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Expecting requests in {SSA_STATUS_LABELS[expectedStatus]}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <SelectionMetricCard
            label="Eligible"
            value={stats.eligible}
            helper="Requests currently queued for this approval stage."
            accent="#16A34A"
            loading={isLoading}
          />
          <SelectionMetricCard
            label="Selected"
            value={stats.selected}
            helper="Requests currently included in the pending batch."
            accent="#2563EB"
            loading={isLoading}
          />
          <SelectionMetricCard
            label="Revised"
            value={stats.revised}
            helper="Requests that already passed through at least one revision cycle."
            accent="#D97706"
            loading={isLoading}
          />
          <SelectionMetricCard
            label="Divisions"
            value={stats.divisions}
            helper="Distinct divisions represented in this approval run."
            accent="#7C3AED"
            loading={isLoading}
          />
        </div>
      </div>

      <SelectionTable
        requests={requests}
        selected={selected}
        loading={isLoading}
        title={`Requests waiting for ${stageLabel}`}
        description="Use this board to select the right requests, confirm the stage context, and submit one governed approval run."
        emptyTitle="No requests pending at this stage"
        emptyDescription="This approval lane is currently clear. Switch to another stage or wait for the queue to refill."
        onToggleAll={toggleAll}
        onToggle={toggleSelect}
      />

      {result && (
        <BulkResultSummary
          result={result}
          accent="#16A34A"
          title="Approval batch completed"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Tab                                                         */
/* ------------------------------------------------------------------ */

function BulkStatusTab() {
  const [transitionIndex, setTransitionIndex] = useState(0);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkOperationSummary | null>(null);

  const { fromStatus, toStatus, label } = ALLOWED_TRANSITIONS[transitionIndex];
  const { data, isLoading } = useSSARequests(1, 100, fromStatus);
  const requests = data?.data ?? [];
  const bulkUpdate = useBulkStatusUpdate();

  const stats = useMemo(() => {
    const divisions = new Set(requests.map((request) => request.divisionOffice))
      .size;
    const submitted = requests.filter((request) =>
      Boolean(request.submittedAt),
    ).length;
    return {
      eligible: requests.length,
      selected: selected.size,
      divisions,
      submitted,
    };
  }, [requests, selected]);

  function toggleSelect(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === requests.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(requests.map((request) => request.id)));
  }

  async function handleUpdate() {
    if (selected.size === 0) return;
    const response = await bulkUpdate.mutateAsync({
      requestIds: Array.from(selected),
      fromStatus,
      toStatus,
      reason: reason || undefined,
    });
    setResult(response);
    setSelected(new Set());
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div
          className="rounded-[32px] border p-6 lg:p-7"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "rgba(217, 119, 6, 0.16)",
            backgroundImage:
              "radial-gradient(circle at 14% 18%, rgba(217,119,6,0.16), transparent 30%), radial-gradient(circle at 86% 14%, rgba(37,99,235,0.1), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                <RotateCcw size={14} />
                State repair
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                Repair state drift safely
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] lg:text-base">
                Run governed status repairs when requests need to move back into
                draft or be cancelled in a controlled batch instead of being
                handled one at a time.
              </p>
            </div>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={selected.size === 0 || bulkUpdate.isPending}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#D97706" }}
            >
              {bulkUpdate.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRightLeft size={16} />
              )}
              Update {selected.size > 0 ? `(${selected.size})` : ""}
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Transition
              </label>
              <select
                value={transitionIndex}
                onChange={(event) => {
                  setTransitionIndex(Number(event.target.value));
                  setSelected(new Set());
                  setResult(null);
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {ALLOWED_TRANSITIONS.map((entry, index) => (
                  <option key={entry.label} value={index}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for status change..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/75 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Active transition
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              {label}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {SSA_STATUS_LABELS[fromStatus]} → {SSA_STATUS_LABELS[toStatus]}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <SelectionMetricCard
            label="Eligible"
            value={stats.eligible}
            helper="Requests currently in the source state for this repair."
            accent="#D97706"
            loading={isLoading}
          />
          <SelectionMetricCard
            label="Selected"
            value={stats.selected}
            helper="Requests queued for this state update batch."
            accent="#2563EB"
            loading={isLoading}
          />
          <SelectionMetricCard
            label="Divisions"
            value={stats.divisions}
            helper="Distinct divisions touched by the current repair set."
            accent="#7C3AED"
            loading={isLoading}
          />
          <SelectionMetricCard
            label="Submitted"
            value={stats.submitted}
            helper="Requests in this batch that were already formally submitted."
            accent="#16A34A"
            loading={isLoading}
          />
        </div>
      </div>

      <SelectionTable
        requests={requests}
        selected={selected}
        loading={isLoading}
        title={`Requests currently in ${SSA_STATUS_LABELS[fromStatus]}`}
        description="Select the requests that need a governed state repair and submit a single controlled transition batch."
        emptyTitle={`No requests in ${SSA_STATUS_LABELS[fromStatus]} status`}
        emptyDescription="This repair lane is currently clear. Switch transition paths if you need a different subset."
        onToggleAll={toggleAll}
        onToggle={toggleSelect}
      />

      {result && (
        <BulkResultSummary
          result={result}
          accent="#D97706"
          title="Status repair batch completed"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Export Tab                                                         */
/* ------------------------------------------------------------------ */

function BulkExportTab() {
  const [status, setStatus] = useState("");
  const [division, setDivision] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const bulkExport = useBulkExport();

  const activeFilterCount = [status, division, fromDate, toDate].filter(
    Boolean,
  ).length;
  const exportCount = bulkExport.data?.length ?? 0;

  async function handleExport() {
    const filter: Record<string, string> = {};
    if (status) filter.status = status;
    if (division) filter.division = division;
    if (fromDate) filter.fromDate = `${fromDate}T00:00:00Z`;
    if (toDate) filter.toDate = `${toDate}T23:59:59Z`;

    const data = await bulkExport.mutateAsync(filter);
    const csv = exportToCSV(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ssa-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function clearFilters() {
    setStatus("");
    setDivision("");
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div
          className="rounded-[32px] border p-6 lg:p-7"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "rgba(37, 99, 235, 0.16)",
            backgroundImage:
              "radial-gradient(circle at 14% 18%, rgba(37,99,235,0.16), transparent 30%), radial-gradient(circle at 86% 14%, rgba(20,184,166,0.12), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                <FileDown size={14} />
                Export studio
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                Export request portfolios
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] lg:text-base">
                Pull governed CSV extracts for SSA requests using status,
                division, and date windows so reporting and audit work can
                happen outside the live workflow screens.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={bulkExport.isPending}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#2563EB" }}
            >
              {bulkExport.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Export CSV
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Status
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="">All Statuses</option>
                {Object.entries(SSA_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Division
              </label>
              <input
                type="text"
                value={division}
                onChange={(event) => setDivision(event.target.value)}
                placeholder="Filter by division..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-5 flex items-center justify-between rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/75 px-4 py-3">
              <p className="text-sm text-[var(--text-secondary)]">
                {activeFilterCount} export filter
                {activeFilterCount === 1 ? "" : "s"} active
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <SelectionMetricCard
            label="Active filters"
            value={activeFilterCount}
            helper="Filters shaping the next CSV export request."
            accent="#2563EB"
          />
          <SelectionMetricCard
            label="Last export"
            value={exportCount}
            helper="Requests included in the most recent export run."
            accent="#14B8A6"
          />
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Export scope
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              {status ? SSA_STATUS_LABELS[status] || status : "All statuses"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {division
                ? `Division filter set to ${division}.`
                : "No division restriction applied yet."}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Date window
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              {fromDate || toDate
                ? `${fromDate || "Any"} → ${toDate || "Any"}`
                : "No date restriction"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Use a bounded date range when you want a precise export for
              reporting or audit evidence.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Export notes
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              CSV delivery lane
            </h3>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <Download size={12} />
            {bulkExport.isPending ? "Preparing export" : "Ready to export"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              What gets exported
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              The CSV includes request metadata, current state, infrastructure
              sizing, requestor information, and lifecycle timestamps so
              downstream teams can analyze the portfolio outside the workflow
              UI.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Most recent result
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {bulkExport.data
                ? `Exported ${bulkExport.data.length} request(s) to CSV.`
                : "No export has been generated in this session yet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSV Export Helper                                                  */
/* ------------------------------------------------------------------ */

function exportToCSV(data: ExportedRequest[]): string {
  if (data.length === 0) return "";

  const headers = [
    "referenceNo",
    "status",
    "appName",
    "dbName",
    "operatingSystem",
    "serverType",
    "vcpuCount",
    "memoryGb",
    "spaceGb",
    "vlanZone",
    "divisionOffice",
    "justification",
    "requestorName",
    "requestorEmail",
    "revisionCount",
    "submittedAt",
    "completedAt",
    "createdAt",
  ] as const satisfies ReadonlyArray<keyof ExportedRequest>;

  const escape = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return text.includes(",") || text.includes('"') || text.includes("\n")
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  };

  const rows = data.map((row) =>
    headers.map((header) => escape(row[header])).join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function BulkOperationsPage() {
  const [tab, setTab] = useState<TabKey>("approve");
  const activeTab = TAB_COPY[tab];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(22, 101, 52, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(22,101,52,0.16), transparent 32%), radial-gradient(circle at 88% 16%, rgba(37,99,235,0.12), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(22, 101, 52, 0.24)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                <Sparkles size={14} />
                Governed batch control
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <ListChecks size={14} className="text-[#166534]" />
                SSA bulk operations
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                Bulk Operations
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                Approve queues, repair request state, and export SSA portfolios
                from one controlled workspace built for speed without losing
                audit clarity.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <HeroActionButton
                icon={CheckCircle2}
                label="Bulk Approve"
                primary
                onClick={() => setTab("approve")}
              />
              <HeroActionButton
                icon={ArrowRightLeft}
                label="Status Update"
                onClick={() => setTab("status")}
              />
              <HeroActionButton
                icon={Download}
                label="Export"
                onClick={() => setTab("export")}
              />
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.74)",
              borderColor: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Active lane
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Operation pulse
                </h2>
              </div>
              <Activity size={20} className="text-[#166534]" />
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {activeTab.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Active tool
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {activeTab.title}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Governed lanes
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  3
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Repair paths
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {ALLOWED_TRANSITIONS.length}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Export format
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  CSV
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="grid gap-3 md:grid-cols-3"
      >
        {(
          Object.entries(TAB_COPY) as Array<[TabKey, (typeof TAB_COPY)[TabKey]]>
        ).map(([key, value]) => {
          const Icon = value.icon;
          const active = tab === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="relative overflow-hidden rounded-[28px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: active ? value.accent : "var(--border)",
                backgroundColor: active
                  ? `${value.accent}10`
                  : "var(--surface-0)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: active
                      ? `${value.accent}18`
                      : "var(--surface-1)",
                    color: active ? value.accent : "var(--text-secondary)",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: active ? value.accent : "var(--text-primary)",
                      }}
                    >
                      {value.title}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {value.description}
                  </p>
                </div>
              </div>
              {active && (
                <motion.div
                  layoutId="ssa-bulk-tab"
                  className="absolute inset-x-0 top-0 h-1 rounded-t-[28px]"
                  style={{ backgroundColor: value.accent }}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {tab === "approve" && <BulkApproveTab />}
          {tab === "status" && <BulkStatusTab />}
          {tab === "export" && <BulkExportTab />}
        </motion.div>
      </AnimatePresence>

      <div className="grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Batch discipline
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Operating notes
          </h3>
          <div className="mt-4 space-y-3">
            {[
              {
                title: "Prefer narrow, explainable batches",
                body: "Smaller governed batches are easier to defend and easier to recover when one request behaves differently from the rest.",
              },
              {
                title: "Use remarks when the intent matters",
                body: "Approval and status-repair remarks are the fastest way to preserve operator intent for reviewers after the batch is gone.",
              },
              {
                title: "Export on purpose, not by default",
                body: "Filters and date windows matter because large unrestricted exports are harder to use and harder to validate later.",
              },
            ].map((note) => (
              <div
                key={note.title}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {note.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Workflow framing
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Why this page exists
          </h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Approval queues
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Move batches through the formal SSA approval chain without
                opening each request individually.
              </p>
            </div>
            <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                State repair
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Correct drift when rejected or draft requests need a controlled
                return path.
              </p>
            </div>
            <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Export control
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Produce CSV extracts with enough context for reporting, audit,
                and offline analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
