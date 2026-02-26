"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search,
  FileText,
  BookOpen,
  ArrowLeft,
  Loader2,
  Clock,
} from "lucide-react";
import { useSearchKBArticles } from "@/hooks/use-knowledge";

/* ------------------------------------------------------------------ */
/*  Type Badge Helper                                                  */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  how_to: "How-To",
  troubleshooting: "Troubleshooting",
  faq: "FAQ",
  best_practice: "Best Practice",
  runbook: "Runbook",
};

const TYPE_COLORS: Record<string, { text: string; bg: string }> = {
  how_to: { text: "#1B7340", bg: "rgba(27, 115, 64, 0.1)" },
  troubleshooting: { text: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" },
  faq: { text: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
  best_practice: { text: "#8B5CF6", bg: "rgba(139, 92, 246, 0.1)" },
  runbook: { text: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KnowledgeSearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page] = useState(1);
  const limit = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Debounce the search input */
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
    page,
    limit,
  );

  const articles = data?.data ?? [];
  const totalItems = data?.meta?.totalItems ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href="/dashboard/knowledge"
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Knowledge Hub
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
          >
            <Search size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Search Knowledge Base
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Find articles, how-tos, runbooks, and troubleshooting guides.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search Input */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search articles by title, content, or tags..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--neutral-gray)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
          {isFetching && (
            <Loader2
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[var(--primary)]"
            />
          )}
        </div>
      </motion.div>

      {/* Results Count */}
      {debouncedQuery && !isLoading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-[var(--text-secondary)]"
        >
          {totalItems} result{totalItems !== 1 ? "s" : ""} for &quot;{debouncedQuery}&quot;
        </motion.p>
      )}

      {/* Loading Skeletons */}
      {isLoading && debouncedQuery && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 animate-pulse"
            >
              <div className="h-5 w-2/3 rounded bg-[var(--surface-2)] mb-3" />
              <div className="h-3 w-full rounded bg-[var(--surface-2)] mb-2" />
              <div className="h-3 w-4/5 rounded bg-[var(--surface-2)] mb-3" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-[var(--surface-2)]" />
                <div className="h-5 w-20 rounded-full bg-[var(--surface-2)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results List */}
      <AnimatePresence mode="wait">
        {!isLoading && debouncedQuery && articles.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {articles.map((article, index) => {
              const typeColor = TYPE_COLORS[article.type] ?? {
                text: "var(--text-secondary)",
                bg: "var(--surface-2)",
              };
              const excerpt =
                article.content.length > 200
                  ? article.content.slice(0, 200) + "..."
                  : article.content;

              return (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  <Link
                    href={`/dashboard/knowledge/articles/${article.slug}`}
                    className="group block rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-all duration-200 hover:shadow-md hover:border-[var(--primary)]/30"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <FileText
                          size={16}
                          className="text-[var(--primary)] shrink-0"
                        />
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                          {article.title}
                        </h3>
                      </div>
                      <span
                        className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          color: typeColor.text,
                          backgroundColor: typeColor.bg,
                        }}
                      >
                        {TYPE_LABELS[article.type] || article.type}
                      </span>
                    </div>

                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                      {excerpt}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--neutral-gray)]">
                      {article.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} />
                        {article.viewCount} views
                      </span>
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {article.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                            >
                              {tag}
                            </span>
                          ))}
                          {article.tags.length > 3 && (
                            <span className="text-xs text-[var(--neutral-gray)]">
                              +{article.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && debouncedQuery && articles.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            >
              <Search size={24} style={{ color: "#3B82F6" }} />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              No results found
            </h3>
            <p className="text-sm text-[var(--neutral-gray)] text-center max-w-sm">
              We couldn&apos;t find any articles matching &quot;{debouncedQuery}&quot;. Try different
              keywords or check the spelling.
            </p>
          </motion.div>
        )}

        {/* Initial State */}
        {!debouncedQuery && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
            >
              <BookOpen size={24} style={{ color: "#1B7340" }} />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              Search the Knowledge Base
            </h3>
            <p className="text-sm text-[var(--neutral-gray)] text-center max-w-sm">
              Start typing to search across all articles, how-tos, runbooks, and
              troubleshooting guides.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
