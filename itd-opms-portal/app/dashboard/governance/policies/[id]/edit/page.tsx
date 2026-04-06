"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  Shield,
  FileText,
  Tag,
  Calendar,
  User,
  Clock,
  Lightbulb,
  Info,
  X,
  AlertTriangle,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { UserPicker } from "@/components/shared/pickers";
import { StatusBadge } from "@/components/shared/status-badge";
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

const CATEGORY_CONFIG: Record<string, { color: string; gradient: string }> = {
  security: { color: "#EF4444", gradient: "linear-gradient(135deg, #EF4444, #F87171)" },
  operational: { color: "#3B82F6", gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)" },
  compliance: { color: "#8B5CF6", gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)" },
  hr: { color: "#F59E0B", gradient: "linear-gradient(135deg, #F59E0B, #FBBF24)" },
};

/* ------------------------------------------------------------------ */
/*  Section Card                                                       */
/* ------------------------------------------------------------------ */

function SectionCard({
  icon: Icon,
  label,
  description,
  children,
  delay = 0,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  description?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-1)]/50 px-6 py-3">
        <Icon size={15} className="text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </span>
        {description && (
          <span className="text-xs text-[var(--neutral-gray)]">
            — {description}
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag Input                                                          */
/* ------------------------------------------------------------------ */

function TagInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const tags = useMemo(
    () =>
      value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [value],
  );

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags.join(", "));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        Tags
      </label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2 py-0.5 text-xs font-medium text-[var(--primary)]"
            >
              <Tag size={10} />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="rounded-full p-0.5 hover:bg-[var(--primary)]/20 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. security, access-control, gdpr (comma-separated)"
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
      />
      <p className="text-xs text-[var(--neutral-gray)] mt-1">
        Separate multiple tags with commas
      </p>
    </div>
  );
}

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
  const [ownerDisplay, setOwnerDisplay] = useState("");
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
      setOwnerDisplay(policy.ownerId || "");
    }
  }, [policy]);

  /* ---- Change tracking ---- */
  const hasChanges = useMemo(() => {
    if (!policy) return false;
    return (
      title !== policy.title ||
      description !== (policy.description || "") ||
      category !== policy.category ||
      scopeType !== policy.scopeType ||
      content !== policy.content ||
      tags !== (policy.tags?.join(", ") || "") ||
      effectiveDate !== (policy.effectiveDate?.split("T")[0] || "") ||
      reviewDate !== (policy.reviewDate?.split("T")[0] || "") ||
      expiryDate !== (policy.expiryDate?.split("T")[0] || "") ||
      ownerId !== (policy.ownerId || "")
    );
  }, [
    policy, title, description, category, scopeType, content,
    tags, effectiveDate, reviewDate, expiryDate, ownerId,
  ]);

  /* ---- Content stats ---- */
  const contentStats = useMemo(() => {
    const words = content
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const chars = content.length;
    return { words, chars };
  }, [content]);

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
        effectiveDate: effectiveDate
          ? new Date(effectiveDate + "T00:00:00Z").toISOString()
          : undefined,
        reviewDate: reviewDate
          ? new Date(reviewDate + "T00:00:00Z").toISOString()
          : undefined,
        expiryDate: expiryDate
          ? new Date(expiryDate + "T00:00:00Z").toISOString()
          : undefined,
        ownerId: ownerId.trim() || undefined,
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
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #1B7340, #10B981)",
            }}
          >
            <Loader2 size={24} className="animate-spin text-white" />
          </div>
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading policy...
          </p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Policy not found
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/governance/policies")}
          className="text-sm text-[var(--primary)] hover:underline"
        >
          Back to Policies
        </button>
      </div>
    );
  }

  const catConfig = CATEGORY_CONFIG[policy.category];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ================================================ */}
      {/*  HERO HEADER                                      */}
      {/* ================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-[0.04]"
            style={{
              background: `radial-gradient(circle, ${catConfig?.color ?? "#1B7340"} 0%, transparent 70%)`,
            }}
          />
        </div>

        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{
                background: catConfig?.gradient ?? "linear-gradient(135deg, #1B7340, #10B981)",
              }}
            >
              <Shield size={26} className="text-white" />
            </div>
            <div>
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/governance/policies/${id}`)
                }
                className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)] mb-0.5"
              >
                <ArrowLeft size={12} />
                Back to Policy
              </button>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Edit Policy
              </h1>
              <p className="mt-0.5 text-sm text-[var(--neutral-gray)]">
                Update the policy details — a new version will be created when
                saved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start">
            {hasChanges && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                style={{ borderColor: "rgba(245, 158, 11, 0.3)", backgroundColor: "rgba(245, 158, 11, 0.08)" }}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </motion.span>
            )}
            <StatusBadge status={policy.status} />
            <span className="rounded-full bg-[var(--surface-1)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] tabular-nums">
              v{policy.version}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ================================================ */}
      {/*  TWO-PANEL LAYOUT                                 */}
      {/* ================================================ */}
      <div className="flex gap-6">
        {/* ---- Main Form ---- */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Basic Information */}
          <SectionCard
            icon={FileText}
            label="Basic Information"
            description="Title, description, and classification"
            delay={0.05}
          >
            <div className="space-y-5">
              <FormField
                label="Title"
                name="title"
                value={title}
                onChange={setTitle}
                placeholder="e.g. Information Security Policy"
                required
                error={errors.title}
              />
              <FormField
                label="Description"
                name="description"
                type="textarea"
                value={description}
                onChange={setDescription}
                placeholder="Brief summary of the policy purpose"
                rows={2}
              />
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
            </div>
          </SectionCard>

          {/* Policy Content */}
          <SectionCard
            icon={FileText}
            label="Policy Content"
            description="The full body of the policy"
            delay={0.1}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Content <span className="text-[var(--error)]">*</span>
                </label>
                <span className="text-[11px] text-[var(--neutral-gray)] tabular-nums">
                  {contentStats.words} words &middot; {contentStats.chars} chars
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write the full policy content here..."
                rows={14}
                className={`w-full rounded-xl border bg-[var(--surface-0)] px-3.5 py-3 text-sm leading-relaxed transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] font-mono ${
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
          </SectionCard>

          {/* Tags & Owner */}
          <SectionCard
            icon={Tag}
            label="Classification"
            description="Tags and ownership"
            delay={0.15}
          >
            <div className="space-y-5">
              <TagInput value={tags} onChange={setTags} />
              <UserPicker
                label="Owner"
                value={ownerId || undefined}
                displayValue={ownerDisplay}
                onChange={(uid, name) => {
                  setOwnerId(uid ?? "");
                  setOwnerDisplay(name);
                }}
                placeholder="Search for policy owner..."
                description="The person accountable for this policy"
              />
            </div>
          </SectionCard>

          {/* Dates */}
          <SectionCard
            icon={Calendar}
            label="Key Dates"
            description="Lifecycle dates for this policy"
            delay={0.2}
          >
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
          </SectionCard>

          {/* Version Notes */}
          <SectionCard
            icon={Clock}
            label="Version Notes"
            description="What changed in this revision"
            delay={0.25}
          >
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
          </SectionCard>
        </div>

        {/* ---- Sidebar ---- */}
        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="hidden w-72 shrink-0 lg:block"
        >
          <div className="sticky top-24 space-y-4">
            {/* Policy Info */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-3">
                Current Policy
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--neutral-gray)]">Title</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                    {policy.title}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--neutral-gray)]">Status</p>
                    <div className="mt-0.5">
                      <StatusBadge status={policy.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--neutral-gray)]">Version</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                      v{policy.version}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--neutral-gray)]">Category</p>
                  <span
                    className="mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider capitalize"
                    style={{
                      backgroundColor: `${catConfig?.color ?? "#6B7280"}14`,
                      color: catConfig?.color ?? "#6B7280",
                    }}
                  >
                    {policy.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1">
                Actions
              </p>
              <button
                type="submit"
                disabled={updatePolicy.isPending || !hasChanges}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                style={{
                  background: catConfig?.gradient ?? "linear-gradient(135deg, #1B7340, #10B981)",
                }}
              >
                {updatePolicy.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/governance/policies/${id}`)
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Cancel
              </button>
            </div>

            {/* Helpful Tips */}
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "rgba(59, 130, 246, 0.2)", backgroundColor: "rgba(59, 130, 246, 0.04)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={14} style={{ color: "#3B82F6" }} />
                <span className="text-xs font-semibold" style={{ color: "#2563EB" }}>
                  Tips
                </span>
              </div>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <Info size={10} className="mt-0.5 shrink-0 text-blue-400" />
                  Saving creates a new version automatically
                </li>
                <li className="flex items-start gap-1.5">
                  <Info size={10} className="mt-0.5 shrink-0 text-blue-400" />
                  Set a review date to get reminders
                </li>
                <li className="flex items-start gap-1.5">
                  <Info size={10} className="mt-0.5 shrink-0 text-blue-400" />
                  Use the changes summary for audit trail
                </li>
                <li className="flex items-start gap-1.5">
                  <Info size={10} className="mt-0.5 shrink-0 text-blue-400" />
                  Tags help with search and categorization
                </li>
              </ul>
            </div>

            {/* Keyboard shortcuts */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-2">
                Quick Info
              </p>
              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center justify-between">
                  <span>Created</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {new Date(policy.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last updated</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {new Date(policy.updatedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      </div>

      {/* ================================================ */}
      {/*  MOBILE STICKY FOOTER                             */}
      {/* ================================================ */}
      <div className="lg:hidden sticky bottom-0 z-10 -mx-4 border-t border-[var(--border)] bg-[var(--surface-0)] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/governance/policies/${id}`)
            }
            className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updatePolicy.isPending || !hasChanges}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{
              background: catConfig?.gradient ?? "linear-gradient(135deg, #1B7340, #10B981)",
            }}
          >
            {updatePolicy.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </form>
  );
}
