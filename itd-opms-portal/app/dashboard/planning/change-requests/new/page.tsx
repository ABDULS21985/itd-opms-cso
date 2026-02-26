"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateChangeRequest } from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewChangeRequestPage() {
  const router = useRouter();
  const createChangeRequest = useCreateChangeRequest();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [justification, setJustification] = useState("");
  const [impactAssessment, setImpactAssessment] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!justification.trim())
      newErrors.justification = "Justification is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createChangeRequest.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId.trim() || undefined,
        justification: justification.trim(),
        impactAssessment: impactAssessment.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/planning/change-requests");
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
          onClick={() =>
            router.push("/dashboard/planning/change-requests")
          }
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Change Requests
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Submit Change Request
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Request a change to project scope, schedule, or budget.
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
          placeholder="e.g. Extend project timeline by 2 weeks"
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
          placeholder="Detailed description of the proposed change"
          rows={4}
        />

        {/* Project */}
        <FormField
          label="Project"
          name="projectId"
          value={projectId}
          onChange={setProjectId}
          placeholder="Project UUID (optional)"
          description="The project this change request applies to"
        />

        {/* Justification */}
        <FormField
          label="Justification"
          name="justification"
          type="textarea"
          value={justification}
          onChange={setJustification}
          placeholder="Why is this change necessary? What are the business drivers?"
          rows={4}
          required
          error={errors.justification}
        />

        {/* Impact Assessment */}
        <FormField
          label="Impact Assessment"
          name="impactAssessment"
          type="textarea"
          value={impactAssessment}
          onChange={setImpactAssessment}
          placeholder="What is the impact on scope, timeline, budget, and resources?"
          rows={4}
          description="Describe impacts on schedule, cost, scope, quality, and risks"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/planning/change-requests")
            }
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createChangeRequest.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createChangeRequest.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Submit Change Request
          </button>
        </div>
      </motion.form>
    </div>
  );
}
