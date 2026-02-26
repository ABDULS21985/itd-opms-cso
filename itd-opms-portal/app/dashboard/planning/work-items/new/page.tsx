"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateWorkItem } from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WORK_ITEM_TYPES = [
  { value: "epic", label: "Epic" },
  { value: "story", label: "Story" },
  { value: "task", label: "Task" },
  { value: "subtask", label: "Subtask" },
  { value: "milestone", label: "Milestone" },
];

const PRIORITIES = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewWorkItemPage() {
  const router = useRouter();
  const createWorkItem = useCreateWorkItem();

  const [projectId, setProjectId] = useState("");
  const [parentId, setParentId] = useState("");
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!projectId.trim()) newErrors.projectId = "Project ID is required";
    if (!type) newErrors.type = "Type is required";
    if (!title.trim()) newErrors.title = "Title is required";
    if (!priority) newErrors.priority = "Priority is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    createWorkItem.mutate(
      {
        projectId: projectId.trim(),
        parentId: parentId.trim() || undefined,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeId: assigneeId.trim() || undefined,
        priority,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        dueDate: dueDate || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/planning/work-items");
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
          onClick={() => router.push("/dashboard/planning/work-items")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Work Items
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Create New Work Item
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Define a new task, story, or epic for your project.
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
        {/* Project & Parent */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Project ID"
            name="projectId"
            value={projectId}
            onChange={setProjectId}
            placeholder="Project UUID"
            required
            error={errors.projectId}
          />
          <FormField
            label="Parent ID"
            name="parentId"
            value={parentId}
            onChange={setParentId}
            placeholder="Parent work item UUID (optional)"
            description="For subtasks, reference the parent item"
          />
        </div>

        {/* Type & Priority */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Type"
            name="type"
            type="select"
            value={type}
            onChange={setType}
            options={WORK_ITEM_TYPES}
            placeholder="Select type"
            required
            error={errors.type}
          />
          <FormField
            label="Priority"
            name="priority"
            type="select"
            value={priority}
            onChange={setPriority}
            options={PRIORITIES}
            placeholder="Select priority"
            required
            error={errors.priority}
          />
        </div>

        {/* Title */}
        <FormField
          label="Title"
          name="title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Implement user authentication module"
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
          placeholder="Detailed description of the work item"
          rows={4}
        />

        {/* Assignee & Estimated Hours */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Assignee"
            name="assigneeId"
            value={assigneeId}
            onChange={setAssigneeId}
            placeholder="User UUID of the assignee"
          />
          <FormField
            label="Estimated Hours"
            name="estimatedHours"
            type="number"
            value={estimatedHours}
            onChange={setEstimatedHours}
            placeholder="e.g. 8"
          />
        </div>

        {/* Due Date */}
        <FormField
          label="Due Date"
          name="dueDate"
          type="date"
          value={dueDate}
          onChange={setDueDate}
        />

        {/* Tags */}
        <FormField
          label="Tags"
          name="tags"
          value={tags}
          onChange={setTags}
          placeholder="e.g. backend, api, auth (comma-separated)"
          description="Separate multiple tags with commas"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/work-items")}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createWorkItem.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createWorkItem.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Work Item
          </button>
        </div>
      </motion.form>
    </div>
  );
}
