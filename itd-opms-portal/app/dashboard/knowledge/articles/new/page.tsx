"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateKBArticle, useKBCategories } from "@/hooks/use-knowledge";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ARTICLE_TYPES = [
  { value: "how_to", label: "How-To" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "faq", label: "FAQ" },
  { value: "best_practice", label: "Best Practice" },
  { value: "runbook", label: "Runbook" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewArticlePage() {
  const router = useRouter();
  const createArticle = useCreateKBArticle();
  const { data: categories } = useKBCategories();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [type, setType] = useState("how_to");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!slugManuallyEdited) {
        setSlug(slugify(value));
      }
    },
    [slugManuallyEdited],
  );

  const handleSlugChange = useCallback((value: string) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  }, []);

  const categoryOptions = (
    Array.isArray(categories) ? categories : []
  ).map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!slug.trim()) newErrors.slug = "Slug is required";
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

    createArticle.mutate(
      {
        title: title.trim(),
        slug: slug.trim(),
        type,
        categoryId: categoryId || undefined,
        tags: tagsArray,
        content: content.trim(),
      },
      {
        onSuccess: () => {
          router.push("/dashboard/knowledge");
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
          onClick={() => router.push("/dashboard/knowledge")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Knowledge Hub
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Create New Article
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Write a new knowledge base article. It will be saved as a draft.
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
          onChange={handleTitleChange}
          placeholder="e.g. How to Reset User Passwords"
          required
          error={errors.title}
        />

        {/* Slug */}
        <FormField
          label="Slug"
          name="slug"
          value={slug}
          onChange={handleSlugChange}
          placeholder="auto-generated-from-title"
          required
          error={errors.slug}
          description="URL-friendly identifier. Auto-generated from title."
        />

        {/* Type & Category */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Article Type"
            name="type"
            type="select"
            value={type}
            onChange={setType}
            options={ARTICLE_TYPES}
          />
          <FormField
            label="Category"
            name="categoryId"
            type="select"
            value={categoryId}
            onChange={setCategoryId}
            options={categoryOptions}
            placeholder="Select category (optional)"
          />
        </div>

        {/* Tags */}
        <FormField
          label="Tags"
          name="tags"
          value={tags}
          onChange={setTags}
          placeholder="e.g. password, security, active-directory (comma-separated)"
          description="Separate multiple tags with commas"
        />

        {/* Content */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Content (Markdown) <span className="text-[var(--error)]">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your article content in Markdown..."
            rows={16}
            className={`w-full rounded-xl border bg-[var(--surface-0)] px-3.5 py-2.5 text-sm font-mono transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] ${
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/knowledge")}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createArticle.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createArticle.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Article
          </button>
        </div>
      </motion.form>
    </div>
  );
}
