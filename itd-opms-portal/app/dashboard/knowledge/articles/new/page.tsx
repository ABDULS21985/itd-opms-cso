"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Edit3,
  FileText,
  FolderTree,
  Hash,
  Loader2,
  Save,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateKBArticle, useKBCategories } from "@/hooks/use-knowledge";
import type { KBCategory } from "@/types";

const ARTICLE_TYPES = [
  {
    value: "how_to",
    label: "How-To",
    accent: "#1B7340",
    bg: "rgba(27, 115, 64, 0.1)",
    description: "Step-by-step guidance for repeatable tasks and user help.",
  },
  {
    value: "troubleshooting",
    label: "Troubleshooting",
    accent: "#DC2626",
    bg: "rgba(220, 38, 38, 0.1)",
    description:
      "Diagnostic guidance for issues, faults, and failure recovery.",
  },
  {
    value: "faq",
    label: "FAQ",
    accent: "#2563EB",
    bg: "rgba(37, 99, 235, 0.1)",
    description: "Fast answers for repeated questions and common uncertainty.",
  },
  {
    value: "best_practice",
    label: "Best Practice",
    accent: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.1)",
    description:
      "Reference guidance for higher-quality and more consistent delivery.",
  },
  {
    value: "runbook",
    label: "Runbook",
    accent: "#D97706",
    bg: "rgba(217, 119, 6, 0.1)",
    description:
      "Operational procedures for live execution and incident handling.",
  },
] as const;

const STEPS = [
  {
    label: "Metadata",
    title: "Shape the article frame",
    description: "Define title, slug, type, category, and discovery tags.",
    icon: FileText,
  },
  {
    label: "Content",
    title: "Write the body",
    description:
      "Draft the actual guidance with enough clarity to be useful fast.",
    icon: Edit3,
  },
  {
    label: "Review",
    title: "Review before publishing to draft",
    description:
      "Check taxonomy, readability, and discoverability before creation.",
    icon: Sparkles,
  },
] as const;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
  }),
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function countWords(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).length;
}

function estimateReadTime(wordCount: number): string {
  if (wordCount === 0) return "0 min";
  return `${Math.max(1, Math.ceil(wordCount / 220))} min`;
}

function shortPreview(text: string, limit = 220): string {
  if (!text.trim()) return "No content drafted yet.";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
}

function authoringPosture(
  title: string,
  slug: string,
  content: string,
  tagsCount: number,
  categorySelected: boolean,
) {
  if (!title.trim() || !slug.trim()) {
    return {
      label: "Needs a clear frame",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "The article still needs its basic metadata before it can become discoverable content.",
    };
  }

  if (!content.trim() || countWords(content) < 60) {
    return {
      label: "Draft in progress",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "The article frame exists, but the body still needs more substance before it is review-ready.",
    };
  }

  if (!categorySelected || tagsCount === 0) {
    return {
      label: "Needs stronger discovery",
      badgeClass:
        "border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      description:
        "The draft reads like a usable article, but taxonomy and tags should be sharper for searchability.",
    };
  }

  return {
    label: "Review-ready draft",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "The draft has content, structure, and discovery signals strong enough for a confident review pass.",
  };
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[var(--surface-1)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
        {value || "—"}
      </p>
    </div>
  );
}

function StepCard({
  label,
  title,
  description,
  icon: Icon,
  active,
  done,
  onClick,
}: {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        borderColor: active
          ? "var(--primary)"
          : done
            ? "rgba(37,99,235,0.28)"
            : "var(--border)",
        backgroundColor: active
          ? "rgba(37, 99, 235, 0.08)"
          : done
            ? "rgba(37, 99, 235, 0.04)"
            : "var(--surface-0)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor:
              active || done ? "rgba(37, 99, 235, 0.12)" : "var(--surface-1)",
            color: active || done ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          {done && !active ? <Check size={18} /> : <Icon size={18} />}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {label}
          </p>
          <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function ChecklistRow({
  label,
  helper,
  done,
}: {
  label: string;
  helper: string;
  done: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] bg-[var(--surface-1)] p-3.5">
      <div
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: done
            ? "rgba(27, 115, 64, 0.12)"
            : "rgba(107, 114, 128, 0.12)",
          color: done ? "#1B7340" : "#6B7280",
        }}
      >
        <Check size={14} />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          {helper}
        </p>
      </div>
    </div>
  );
}

export default function NewArticlePage() {
  const router = useRouter();
  const createArticle = useCreateKBArticle();
  const { data: categories, isLoading: categoriesLoading } = useKBCategories();

  const categoryList: KBCategory[] = Array.isArray(categories)
    ? categories
    : [];

  const categoryOptions = categoryList.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [type, setType] = useState("how_to");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tagsArray = useMemo(
    () =>
      tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tags],
  );

  const selectedType = useMemo(
    () => ARTICLE_TYPES.find((item) => item.value === type) ?? ARTICLE_TYPES[0],
    [type],
  );

  const selectedCategory = useMemo(
    () => categoryList.find((category) => category.id === categoryId),
    [categoryId, categoryList],
  );

  const wordCount = useMemo(() => countWords(content), [content]);
  const readTime = useMemo(() => estimateReadTime(wordCount), [wordCount]);

  const posture = authoringPosture(
    title,
    slug,
    content,
    tagsArray.length,
    Boolean(categoryId),
  );

  const stepComplete = [
    Boolean(title.trim() && slug.trim()),
    Boolean(content.trim()),
    Boolean(title.trim() && slug.trim() && content.trim()),
  ];

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  }

  function validateStep(targetStep: number): boolean {
    const nextErrors: Record<string, string> = {};

    if (targetStep === 0) {
      if (!title.trim()) nextErrors.title = "Title is required";
      if (!slug.trim()) nextErrors.slug = "Slug is required";
    }

    if (targetStep === 1 && !content.trim()) {
      nextErrors.content = "Content is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goPrev() {
    setDirection(-1);
    setStep((current) => Math.max(current - 1, 0));
  }

  function goTo(target: number) {
    if (target > step && !validateStep(step)) return;
    setDirection(target > step ? 1 : -1);
    setStep(target);
  }

  function handleSubmit() {
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

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="space-y-8 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(37, 99, 235, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(37,99,235,0.16), transparent 30%), radial-gradient(circle at 88% 16%, rgba(139,92,246,0.12), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(37, 99, 235, 0.25)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => router.push("/dashboard/knowledge")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={16} />
              Back to Knowledge Hub
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${posture.badgeClass}`}
              >
                <Sparkles size={14} />
                {posture.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <FileText size={14} className="text-[#2563EB]" />
                Editorial authoring
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                Create New Article
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                Build a new knowledge asset with a clearer editorial workflow,
                stronger discovery signals, and a better final review before it
                lands as a draft.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                "Saved as draft first",
                "Markdown-ready",
                "Search-aware taxonomy",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-[var(--surface-0)]/80 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] backdrop-blur-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.74)",
              borderColor: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Authoring pulse
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Draft telemetry
                </h2>
              </div>
              <Activity size={20} className="text-[var(--primary)]" />
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {posture.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Current step
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {STEPS[step].label}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Read time
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {readTime}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Word count
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {wordCount}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Tags
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {tagsArray.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <section className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {STEPS.map((stepItem, index) => (
              <StepCard
                key={stepItem.label}
                label={`Step ${index + 1}`}
                title={stepItem.label}
                description={stepItem.description}
                icon={stepItem.icon}
                active={index === step}
                done={index < step || stepComplete[index]}
                onClick={() => goTo(index)}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface-0)]"
          >
            <div className="border-b border-[var(--border)] px-6 py-5 lg:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Publishing workflow
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                {STEPS[step].title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {STEPS[step].description}
              </p>
            </div>

            <div className="min-h-[430px] p-6 lg:p-7">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {step === 0 && (
                    <div className="grid gap-6 xl:grid-cols-[1fr_0.88fr]">
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
                          description="URL-friendly identifier generated from the title until you override it."
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            label="Article Type"
                            name="type"
                            type="select"
                            value={type}
                            onChange={setType}
                            options={ARTICLE_TYPES.map((item) => ({
                              value: item.value,
                              label: item.label,
                            }))}
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
                          placeholder="password, security, active-directory"
                          description="Separate tags with commas to improve search relevance."
                        />
                      </div>

                      <div className="space-y-4">
                        <div
                          className="rounded-[24px] border p-5"
                          style={{
                            borderColor: `${selectedType.accent}22`,
                            backgroundImage: `radial-gradient(circle at 100% 0%, ${selectedType.accent}14, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-2xl"
                              style={{
                                backgroundColor: selectedType.bg,
                                color: selectedType.accent,
                              }}
                            >
                              <FileText size={20} />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                Content lane
                              </p>
                              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                                {selectedType.label}
                              </h3>
                              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                                {selectedType.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            Slug preview
                          </p>
                          <p className="mt-3 break-all rounded-[18px] bg-[var(--surface-0)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                            /knowledge/articles/{slug || "your-article-slug"}
                          </p>
                        </div>

                        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            Taxonomy coverage
                          </p>
                          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                            {categoriesLoading
                              ? "Loading category map..."
                              : categoryList.length > 0
                                ? `${categoryList.length} categories available to anchor this article.`
                                : "No categories yet. The article can still be created without one."}
                          </p>
                          {selectedCategory && (
                            <div className="mt-4 rounded-[18px] bg-[var(--surface-0)] p-4">
                              <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {selectedCategory.name}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                                {selectedCategory.description ||
                                  "No category description yet."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
                      <div>
                        <label
                          htmlFor="article-content"
                          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                        >
                          Content (Markdown){" "}
                          <span className="text-[var(--error)]">*</span>
                        </label>
                        <textarea
                          id="article-content"
                          name="content"
                          value={content}
                          onChange={(event) => setContent(event.target.value)}
                          placeholder="Write your article content in Markdown..."
                          rows={18}
                          className={`w-full resize-none rounded-[24px] border bg-[var(--surface-0)] px-4 py-3 text-sm font-mono transition-all duration-200 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 ${
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

                      <div className="space-y-4">
                        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                Writing telemetry
                              </p>
                              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                                Draft quality signals
                              </h3>
                            </div>
                            <BookOpen
                              size={18}
                              className="text-[var(--primary)]"
                            />
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <ReviewField
                              label="Word count"
                              value={`${wordCount}`}
                            />
                            <ReviewField
                              label="Estimated read time"
                              value={readTime}
                            />
                            <ReviewField
                              label="Tag count"
                              value={`${tagsArray.length}`}
                            />
                            <ReviewField
                              label="Category"
                              value={selectedCategory?.name || "Not assigned"}
                            />
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            Markdown cues
                          </p>
                          <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                            <p>
                              Use headings to break sections into quick,
                              scannable lanes.
                            </p>
                            <p>
                              Keep runbooks task-oriented with numbered actions
                              and decision points.
                            </p>
                            <p>
                              Close troubleshooting articles with signals,
                              fixes, and verification steps.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <div className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
                        <button
                          type="button"
                          onClick={() => goTo(0)}
                          className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-5 text-left transition-all duration-200 hover:border-[var(--primary)]/40 hover:bg-[var(--surface-0)]"
                        >
                          <div className="flex items-center gap-2">
                            <FileText
                              size={16}
                              className="text-[var(--primary)]"
                            />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                              Metadata
                            </span>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <ReviewField label="Title" value={title} />
                            <ReviewField label="Slug" value={slug} />
                            <ReviewField
                              label="Type"
                              value={selectedType.label}
                            />
                            <ReviewField
                              label="Category"
                              value={selectedCategory?.name || "—"}
                            />
                            <ReviewField
                              label="Tags"
                              value={
                                tagsArray.length > 0
                                  ? tagsArray.join(", ")
                                  : "—"
                              }
                            />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => goTo(1)}
                          className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-5 text-left transition-all duration-200 hover:border-[var(--primary)]/40 hover:bg-[var(--surface-0)]"
                        >
                          <div className="flex items-center gap-2">
                            <Edit3
                              size={16}
                              className="text-[var(--primary)]"
                            />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                              Content
                            </span>
                          </div>
                          <div className="mt-4 space-y-3">
                            <ReviewField
                              label="Preview"
                              value={shortPreview(content)}
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <ReviewField
                                label="Word count"
                                value={`${wordCount}`}
                              />
                              <ReviewField label="Read time" value={readTime} />
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                            <Check size={20} />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                              Draft destination
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                              Saved as draft on create
                            </h3>
                            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                              This flow creates the article and returns you to
                              the knowledge hub. Review the metadata and content
                              now so the draft lands with a clean foundation.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-4 border-t border-[var(--border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
              <button
                type="button"
                onClick={
                  step === 0
                    ? () => router.push("/dashboard/knowledge")
                    : goPrev
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                <ArrowLeft size={16} />
                {step === 0 ? "Cancel" : "Previous"}
              </button>

              <div className="flex items-center gap-1.5 self-center">
                {STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === step
                        ? "w-8 bg-[var(--primary)]"
                        : index < step
                          ? "w-3 bg-[var(--primary)]/45"
                          : "w-3 bg-[var(--border)]"
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Readiness check
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Authoring checklist
                </h2>
              </div>
              <Activity size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 space-y-3">
              <ChecklistRow
                label="Title and slug"
                helper="A clear headline and URL path give the article an identity."
                done={Boolean(title.trim() && slug.trim())}
              />
              <ChecklistRow
                label="Useful body content"
                helper="The article body should be substantial enough to help someone act."
                done={Boolean(content.trim())}
              />
              <ChecklistRow
                label="Discovery signals"
                helper="Tags and category improve search performance and knowledge routing."
                done={Boolean(categoryId || tagsArray.length > 0)}
              />
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Article capsule
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Draft snapshot
                </h2>
              </div>
              <BookOpen size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 rounded-[24px] bg-[var(--surface-1)] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{
                    backgroundColor: selectedType.bg,
                    color: selectedType.accent,
                  }}
                >
                  {selectedType.label}
                </span>
                <span className="rounded-full bg-[var(--surface-0)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  {selectedCategory?.name || "No category"}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                {title || "Untitled article"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {shortPreview(content, 170)}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    Slug
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-[var(--text-primary)]">
                    {slug || "pending-slug"}
                  </p>
                </div>
                <div className="rounded-[18px] bg-[var(--surface-0)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    Read time
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <Clock3
                      size={14}
                      className="text-[var(--text-secondary)]"
                    />
                    {readTime}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {tagsArray.length > 0 ? (
                  tagsArray.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      <Hash size={10} />
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-secondary)]">
                    No tags yet
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Taxonomy
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Category map
                </h2>
              </div>
              <FolderTree size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 space-y-3">
              {categoriesLoading ? (
                [1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] bg-[var(--surface-1)] p-4"
                  >
                    <div className="h-5 w-1/2 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                    <div className="mt-3 h-4 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                  </div>
                ))
              ) : categoryList.length === 0 ? (
                <div className="rounded-[20px] bg-[var(--surface-1)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                  No categories created yet. This draft can still be created and
                  categorized later.
                </div>
              ) : (
                categoryList.slice(0, 4).map((category) => (
                  <div
                    key={category.id}
                    className="rounded-[20px] bg-[var(--surface-1)] p-4"
                  >
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {category.name}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      {category.description || "No category description yet."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
