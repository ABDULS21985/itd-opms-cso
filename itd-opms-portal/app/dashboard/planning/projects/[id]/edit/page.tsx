"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import {
  useProject,
  useUpdateProject,
  usePortfolios,
} from "@/hooks/use-planning";
import { useOrgUnits, useUsers } from "@/hooks/use-system";

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUSES = [
  { value: "proposed", label: "Proposed" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const RAG_STATUSES = [
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "red", label: "Red" },
];

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: project, isLoading: projectLoading } = useProject(id);
  const updateProject = useUpdateProject(id);
  const { data: portfoliosData } = usePortfolios(1, 100);
  const portfolios = portfoliosData?.data ?? [];
  const { data: orgUnitsData } = useOrgUnits(1, 100);
  const { data: usersData } = useUsers(1, 200);

  const orgUnits = Array.isArray(orgUnitsData)
    ? orgUnitsData
    : orgUnitsData?.data ?? [];

  const users = Array.isArray(usersData)
    ? usersData
    : usersData?.data ?? [];

  const portfolioOptions = portfolios.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const divisionOptions = orgUnits
    .filter(
      (ou) =>
        ou.level === "office" ||
        ou.level === "division" ||
        ou.level === "department",
    )
    .map((ou) => ({ value: ou.id, label: `${ou.code} — ${ou.name}` }));

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.displayName || u.email,
  }));

  /* ---- Form state ---- */
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [description, setDescription] = useState("");
  const [charter, setCharter] = useState("");
  const [scope, setScope] = useState("");
  const [businessCase, setBusinessCase] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [projectManagerId, setProjectManagerId] = useState("");
  const [status, setStatus] = useState("");
  const [ragStatus, setRagStatus] = useState("");
  const [priority, setPriority] = useState("medium");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [actualStart, setActualStart] = useState("");
  const [actualEnd, setActualEnd] = useState("");
  const [budgetApproved, setBudgetApproved] = useState("");
  const [budgetSpent, setBudgetSpent] = useState("");
  const [completionPct, setCompletionPct] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  /* ---- Pre-fill form from existing project ---- */
  useEffect(() => {
    if (project && !initialized) {
      setTitle(project.title || "");
      setCode(project.code || "");
      setPortfolioId(project.portfolioId || "");
      setDivisionId(project.divisionId || "");
      setDescription(project.description || "");
      setCharter(project.charter || "");
      setScope(project.scope || "");
      setBusinessCase(project.businessCase || "");
      setSponsorId(project.sponsorId || "");
      setProjectManagerId(project.projectManagerId || "");
      setStatus(project.status || "");
      setRagStatus(project.ragStatus || "");
      setPriority(project.priority || "medium");
      setPlannedStart(formatDateForInput(project.plannedStart));
      setPlannedEnd(formatDateForInput(project.plannedEnd));
      setActualStart(formatDateForInput(project.actualStart));
      setActualEnd(formatDateForInput(project.actualEnd));
      setBudgetApproved(project.budgetApproved ? String(project.budgetApproved) : "");
      setBudgetSpent(project.budgetSpent ? String(project.budgetSpent) : "");
      setCompletionPct(project.completionPct != null ? String(project.completionPct) : "");
      setInitialized(true);
    }
  }, [project, initialized]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Project title is required";
    if (!code.trim()) newErrors.code = "Project code is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    updateProject.mutate(
      {
        title: title.trim(),
        code: code.trim(),
        portfolioId: portfolioId || undefined,
        divisionId: divisionId || undefined,
        description: description.trim() || undefined,
        charter: charter.trim() || undefined,
        scope: scope.trim() || undefined,
        businessCase: businessCase.trim() || undefined,
        sponsorId: sponsorId || undefined,
        projectManagerId: projectManagerId || undefined,
        status: status || undefined,
        ragStatus: ragStatus || undefined,
        priority,
        plannedStart: plannedStart ? `${plannedStart}T00:00:00Z` : undefined,
        plannedEnd: plannedEnd ? `${plannedEnd}T00:00:00Z` : undefined,
        actualStart: actualStart ? `${actualStart}T00:00:00Z` : undefined,
        actualEnd: actualEnd ? `${actualEnd}T00:00:00Z` : undefined,
        budgetApproved: budgetApproved ? Number(budgetApproved) : undefined,
        budgetSpent: budgetSpent ? Number(budgetSpent) : undefined,
        completionPct: completionPct !== "" ? Number(completionPct) : undefined,
      },
      {
        onSuccess: () => {
          router.push(`/dashboard/planning/projects/${id}`);
        },
      },
    );
  }

  if (projectLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-[var(--surface-1)]" />
          <div className="h-4 w-72 rounded bg-[var(--surface-1)]" />
          <div className="h-[600px] rounded-2xl bg-[var(--surface-1)]" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center text-[var(--neutral-gray)]">
        Project not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push(`/dashboard/planning/projects/${id}`)}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Project
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Edit Project
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Update project details for <strong>{project.title}</strong>.
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
      >
        {/* Section: Basic Information */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Project Title"
                name="title"
                value={title}
                onChange={setTitle}
                placeholder="e.g. Core Banking Upgrade"
                required
                error={errors.title}
              />
              <FormField
                label="Project Code"
                name="code"
                value={code}
                onChange={setCode}
                placeholder="e.g. PRJ-2026-001"
                required
                error={errors.code}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Portfolio"
                name="portfolioId"
                type="select"
                value={portfolioId}
                onChange={setPortfolioId}
                options={portfolioOptions}
                placeholder="Select portfolio (optional)"
              />
              <FormField
                label="Division / Office"
                name="divisionId"
                type="select"
                value={divisionId}
                onChange={setDivisionId}
                options={divisionOptions}
                placeholder="Select division (optional)"
              />
            </div>

            <FormField
              label="Description"
              name="description"
              type="textarea"
              value={description}
              onChange={setDescription}
              placeholder="Brief summary of the project"
              rows={3}
            />
          </div>
        </div>

        {/* Section: Charter & Scope */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Charter &amp; Scope
          </h2>
          <div className="space-y-4">
            <FormField
              label="Project Charter"
              name="charter"
              type="textarea"
              value={charter}
              onChange={setCharter}
              placeholder="Define the project charter and objectives"
              rows={4}
            />
            <FormField
              label="Scope"
              name="scope"
              type="textarea"
              value={scope}
              onChange={setScope}
              placeholder="Define what is in and out of scope"
              rows={3}
            />
            <FormField
              label="Business Case"
              name="businessCase"
              type="textarea"
              value={businessCase}
              onChange={setBusinessCase}
              placeholder="Justify the project with a business case"
              rows={3}
            />
          </div>
        </div>

        {/* Section: Team & Priority */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Team &amp; Priority
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Sponsor"
                name="sponsorId"
                type="select"
                value={sponsorId}
                onChange={setSponsorId}
                options={userOptions}
                placeholder="Select sponsor (optional)"
              />
              <FormField
                label="Project Manager"
                name="projectManagerId"
                type="select"
                value={projectManagerId}
                onChange={setProjectManagerId}
                options={userOptions}
                placeholder="Select project manager (optional)"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Status"
                name="status"
                type="select"
                value={status}
                onChange={setStatus}
                options={STATUSES}
                placeholder="Select status"
              />
              <FormField
                label="RAG Status"
                name="ragStatus"
                type="select"
                value={ragStatus}
                onChange={setRagStatus}
                options={RAG_STATUSES}
                placeholder="Select RAG status"
              />
            </div>
            <FormField
              label="Priority"
              name="priority"
              type="select"
              value={priority}
              onChange={setPriority}
              options={PRIORITIES}
            />
          </div>
        </div>

        {/* Section: Timeline & Budget */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Timeline &amp; Budget
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Planned Start"
                name="plannedStart"
                type="date"
                value={plannedStart}
                onChange={setPlannedStart}
              />
              <FormField
                label="Planned End"
                name="plannedEnd"
                type="date"
                value={plannedEnd}
                onChange={setPlannedEnd}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Actual Start"
                name="actualStart"
                type="date"
                value={actualStart}
                onChange={setActualStart}
              />
              <FormField
                label="Actual End"
                name="actualEnd"
                type="date"
                value={actualEnd}
                onChange={setActualEnd}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                label="Approved Budget"
                name="budgetApproved"
                type="number"
                value={budgetApproved}
                onChange={setBudgetApproved}
                placeholder="e.g. 50000000"
                description="Budget in NGN"
              />
              <FormField
                label="Spent Budget"
                name="budgetSpent"
                type="number"
                value={budgetSpent}
                onChange={setBudgetSpent}
                placeholder="e.g. 12000000"
                description="Amount spent in NGN"
              />
              <FormField
                label="Completion %"
                name="completionPct"
                type="number"
                value={completionPct}
                onChange={setCompletionPct}
                placeholder="0–100"
                description="Overall progress percentage"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/planning/projects/${id}`)}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateProject.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {updateProject.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Changes
          </button>
        </div>
      </motion.form>
    </div>
  );
}
