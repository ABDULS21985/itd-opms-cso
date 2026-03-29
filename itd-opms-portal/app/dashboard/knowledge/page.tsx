"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Compass,
  FilePenLine,
  FileText,
  FolderTree,
  Layers3,
  Megaphone,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useAnnouncements,
  useKBArticles,
  useKBCategories,
} from "@/hooks/use-knowledge";
import type { Announcement, KBArticle, KBCategory } from "@/types";

interface StatCard {
  label: string;
  value: number | string | undefined;
  helper: string;
  color: string;
  bg: string;
  icon: LucideIcon;
  href: string;
}

interface WorkspaceLink {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Unscheduled";

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

function excerpt(content: string, limit = 120): string {
  if (!content) return "No summary available.";
  if (content.length <= limit) return content;
  return `${content.slice(0, limit).trim()}...`;
}

function knowledgePosture(
  publishingRate: number,
  announcementCount: number,
  categoryCount: number,
) {
  if (publishingRate < 55) {
    return {
      label: "Needs editorial push",
      accent: "#DC2626",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "Draft volume is outrunning published knowledge, so useful content is not landing fast enough.",
    };
  }

  if (announcementCount >= 3 || categoryCount >= 8) {
    return {
      label: "Knowledge in motion",
      accent: "#D97706",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "The library is active and broad, but it needs steady curation to stay sharp and discoverable.",
    };
  }

  return {
    label: "Well-curated",
    accent: "#1B7340",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "Publishing, structure, and broadcasts are aligned well enough to support fast knowledge retrieval.",
  };
}

function LoadingValue({ width = "w-14" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function HeroActionButton({
  icon: Icon,
  label,
  href,
  primary,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
        primary
          ? "bg-[var(--primary)] text-white hover:opacity-90"
          : "border text-[var(--text-primary)] hover:-translate-y-0.5 hover:shadow-md"
      }`}
      style={
        primary
          ? undefined
          : {
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-0)",
              backdropFilter: "blur(18px)",
            }
      }
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

function SummaryStatCard({
  card,
  loading,
  index,
}: {
  card: StatCard;
  loading: boolean;
  index: number;
}) {
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link
        href={card.href}
        className="group block rounded-[28px] border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)]"
        style={{
          borderColor: `${card.color}20`,
          backgroundImage: `radial-gradient(circle at 100% 0%, ${card.color}16, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: card.bg, color: card.color }}
          >
            <Icon size={20} />
          </div>
          <ArrowRight
            size={16}
            className="text-[var(--text-secondary)] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
          />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {card.label}
        </p>
        <p
          className="mt-3 text-3xl font-bold tabular-nums"
          style={{ color: card.color }}
        >
          {loading ? <LoadingValue /> : (card.value ?? "--")}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {card.helper}
        </p>
      </Link>
    </motion.div>
  );
}

function ArticleCard({
  article,
  categoryName,
}: {
  article: KBArticle;
  categoryName?: string;
}) {
  return (
    <Link
      href={`/dashboard/knowledge/articles/${article.slug}`}
      className="group block rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              {article.type}
            </span>
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              {categoryName ?? "Uncategorized"}
            </span>
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            {article.title}
          </h3>
        </div>
        <ArrowRight
          size={16}
          className="mt-1 shrink-0 text-[var(--text-secondary)] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>

      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
        {excerpt(article.content)}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] bg-[var(--surface-1)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Published
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {formatDate(article.publishedAt ?? article.updatedAt)}
          </p>
        </div>
        <div className="rounded-[20px] bg-[var(--surface-1)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Reach
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {article.viewCount} views
          </p>
        </div>
        <div className="rounded-[20px] bg-[var(--surface-1)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Author
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {article.authorName ?? article.authorId}
          </p>
        </div>
      </div>
    </Link>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const priorityTone =
    announcement.priority === "high"
      ? {
          bg: "rgba(239, 68, 68, 0.1)",
          text: "#DC2626",
        }
      : announcement.priority === "medium"
        ? {
            bg: "rgba(245, 158, 11, 0.1)",
            text: "#D97706",
          }
        : {
            bg: "rgba(59, 130, 246, 0.1)",
            text: "#2563EB",
          };

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ backgroundColor: priorityTone.bg, color: priorityTone.text }}
        >
          {announcement.priority} priority
        </span>
        <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          {announcement.targetAudience}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
        {announcement.title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
        {excerpt(announcement.content)}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
        <span>
          Published{" "}
          {formatDate(announcement.publishedAt ?? announcement.createdAt)}
        </span>
        <span>Updated {daysAgo(announcement.updatedAt)}</span>
        <span>{announcement.isActive ? "Live now" : "Paused"}</span>
      </div>
    </div>
  );
}

function WorkspaceLinkCard({
  item,
  index,
}: {
  item: WorkspaceLink;
  index: number;
}) {
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 + index * 0.05 }}
    >
      <Link
        href={item.href}
        className="group block rounded-[28px] border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        style={{
          borderColor: `${item.accent}22`,
          backgroundImage: `linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${item.accent}14`, color: item.accent }}
        >
          <Icon size={20} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
          {item.label}
        </h3>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
          {item.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          Open workspace
          <ArrowRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </motion.div>
  );
}

export default function KnowledgeHubPage() {
  const { user } = useAuth();

  const { data: publishedCountData, isLoading: publishedCountLoading } =
    useKBArticles(1, 1, undefined, "published");
  const { data: draftCountData, isLoading: draftCountLoading } = useKBArticles(
    1,
    1,
    undefined,
    "draft",
  );
  const { data: recentArticlesData, isLoading: recentArticlesLoading } =
    useKBArticles(1, 3, undefined, "published");
  const { data: categoriesData, isLoading: categoriesLoading } =
    useKBCategories();
  const { data: announcementCountData, isLoading: announcementCountLoading } =
    useAnnouncements(1, 1, true);
  const {
    data: recentAnnouncementsData,
    isLoading: recentAnnouncementsLoading,
  } = useAnnouncements(1, 3, true);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const publishedCount = publishedCountData?.meta?.totalItems ?? 0;
  const draftCount = draftCountData?.meta?.totalItems ?? 0;
  const announcementCount = announcementCountData?.meta?.totalItems ?? 0;
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const categoryCount = categories.length;
  const recentArticles = recentArticlesData?.data ?? [];
  const recentAnnouncements = recentAnnouncementsData?.data ?? [];

  const publishingRate = useMemo(() => {
    const total = publishedCount + draftCount;
    if (!total) return 0;
    return Math.round((publishedCount / total) * 100);
  }, [draftCount, publishedCount]);

  const posture = knowledgePosture(
    publishingRate,
    announcementCount,
    categoryCount,
  );

  const taxonomyStats = useMemo(() => {
    const topLevel = categories.filter((category) => !category.parentId).length;
    const nested = categories.filter((category) =>
      Boolean(category.parentId),
    ).length;
    const recent = [...categories]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 4);

    return { topLevel, nested, recent };
  }, [categories]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, KBCategory>();
    categories.forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  const summaryCards: StatCard[] = [
    {
      label: "Published articles",
      value: publishedCountData?.meta?.totalItems,
      helper: "Live knowledge assets available to the wider team.",
      color: "#1B7340",
      bg: "rgba(27, 115, 64, 0.1)",
      icon: BookOpen,
      href: "/dashboard/knowledge/search",
    },
    {
      label: "Draft pipeline",
      value: draftCountData?.meta?.totalItems,
      helper: "Articles still being shaped before they reach the library.",
      color: "#D97706",
      bg: "rgba(217, 119, 6, 0.1)",
      icon: FilePenLine,
      href: "/dashboard/knowledge/articles/new",
    },
    {
      label: "Category map",
      value: categoryCount,
      helper: "Taxonomy lanes keeping content grouped and discoverable.",
      color: "#2563EB",
      bg: "rgba(37, 99, 235, 0.1)",
      icon: FolderTree,
      href: "/dashboard/knowledge/categories",
    },
    {
      label: "Active broadcasts",
      value: announcementCountData?.meta?.totalItems,
      helper:
        "Live communications pushing key updates across the organization.",
      color: "#8B5CF6",
      bg: "rgba(139, 92, 246, 0.1)",
      icon: Megaphone,
      href: "/dashboard/knowledge/announcements",
    },
  ];

  const workspaces: WorkspaceLink[] = [
    {
      label: "Article studio",
      description:
        "Create and refine how-tos, runbooks, and evergreen process knowledge.",
      href: "/dashboard/knowledge/articles/new",
      icon: FileText,
      accent: "#2563EB",
    },
    {
      label: "Search desk",
      description:
        "Jump straight into the knowledge base to validate discoverability and find gaps.",
      href: "/dashboard/knowledge/search",
      icon: Search,
      accent: "#1B7340",
    },
    {
      label: "Category map",
      description:
        "Reshape the taxonomy so teams can navigate knowledge without friction.",
      href: "/dashboard/knowledge/categories",
      icon: Layers3,
      accent: "#D97706",
    },
    {
      label: "Broadcast center",
      description:
        "Publish and manage announcements that need high visibility across teams.",
      href: "/dashboard/knowledge/announcements",
      icon: Megaphone,
      accent: "#8B5CF6",
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(27, 115, 64, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(27,115,64,0.18), transparent 30%), radial-gradient(circle at 88% 16%, rgba(37,99,235,0.14), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(27, 115, 64, 0.25)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.16fr_0.84fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${posture.badgeClass}`}
              >
                <Sparkles size={14} />
                {posture.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <BookOpen size={14} className="text-[#1B7340]" />
                Editorial command center
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                Knowledge Management
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                {greeting}, {user?.displayName || "User"}. Run the knowledge
                library like a real publishing operation with stronger content
                visibility, cleaner taxonomy signals, and faster editorial
                action.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <HeroActionButton
                icon={FilePenLine}
                label="Write Article"
                href="/dashboard/knowledge/articles/new"
                primary
              />
              <HeroActionButton
                icon={Search}
                label="Search Library"
                href="/dashboard/knowledge/search"
              />
              <HeroActionButton
                icon={FolderTree}
                label="Manage Categories"
                href="/dashboard/knowledge/categories"
              />
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Editorial posture
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Knowledge pulse
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
                  Publishing rate
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {publishedCountLoading || draftCountLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    `${publishingRate}%`
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Active broadcasts
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {announcementCountLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    announcementCount
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Taxonomy depth
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {categoriesLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    taxonomyStats.nested
                  )}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Top-level lanes
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {categoriesLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    taxonomyStats.topLevel
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => {
          const loading =
            card.label === "Published articles"
              ? publishedCountLoading
              : card.label === "Draft pipeline"
                ? draftCountLoading
                : card.label === "Category map"
                  ? categoriesLoading
                  : announcementCountLoading;

          return (
            <SummaryStatCard
              key={card.label}
              card={card}
              loading={loading}
              index={index}
            />
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Publishing desk
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Fresh knowledge shipping now
              </h2>
            </div>
            <Link
              href="/dashboard/knowledge/search"
              className="hidden text-sm font-semibold text-[var(--primary)] md:inline-flex"
            >
              Explore library
            </Link>
          </div>

          {recentArticlesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5"
                >
                  <div className="h-5 w-28 animate-pulse rounded-full bg-[var(--surface-2)]" />
                  <div className="mt-4 h-8 w-3/4 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                  <div className="mt-4 space-y-2">
                    <div className="h-4 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                    <div className="h-4 w-10/12 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentArticles.length === 0 ? (
            <div
              className="rounded-[32px] border p-12 text-center"
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
                No published knowledge yet
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                Publish your first article to start building a searchable
                knowledge library for runbooks, troubleshooting, and
                institutional memory.
              </p>
              <Link
                href="/dashboard/knowledge/articles/new"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <FilePenLine size={16} />
                Create First Article
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  categoryName={
                    article.categoryId
                      ? categoryMap.get(article.categoryId)?.name
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Broadcast desk
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Active announcements
                </h2>
              </div>
              <Megaphone size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 space-y-3">
              {recentAnnouncementsLoading ? (
                [1, 2].map((item) => (
                  <div
                    key={item}
                    className="rounded-[24px] bg-[var(--surface-1)] p-4"
                  >
                    <div className="h-5 w-24 animate-pulse rounded-full bg-[var(--surface-2)]" />
                    <div className="mt-4 h-6 w-3/4 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                    <div className="mt-3 h-4 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                  </div>
                ))
              ) : recentAnnouncements.length === 0 ? (
                <div className="rounded-[24px] bg-[var(--surface-1)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
                  No active announcements yet. Use broadcasts for urgent
                  updates, broad awareness, or time-sensitive operational
                  guidance.
                </div>
              ) : (
                recentAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Taxonomy watch
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Category coverage
                </h2>
              </div>
              <Compass size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Top-level
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {categoriesLoading ? (
                    <LoadingValue width="w-12" />
                  ) : (
                    taxonomyStats.topLevel
                  )}
                </p>
              </div>
              <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Nested
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {categoriesLoading ? (
                    <LoadingValue width="w-12" />
                  ) : (
                    taxonomyStats.nested
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {categoriesLoading ? (
                [1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] bg-[var(--surface-1)] p-4"
                  >
                    <div className="h-5 w-1/2 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                  </div>
                ))
              ) : taxonomyStats.recent.length === 0 ? (
                <div className="rounded-[20px] bg-[var(--surface-1)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                  No categories created yet. Define your first taxonomy lanes to
                  organize knowledge by domain, team, or service area.
                </div>
              ) : (
                taxonomyStats.recent.map((category) => (
                  <Link
                    key={category.id}
                    href="/dashboard/knowledge/categories"
                    className="flex items-start justify-between gap-3 rounded-[20px] bg-[var(--surface-1)] p-4 transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {category.name}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {category.description || "No category description yet."}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]">
                      {category.parentId ? "Nested" : "Top level"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Workspace lanes
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Knowledge modules
            </h2>
          </div>
          <Link
            href="/dashboard/knowledge/search"
            className="hidden text-sm font-semibold text-[var(--primary)] md:inline-flex"
          >
            Audit discoverability
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workspaces.map((item, index) => (
            <WorkspaceLinkCard key={item.label} item={item} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
