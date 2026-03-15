"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Search,
  Megaphone,
  FolderTree,
  Plus,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useKBArticles,
  useKBCategories,
  useAnnouncements,
} from "@/hooks/use-knowledge";

/* ------------------------------------------------------------------ */
/*  Summary Card Type                                                   */
/* ------------------------------------------------------------------ */

interface SummaryCard {
  title: string;
  icon: LucideIcon;
  value: string | number | undefined;
  loading: boolean;
  href: string;
  color: string;
  bgColor: string;
}

/* ------------------------------------------------------------------ */
/*  Quick Link Type                                                     */
/* ------------------------------------------------------------------ */

interface QuickLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KnowledgeHubPage() {
  const { user } = useAuth();

  const { data: publishedArticles, isLoading: publishedLoading } =
    useKBArticles(1, 1, undefined, "published");
  const { data: draftArticles, isLoading: draftsLoading } =
    useKBArticles(1, 1, undefined, "draft");
  const { data: categoriesData, isLoading: categoriesLoading } =
    useKBCategories();
  const { data: announcementsData, isLoading: announcementsLoading } =
    useAnnouncements(1, 1, true);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const summaryCards: SummaryCard[] = [
    {
      title: "Published Articles",
      icon: BookOpen,
      value: publishedArticles?.meta?.totalItems,
      loading: publishedLoading,
      href: "/dashboard/knowledge/articles/new",
      color: "#1B7340",
      bgColor: "rgba(27, 115, 64, 0.1)",
    },
    {
      title: "Draft Articles",
      icon: FileText,
      value: draftArticles?.meta?.totalItems,
      loading: draftsLoading,
      href: "/dashboard/knowledge/articles/new",
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)",
    },
    {
      title: "Categories",
      icon: FolderTree,
      value: Array.isArray(categoriesData)
        ? categoriesData.length
        : undefined,
      loading: categoriesLoading,
      href: "/dashboard/knowledge/search",
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      title: "Announcements",
      icon: Megaphone,
      value: announcementsData?.meta?.totalItems,
      loading: announcementsLoading,
      href: "/dashboard/knowledge/search",
      color: "#8B5CF6",
      bgColor: "rgba(139, 92, 246, 0.1)",
    },
  ];

  const quickLinks: QuickLink[] = [
    {
      label: "Create Article",
      href: "/dashboard/knowledge/articles/new",
      icon: FileText,
    },
    {
      label: "Search Knowledge Base",
      href: "/dashboard/knowledge/search",
      icon: Search,
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <BookOpen size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Knowledge Management
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {greeting}, {user?.displayName || "User"}. Manage articles,
              categories, search, and announcements.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.07 }}
            >
              <Link
                href={card.href}
                className="group block rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.bgColor }}
                  >
                    <Icon
                      size={20}
                      style={{ color: card.color }}
                      className="transition-transform duration-200 group-hover:scale-110"
                    />
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                  />
                </div>
                <div>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: card.color }}
                  >
                    {card.loading ? (
                      <span className="inline-block w-8 h-7 rounded bg-[var(--surface-2)] animate-pulse" />
                    ) : (
                      (card.value ?? "--")
                    )}
                  </p>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mt-0.5">
                    {card.title}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:shadow-sm"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <Plus size={16} className="text-[var(--primary)]" />
              {link.label}
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Module Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Knowledge Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Articles",
              description:
                "Create and manage knowledge base articles, how-tos, and runbooks",
              href: "/dashboard/knowledge/articles/new",
              icon: FileText,
            },
            {
              title: "Categories",
              description:
                "Organize articles into hierarchical categories for easy navigation",
              href: "/dashboard/knowledge/search",
              icon: FolderTree,
            },
            {
              title: "Search",
              description:
                "Full-text search across all articles and knowledge content",
              href: "/dashboard/knowledge/search",
              icon: Search,
            },
            {
              title: "Announcements",
              description:
                "Publish and manage announcements for teams and the organization",
              href: "/dashboard/knowledge/search",
              icon: Megaphone,
            },
          ].map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.title}
                href={mod.href}
                className="group block rounded-xl border p-5 transition-all duration-200 hover:shadow-sm"
                style={{
                  backgroundColor: "var(--surface-1)",
                  borderColor: "var(--border)",
                }}
              >
                <Icon
                  size={20}
                  className="text-[var(--primary)] mb-2"
                />
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {mod.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {mod.description}
                </p>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
