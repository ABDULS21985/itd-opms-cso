"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreatePolicy } from "@/hooks/use-governance";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { value: "security", label: "Security" },
  { value: "operational", label: "Operational" },
  { value: "compliance", label: "Compliance" },
  { value: "hr", label: "Human Resources" },
];

const SCOPE_TYPES = [
  { value: "enterprise", label: "Enterprise-wide" },
  { value: "tenant", label: "Tenant-specific" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewPolicyPage() {
  const router = useRouter();
  const createPolicy = useCreatePolicy();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [scopeType, setScopeType] = useState("enterprise");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!category) newErrors.category = "Category is required";
    if (!content.trim()) newErrors.content = "Content is required";
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

    createPolicy.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        scopeType,
        content: content.trim(),
        tags: tagsArray,
        effectiveDate: effectiveDate || undefined,
        reviewDate: reviewDate || undefined,
        expiryDate: expiryDate || undefined,
        ownerId: ownerId.trim() || undefined,
      },
      {
        onSuccess: (policy) => {
          router.push(`/dashboard/governance/policies/${policy.id}`);
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
          onClick={() => router.push("/dashboard/governance/policies")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Policies
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Create New Policy
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Define a new organizational policy. It will be saved as a draft.
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
          placeholder="e.g. Information Security Policy"
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
          placeholder="Brief summary of the policy purpose"
          rows={2}
        />

        {/* Category & Scope */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Category"
            name="category"
            type="select"
            value={category}
            onChange={setCategory}
            options={CATEGORIES}
            placeholder="Select category"
            required
            error={errors.category}
          />
          <FormField
            label="Scope Type"
            name="scopeType"
            type="select"
            value={scopeType}
            onChange={setScopeType}
            options={SCOPE_TYPES}
          />
        </div>

        {/* Content */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Content <span className="text-[var(--error)]">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the full policy content here..."
            rows={12}
            className={`w-full rounded-xl border bg-[var(--surface-0)] px-3.5 py-2.5 text-sm transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] ${
              errors.content
                ? "border-[var(--error)] ring-2 ring-[var(--error)]/10"
                : "border-[var(--border)]"
            }`}
          />
          {errors.content && (
            <p className="mt-1 text-xs font-medium text-[var(--error)]">
              {errors.content}
            </p>
          )}
        </div>

        {/* Tags */}
        <FormField
          label="Tags"
          name="tags"
          value={tags}
          onChange={setTags}
          placeholder="e.g. security, access-control, gdpr (comma-separated)"
          description="Separate multiple tags with commas"
        />

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            label="Effective Date"
            name="effectiveDate"
            type="date"
            value={effectiveDate}
            onChange={setEffectiveDate}
          />
          <FormField
            label="Review Date"
            name="reviewDate"
            type="date"
            value={reviewDate}
            onChange={setReviewDate}
          />
          <FormField
            label="Expiry Date"
            name="expiryDate"
            type="date"
            value={expiryDate}
            onChange={setExpiryDate}
          />
        </div>

        {/* Owner */}
        <FormField
          label="Owner ID"
          name="ownerId"
          value={ownerId}
          onChange={setOwnerId}
          placeholder="User UUID of the policy owner"
          description="The person accountable for this policy"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/governance/policies")}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPolicy.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createPolicy.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Policy
          </button>
        </div>
      </motion.form>
    </div>
  );
}
