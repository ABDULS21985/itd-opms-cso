"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateRisk } from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { value: "technical", label: "Technical" },
  { value: "operational", label: "Operational" },
  { value: "financial", label: "Financial" },
  { value: "security", label: "Security" },
  { value: "compliance", label: "Compliance" },
  { value: "resource", label: "Resource" },
  { value: "schedule", label: "Schedule" },
];

const LIKELIHOOD_LEVELS = [
  { value: "very_low", label: "Very Low (1)" },
  { value: "low", label: "Low (2)" },
  { value: "medium", label: "Medium (3)" },
  { value: "high", label: "High (4)" },
  { value: "very_high", label: "Very High (5)" },
];

const IMPACT_LEVELS = [
  { value: "very_low", label: "Very Low (1)" },
  { value: "low", label: "Low (2)" },
  { value: "medium", label: "Medium (3)" },
  { value: "high", label: "High (4)" },
  { value: "very_high", label: "Very High (5)" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewRiskPage() {
  const router = useRouter();
  const createRisk = useCreateRisk();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("");
  const [likelihood, setLikelihood] = useState("");
  const [impact, setImpact] = useState("");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [contingencyPlan, setContingencyPlan] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!likelihood) newErrors.likelihood = "Likelihood is required";
    if (!impact) newErrors.impact = "Impact is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createRisk.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId.trim() || undefined,
        category: category || undefined,
        likelihood,
        impact,
        mitigationPlan: mitigationPlan.trim() || undefined,
        contingencyPlan: contingencyPlan.trim() || undefined,
        ownerId: ownerId.trim() || undefined,
        reviewDate: reviewDate || undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/planning/risks");
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
          onClick={() => router.push("/dashboard/planning/risks")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Risk Register
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Register New Risk
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Identify and assess a new risk for tracking and mitigation.
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
        {/* Title */}
        <FormField
          label="Title"
          name="title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Key team member departure"
          required
          error={errors.title}
        />

        {/* Description */}
        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={description}
          onChange={setDescription}
          placeholder="Detailed description of the risk"
          rows={3}
        />

        {/* Project & Category */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Project"
            name="projectId"
            value={projectId}
            onChange={setProjectId}
            placeholder="Project UUID (optional)"
            description="Leave empty for organization-wide risks"
          />
          <FormField
            label="Category"
            name="category"
            type="select"
            value={category}
            onChange={setCategory}
            options={CATEGORIES}
            placeholder="Select category"
          />
        </div>

        {/* Likelihood & Impact */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Likelihood"
            name="likelihood"
            type="select"
            value={likelihood}
            onChange={setLikelihood}
            options={LIKELIHOOD_LEVELS}
            placeholder="Select likelihood"
            required
            error={errors.likelihood}
          />
          <FormField
            label="Impact"
            name="impact"
            type="select"
            value={impact}
            onChange={setImpact}
            options={IMPACT_LEVELS}
            placeholder="Select impact"
            required
            error={errors.impact}
          />
        </div>

        {/* Mitigation Plan */}
        <FormField
          label="Mitigation Plan"
          name="mitigationPlan"
          type="textarea"
          value={mitigationPlan}
          onChange={setMitigationPlan}
          placeholder="Steps to reduce the likelihood or impact of this risk"
          rows={3}
        />

        {/* Contingency Plan */}
        <FormField
          label="Contingency Plan"
          name="contingencyPlan"
          type="textarea"
          value={contingencyPlan}
          onChange={setContingencyPlan}
          placeholder="Fallback plan if the risk materializes"
          rows={3}
        />

        {/* Owner & Review Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Owner"
            name="ownerId"
            value={ownerId}
            onChange={setOwnerId}
            placeholder="User UUID of the risk owner"
          />
          <FormField
            label="Review Date"
            name="reviewDate"
            type="date"
            value={reviewDate}
            onChange={setReviewDate}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/risks")}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createRisk.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createRisk.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Register Risk
          </button>
        </div>
      </motion.form>
    </div>
  );
}
