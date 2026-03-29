"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bug,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import { UserPicker } from "@/components/shared/pickers";
import {
  useCreateKnownError,
  useCreateProblem,
  useKnownErrors,
  useProblems,
} from "@/hooks/use-itsm";
import type { ITSMProblem, KnownError } from "@/types";

interface ProblemStatusOption {
  value: string;
  label: string;
  accent: string;
  description: string;
}

interface MetricCardProps {
  title: string;
  value: ReactNode;
  helper: string;
  icon: LucideIcon;
  accent: string;
}

const PROBLEM_STATUSES: ProblemStatusOption[] = [
  {
    value: "",
    label: "All problems",
    accent: "#1B7340",
    description: "Full investigation board",
  },
  {
    value: "logged",
    label: "Logged",
    accent: "#475569",
    description: "Freshly recorded and awaiting deeper correlation",
  },
  {
    value: "investigating",
    label: "Investigating",
    accent: "#2563EB",
    description: "Analysis and pattern tracing in progress",
  },
  {
    value: "root_cause_identified",
    label: "Root cause identified",
    accent: "#D97706",
    description: "Cause found, response and fix planning underway",
  },
  {
    value: "known_error",
    label: "Known error",
    accent: "#EA580C",
    description: "Workaround published while the permanent fix is tracked",
  },
  {
    value: "resolved",
    label: "Resolved",
    accent: "#1B7340",
    description: "Problem has been driven to closure",
  },
];

const STATUS_SUMMARY: Record<
  string,
  { accent: string; bgColor: string; description: string }
> = {
  logged: {
    accent: "#475569",
    bgColor: "rgba(71, 85, 105, 0.12)",
    description: "Captured and waiting for deeper triage.",
  },
  investigating: {
    accent: "#2563EB",
    bgColor: "rgba(37, 99, 235, 0.12)",
    description: "Correlation and evidence gathering are active.",
  },
  root_cause_identified: {
    accent: "#D97706",
    bgColor: "rgba(217, 119, 6, 0.12)",
    description: "Cause is known and mitigation can tighten.",
  },
  known_error: {
    accent: "#EA580C",
    bgColor: "rgba(234, 88, 12, 0.12)",
    description: "Workaround is available while the long fix lands.",
  },
  resolved: {
    accent: "#1B7340",
    bgColor: "rgba(27, 115, 64, 0.12)",
    description: "Problem record has reached closure.",
  },
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatRelativeTime(value?: string) {
  if (!value) return "just now";

  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(value?: string) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString();
}

function humanize(value?: string) {
  return value ? value.replace(/_/g, " ") : "unknown";
}

function truncateId(value?: string) {
  if (!value) return "Unassigned";
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

function getStatusMeta(status: string) {
  return (
    STATUS_SUMMARY[status] ?? {
      accent: "#475569",
      bgColor: "rgba(71, 85, 105, 0.12)",
      description: "Investigation state is active.",
    }
  );
}

function getProblemPosture(
  unresolvedCount: number,
  linkedIncidents: number,
  knownErrorCount: number,
) {
  if (unresolvedCount >= 8 || linkedIncidents >= 12) {
    return {
      label: "Pressure is high",
      accent: "#DC2626",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "Incident clusters are large enough that problem discipline should stay near the top of the queue.",
    };
  }

  if (unresolvedCount >= 4 || knownErrorCount === 0) {
    return {
      label: "Watch carefully",
      accent: "#D97706",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "The board is manageable, but known-error coverage and closure follow-through need attention.",
    };
  }

  return {
    label: "Controlled",
    accent: "#1B7340",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "Problem pressure is contained and the investigation funnel is moving well.",
  };
}

function LoadingValue({ width = "w-16" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  accent,
}: MetricCardProps) {
  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {title}
          </p>
          <p
            className="mt-3 text-3xl font-bold tracking-tight"
            style={{ color: accent }}
          >
            {value}
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}16` }}
        >
          <Icon size={20} style={{ color: accent }} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function KnownErrorList({ problemId }: { problemId: string }) {
  const { data: knownErrors, isLoading } = useKnownErrors(problemId);
  const createKnownError = useCreateKnownError();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workaround, setWorkaround] = useState("");

  const errors = knownErrors ?? [];

  function resetForm() {
    setShowForm(false);
    setTitle("");
    setDescription("");
    setWorkaround("");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    createKnownError.mutate(
      {
        problemId,
        title: title.trim(),
        description: description.trim() || undefined,
        workaround: workaround.trim() || undefined,
      },
      {
        onSuccess: resetForm,
      },
    );
  }

  return (
    <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Known errors
          </p>
          <h4 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            Workaround intelligence
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          style={{ borderColor: "var(--border)" }}
        >
          <Plus size={14} />
          Add known error
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleCreate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3 rounded-[24px] border p-4"
            style={{
              backgroundColor: "var(--surface-1)",
              borderColor: "var(--border)",
            }}
          >
            <FormField
              label="Title"
              name="knownErrorTitle"
              value={title}
              onChange={setTitle}
              placeholder="Known error title"
              required
            />
            <FormField
              label="Description"
              name="knownErrorDescription"
              type="textarea"
              value={description}
              onChange={setDescription}
              placeholder="What operators should know about the failure mode"
              rows={2}
            />
            <FormField
              label="Workaround"
              name="knownErrorWorkaround"
              type="textarea"
              value={workaround}
              onChange={setWorkaround}
              placeholder="Temporary operating workaround"
              rows={2}
            />
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createKnownError.isPending || !title.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {createKnownError.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Save known error
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Loader2 size={15} className="animate-spin" />
          Loading known errors...
        </div>
      ) : errors.length === 0 ? (
        <div
          className="mt-4 rounded-[20px] border border-dashed p-4"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No known errors recorded yet
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            When a workaround becomes reliable enough to share, publish it here
            so operators can reduce repeated incident noise.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {errors.map((error) => (
            <div
              key={error.id}
              className="rounded-[20px] border p-4"
              style={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {error.title}
                </p>
                <StatusBadge status={error.status} />
              </div>
              {error.description && (
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {error.description}
                </p>
              )}
              {error.workaround && (
                <div
                  className="mt-3 rounded-2xl p-3 text-sm"
                  style={{ backgroundColor: "rgba(37, 99, 235, 0.06)" }}
                >
                  <span className="font-semibold text-[#2563EB]">Workaround: </span>
                  <span className="text-[var(--text-secondary)]">
                    {error.workaround}
                  </span>
                </div>
              )}
              {error.kbArticleId && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <FileText size={12} />
                  Linked KB: {error.kbArticleId}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProblemCard({
  problem,
  index,
}: {
  problem: ITSMProblem;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = getStatusMeta(problem.status);
  const incidentCount = problem.linkedIncidentIds.length;

  const highlights = [
    {
      label: "Root cause",
      value: problem.rootCause || "Still being established",
    },
    {
      label: "Workaround",
      value: problem.workaround || "No operator workaround has been documented yet.",
    },
    {
      label: "Permanent fix",
      value: problem.permanentFix || "Permanent remediation is still open.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.04 }}
      className="rounded-[30px] border p-5"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
        backgroundImage: `radial-gradient(circle at 100% 0%, ${statusMeta.accent}1c, transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              backgroundColor: statusMeta.bgColor,
              color: statusMeta.accent,
            }}
          >
            {problem.problemNumber}
          </span>
          <StatusBadge status={problem.status} />
          {problem.linkedChangeId && (
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              Change linked
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--surface-0)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)] shadow-sm">
            {incidentCount} linked incident{incidentCount === 1 ? "" : "s"}
          </span>
          <Link
            href={`/dashboard/itsm/problems/${problem.id}`}
            className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            style={{ borderColor: "var(--border)" }}
          >
            Open record
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">
          {problem.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
          {problem.description ||
            "No narrative has been added yet. Use the expanded panel to document incident patterns, blast radius, and investigative context."}
        </p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="rounded-[24px] border p-4"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              backdropFilter: "blur(18px)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {item.label}
            </p>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--text-secondary)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
        <span>Owner: {truncateId(problem.ownerId)}</span>
        <span>Created {formatDate(problem.createdAt)}</span>
        <span>Updated {formatRelativeTime(problem.updatedAt)}</span>
        {problem.linkedChangeId && <span>Change {truncateId(problem.linkedChangeId)}</span>}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <div className="max-w-2xl text-sm text-[var(--text-secondary)]">
          {statusMeta.description}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          style={{ borderColor: "var(--border)" }}
        >
          {expanded ? "Hide diagnostics" : "Expand diagnostics"}
          <ArrowRight
            size={15}
            className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 space-y-5 border-t border-[var(--border)] pt-5"
          >
            {problem.description && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Investigation narrative
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                  {problem.description}
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div
                className="rounded-[24px] border p-4"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Incident linkage
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {incidentCount > 0
                    ? `${incidentCount} incident${incidentCount === 1 ? "" : "s"} already mapped to this problem record.`
                    : "No incidents have been linked yet."}
                </p>
              </div>

              <div
                className="rounded-[24px] border p-4"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Change linkage
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {problem.linkedChangeId
                    ? `Permanent remediation is being tracked through ${problem.linkedChangeId}.`
                    : "No linked change request is recorded yet."}
                </p>
              </div>
            </div>

            <KnownErrorList problemId={problem.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ProblemsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data, isLoading } = useProblems(page, 12, status || undefined);
  const { data: knownErrors, isLoading: knownErrorsLoading } =
    useKnownErrors();
  const createProblem = useCreateProblem();

  const problems = data?.data ?? [];
  const meta = data?.meta;
  const totalProblems = meta?.totalItems ?? problems.length;

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [ownerDisplay, setOwnerDisplay] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const unresolvedCount = problems.filter(
    (problem) => problem.status !== "resolved",
  ).length;
  const linkedIncidents = problems.reduce(
    (sum, problem) => sum + problem.linkedIncidentIds.length,
    0,
  );
  const knownErrorCount = knownErrors?.length ?? 0;
  const knownErrorCoverage =
    unresolvedCount > 0
      ? clampPercent((knownErrorCount / unresolvedCount) * 100)
      : 100;
  const posture = getProblemPosture(
    unresolvedCount,
    linkedIncidents,
    knownErrorCount,
  );

  const selectedStatus = PROBLEM_STATUSES.find(
    (option) => option.value === status,
  ) ?? PROBLEM_STATUSES[0];

  const statusLandscape = useMemo(
    () =>
      PROBLEM_STATUSES.filter((option) => option.value).map((option) => ({
        ...option,
        count: problems.filter((problem) => problem.status === option.value)
          .length,
      })),
    [problems],
  );

  const recentKnownErrors = useMemo(
    () =>
      [...(knownErrors ?? [])]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime(),
        )
        .slice(0, 4),
    [knownErrors],
  );

  function resetCreateForm() {
    setShowCreateForm(false);
    setNewTitle("");
    setNewDescription("");
    setNewOwnerId("");
    setOwnerDisplay("");
    setFormErrors({});
  }

  function handleCreateProblem(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!newTitle.trim()) {
      nextErrors.title = "Title is required";
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    createProblem.mutate(
      {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        ownerId: newOwnerId.trim() || undefined,
      },
      {
        onSuccess: resetCreateForm,
      },
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(37, 99, 235, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(37,99,235,0.14), transparent 32%), radial-gradient(circle at 88% 16%, rgba(234,88,12,0.12), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(37, 99, 235, 0.34)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${posture.badgeClass}`}
              >
                <Sparkles size={14} />
                {posture.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <Bug size={14} className="text-[#2563EB]" />
                Investigation workspace
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                Problem Management
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                A tighter control room for root-cause analysis, workaround
                publishing, and long-tail issue eradication. Move beyond
                incident firefighting and build durable service stability.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                New Problem
              </button>
              <a
                href="#known-error-library"
                className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                style={{ borderColor: "var(--border)" }}
              >
                <FileText size={16} />
                Known Error Library
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Problems tracked"
                value={isLoading ? <LoadingValue width="w-16" /> : totalProblems}
                helper={
                  status
                    ? `Records matching the current “${selectedStatus.label}” filter.`
                    : "All problem records currently represented by this result set."
                }
                icon={Bug}
                accent="#2563EB"
              />
              <MetricCard
                title="Active investigations"
                value={isLoading ? <LoadingValue width="w-16" /> : unresolvedCount}
                helper="Open investigation work visible in the current board slice."
                icon={ClipboardList}
                accent="#D97706"
              />
              <MetricCard
                title="Known errors"
                value={
                  knownErrorsLoading ? <LoadingValue width="w-16" /> : knownErrorCount
                }
                helper="Published workaround intelligence available to operators."
                icon={FileText}
                accent="#EA580C"
              />
              <MetricCard
                title="Incident impact"
                value={isLoading ? <LoadingValue width="w-16" /> : linkedIncidents}
                helper="Linked incident references across the visible problem cards."
                icon={Activity}
                accent="#1B7340"
              />
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Command board
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  Investigation playbook
                </h2>
              </div>
              <Sparkles size={20} style={{ color: posture.accent }} />
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {posture.description}
            </p>

            <div className="mt-5 space-y-3">
              {[
                "Capture recurring incident patterns fast.",
                "Identify the root cause and publish operator-safe workarounds.",
                "Link the permanent fix path to change activity and close the loop.",
              ].map((step) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-[22px] border p-4"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                >
                  <CheckCircle2 size={18} className="mt-0.5 text-[var(--primary)]" />
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Current focus
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {selectedStatus.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {selectedStatus.description}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Known-error coverage
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {knownErrorsLoading ? <LoadingValue width="w-14" /> : `${knownErrorCoverage}%`}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Approximate workaround coverage against unresolved items in this board slice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-2">
        {PROBLEM_STATUSES.map((option) => {
          const active = option.value === status;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setStatus(option.value);
                setPage(1);
              }}
              className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
              style={{
                borderColor: active ? option.accent : "var(--border)",
                backgroundColor: active ? `${option.accent}14` : "var(--surface-0)",
                color: active ? option.accent : "var(--text-secondary)",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showCreateForm && (
          <motion.form
            onSubmit={handleCreateProblem}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-[32px] border p-6"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              backgroundImage:
                "radial-gradient(circle at 100% 0%, rgba(27,115,64,0.12), transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  New problem
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  Create a problem record
                </h2>
              </div>
              <button
                type="button"
                onClick={resetCreateForm}
                className="rounded-2xl border p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)]"
                style={{ borderColor: "var(--border)" }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Capture a durable investigation, assign ownership, and give the
              team a clear place to document root cause and operational
              workarounds.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <FormField
                label="Title"
                name="newProblemTitle"
                value={newTitle}
                onChange={setNewTitle}
                placeholder="Short statement of the recurring failure"
                required
                error={formErrors.title}
              />

              <UserPicker
                label="Owner"
                value={newOwnerId || undefined}
                displayValue={ownerDisplay}
                onChange={(id, name) => {
                  setNewOwnerId(id ?? "");
                  setOwnerDisplay(name);
                }}
                placeholder="Assign an investigation owner"
              />

              <div className="lg:col-span-2">
                <FormField
                  label="Description"
                  name="newProblemDescription"
                  type="textarea"
                  value={newDescription}
                  onChange={setNewDescription}
                  placeholder="Describe symptoms, affected services, and recurring impact"
                  rows={4}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
              <button
                type="button"
                onClick={resetCreateForm}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProblem.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section
          className="rounded-[32px] border p-6"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Investigation deck
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Problem records in motion
              </h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {totalProblems} record{totalProblems === 1 ? "" : "s"} in this result
              set
            </p>
          </div>

          {isLoading ? (
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-[30px] bg-[var(--surface-1)]"
                />
              ))}
            </div>
          ) : problems.length === 0 ? (
            <div
              className="mt-6 rounded-[30px] border border-dashed p-10 text-center"
              style={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border)",
              }}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-0)] shadow-sm">
                <Bug size={24} className="text-[var(--text-secondary)]" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
                No problems found
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
                Create a problem record to connect repeated incidents, document
                the root cause trail, and capture workarounds before the same
                service issue keeps coming back.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                New Problem
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {problems.map((problem, index) => (
                <ProblemCard key={problem.id} problem={problem} index={index} />
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                Page {page} of {meta.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page <= 1}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: "var(--border)" }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= meta.totalPages}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: "var(--border)" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section
            id="known-error-library"
            className="rounded-[32px] border p-6"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Known error library
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Published operational memory
                </h2>
              </div>
              <FileText size={20} className="text-[var(--primary)]" />
            </div>

            {knownErrorsLoading ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-[24px] bg-[var(--surface-1)]"
                  />
                ))}
              </div>
            ) : recentKnownErrors.length === 0 ? (
              <div
                className="mt-6 rounded-[24px] border border-dashed p-5"
                style={{
                  backgroundColor: "var(--surface-1)",
                  borderColor: "var(--border)",
                }}
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No known errors published
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  As repeatable workarounds become stable, publish them from the
                  expanded problem cards so the service desk can respond faster.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {recentKnownErrors.map((error) => (
                  <div
                    key={error.id}
                    className="rounded-[24px] border p-4"
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {error.title}
                      </p>
                      <StatusBadge status={error.status} />
                    </div>
                    {error.workaround && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                        {error.workaround}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <LinkIcon size={12} />
                      Problem {truncateId(error.problemId)} · Updated{" "}
                      {formatRelativeTime(error.updatedAt || error.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            className="rounded-[32px] border p-6"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Status landscape
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Current board mix
                </h2>
              </div>
              <AlertTriangle size={20} className="text-[var(--primary)]" />
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Counts below are derived from the currently loaded card set.
            </p>

            <div className="mt-6 space-y-4">
              {statusLandscape.map((item) => {
                const maxCount = Math.max(
                  1,
                  ...statusLandscape.map((entry) => entry.count),
                );
                const width = (item.count / maxCount) * 100;

                return (
                  <div key={item.value}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-secondary)]">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${clampPercent(width)}%`,
                          backgroundColor: item.accent,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
