"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { usePolicy, useUpdatePolicy } from "@/hooks/use-governance";

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

export default function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: policy, isLoading } = usePolicy(id);
  const updatePolicy = useUpdatePolicy(id);

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
  const [changesSummary, setChangesSummary] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* Pre-populate form when policy loads */
  useEffect(() => {
    if (policy) {
      setTitle(policy.title);
      setDescription(policy.description || "");
      setCategory(policy.category);
      setScopeType(policy.scopeType);
      setContent(policy.content);
      setTags(policy.tags?.join(", ") || "");
      setEffectiveDate(policy.effectiveDate?.split("T")[0] || "");
      setReviewDate(policy.reviewDate?.split("T")[0] || "");
      setExpiryDate(policy.expiryDate?.split("T")[0] || "");
      setOwnerId(policy.ownerId || "");
    }
  }, [policy]);

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

    updatePolicy.mutate(
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
        // Include changes summary as part of the update payload
        ...(changesSummary.trim() && {
          changesSummary: changesSummary.trim(),
        }),
      } as Record<string, unknown>,
      {
        onSuccess: () => {
          router.push(`/dashboard/governance/policies/${id}`);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading policy...
          </p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">Policy not found.</p>
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
          onClick={() =>
            router.push(`/dashboard/governance/policies/${id}`)
          }
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Policy
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Edit Policy
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Update the policy details. A new version will be created when saved.
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

        {/* Changes Summary */}
        <FormField
          label="Changes Summary"
          name="changesSummary"
          type="textarea"
          value={changesSummary}
          onChange={setChangesSummary}
          placeholder="Describe the changes made in this version..."
          rows={3}
          description="Briefly explain what changed for version tracking"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/governance/policies/${id}`)
            }
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updatePolicy.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {updatePolicy.isPending ? (
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
