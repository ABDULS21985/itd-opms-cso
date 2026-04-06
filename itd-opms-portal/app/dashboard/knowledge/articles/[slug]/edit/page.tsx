"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  useKBArticleBySlug,
  useUpdateKBArticle,
  useKBCategories,
} from "@/hooks/use-knowledge";

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
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-[var(--neutral-gray)]">{hint}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const { data: article, isLoading } = useKBArticleBySlug(slug);
  const { data: categories } = useKBCategories();
  const updateArticle = useUpdateKBArticle(article?.id);

  /* ---- Form state ---- */
  const [title, setTitle] = useState("");
  const [articleSlug, setArticleSlug] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("how_to");
  const [categoryId, setCategoryId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [initialized, setInitialized] = useState(false);

  /* Pre-fill form when article loads */
  useEffect(() => {
    if (article && !initialized) {
      setTitle(article.title);
      setArticleSlug(article.slug);
      setContent(article.content);
      setType(article.type);
      setCategoryId(article.categoryId ?? "");
      setTagsInput((article.tags ?? []).join(", "));
      setReviewerId(article.reviewerId ?? "");
      setInitialized(true);
    }
  }, [article, initialized]);

  /* ---- Submit ---- */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!article) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    updateArticle.mutate(
      {
        title: title || undefined,
        slug: articleSlug || undefined,
        content: content || undefined,
        type: type || undefined,
        categoryId: categoryId || undefined,
        tags,
        clearTags: tags.length === 0 && tagsInput.trim() === "",
        reviewerId: reviewerId || undefined,
      },
      {
        onSuccess: () => {
          router.push(
            `/dashboard/knowledge/articles/${articleSlug || slug}`,
          );
        },
      },
    );
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">Article not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)]/10">
          <BookOpen size={22} className="text-[var(--primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Edit Article
          </h1>
          <p className="text-xs text-[var(--neutral-gray)]">{article.slug}</p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 space-y-5"
      >
        <Field label="Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputCls}
            placeholder="Article title"
          />
        </Field>

        <Field label="Slug" required>
          <input
            type="text"
            value={articleSlug}
            onChange={(e) =>
              setArticleSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            required
            className={inputCls + " font-mono"}
            placeholder="article-slug"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Type" required>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              className={inputCls}
            >
              {ARTICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              <option value="">Uncategorized</option>
              {Array.isArray(categories) &&
                categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <Field label="Tags" hint="Comma-separated list of tags">
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className={inputCls}
            placeholder="tag1, tag2, tag3"
          />
        </Field>

        <Field label="Content" required>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={14}
            className={inputCls + " resize-y"}
            placeholder="Article content…"
          />
        </Field>

        <Field label="Reviewer ID" hint="Optional UUID of reviewer user">
          <input
            type="text"
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            className={inputCls + " font-mono"}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateArticle.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {updateArticle.isPending ? (
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
