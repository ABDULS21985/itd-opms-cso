"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  XCircle,
  Users,
  GitBranch,
  DollarSign,
  Calendar,
  TrendingUp,
  Plus,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import {
  useProject,
  useProjectStakeholders,
  useProjectDependencies,
  useApproveProject,
  useUpdateProject,
  useDeleteProject,
  useAddProjectStakeholder,
  useRemoveProjectStakeholder,
  useAddProjectDependency,
  useRemoveProjectDependency,
  useProjects,
} from "@/hooks/use-planning";
import type { ProjectStakeholder, ProjectDependency } from "@/types";

/* ------------------------------------------------------------------ */
/*  RAG color mapping                                                  */
/* ------------------------------------------------------------------ */

const RAG_COLORS: Record<string, string> = {
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  grey: "#9CA3AF",
};

function ragColor(ragStatus: string): string {
  return RAG_COLORS[ragStatus?.toLowerCase()] ?? RAG_COLORS.grey;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: project, isLoading } = useProject(id);
  const { data: stakeholders } = useProjectStakeholders(id);
  const { data: dependencies } = useProjectDependencies(id);
  const { data: allProjectsData } = useProjects(1, 100);

  const approveProject = useApproveProject();
  const updateProject = useUpdateProject(id);
  const deleteProject = useDeleteProject();
  const addStakeholder = useAddProjectStakeholder(id);
  const removeStakeholder = useRemoveProjectStakeholder(id);
  const addDependency = useAddProjectDependency(id);
  const removeDependency = useRemoveProjectDependency(id);

  /* ---- Local state for inline forms ---- */
  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [stUserId, setStUserId] = useState("");
  const [stRole, setStRole] = useState("");
  const [stInfluence, setStInfluence] = useState("");
  const [stInterest, setStInterest] = useState("");

  const [showDependencyForm, setShowDependencyForm] = useState(false);
  const [depProjectId, setDepProjectId] = useState("");
  const [depType, setDepType] = useState("finish_to_start");
  const [depDescription, setDepDescription] = useState("");

  const allProjects = allProjectsData?.data ?? [];

  const isActing =
    approveProject.isPending ||
    updateProject.isPending ||
    deleteProject.isPending;

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading project...
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">
          Project not found.
        </p>
      </div>
    );
  }

  /* ---- Helpers ---- */

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  const budgetPct =
    project.budgetApproved && project.budgetApproved > 0
      ? ((project.budgetSpent ?? 0) / project.budgetApproved) * 100
      : 0;

  /* ---- Status transition actions ---- */

  function handleStatusTransition(newStatus: string) {
    updateProject.mutate({ status: newStatus });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this project?")) return;
    deleteProject.mutate(id, {
      onSuccess: () => router.push("/dashboard/planning/projects"),
    });
  }

  function handleAddStakeholder(e: React.FormEvent) {
    e.preventDefault();
    if (!stUserId.trim() || !stRole.trim()) return;
    addStakeholder.mutate(
      {
        userId: stUserId.trim(),
        role: stRole.trim(),
        influence: stInfluence.trim() || undefined,
        interest: stInterest.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowStakeholderForm(false);
          setStUserId("");
          setStRole("");
          setStInfluence("");
          setStInterest("");
        },
      },
    );
  }

  function handleAddDependency(e: React.FormEvent) {
    e.preventDefault();
    if (!depProjectId) return;
    addDependency.mutate(
      {
        dependsOnProjectId: depProjectId,
        dependencyType: depType,
        description: depDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowDependencyForm(false);
          setDepProjectId("");
          setDepType("finish_to_start");
          setDepDescription("");
        },
      },
    );
  }

  function renderStatusActions() {
    if (!project) return null;
    const s = project.status.toLowerCase();

    const buttons: React.ReactNode[] = [];

    if (s === "draft" || s === "pending_approval") {
      buttons.push(
        <button
          key="approve"
          type="button"
          disabled={isActing}
          onClick={() => approveProject.mutate(id)}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {approveProject.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle size={16} />
          )}
          Approve
        </button>,
      );
    }

    if (s === "approved" || s === "on_hold") {
      buttons.push(
        <button
          key="activate"
          type="button"
          disabled={isActing}
          onClick={() => handleStatusTransition("active")}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <PlayCircle size={16} />
          Activate
        </button>,
      );
    }

    if (s === "active") {
      buttons.push(
        <button
          key="hold"
          type="button"
          disabled={isActing}
          onClick={() => handleStatusTransition("on_hold")}
          className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <PauseCircle size={16} />
          Hold
        </button>,
      );
      buttons.push(
        <button
          key="complete"
          type="button"
          disabled={isActing}
          onClick={() => handleStatusTransition("completed")}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <CheckCircle size={16} />
          Complete
        </button>,
      );
    }

    if (s !== "completed" && s !== "cancelled") {
      buttons.push(
        <button
          key="cancel"
          type="button"
          disabled={isActing}
          onClick={() => handleStatusTransition("cancelled")}
          className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-700 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <XCircle size={16} />
          Cancel
        </button>,
      );
    }

    return <>{buttons}</>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/planning/projects")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
            <Briefcase size={24} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {project.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              <span className="text-xs font-mono text-[var(--neutral-gray)]">
                {project.code}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                style={{
                  backgroundColor: `${ragColor(project.ragStatus)}20`,
                  color: ragColor(project.ragStatus),
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ragColor(project.ragStatus),
                  }}
                />
                RAG: {project.ragStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {renderStatusActions()}
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/planning/projects/${id}`)
            }
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteProject.isPending}
            className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-700 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {deleteProject.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Delete
          </button>
        </div>
      </motion.div>

      {/* Overview Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Progress */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-[var(--primary)]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Progress
            </p>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {project.completionPct ?? 0}%
          </p>
          <div className="mt-2 w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${project.completionPct ?? 0}%`,
                backgroundColor: ragColor(project.ragStatus),
              }}
            />
          </div>
        </div>

        {/* Budget */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} style={{ color: "#C9A84C" }} />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Budget
            </p>
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {project.budgetApproved
              ? formatCurrency(project.budgetApproved)
              : "Not set"}
          </p>
          {project.budgetApproved && project.budgetApproved > 0 && (
            <>
              <p className="text-xs text-[var(--neutral-gray)] mt-1">
                Spent: {formatCurrency(project.budgetSpent ?? 0)} (
                {budgetPct.toFixed(0)}%)
              </p>
              <div className="mt-2 w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(budgetPct, 100)}%`,
                    backgroundColor: budgetPct > 90 ? "#EF4444" : "#1B7340",
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Planned Start */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-[var(--info)]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Planned Start
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {project.plannedStart
              ? new Date(project.plannedStart).toLocaleDateString()
              : "Not set"}
          </p>
          {project.actualStart && (
            <p className="text-xs text-[var(--neutral-gray)] mt-1">
              Actual: {new Date(project.actualStart).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Planned End */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} style={{ color: "#EF4444" }} />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Planned End
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {project.plannedEnd
              ? new Date(project.plannedEnd).toLocaleDateString()
              : "Not set"}
          </p>
          {project.actualEnd && (
            <p className="text-xs text-[var(--neutral-gray)] mt-1">
              Actual: {new Date(project.actualEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      </motion.div>

      {/* Description / Charter / Scope / Business Case */}
      {(project.description ||
        project.charter ||
        project.scope ||
        project.businessCase) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="space-y-4"
        >
          {project.description && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                Description
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          )}
          {project.charter && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                Project Charter
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                {project.charter}
              </p>
            </div>
          )}
          {project.scope && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                Scope
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                {project.scope}
              </p>
            </div>
          )}
          {project.businessCase && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                Business Case
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                {project.businessCase}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Stakeholders Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Stakeholders
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowStakeholderForm((f) => !f)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
          >
            <Plus size={14} />
            Add Stakeholder
          </button>
        </div>

        {/* Add Stakeholder Form */}
        {showStakeholderForm && (
          <motion.form
            onSubmit={handleAddStakeholder}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="User ID"
                name="stUserId"
                value={stUserId}
                onChange={setStUserId}
                placeholder="User UUID"
                required
              />
              <FormField
                label="Role"
                name="stRole"
                value={stRole}
                onChange={setStRole}
                placeholder="e.g. Sponsor, PM, Developer"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Influence"
                name="stInfluence"
                type="select"
                value={stInfluence}
                onChange={setStInfluence}
                options={[
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
                placeholder="Select influence"
              />
              <FormField
                label="Interest"
                name="stInterest"
                type="select"
                value={stInterest}
                onChange={setStInterest}
                options={[
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
                placeholder="Select interest"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={addStakeholder.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {addStakeholder.isPending && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowStakeholderForm(false)}
                className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}

        {/* Stakeholders List */}
        {!stakeholders || stakeholders.length === 0 ? (
          <p className="text-sm text-[var(--neutral-gray)] py-4 text-center">
            No stakeholders added yet.
          </p>
        ) : (
          <div className="space-y-2">
            {stakeholders.map((sh: ProjectStakeholder) => (
              <div
                key={sh.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                    <Users
                      size={14}
                      className="text-[var(--neutral-gray)]"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {sh.userId.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      {sh.role}
                      {sh.influence && ` | Influence: ${sh.influence}`}
                      {sh.interest && ` | Interest: ${sh.interest}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeStakeholder.mutate(sh.id)}
                  disabled={removeStakeholder.isPending}
                  className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Dependencies Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Dependencies
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowDependencyForm((f) => !f)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
          >
            <Plus size={14} />
            Add Dependency
          </button>
        </div>

        {/* Add Dependency Form */}
        {showDependencyForm && (
          <motion.form
            onSubmit={handleAddDependency}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <FormField
              label="Depends On Project"
              name="depProjectId"
              type="select"
              value={depProjectId}
              onChange={setDepProjectId}
              options={allProjects
                .filter((p) => p.id !== id)
                .map((p) => ({ value: p.id, label: `${p.code} - ${p.title}` }))}
              placeholder="Select project"
              required
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Dependency Type"
                name="depType"
                type="select"
                value={depType}
                onChange={setDepType}
                options={[
                  { value: "finish_to_start", label: "Finish to Start" },
                  { value: "start_to_start", label: "Start to Start" },
                  { value: "finish_to_finish", label: "Finish to Finish" },
                  { value: "start_to_finish", label: "Start to Finish" },
                ]}
              />
              <FormField
                label="Description"
                name="depDescription"
                value={depDescription}
                onChange={setDepDescription}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={addDependency.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {addDependency.isPending && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowDependencyForm(false)}
                className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}

        {/* Dependencies List */}
        {!dependencies || dependencies.length === 0 ? (
          <p className="text-sm text-[var(--neutral-gray)] py-4 text-center">
            No dependencies defined yet.
          </p>
        ) : (
          <div className="space-y-2">
            {dependencies.map((dep: ProjectDependency) => {
              const depProject = allProjects.find(
                (p) => p.id === dep.dependsOnProjectId,
              );
              return (
                <div
                  key={dep.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                      <GitBranch
                        size={14}
                        className="text-[var(--neutral-gray)]"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {depProject
                          ? `${depProject.code} - ${depProject.title}`
                          : dep.dependsOnProjectId.slice(0, 8) + "..."}
                      </p>
                      <p className="text-xs text-[var(--neutral-gray)]">
                        {dep.dependencyType.replace(/_/g, " ")}
                        {dep.description && ` - ${dep.description}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDependency.mutate(dep.id)}
                    disabled={removeDependency.isPending}
                    className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Metadata
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Priority
            </dt>
            <dd className="capitalize text-[var(--text-primary)]">
              {project.priority}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Portfolio
            </dt>
            <dd className="text-[var(--text-primary)]">
              {project.portfolioId || "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Sponsor
            </dt>
            <dd className="text-[var(--text-primary)]">
              {project.sponsorId || "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Project Manager
            </dt>
            <dd className="text-[var(--text-primary)]">
              {project.projectManagerId || "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Created
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(project.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Last Updated
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(project.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </motion.div>
    </div>
  );
}
