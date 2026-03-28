"use client";

import { use, useEffect, useMemo } from "react";
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
  Calendar,
  FolderTree,
  Hash,
  Link2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  how_to: { label: "How-To", color: "#1B7340", bg: "rgba(27, 115, 64, 0.08)", icon: BookOpen },
  troubleshooting: { label: "Troubleshooting", color: "#DC2626", bg: "rgba(220, 38, 38, 0.08)", icon: AlertTriangle },
  faq: { label: "FAQ", color: "#2563EB", bg: "rgba(37, 99, 235, 0.08)", icon: Hash },
  best_practice: { label: "Best Practice", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.08)", icon: Sparkles },
  runbook: { label: "Runbook", color: "#D97706", bg: "rgba(217, 119, 6, 0.08)", icon: FileText },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readTime(words: number): string {
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

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

  /* Computed values */
  const typeConf = TYPE_CONFIG[article?.type ?? ""] ?? {
    label: article?.type ?? "Article",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.08)",
    icon: FileText,
  };
  const TypeIcon = typeConf.icon;

  const words = useMemo(() => countWords(article?.content ?? ""), [article?.content]);
  const helpfulPct = useMemo(() => {
    const total = feedbackStats
      ? feedbackStats.total
      : (article?.helpfulCount ?? 0) + (article?.notHelpfulCount ?? 0);
    if (total === 0) return null;
    const helpful = feedbackStats ? feedbackStats.helpful : (article?.helpfulCount ?? 0);
    return Math.round((helpful / total) * 100);
  }, [feedbackStats, article]);

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
          >
            <Loader2 size={24} className="animate-spin text-white" />
          </div>
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading article...
          </p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Article not found
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/knowledge")}
          className="text-sm text-[var(--primary)] hover:underline"
        >
          Back to Knowledge Hub
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              background: `radial-gradient(circle, ${typeConf.color} 0%, transparent 70%)`,
            }}
          />
        </div>

        <div className="relative p-6">
          {/* Back link */}
          <button
            type="button"
            onClick={() => router.push("/dashboard/knowledge")}
            className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)] mb-4"
          >
            <ArrowLeft size={12} />
            Back to Knowledge Hub
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${typeConf.color}, ${typeConf.color}cc)`,
                }}
              >
                <TypeIcon size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {article.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={article.status} />
                  <span className="rounded-full bg-[var(--surface-1)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                    v{article.version}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: typeConf.bg, color: typeConf.color }}
                  >
                    <TypeIcon size={11} />
                    {typeConf.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--neutral-gray)]">
                    <Clock size={11} />
                    {readTime(words)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              {/* Status actions */}
              {(article.status.toLowerCase() === "draft" ||
                article.status.toLowerCase() === "in_review") && (
                <button
                  type="button"
                  disabled={isActing}
                  onClick={() => publishArticle.mutate(article.id)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${typeConf.color}, ${typeConf.color}cc)`,
                  }}
                >
                  {publishArticle.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Globe size={16} />
                  )}
                  Publish
                </button>
              )}
              {article.status.toLowerCase() === "published" && (
                <button
                  type="button"
                  disabled={isActing}
                  onClick={() => archiveArticle.mutate(article.id)}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {archiveArticle.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Archive size={16} />
                  )}
                  Archive
                </button>
              )}
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
          </div>
        </div>
      </motion.div>

      {/* ================================================ */}
      {/*  STAT CARDS                                       */}
      {/* ================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #6366F1, transparent)" }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">Author</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)] truncate max-w-[140px]">
                {article.authorName || article.authorId}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <User size={18} style={{ color: "#6366F1" }} />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #3B82F6, transparent)" }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">Views</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {article.viewCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Eye size={18} style={{ color: "#3B82F6" }} />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #10B981, transparent)" }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">Helpful</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {feedbackStats ? feedbackStats.helpful : article.helpfulCount}
                </span>
                <span className="text-xs text-[var(--neutral-gray)]">
                  / {feedbackStats ? feedbackStats.total : article.helpfulCount + article.notHelpfulCount}
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <ThumbsUp size={18} style={{ color: "#10B981" }} />
            </div>
          </div>
          {helpfulPct !== null && (
            <div className="mt-2">
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: helpfulPct >= 70 ? "#10B981" : helpfulPct >= 40 ? "#F59E0B" : "#EF4444" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${helpfulPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[var(--neutral-gray)] tabular-nums">{helpfulPct}% found helpful</p>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #F59E0B, transparent)" }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">Published</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                {article.publishedAt ? formatDate(article.publishedAt) : "Not published"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Calendar size={18} style={{ color: "#F59E0B" }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ================================================ */}
      {/*  TWO-PANEL LAYOUT                                 */}
      {/* ================================================ */}
      <div className="flex gap-6">
        {/* ---- Main Content ---- */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-wrap items-center gap-2"
            >
              <Tag size={13} className="text-[var(--neutral-gray)]" />
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
                >
                  <Hash size={10} className="text-[var(--neutral-gray)]" />
                  {tag}
                </span>
              ))}
            </motion.div>
          )}

          {/* Article body */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-1)]/50 px-6 py-3">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-[var(--primary)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Article Content
                </span>
              </div>
              <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
                {words} words
              </span>
            </div>
            <div className="p-6">
              <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                {article.content}
              </div>
            </div>
          </motion.div>

          {/* Feedback section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-1)]/50 px-6 py-3">
              <CheckCircle2 size={15} className="text-[var(--primary)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Was this article helpful?
              </span>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={createFeedback.isPending}
                  onClick={() => createFeedback.mutate({ isHelpful: true })}
                  className="flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100 disabled:opacity-50"
                >
                  <ThumbsUp size={16} />
                  Yes, helpful
                  {feedbackStats && (
                    <span className="ml-1 rounded-full bg-emerald-200/50 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                      {feedbackStats.helpful}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={createFeedback.isPending}
                  onClick={() => createFeedback.mutate({ isHelpful: false })}
                  className="flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition-all hover:bg-red-100 hover:border-red-300 hover:shadow-md hover:shadow-red-100 disabled:opacity-50"
                >
                  <ThumbsDown size={16} />
                  Not helpful
                  {feedbackStats && (
                    <span className="ml-1 rounded-full bg-red-200/50 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                      {feedbackStats.notHelpful}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ---- Sidebar ---- */}
        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="hidden w-72 shrink-0 lg:block"
        >
          <div className="sticky top-24 space-y-4">
            {/* Article Metadata */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-4">
                Details
              </p>
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <FolderTree size={14} className="mt-0.5 shrink-0 text-[var(--neutral-gray)]" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--neutral-gray)]">Category</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {category?.name || (article.categoryId ? "Loading…" : "Uncategorized")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User size={14} className="mt-0.5 shrink-0 text-[var(--neutral-gray)]" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--neutral-gray)]">Reviewer</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {article.reviewerName || (article.reviewerId ? article.reviewerId : "Not assigned")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Hash size={14} className="mt-0.5 shrink-0 text-[var(--neutral-gray)]" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--neutral-gray)]">Slug</p>
                    <p className="text-xs font-mono text-[var(--text-primary)] break-all">
                      {article.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock size={14} className="mt-0.5 shrink-0 text-[var(--neutral-gray)]" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--neutral-gray)]">Last Updated</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {formatDateTime(article.updatedAt)}
                    </p>
                  </div>
                </div>

                {article.linkedTicketIds && article.linkedTicketIds.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Link2 size={14} className="mt-0.5 shrink-0 text-[var(--neutral-gray)]" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-[var(--neutral-gray)]">Linked Tickets</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {article.linkedTicketIds.map((tid) => (
                          <span
                            key={tid}
                            className="inline-flex rounded bg-[var(--primary)]/8 px-1.5 py-0.5 text-[11px] font-mono font-medium text-[var(--primary)]"
                          >
                            {tid}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-3">
                Quick Actions
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/knowledge/articles/${slug}/edit`)
                  }
                  className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  <Edit size={14} />
                  Edit Article
                </button>
                {(article.status.toLowerCase() === "draft" ||
                  article.status.toLowerCase() === "in_review") && (
                  <button
                    type="button"
                    disabled={isActing}
                    onClick={() => publishArticle.mutate(article.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${typeConf.color}, ${typeConf.color}cc)`,
                    }}
                  >
                    {publishArticle.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Globe size={14} />
                    )}
                    Publish Article
                  </button>
                )}
                {article.status.toLowerCase() === "published" && (
                  <button
                    type="button"
                    disabled={isActing}
                    onClick={() => archiveArticle.mutate(article.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                  >
                    {archiveArticle.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Archive size={14} />
                    )}
                    Archive Article
                  </button>
                )}
              </div>
            </div>

            {/* Reading stats */}
            <div
              className="rounded-2xl border p-4"
              style={{
                borderColor: `${typeConf.color}20`,
                backgroundColor: `${typeConf.color}04`,
              }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: typeConf.color }}>
                Reading Stats
              </p>
              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Word count</span>
                  <span className="font-medium text-[var(--text-primary)] tabular-nums">{words}</span>
                </div>
                <div className="flex justify-between">
                  <span>Read time</span>
                  <span className="font-medium text-[var(--text-primary)]">{readTime(words)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Version</span>
                  <span className="font-medium text-[var(--text-primary)] tabular-nums">v{article.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total views</span>
                  <span className="font-medium text-[var(--text-primary)] tabular-nums">{article.viewCount}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
