"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Globe,
  Archive,
  Loader2,
  Clock,
  Tag,
  User,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useKBArticleBySlug,
  useKBCategory,
  useFeedbackStats,
  useCreateFeedback,
  useRecordArticleView,
  usePublishKBArticle,
  useArchiveKBArticle,
} from "@/hooks/use-knowledge";

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const { data: article, isLoading } = useKBArticleBySlug(slug);
  const { data: category } = useKBCategory(article?.categoryId);
  const { data: feedbackStats } = useFeedbackStats(article?.id);
  const createFeedback = useCreateFeedback(article?.id);
  const recordView = useRecordArticleView();
  const publishArticle = usePublishKBArticle();
  const archiveArticle = useArchiveKBArticle();

  const isActing = publishArticle.isPending || archiveArticle.isPending;

  /* Record view on mount */
  useEffect(() => {
    if (article?.id) {
      recordView.mutate(article.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id]);

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading article...
          </p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">
          Article not found.
        </p>
      </div>
    );
  }

  /* ---- Status actions ---- */

  function renderStatusActions() {
    if (!article) return null;
    const s = article.status.toLowerCase();

    if (s === "draft" || s === "in_review") {
      return (
        <button
          type="button"
          disabled={isActing}
          onClick={() => publishArticle.mutate(article.id)}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {publishArticle.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Globe size={16} />
          )}
          Publish
        </button>
      );
    }

    if (s === "published") {
      return (
        <button
          type="button"
          disabled={isActing}
          onClick={() => archiveArticle.mutate(article.id)}
          className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {archiveArticle.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Archive size={16} />
          )}
          Archive
        </button>
      );
    }

    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/knowledge")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Knowledge Hub
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <BookOpen size={24} className="text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {article.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={article.status} />
              <span className="text-xs text-[var(--neutral-gray)]">
                v{article.version}
              </span>
              <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                {TYPE_LABELS[article.type] || article.type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {renderStatusActions()}
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/knowledge/articles/${slug}/edit`)
            }
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Edit size={16} />
            Edit
          </button>
        </div>
      </motion.div>

      {/* Metadata Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-4"
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-[var(--neutral-gray)]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Author
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {article.authorName || article.authorId}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-[var(--neutral-gray)]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Published
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString()
              : "Not published"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye size={14} className="text-[var(--neutral-gray)]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Views
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {article.viewCount}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <ThumbsUp size={14} className="text-[var(--neutral-gray)]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Helpful
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {feedbackStats
              ? `${feedbackStats.helpful} / ${feedbackStats.total}`
              : `${article.helpfulCount} / ${article.helpfulCount + article.notHelpfulCount}`}
          </p>
        </div>
      </motion.div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-wrap items-center gap-2"
        >
          <Tag size={14} className="text-[var(--neutral-gray)]" />
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Article Content
        </h2>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
          {article.content}
        </div>
      </motion.div>

      {/* Feedback Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          Was this article helpful?
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={createFeedback.isPending}
            onClick={() => createFeedback.mutate({ isHelpful: true })}
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 transition-all duration-200 hover:bg-green-100 disabled:opacity-50"
          >
            <ThumbsUp size={16} />
            Yes, helpful
            {feedbackStats && (
              <span className="ml-1 text-xs opacity-70">
                ({feedbackStats.helpful})
              </span>
            )}
          </button>
          <button
            type="button"
            disabled={createFeedback.isPending}
            onClick={() => createFeedback.mutate({ isHelpful: false })}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition-all duration-200 hover:bg-red-100 disabled:opacity-50"
          >
            <ThumbsDown size={16} />
            Not helpful
            {feedbackStats && (
              <span className="ml-1 text-xs opacity-70">
                ({feedbackStats.notHelpful})
              </span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Metadata
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Category
            </dt>
            <dd className="text-[var(--text-primary)]">
              {category?.name || (article.categoryId ? "Loading…" : "Uncategorized")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Reviewer
            </dt>
            <dd className="text-[var(--text-primary)]">
              {article.reviewerName || (article.reviewerId ? article.reviewerId : "Not assigned")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Slug
            </dt>
            <dd className="text-[var(--text-primary)] font-mono text-xs">
              {article.slug}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Last Updated
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(article.updatedAt).toLocaleString()}
            </dd>
          </div>
          {article.linkedTicketIds && article.linkedTicketIds.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                Linked Tickets
              </dt>
              <dd className="text-[var(--text-primary)]">
                {article.linkedTicketIds.join(", ")}
              </dd>
            </div>
          )}
        </dl>
      </motion.div>
    </div>
  );
}
