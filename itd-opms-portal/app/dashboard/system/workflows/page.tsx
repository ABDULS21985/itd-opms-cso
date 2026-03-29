"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  ArrowRight,
  Eye,
  Search,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import {
  useWorkflowDefinitions,
  useCreateWorkflowDefinition,
  useUpdateWorkflowDefinition,
  useDeleteWorkflowDefinition,
} from "@/hooks/use-approvals";
import type {
  WorkflowDefinition,
  WorkflowStepDef,
  CreateWorkflowDefinitionBody,
  UpdateWorkflowDefinitionBody,
} from "@/hooks/use-approvals";
import { useSearchUsers } from "@/hooks/use-system";
import type { UserSearchResult } from "@/types";
import { DataTable } from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";

/* ------------------------------------------------------------------ */
/*  Entity type options                                                 */
/* ------------------------------------------------------------------ */

const ENTITY_TYPES = [
  "project",
  "portfolio",
  "policy",
  "risk",
  "change_request",
  "procurement",
  "budget",
  "document",
  "workitem",
];

const STEP_MODES: { value: string; label: string }[] = [
  { value: "sequential", label: "Sequential (all, in order)" },
  { value: "parallel", label: "Parallel (all, any order)" },
  { value: "any_of", label: "Any Of (quorum)" },
];

/* ------------------------------------------------------------------ */
/*  User Picker Input                                                  */
/* ------------------------------------------------------------------ */

/**
 * A searchable user-picker that stores UUIDs in `value` and renders
 * selected users as removable chips with display names.
 */
function UserPickerInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve current approver IDs → display names for chips.
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>(
    {},
  );

  const { data: searchResults, isFetching } = useSearchUsers(query);
  const results: UserSearchResult[] = Array.isArray(searchResults)
    ? searchResults
    : [];

  // Persist resolved names so chips show names even after dropdown closes.
  useEffect(() => {
    results.forEach((u) => {
      setResolvedNames((prev) => ({ ...prev, [u.id]: u.displayName }));
    });
  }, [results]);

  // Close dropdown on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectUser(user: UserSearchResult) {
    if (!value.includes(user.id)) {
      onChange([...value, user.id]);
      setResolvedNames((prev) => ({ ...prev, [user.id]: user.displayName }));
    }
    setQuery("");
    setOpen(false);
  }

  function removeUser(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  const filtered = results.filter((u) => !value.includes(u.id));

  return (
    <div ref={containerRef} className="relative">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
            >
              <User className="h-3 w-3 shrink-0" />
              {resolvedNames[id] ?? id.slice(0, 8) + "…"}
              <button
                type="button"
                onClick={() => removeUser(id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--primary)]/20 transition-colors"
                aria-label={`Remove ${resolvedNames[id] ?? id}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--neutral-gray)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search users by name or email…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[var(--neutral-gray)]" />
        )}
      </div>

      {/* Dropdown */}
      {open && query.length >= 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[var(--neutral-gray)]">
              {isFetching ? "Searching…" : "No users found"}
            </p>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur before click
                      selectUser(user);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[10px] font-semibold text-[var(--primary)]">
                      {user.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">
                        {user.displayName}
                      </p>
                      <p className="truncate text-xs text-[var(--neutral-gray)]">
                        {user.email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step Builder Component                                              */
/* ------------------------------------------------------------------ */

function StepBuilder({
  steps,
  onChange,
}: {
  steps: WorkflowStepDef[];
  onChange: (steps: WorkflowStepDef[]) => void;
}) {
  function addStep() {
    const newStep: WorkflowStepDef = {
      stepOrder: steps.length + 1,
      name: `Step ${steps.length + 1}`,
      mode: "sequential",
      quorum: 1,
      approverType: "user",
      approverIds: [],
      timeoutHours: 0,
      allowDelegation: true,
    };
    onChange([...steps, newStep]);
  }

  function removeStep(index: number) {
    const updated = steps.filter((_, i) => i !== index);
    // Re-number step orders.
    const renumbered = updated.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    onChange(renumbered);
  }

  function updateStep(index: number, patch: Partial<WorkflowStepDef>) {
    const updated = steps.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(updated);
  }

  function moveStep(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    )
      return;
    const updated = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [
      updated[targetIndex],
      updated[index],
    ];
    // Re-number step orders.
    const renumbered = updated.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    onChange(renumbered);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Approval Steps
        </label>
        <button
          type="button"
          onClick={addStep}
          className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:opacity-80 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Step
        </button>
      </div>

      {steps.length === 0 && (
        <p className="text-sm text-[var(--neutral-gray)] py-4 text-center border border-dashed border-[var(--border)] rounded-xl">
          No steps defined yet. Add at least one step.
        </p>
      )}

      {steps.map((step, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Step {step.stepOrder}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveStep(index, "up")}
                disabled={index === 0}
                className="p-1 rounded text-[var(--neutral-gray)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                aria-label="Move step up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveStep(index, "down")}
                disabled={index === steps.length - 1}
                className="p-1 rounded text-[var(--neutral-gray)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                aria-label="Move step down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeStep(index)}
                className="p-1 rounded text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors"
                aria-label="Remove step"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Step Name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Name
              </label>
              <input
                type="text"
                value={step.name}
                onChange={(e) => updateStep(index, { name: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            {/* Mode */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Mode
              </label>
              <select
                value={step.mode}
                onChange={(e) =>
                  updateStep(index, {
                    mode: e.target.value as WorkflowStepDef["mode"],
                  })
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {STEP_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Approver IDs */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Approvers
              </label>
              <UserPickerInput
                value={step.approverIds}
                onChange={(ids) => updateStep(index, { approverIds: ids })}
              />
            </div>

            {/* Quorum (only for any_of mode) */}
            {step.mode === "any_of" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Quorum
                </label>
                <input
                  type="number"
                  min={1}
                  value={step.quorum}
                  onChange={(e) =>
                    updateStep(index, {
                      quorum: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
            )}

            {/* Timeout Hours */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Timeout (hours)
              </label>
              <input
                type="number"
                min={0}
                value={step.timeoutHours}
                onChange={(e) =>
                  updateStep(index, {
                    timeoutHours: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            {/* Allow Delegation */}
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id={`allow-delegation-${index}`}
                checked={step.allowDelegation}
                onChange={(e) =>
                  updateStep(index, { allowDelegation: e.target.checked })
                }
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
              />
              <label
                htmlFor={`allow-delegation-${index}`}
                className="text-sm text-[var(--text-secondary)]"
              >
                Allow delegation
              </label>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Visual Step Flow Preview                                            */
/* ------------------------------------------------------------------ */

function StepFlowPreview({ steps }: { steps: WorkflowStepDef[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-0)] border border-[var(--border)] px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {step.name}
            </span>
            <span className="text-[10px] text-[var(--neutral-gray)]">
              (
              {step.mode === "any_of"
                ? `${step.quorum}/${step.approverIds.length}`
                : step.approverIds.length}
              )
            </span>
          </div>
          {index < steps.length - 1 && (
            <ArrowRight className="h-3.5 w-3.5 text-[var(--neutral-gray)]" />
          )}
        </div>
      ))}
    </div>
  );
}

function formatEntityTypeLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatWorkflowDate(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getWorkflowPulse(
  workflowCount: number,
  activeCount: number,
  coveredEntities: number,
) {
  if (workflowCount === 0) {
    return {
      label: "Build the foundation",
      badgeClass:
        "border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      description:
        "No approval templates are live yet, so this workspace should focus on establishing core routing patterns and entity coverage.",
    };
  }

  const activeRatio = activeCount / workflowCount;

  if (activeRatio < 0.65 || coveredEntities < 3) {
    return {
      label: "Needs attention",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "Several workflow paths are inactive or coverage is still shallow, so the approval layer needs deliberate consolidation.",
    };
  }

  if (activeRatio < 0.9 || coveredEntities < 5) {
    return {
      label: "Expanding well",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "The workflow library is growing in the right direction, but a few entities still need stronger routing depth and cleaner activation.",
    };
  }

  return {
    label: "Well orchestrated",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "Coverage, activation, and step design are in a healthy range, giving the approval program a predictable execution rhythm.",
  };
}

function LoadingValue({ width = "w-14" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function WorkflowMetricCard({
  label,
  value,
  helper,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  helper: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: `${color}1f`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${color}14, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color }}>
        {loading ? <LoadingValue /> : value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function EntityCoverageCard({
  entityType,
  count,
  activeCount,
  avgSteps,
}: {
  entityType: string;
  count: number;
  activeCount: number;
  avgSteps: string;
}) {
  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: "rgba(99, 102, 241, 0.12)",
        backgroundImage:
          "radial-gradient(circle at 100% 0%, rgba(99,102,241,0.12), transparent 32%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Entity lane
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {formatEntityTypeLabel(entityType)}
          </h3>
        </div>
        <span className="text-3xl font-bold text-[#6366F1]">{count}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] bg-[var(--surface-0)]/78 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Active
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {activeCount} live templates
          </p>
        </div>
        <div className="rounded-[20px] bg-[var(--surface-0)]/78 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Avg steps
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {avgSteps} stages
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create/Edit Workflow Modal                                          */
/* ------------------------------------------------------------------ */

function WorkflowModal({
  open,
  onClose,
  onSubmit,
  loading,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWorkflowDefinitionBody) => void;
  loading: boolean;
  initial?: WorkflowDefinition | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [entityType, setEntityType] = useState(initial?.entityType ?? "");
  const [steps, setSteps] = useState<WorkflowStepDef[]>(initial?.steps ?? []);
  const [showPreview, setShowPreview] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !entityType) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      entityType,
      steps,
    });
  }

  function handleClose() {
    if (loading) return;
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-40"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
          <GitBranch className="h-6 w-6 text-[var(--primary)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {initial ? "Edit Workflow Definition" : "Create Workflow Definition"}
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          {initial
            ? "Update the workflow configuration and approval steps."
            : "Define a new approval workflow with steps and approvers."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="wf-name"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Name <span className="text-[var(--error)]">*</span>
            </label>
            <input
              id="wf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Approval Workflow"
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="wf-description"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Description
            </label>
            <textarea
              id="wf-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this workflow..."
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
            />
          </div>

          {/* Entity Type */}
          <div>
            <label
              htmlFor="wf-entity-type"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Entity Type <span className="text-[var(--error)]">*</span>
            </label>
            <select
              id="wf-entity-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">Select entity type...</option>
              {ENTITY_TYPES.map((et) => (
                <option key={et} value={et}>
                  {et
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Steps Builder */}
          <StepBuilder steps={steps} onChange={setSteps} />

          {/* Preview toggle */}
          {steps.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:opacity-80 transition-opacity"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? "Hide Preview" : "Show Step Flow Preview"}
              </button>
              {showPreview && <StepFlowPreview steps={steps} />}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading || !name.trim() || !entityType || steps.length === 0
              }
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {initial ? "Updating..." : "Creating..."}
                </span>
              ) : (
                <>
                  {initial ? (
                    <>
                      <Pencil className="h-4 w-4" />
                      Update Workflow
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Workflow
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WorkflowsPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Workflows", href: "/dashboard/system/workflows" },
  ]);

  const { data: workflows, isLoading } = useWorkflowDefinitions();
  const createMutation = useCreateWorkflowDefinition();
  const deleteMutation = useDeleteWorkflowDefinition();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkflowDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [entityFilter, setEntityFilter] = useState("");

  // For the edit modal, we need a separate hook call with the ID.
  const updateMutation = useUpdateWorkflowDefinition(editTarget?.id);

  const workflowList: WorkflowDefinition[] = Array.isArray(workflows)
    ? workflows
    : [];

  const workflowToDelete = workflowList.find((w) => w.id === deleteTarget);
  const totalWorkflows = workflowList.length;
  const activeWorkflows = workflowList.filter((workflow) => workflow.isActive);
  const activeCount = activeWorkflows.length;
  const inactiveCount = totalWorkflows - activeCount;
  const totalSteps = workflowList.reduce(
    (sum, workflow) => sum + workflow.steps.length,
    0,
  );
  const avgSteps =
    totalWorkflows > 0 ? (totalSteps / totalWorkflows).toFixed(1) : "0.0";
  const coveredEntities = new Set(
    workflowList.map((workflow) => workflow.entityType),
  ).size;
  const delegationReadyCount = workflowList.filter(
    (workflow) =>
      workflow.steps.length > 0 &&
      workflow.steps.every((step) => step.allowDelegation),
  ).length;
  const latestUpdatedWorkflow = [...workflowList].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
  const mostComplexWorkflow = [...workflowList].sort(
    (a, b) => b.steps.length - a.steps.length,
  )[0];
  const uncoveredEntities = ENTITY_TYPES.filter(
    (entityType) =>
      !workflowList.some((workflow) => workflow.entityType === entityType),
  );
  const entityCoverage = ENTITY_TYPES.map((entityType) => {
    const workflowsForEntity = workflowList.filter(
      (workflow) => workflow.entityType === entityType,
    );
    const count = workflowsForEntity.length;
    const entityStepCount = workflowsForEntity.reduce(
      (sum, workflow) => sum + workflow.steps.length,
      0,
    );

    return {
      entityType,
      count,
      activeCount: workflowsForEntity.filter((workflow) => workflow.isActive)
        .length,
      avgSteps: count > 0 ? (entityStepCount / count).toFixed(1) : "0.0",
    };
  })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const filteredWorkflows = workflowList.filter((workflow) => {
    const matchesSearch =
      searchQuery.trim().length === 0 ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      workflow.entityType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? workflow.isActive : !workflow.isActive);
    const matchesEntity =
      entityFilter.length === 0 || workflow.entityType === entityFilter;

    return matchesSearch && matchesStatus && matchesEntity;
  });

  const spotlightSource =
    filteredWorkflows.length > 0 ? filteredWorkflows : workflowList;
  const spotlightWorkflows = [...spotlightSource]
    .sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? 1 : -1;
      }
      if (b.steps.length !== a.steps.length) {
        return b.steps.length - a.steps.length;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, 4);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    entityFilter.length > 0;
  const workflowPulse = getWorkflowPulse(
    totalWorkflows,
    activeCount,
    coveredEntities,
  );
  const activeRatio =
    totalWorkflows > 0 ? Math.round((activeCount / totalWorkflows) * 100) : 0;

  const handleCreate = useCallback(
    (data: CreateWorkflowDefinitionBody) => {
      createMutation.mutate(data, {
        onSuccess: () => setShowCreate(false),
      });
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (data: CreateWorkflowDefinitionBody) => {
      // Cast to update body — all fields sent explicitly from the edit form.
      const body: UpdateWorkflowDefinitionBody = {
        name: data.name,
        description: data.description,
        entityType: data.entityType,
        steps: data.steps,
      };
      updateMutation.mutate(body, {
        onSuccess: () => setEditTarget(null),
      });
    },
    [updateMutation],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setEntityFilter("");
  }

  // Table columns.
  const columns: Column<WorkflowDefinition>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (item) => (
        <div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {item.name}
          </span>
          {item.description && (
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5 line-clamp-1">
              {item.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "entityType",
      header: "Entity",
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
          {formatEntityTypeLabel(item.entityType)}
        </span>
      ),
    },
    {
      key: "steps",
      header: "Approval Design",
      className: "min-w-[240px]",
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {item.steps.length} stage{item.steps.length !== 1 ? "s" : ""} with{" "}
            {item.steps.filter((step) => step.allowDelegation).length}{" "}
            delegation-ready
          </p>
          <p className="mt-0.5 text-xs text-[var(--neutral-gray)]">
            {item.steps
              .slice(0, 2)
              .map((step) => step.name)
              .join(" → ")}
            {item.steps.length > 2 ? " → …" : ""}
          </p>
        </div>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {formatWorkflowDate(item.updatedAt)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--neutral-gray)]">
            Version {item.version}
          </p>
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (item) => (
        <StatusBadge
          status={item.isActive ? "active" : "inactive"}
          variant={item.isActive ? "success" : "default"}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditTarget(item);
            }}
            className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            aria-label={`Edit workflow ${item.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(item.id);
            }}
            className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--error)]"
            aria-label={`Delete workflow ${item.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PermissionGate permission="approval.manage">
      <div className="space-y-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "rgba(99, 102, 241, 0.16)",
            backgroundImage:
              "radial-gradient(circle at 12% 18%, rgba(99,102,241,0.16), transparent 30%), radial-gradient(circle at 88% 16%, rgba(16,185,129,0.12), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
            boxShadow: "0 28px 90px -58px rgba(99, 102, 241, 0.28)",
          }}
        >
          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${workflowPulse.badgeClass}`}
                >
                  <Sparkles size={14} />
                  {workflowPulse.label}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                  <GitBranch size={14} className="text-[#6366F1]" />
                  Workflow orchestration
                </span>
              </div>

              <div className="max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                  Workflow Definitions
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                  Approval templates, routing logic, and escalation design in a
                  stronger operational workspace so system owners can see which
                  workflows are live, stale, or still missing from entity
                  coverage.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Plus size={16} />
                  Create Workflow
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  <AlertTriangle size={16} />
                  Review inactive
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                  >
                    Reset view
                  </button>
                )}
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Orchestration pulse
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Routing telemetry
                  </h2>
                </div>
                <Activity size={20} className="text-[var(--primary)]" />
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                {workflowPulse.description}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Active ratio
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {isLoading ? (
                      <LoadingValue width="w-16" />
                    ) : (
                      `${activeRatio}%`
                    )}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Average depth
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {isLoading ? <LoadingValue width="w-16" /> : avgSteps}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Delegation-ready
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {isLoading ? (
                      <LoadingValue width="w-16" />
                    ) : (
                      delegationReadyCount
                    )}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Latest change
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {isLoading ? (
                      <LoadingValue width="w-20" />
                    ) : (
                      formatWorkflowDate(latestUpdatedWorkflow?.updatedAt)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <WorkflowMetricCard
            label="Templates in system"
            value={totalWorkflows}
            helper="All workflow definitions currently available to approval chains."
            color="#6366F1"
            loading={isLoading}
          />
          <WorkflowMetricCard
            label="Active templates"
            value={activeCount}
            helper="Live workflow paths that can be used for new approval requests."
            color="#10B981"
            loading={isLoading}
          />
          <WorkflowMetricCard
            label="Entity coverage"
            value={coveredEntities}
            helper="Distinct entity types that already have at least one workflow path."
            color="#2563EB"
            loading={isLoading}
          />
          <WorkflowMetricCard
            label="Inactive attention"
            value={inactiveCount}
            helper="Templates that need review before they can support fresh routing."
            color="#DC2626"
            loading={isLoading}
          />
        </div>

        {!isLoading && entityCoverage.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="space-y-4"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Entity coverage
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Routing depth by entity lane
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {entityCoverage.slice(0, 4).map((item) => (
                <EntityCoverageCard
                  key={item.entityType}
                  entityType={item.entityType}
                  count={item.count}
                  activeCount={item.activeCount}
                  avgSteps={item.avgSteps}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="space-y-4">
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Registry
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Workflow registry
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "All templates" },
                    { value: "active", label: "Active only" },
                    { value: "inactive", label: "Inactive only" },
                  ].map((option) => {
                    const active = statusFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setStatusFilter(
                            option.value as "all" | "active" | "inactive",
                          )
                        }
                        className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
                        style={{
                          borderColor: active
                            ? "var(--primary)"
                            : "var(--border)",
                          backgroundColor: active
                            ? "rgba(99, 102, 241, 0.1)"
                            : "var(--surface-0)",
                          color: active
                            ? "var(--primary)"
                            : "var(--text-secondary)",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Search workflows
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-gray)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search workflow name, description, or entity..."
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Entity lens
                  </label>
                  <select
                    value={entityFilter}
                    onChange={(event) => setEntityFilter(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  >
                    <option value="">All entities</option>
                    {ENTITY_TYPES.map((entityType) => (
                      <option key={entityType} value={entityType}>
                        {formatEntityTypeLabel(entityType)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] lg:self-end"
                >
                  Reset filters
                </button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-1"
            >
              <DataTable
                columns={columns}
                data={filteredWorkflows}
                keyExtractor={(item) => item.id}
                loading={isLoading}
                emptyTitle={
                  totalWorkflows === 0
                    ? "No workflow definitions"
                    : "No workflows match this view"
                }
                emptyDescription={
                  totalWorkflows === 0
                    ? "Create your first approval workflow to get started."
                    : "Adjust the registry filters or reset the current lens to surface more templates."
                }
                emptyAction={
                  totalWorkflows === 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <Plus size={16} />
                      Create Workflow
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                    >
                      Reset filters
                    </button>
                  )
                }
              />
            </motion.div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Spotlight
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Template spotlight
                  </h2>
                </div>
                <ShieldCheck size={20} className="text-[var(--primary)]" />
              </div>

              <div className="mt-5 space-y-3">
                {spotlightWorkflows.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[var(--border)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
                    Create a workflow to start building approval routing depth
                    across your operational entities.
                  </div>
                ) : (
                  spotlightWorkflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      type="button"
                      onClick={() => setEditTarget(workflow)}
                      className="w-full rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4 text-left transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {workflow.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {formatEntityTypeLabel(workflow.entityType)} •
                            Version {workflow.version}
                          </p>
                        </div>
                        <span
                          className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{
                            backgroundColor: workflow.isActive
                              ? "rgba(16,185,129,0.1)"
                              : "rgba(245,158,11,0.12)",
                            color: workflow.isActive ? "#10B981" : "#D97706",
                          }}
                        >
                          {workflow.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        {workflow.steps.length} stages with{" "}
                        {
                          workflow.steps.filter((step) => step.allowDelegation)
                            .length
                        }{" "}
                        delegation-ready checkpoints.
                      </p>

                      <div className="mt-3 overflow-hidden">
                        <StepFlowPreview steps={workflow.steps.slice(0, 3)} />
                      </div>

                      {workflow.steps.length > 3 && (
                        <p className="mt-2 text-xs text-[var(--neutral-gray)]">
                          +{workflow.steps.length - 3} more stage
                          {workflow.steps.length - 3 !== 1 ? "s" : ""}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Coverage notes
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Program notes
                  </h2>
                </div>
                <Clock3 size={20} className="text-[var(--primary)]" />
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-[#10B981]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Latest updated workflow
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {latestUpdatedWorkflow
                          ? `${latestUpdatedWorkflow.name} refreshed on ${formatWorkflowDate(latestUpdatedWorkflow.updatedAt)}.`
                          : "No workflow activity recorded yet."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                  <div className="flex items-start gap-3">
                    <Activity
                      size={18}
                      className="mt-0.5 shrink-0 text-[#6366F1]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Deepest approval path
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {mostComplexWorkflow
                          ? `${mostComplexWorkflow.name} currently carries ${mostComplexWorkflow.steps.length} stages.`
                          : "Add a workflow to start mapping multi-stage approval paths."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={18}
                      className="mt-0.5 shrink-0 text-[#D97706]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Missing entity coverage
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {uncoveredEntities.length > 0
                          ? uncoveredEntities
                              .slice(0, 4)
                              .map((entityType) =>
                                formatEntityTypeLabel(entityType),
                              )
                              .join(", ")
                          : "All tracked entities already have at least one workflow path."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                {inactiveCount > 0
                  ? `${inactiveCount} inactive template${inactiveCount !== 1 ? "s are" : " is"} waiting for review before new approval chains can rely on them.`
                  : "All current workflow templates are active and ready for new approval chains."}
              </div>
            </div>
          </aside>
        </div>

        <AnimatePresence>
          {showCreate && (
            <WorkflowModal
              open={showCreate}
              onClose={() => setShowCreate(false)}
              onSubmit={handleCreate}
              loading={createMutation.isPending}
            />
          )}
        </AnimatePresence>

        {/* Edit Workflow Modal */}
        <AnimatePresence>
          {editTarget && (
            <WorkflowModal
              open={!!editTarget}
              onClose={() => setEditTarget(null)}
              onSubmit={handleUpdate}
              loading={updateMutation.isPending}
              initial={editTarget}
            />
          )}
        </AnimatePresence>

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Deactivate Workflow"
          message={`Are you sure you want to deactivate the workflow "${workflowToDelete?.name ?? ""}"? This will prevent it from being used for new approval chains. Existing chains will not be affected.`}
          confirmLabel="Deactivate"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      </div>
    </PermissionGate>
  );
}
