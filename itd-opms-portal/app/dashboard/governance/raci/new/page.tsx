"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateRACIMatrix } from "@/hooks/use-governance";

export default function CreateRACIMatrixPage() {
  const router = useRouter();
  const createMutation = useCreateRACIMatrix();

  const [title, setTitle] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!entityType) newErrors.entityType = "Entity type is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createMutation.mutate(
      {
        title: title.trim(),
        entityType,
        entityId: entityId.trim() || undefined,
        description: description.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          router.push(`/dashboard/governance/raci/${data.id}`);
        },
      },
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href="/dashboard/governance/raci"
          className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Create RACI Matrix
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Define a new responsibility assignment matrix.
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl rounded-xl border p-6 space-y-5"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <FormField
            label="Title"
            name="title"
            value={title}
            onChange={setTitle}
            placeholder="e.g., Change Management RACI"
            required
            error={errors.title}
          />

          <FormField
            label="Entity Type"
            name="entityType"
            type="select"
            value={entityType}
            onChange={setEntityType}
            required
            error={errors.entityType}
            options={[
              { value: "process", label: "Process" },
              { value: "project", label: "Project" },
              { value: "service", label: "Service" },
            ]}
            placeholder="Select entity type..."
          />

          <FormField
            label="Entity ID"
            name="entityId"
            value={entityId}
            onChange={setEntityId}
            placeholder="Optional UUID of related entity"
            description="Link this matrix to a specific process, project, or service by ID."
          />

          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={description}
            onChange={setDescription}
            placeholder="Describe the purpose and scope of this RACI matrix..."
            rows={4}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard/governance/raci"
              className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-1)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {createMutation.isPending ? "Creating..." : "Create Matrix"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
