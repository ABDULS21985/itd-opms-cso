"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Check,
  FileText,
  Edit3,
  Sparkles,
} from "lucide-react";
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

const STEPS = [
  { label: "Metadata", icon: FileText, description: "Title, slug & category" },
  { label: "Content", icon: Edit3, description: "Write your article" },
  { label: "Review", icon: Sparkles, description: "Confirm & create" },
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
/*  Slide animation variants                                           */
/* ------------------------------------------------------------------ */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewArticlePage() {
  const router = useRouter();
  const createArticle = useCreateKBArticle();
  const { data: categories } = useKBCategories();

  const categoryOptions = (
    Array.isArray(categories) ? categories : (categories as any)?.data ?? []
  ).map((cat: { id: string; name: string }) => ({
    value: cat.id,
    label: cat.name,
  }));

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
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

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!title.trim()) newErrors.title = "Title is required";
        if (!slug.trim()) newErrors.slug = "Slug is required";
      }
      if (s === 1) {
        if (!content.trim()) newErrors.content = "Content is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [title, slug, content],
  );

  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, validateStep]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (target > step) {
        if (!validateStep(step)) return;
      }
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, validateStep],
  );

  /* ---- Submit ---- */
  function handleSubmit() {
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

  /* ---- Helpers ---- */
  const findLabel = (
    opts: { value: string; label: string }[],
    val: string,
  ) => opts.find((o) => o.value === val)?.label || "—";

  const isLastStep = step === STEPS.length - 1;

  /* ---- Step completeness indicators ---- */
  const stepComplete = [
    !!(title.trim() && slug.trim()),
    !!content.trim(),
    false,
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
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

      {/* ── Stepper ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-6 py-5"
      >
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step || stepComplete[i];
            const isClickable = i <= step || stepComplete[step];

            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => isClickable && goTo(i)}
                  className={`group flex flex-col items-center gap-1.5 transition-all ${
                    isClickable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25 scale-110"
                        : isDone
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                    } ${isClickable && !isActive ? "group-hover:border-[var(--primary)]/50 group-hover:scale-105" : ""}`}
                  >
                    {isDone && !isActive ? (
                      <Check size={18} strokeWidth={2.5} />
                    ) : (
                      <Icon size={18} />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors hidden sm:block ${
                      isActive
                        ? "text-[var(--primary)]"
                        : isDone
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--neutral-gray)]"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>

                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-3">
                    <div className="h-0.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                      <motion.div
                        className="h-full bg-[var(--primary)]"
                        initial={false}
                        animate={{ width: i < step ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-center text-xs text-[var(--neutral-gray)] mt-3"
          >
            Step {step + 1} of {STEPS.length} — {STEPS[step].description}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* ── Step Content ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 min-h-[320px] relative overflow-hidden"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Step 0: Metadata */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Article Metadata
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Set the title, slug, type, and category for this article.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="e.g. How to Reset User Passwords"
                    required
                    error={errors.title}
                  />

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

                  <FormField
                    label="Tags"
                    name="tags"
                    value={tags}
                    onChange={setTags}
                    placeholder="e.g. password, security, active-directory (comma-separated)"
                    description="Separate multiple tags with commas"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Content */}
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Article Content
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Write the article body using Markdown formatting.
                </p>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Content (Markdown){" "}
                    <span className="text-[var(--error)]">*</span>
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
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Create
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Review the details below. Click any section to go back and
                  edit.
                </p>

                <div className="space-y-4">
                  {/* Metadata summary */}
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Metadata
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField label="Title" value={title} />
                      <ReviewField label="Slug" value={slug} />
                      <ReviewField
                        label="Type"
                        value={findLabel(ARTICLE_TYPES, type)}
                      />
                      <ReviewField
                        label="Category"
                        value={findLabel(categoryOptions, categoryId)}
                      />
                      <ReviewField label="Tags" value={tags || "—"} />
                    </div>
                  </button>

                  {/* Content summary */}
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Edit3
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Content
                      </span>
                    </div>
                    <div>
                      <ReviewField
                        label="Content"
                        value={
                          content.length > 200
                            ? content.slice(0, 200) + "..."
                            : content || "—"
                        }
                      />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Navigation ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex items-center justify-between"
      >
        <button
          type="button"
          onClick={
            step === 0
              ? () => router.push("/dashboard/knowledge")
              : goPrev
          }
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <ArrowLeft size={16} />
          {step === 0 ? "Cancel" : "Previous"}
        </button>

        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-[var(--primary)]"
                  : i < step
                    ? "w-1.5 bg-[var(--primary)]/40"
                    : "w-1.5 bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              createArticle.isPending ||
              !title.trim() ||
              !slug.trim() ||
              !content.trim()
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createArticle.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Article
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25"
          >
            Continue
            <ArrowRight size={16} />
          </button>
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review field helper                                                */
/* ------------------------------------------------------------------ */

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-xs text-[var(--neutral-gray)]">{label}: </span>
      <span className="text-sm text-[var(--text-primary)]">
        {value || "—"}
      </span>
    </div>
  );
}
