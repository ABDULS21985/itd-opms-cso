"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateIssue } from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { value: "technical", label: "Technical" },
  { value: "operational", label: "Operational" },
  { value: "resource", label: "Resource" },
  { value: "process", label: "Process" },
  { value: "vendor", label: "Vendor" },
  { value: "requirements", label: "Requirements" },
  { value: "other", label: "Other" },
];

const SEVERITIES = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewIssuePage() {
  const router = useRouter();
  const createIssue = useCreateIssue();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!severity) newErrors.severity = "Severity is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createIssue.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId.trim() || undefined,
        category: category || undefined,
        severity,
        assigneeId: assigneeId.trim() || undefined,
        dueDate: dueDate || undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/planning/issues");
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
          onClick={() => router.push("/dashboard/planning/issues")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Issues
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Report New Issue
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Log a new project issue for tracking and resolution.
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
          placeholder="e.g. Database connection timeout under load"
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
          placeholder="Detailed description of the issue, including steps to reproduce if applicable"
          rows={4}
        />

        {/* Project & Category */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Project"
            name="projectId"
            value={projectId}
            onChange={setProjectId}
            placeholder="Project UUID (optional)"
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

        {/* Severity & Assignee */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Severity"
            name="severity"
            type="select"
            value={severity}
            onChange={setSeverity}
            options={SEVERITIES}
            placeholder="Select severity"
            required
            error={errors.severity}
          />
          <FormField
            label="Assignee"
            name="assigneeId"
            value={assigneeId}
            onChange={setAssigneeId}
            placeholder="User UUID of the assignee"
          />
        </div>

        {/* Due Date */}
        <FormField
          label="Due Date"
          name="dueDate"
          type="date"
          value={dueDate}
          onChange={setDueDate}
          description="Expected resolution date"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/issues")}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createIssue.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createIssue.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Report Issue
          </button>
        </div>
      </motion.form>
    </div>
  );
}
