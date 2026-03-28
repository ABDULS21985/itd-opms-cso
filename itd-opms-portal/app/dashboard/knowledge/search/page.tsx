"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Compass,
  FileText,
  FolderTree,
  Loader2,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { useKBCategories, useSearchKBArticles } from "@/hooks/use-knowledge";
import type { KBCategory } from "@/types";

const SEARCH_PROMPTS = [
  "VPN access",
  "incident response",
  "DNS troubleshooting",
  "new starter onboarding",
];

const TYPE_LABELS: Record<string, string> = {
  how_to: "How-To",
  troubleshooting: "Troubleshooting",
  faq: "FAQ",
  best_practice: "Best Practice",
  runbook: "Runbook",
};

const TYPE_COLORS: Record<string, { text: string; bg: string }> = {
  how_to: { text: "#1B7340", bg: "rgba(27, 115, 64, 0.1)" },
  troubleshooting: { text: "#DC2626", bg: "rgba(220, 38, 38, 0.1)" },
  faq: { text: "#2563EB", bg: "rgba(37, 99, 235, 0.1)" },
  best_practice: { text: "#8B5CF6", bg: "rgba(139, 92, 246, 0.1)" },
  runbook: { text: "#D97706", bg: "rgba(217, 119, 6, 0.1)" },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Unscheduled";

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function excerpt(content: string, limit = 180): string {
  if (!content) return "No article summary available.";
  if (content.length <= limit) return content;
  return `${content.slice(0, limit).trim()}...`;
}

function searchPosture(
  query: string,
  totalItems: number,
  typeCount: number,
  categoryCount: number,
) {
  if (!query) {
    return {
      label: "Ready to explore",
      badgeClass:
        "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      description:
        "Use the search desk to test discoverability, spot gaps, and route people to the right guidance fast.",
    };
  }

  if (totalItems === 0) {
    return {
      label: "Needs a broader trail",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "Nothing matched this query, which may point to a wording issue or a real content gap in the library.",
    };
  }

  if (typeCount >= 3 || categoryCount >= 2 || totalItems >= 8) {
    return {
      label: "Strong signal",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "This query is surfacing a broad mix of content, so search coverage looks healthy and discoverable.",
    };
  }

  return {
    label: "Focused hit",
    badgeClass:
      "border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    description:
      "The result set is tight and specific, which is useful when users need one clear path instead of a long list.",
  };
}

function LoadingValue({ width = "w-14" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function PromptChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-0)",
        color: "var(--text-primary)",
      }}
    >
      {label}
    </button>
  );
}

function CategoryLaneCard({
  category,
  onSelect,
}: {
  category: KBCategory;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(category.name)}
      className="w-full rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)] p-4 text-left transition-all duration-200 hover:bg-[var(--surface-2)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {category.name}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {category.description ||
              "Tap to use this category as a search path."}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]">
          {category.parentId ? "Nested" : "Top level"}
        </span>
      </div>
    </button>
  );
}

export default function KnowledgeSearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = 20;

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue]);

  const { data, isLoading, isFetching } = useSearchKBArticles(
    debouncedQuery,
    1,
    limit,
  );
  const { data: categoriesData, isLoading: categoriesLoading } =
    useKBCategories();

  const articles = data?.data ?? [];
  const totalItems = data?.meta?.totalItems ?? 0;
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const categoryMap = useMemo(() => {
    const map = new Map<string, KBCategory>();
    categories.forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  const searchInsights = useMemo(() => {
    const types = new Set<string>();
    const tags = new Set<string>();
    const categoryIds = new Set<string>();
    let totalViews = 0;

    articles.forEach((article) => {
      if (article.type) types.add(article.type);
      if (article.categoryId) categoryIds.add(article.categoryId);
      totalViews += article.viewCount ?? 0;
      article.tags?.forEach((tag) => tags.add(tag));
    });

    return {
      uniqueTypes: types.size,
      uniqueTags: tags.size,
      totalViews,
      categoryHits: categoryIds.size,
      topTags: Array.from(tags).slice(0, 5),
    };
  }, [articles]);

  const posture = searchPosture(
    debouncedQuery,
    totalItems,
    searchInsights.uniqueTypes,
    searchInsights.categoryHits,
  );

  const featuredCategories = useMemo(
    () =>
      [...categories]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 5),
    [categories],
  );

  return (
    <div className="space-y-8 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(37, 99, 235, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(37,99,235,0.18), transparent 30%), radial-gradient(circle at 88% 16%, rgba(27,115,64,0.12), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(37, 99, 235, 0.25)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <Link
              href="/dashboard/knowledge"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={16} />
              Back to Knowledge Hub
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${posture.badgeClass}`}
              >
                <Sparkles size={14} />
                {posture.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <Search size={14} className="text-[#2563EB]" />
                Discovery desk
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                Search Knowledge Base
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                Find articles, how-tos, runbooks, and troubleshooting guides
                through a sharper discovery workflow with better context around
                what the library is actually returning.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {SEARCH_PROMPTS.map((prompt) => (
                <PromptChip
                  key={prompt}
                  label={prompt}
                  onClick={() => setInputValue(prompt)}
                />
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
                  Discovery pulse
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Search telemetry
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
                  Active query
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {debouncedQuery || "Waiting for search"}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Results
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? <LoadingValue width="w-12" /> : totalItems}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Content types
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? (
                    <LoadingValue width="w-12" />
                  ) : (
                    searchInsights.uniqueTypes
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Categories
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {categoriesLoading ? (
                    <LoadingValue width="w-12" />
                  ) : (
                    categories.length
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Search console
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Search without guesswork
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              Search by title, article body, or tags, then use the result
              telemetry to judge whether the library is precise or too thin.
            </p>
          </div>

          {debouncedQuery && !isLoading && (
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {totalItems} result{totalItems !== 1 ? "s" : ""} for &quot;
              {debouncedQuery}&quot;
            </p>
          )}
        </div>

        <div className="mt-5 relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search by title, body copy, or knowledge tags..."
            className="w-full rounded-[22px] border border-[var(--border)] bg-[var(--surface-0)] py-4 pl-12 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] transition-all duration-200 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
          {isFetching && (
            <Loader2
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[var(--primary)]"
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SEARCH_PROMPTS.map((prompt) => (
            <button
              key={`quick-${prompt}`}
              type="button"
              onClick={() => setInputValue(prompt)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              <Search size={12} />
              {prompt}
            </button>
          ))}
        </div>
      </motion.div>

      {debouncedQuery && !isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Results found",
              value: totalItems,
              helper: "Matches returned for the active query.",
            },
            {
              label: "Content types",
              value: searchInsights.uniqueTypes,
              helper: "Distinct article formats in the result set.",
            },
            {
              label: "View signals",
              value: searchInsights.totalViews,
              helper: "Combined read volume across the surfaced articles.",
            },
            {
              label: "Unique tags",
              value: searchInsights.uniqueTags,
              helper: "Keyword breadth exposed by the current results.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-0)] p-5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {item.helper}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section>
          {isLoading && debouncedQuery ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5"
                >
                  <div className="h-5 w-24 animate-pulse rounded-full bg-[var(--surface-2)]" />
                  <div className="mt-4 h-7 w-3/4 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                  <div className="mt-4 space-y-2">
                    <div className="h-4 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                    <div className="h-4 w-10/12 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                    <div className="h-4 w-9/12 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {!debouncedQuery ? (
                <motion.div
                  key="initial"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[32px] border p-8 text-center"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "rgba(27, 115, 64, 0.14)",
                    backgroundImage:
                      "radial-gradient(circle at 50% 0%, rgba(27,115,64,0.12), transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
                  }}
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-500/10">
                    <BookOpen
                      size={28}
                      className="text-emerald-700 dark:text-emerald-300"
                    />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">
                    Search the Knowledge Base
                  </h3>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                    Start with a question, service name, or known tag. The
                    search desk will help you judge whether the library is thin,
                    broad, or tightly aligned to what teams are looking for.
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {SEARCH_PROMPTS.map((prompt) => (
                      <PromptChip
                        key={`initial-${prompt}`}
                        label={prompt}
                        onClick={() => setInputValue(prompt)}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : articles.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[32px] border p-8 text-center"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "rgba(220, 38, 38, 0.14)",
                    backgroundImage:
                      "radial-gradient(circle at 50% 0%, rgba(220,38,38,0.1), transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
                  }}
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-red-500/10">
                    <Search
                      size={28}
                      className="text-red-600 dark:text-red-300"
                    />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">
                    No results found
                  </h3>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                    We could not find any articles matching &quot;
                    {debouncedQuery}
                    &quot;. Try broader terms, category names, or one of the
                    discovery prompts below.
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {SEARCH_PROMPTS.map((prompt) => (
                      <PromptChip
                        key={`empty-${prompt}`}
                        label={prompt}
                        onClick={() => setInputValue(prompt)}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {articles.map((article, index) => {
                    const typeTone = TYPE_COLORS[article.type] ?? {
                      text: "var(--text-secondary)",
                      bg: "var(--surface-2)",
                    };
                    const categoryName = article.categoryId
                      ? categoryMap.get(article.categoryId)?.name
                      : undefined;

                    return (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.04 }}
                      >
                        <Link
                          href={`/dashboard/knowledge/articles/${article.slug}`}
                          className="group block rounded-[30px] border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)] lg:p-6"
                          style={{
                            borderColor: `${typeTone.text}24`,
                            backgroundImage: `radial-gradient(circle at 100% 0%, ${typeTone.text}12, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
                          }}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                                  style={{
                                    backgroundColor: typeTone.bg,
                                    color: typeTone.text,
                                  }}
                                >
                                  {TYPE_LABELS[article.type] || article.type}
                                </span>
                                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                                  {categoryName ?? "Uncategorized"}
                                </span>
                              </div>

                              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--primary)]">
                                {article.title}
                              </h3>
                              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                                {excerpt(article.content)}
                              </p>
                            </div>

                            <ArrowRight
                              size={16}
                              className="mt-1 shrink-0 text-[var(--text-secondary)] transition-transform duration-200 group-hover:translate-x-0.5"
                            />
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-[22px] bg-[var(--surface-0)]/78 p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                                Published
                              </p>
                              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                                <Clock
                                  size={14}
                                  className="text-[var(--text-secondary)]"
                                />
                                {formatDate(article.publishedAt)}
                              </p>
                            </div>
                            <div className="rounded-[22px] bg-[var(--surface-0)]/78 p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                                Reach
                              </p>
                              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                                <BookOpen
                                  size={14}
                                  className="text-[var(--text-secondary)]"
                                />
                                {article.viewCount} views
                              </p>
                            </div>
                            <div className="rounded-[22px] bg-[var(--surface-0)]/78 p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                                Tags
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {article.tags?.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                                  >
                                    <Tag size={10} />
                                    {tag}
                                  </span>
                                ))}
                                {article.tags && article.tags.length > 3 && (
                                  <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                                    +{article.tags.length - 3} more
                                  </span>
                                )}
                                {(!article.tags ||
                                  article.tags.length === 0) && (
                                  <span className="text-sm text-[var(--text-secondary)]">
                                    No tags
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Result mix
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Search insights
                </h2>
              </div>
              <Compass size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Query state
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {debouncedQuery || "No active query yet"}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Category hits
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {debouncedQuery ? searchInsights.categoryHits : 0}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-[var(--surface-1)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Top tags in current results
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {searchInsights.topTags.length > 0 ? (
                  searchInsights.topTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Run a search to inspect the tags surfacing across matching
                    content.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Taxonomy lanes
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Browse by category
                </h2>
              </div>
              <FolderTree size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 space-y-3">
              {categoriesLoading ? (
                [1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] bg-[var(--surface-1)] p-4"
                  >
                    <div className="h-5 w-1/2 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                    <div className="mt-3 h-4 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                  </div>
                ))
              ) : featuredCategories.length === 0 ? (
                <div className="rounded-[22px] bg-[var(--surface-1)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                  No categories have been created yet. Define taxonomy lanes to
                  make search and browsing much easier for the rest of the team.
                </div>
              ) : (
                featuredCategories.map((category) => (
                  <CategoryLaneCard
                    key={category.id}
                    category={category}
                    onSelect={(value) => setInputValue(value)}
                  />
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
