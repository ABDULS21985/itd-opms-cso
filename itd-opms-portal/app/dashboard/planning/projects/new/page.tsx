"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateProject, usePortfolios } from "@/hooks/use-planning";
import { useOrgUnits } from "@/hooks/use-system";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const { data: portfoliosData } = usePortfolios(1, 100);
  const portfolios = portfoliosData?.data ?? [];
  const { data: orgUnitsData } = useOrgUnits(1, 100);

  const orgUnits = Array.isArray(orgUnitsData)
    ? orgUnitsData
    : orgUnitsData?.data ?? [];

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
  const [priority, setPriority] = useState("medium");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [budgetApproved, setBudgetApproved] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

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

    createProject.mutate(
      {
        title: title.trim(),
        code: code.trim(),
        portfolioId: portfolioId || undefined,
        divisionId: divisionId || undefined,
        description: description.trim() || undefined,
        charter: charter.trim() || undefined,
        scope: scope.trim() || undefined,
        businessCase: businessCase.trim() || undefined,
        sponsorId: sponsorId.trim() || undefined,
        projectManagerId: projectManagerId.trim() || undefined,
        priority,
        plannedStart: plannedStart || undefined,
        plannedEnd: plannedEnd || undefined,
        budgetApproved: budgetApproved ? Number(budgetApproved) : undefined,
      },
      {
        onSuccess: (project) => {
          router.push(`/dashboard/planning/projects/${project.id}`);
        },
      },
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
          onClick={() => router.push("/dashboard/planning/projects")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Initiate New Project
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Define a new project. It will be saved as a draft for review and
          approval.
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
                label="Sponsor ID"
                name="sponsorId"
                value={sponsorId}
                onChange={setSponsorId}
                placeholder="User UUID of the project sponsor"
              />
              <FormField
                label="Project Manager ID"
                name="projectManagerId"
                value={projectManagerId}
                onChange={setProjectManagerId}
                placeholder="User UUID of the project manager"
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
            <FormField
              label="Approved Budget"
              name="budgetApproved"
              type="number"
              value={budgetApproved}
              onChange={setBudgetApproved}
              placeholder="e.g. 50000000"
              description="Budget in NGN"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/projects")}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createProject.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createProject.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Project
          </button>
        </div>
      </motion.form>
    </div>
  );
}
