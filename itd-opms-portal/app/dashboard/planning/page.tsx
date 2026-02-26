"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FolderOpen,
  Briefcase,
  CheckSquare,
  Flag,
  AlertTriangle,
  Bug,
  FileEdit,
  Plus,
  ArrowRight,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useProjects,
  useOverdueWorkItems,
  useRisks,
  useIssues,
} from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Summary Card Type                                                   */
/* ------------------------------------------------------------------ */

interface SummaryCard {
  title: string;
  icon: LucideIcon;
  count: number | undefined;
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

export default function PlanningHubPage() {
  const { user } = useAuth();

  const { data: projectsData, isLoading: projectsLoading } = useProjects(
    1,
    1,
    undefined,
    "active",
  );
  const { data: overdueData, isLoading: overdueLoading } =
    useOverdueWorkItems();
  const { data: risksData, isLoading: risksLoading } = useRisks(
    1,
    1,
    undefined,
    "open",
  );
  const { data: issuesData, isLoading: issuesLoading } = useIssues(
    1,
    1,
    undefined,
    "open",
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const summaryCards: SummaryCard[] = [
    {
      title: "Active Projects",
      icon: Briefcase,
      count: projectsData?.meta?.totalItems,
      loading: projectsLoading,
      href: "/dashboard/planning/projects",
      color: "#1B7340",
      bgColor: "rgba(27, 115, 64, 0.1)",
    },
    {
      title: "Overdue Tasks",
      icon: CheckSquare,
      count: Array.isArray(overdueData) ? overdueData.length : undefined,
      loading: overdueLoading,
      href: "/dashboard/planning/projects",
      color: "#EF4444",
      bgColor: "rgba(239, 68, 68, 0.1)",
    },
    {
      title: "Open Risks",
      icon: AlertTriangle,
      count: risksData?.meta?.totalItems,
      loading: risksLoading,
      href: "/dashboard/planning/projects",
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)",
    },
    {
      title: "Open Issues",
      icon: Bug,
      count: issuesData?.meta?.totalItems,
      loading: issuesLoading,
      href: "/dashboard/planning/projects",
      color: "#8B5CF6",
      bgColor: "rgba(139, 92, 246, 0.1)",
    },
  ];

  const quickLinks: QuickLink[] = [
    {
      label: "New Portfolio",
      href: "/dashboard/planning/portfolios/new",
      icon: FolderOpen,
    },
    {
      label: "New Project",
      href: "/dashboard/planning/projects/new",
      icon: Briefcase,
    },
    {
      label: "New Work Item",
      href: "/dashboard/planning/projects",
      icon: CheckSquare,
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
            <LayoutDashboard size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Planning &amp; PMO
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {greeting}, {user?.displayName || "User"}. Manage portfolios,
              projects, work items, risks, and issues.
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
                      (card.count ?? "--")
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

      {/* Quick Links */}
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
          Planning Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Portfolios",
              description:
                "Organize projects into strategic portfolios by fiscal year",
              href: "/dashboard/planning/portfolios",
              icon: FolderOpen,
            },
            {
              title: "Projects",
              description:
                "Manage project lifecycles, timelines, and budgets",
              href: "/dashboard/planning/projects",
              icon: Briefcase,
            },
            {
              title: "Work Items",
              description:
                "Track tasks, stories, and deliverables within projects",
              href: "/dashboard/planning/projects",
              icon: CheckSquare,
            },
            {
              title: "Milestones",
              description:
                "Define and track key project milestones and deliverables",
              href: "/dashboard/planning/projects",
              icon: Flag,
            },
            {
              title: "Risks",
              description:
                "Identify, assess, and mitigate project and portfolio risks",
              href: "/dashboard/planning/projects",
              icon: AlertTriangle,
            },
            {
              title: "Issues",
              description:
                "Log, track, and resolve project issues and blockers",
              href: "/dashboard/planning/projects",
              icon: Bug,
            },
            {
              title: "Change Requests",
              description:
                "Manage scope, schedule, and budget change requests",
              href: "/dashboard/planning/projects",
              icon: FileEdit,
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
                <Icon size={20} className="text-[var(--primary)] mb-2" />
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
