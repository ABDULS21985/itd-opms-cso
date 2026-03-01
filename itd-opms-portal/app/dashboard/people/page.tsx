"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Brain,
  ClipboardCheck,
  CalendarDays,
  GraduationCap,
  Users,
  BarChart3,
  BookOpen,
  Plus,
  ArrowRight,
  UserPlus,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useSkills,
  useChecklists,
  useLeaveRecords,
  useExpiringCertifications,
} from "@/hooks/use-people";

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

export default function PeopleHubPage() {
  const { user } = useAuth();

  const { data: skillsData, isLoading: skillsLoading } = useSkills(1, 1);
  const { data: activeChecklists, isLoading: checklistsLoading } =
    useChecklists(1, 1, undefined, "in_progress");
  const { data: pendingLeave, isLoading: leaveLoading } =
    useLeaveRecords(1, 1, undefined, "pending");
  const { data: expiringCerts, isLoading: certsLoading } =
    useExpiringCertifications(90);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const summaryCards: SummaryCard[] = [
    {
      title: "Active Skills",
      icon: Brain,
      value: skillsData?.meta?.totalItems,
      loading: skillsLoading,
      href: "/dashboard/people/skills",
      color: "#1B7340",
      bgColor: "rgba(27, 115, 64, 0.1)",
    },
    {
      title: "Active Checklists",
      icon: ClipboardCheck,
      value: activeChecklists?.meta?.totalItems,
      loading: checklistsLoading,
      href: "/dashboard/people/onboarding",
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      title: "Pending Leave",
      icon: CalendarDays,
      value: pendingLeave?.meta?.totalItems,
      loading: leaveLoading,
      href: "/dashboard/people/roster",
      color: "#8B5CF6",
      bgColor: "rgba(139, 92, 246, 0.1)",
    },
    {
      title: "Expiring Certs",
      icon: GraduationCap,
      value: expiringCerts?.length,
      loading: certsLoading,
      href: "/dashboard/people/training",
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)",
    },
  ];

  const quickLinks: QuickLink[] = [
    {
      label: "Add Skill",
      href: "/dashboard/people/skills",
      icon: Brain,
    },
    {
      label: "Create Checklist",
      href: "/dashboard/people/onboarding",
      icon: ClipboardCheck,
    },
    {
      label: "Log Training",
      href: "/dashboard/people/training",
      icon: GraduationCap,
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
            <Users size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              People, Workforce & Admin
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {greeting}, {user?.displayName || "User"}. Manage skills,
              onboarding, rosters, capacity, and training.
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
          People Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Skills",
              description:
                "Manage skill categories, proficiency tracking, and gap analysis",
              href: "/dashboard/people/skills",
              icon: Brain,
            },
            {
              title: "Onboarding",
              description:
                "Create and track onboarding checklists for new team members",
              href: "/dashboard/people/onboarding",
              icon: UserPlus,
            },
            {
              title: "Offboarding",
              description:
                "Manage offboarding processes, access revocation, and handovers",
              href: "/dashboard/people/offboarding",
              icon: UserMinus,
            },
            {
              title: "Roster",
              description:
                "Team schedules, shift management, and leave tracking",
              href: "/dashboard/people/roster",
              icon: CalendarDays,
            },
            {
              title: "Capacity",
              description:
                "Resource allocation, utilization tracking, and planning",
              href: "/dashboard/people/capacity",
              icon: Users,
            },
            {
              title: "Training",
              description:
                "Training records, certifications, and professional development",
              href: "/dashboard/people/training",
              icon: BookOpen,
            },
            {
              title: "Analytics",
              description:
                "Workforce analytics, skill distribution, and capacity reports",
              href: "/dashboard/people/analytics",
              icon: BarChart3,
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
