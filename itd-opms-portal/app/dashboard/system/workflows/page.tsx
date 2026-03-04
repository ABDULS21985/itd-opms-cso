"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
  Eye,
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
} from "@/hooks/use-approvals";
import { DataTable } from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";

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
                Approver IDs (comma-separated)
              </label>
              <input
                type="text"
                value={step.approverIds.join(", ")}
                onChange={(e) =>
                  updateStep(index, {
                    approverIds: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="uuid1, uuid2, uuid3"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
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
              ({step.mode === "any_of" ? `${step.quorum}/${step.approverIds.length}` : step.approverIds.length})
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
  onSubmit: (data: {
    name: string;
    description: string | null;
    entityType: string;
    steps: WorkflowStepDef[];
  }) => void;
  loading: boolean;
  initial?: WorkflowDefinition | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(
    initial?.description ?? "",
  );
  const [entityType, setEntityType] = useState(initial?.entityType ?? "");
  const [steps, setSteps] = useState<WorkflowStepDef[]>(
    initial?.steps ?? [],
  );
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
                  {et.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
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
              disabled={loading || !name.trim() || !entityType || steps.length === 0}
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
  const { data: workflows, isLoading } = useWorkflowDefinitions();
  const createMutation = useCreateWorkflowDefinition();
  const deleteMutation = useDeleteWorkflowDefinition();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkflowDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // For the edit modal, we need a separate hook call with the ID.
  const updateMutation = useUpdateWorkflowDefinition(editTarget?.id);

  const workflowList: WorkflowDefinition[] = Array.isArray(workflows)
    ? workflows
    : [];

  const workflowToDelete = workflowList.find((w) => w.id === deleteTarget);

  const handleCreate = useCallback(
    (data: {
      name: string;
      description: string | null;
      entityType: string;
      steps: WorkflowStepDef[];
    }) => {
      createMutation.mutate(
        {
          name: data.name,
          description: data.description,
          entityType: data.entityType,
          steps: data.steps,
        },
        {
          onSuccess: () => setShowCreate(false),
        },
      );
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (data: {
      name: string;
      description: string | null;
      entityType: string;
      steps: WorkflowStepDef[];
    }) => {
      updateMutation.mutate(
        {
          name: data.name,
          description: data.description,
          entityType: data.entityType,
          steps: data.steps,
        },
        {
          onSuccess: () => setEditTarget(null),
        },
      );
    },
    [updateMutation],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

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
      header: "Entity Type",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)] capitalize">
          {item.entityType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "steps",
      header: "Steps",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.steps.length} step{item.steps.length !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      key: "version",
      header: "Version",
      render: (item) => (
        <span className="text-sm tabular-nums text-[var(--text-secondary)]">
          v{item.version}
        </span>
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
      <div className="space-y-6 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
            >
              <GitBranch size={20} style={{ color: "#6366F1" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Workflow Definitions
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Manage approval workflow templates with configurable steps and
                approvers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Create Workflow
          </button>
        </motion.div>

        {/* Workflow Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <DataTable
            columns={columns}
            data={workflowList}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            emptyTitle="No workflow definitions"
            emptyDescription="Create your first approval workflow to get started."
            emptyAction={
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                Create Workflow
              </button>
            }
          />
        </motion.div>

        {/* Create Workflow Modal */}
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
