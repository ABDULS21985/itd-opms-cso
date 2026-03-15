"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  AlertTriangle,
  ClipboardList,
  Eye,
  Scale,
  Plus,
  ArrowRight,
  FileCheck,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useRisks,
  useGRCAudits,
  useAccessReviewCampaigns,
  useComplianceControls,
} from "@/hooks/use-grc";

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

export default function GRCHubPage() {
  const { user } = useAuth();

  const { data: risksData, isLoading: risksLoading } = useRisks(1, 1);
  const { data: auditsData, isLoading: auditsLoading } = useGRCAudits(
    1,
    1,
    "in_progress",
  );
  const { data: reviewsData, isLoading: reviewsLoading } =
    useAccessReviewCampaigns(1, 1, "active");
  const { data: controlsData, isLoading: controlsLoading } =
    useComplianceControls(1, 1);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const summaryCards: SummaryCard[] = [
    {
      title: "Active Risks",
      icon: AlertTriangle,
      value: risksData?.meta?.totalItems,
      loading: risksLoading,
      href: "/dashboard/grc/risks",
      color: "#EF4444",
      bgColor: "rgba(239, 68, 68, 0.1)",
    },
    {
      title: "Open Audits",
      icon: ClipboardList,
      value: auditsData?.meta?.totalItems,
      loading: auditsLoading,
      href: "/dashboard/grc/audits",
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      title: "Pending Reviews",
      icon: Eye,
      value: reviewsData?.meta?.totalItems,
      loading: reviewsLoading,
      href: "/dashboard/grc/access-reviews",
      color: "#8B5CF6",
      bgColor: "rgba(139, 92, 246, 0.1)",
    },
    {
      title: "Compliance Controls",
      icon: Scale,
      value: controlsData?.meta?.totalItems,
      loading: controlsLoading,
      href: "/dashboard/grc/compliance",
      color: "#10B981",
      bgColor: "rgba(16, 185, 129, 0.1)",
    },
  ];

  const quickLinks: QuickLink[] = [
    {
      label: "Add Risk",
      href: "/dashboard/grc/risks",
      icon: AlertTriangle,
    },
    {
      label: "Schedule Audit",
      href: "/dashboard/grc/audits",
      icon: ClipboardList,
    },
    {
      label: "Start Access Review",
      href: "/dashboard/grc/access-reviews",
      icon: Eye,
    },
    {
      label: "Add Control",
      href: "/dashboard/grc/compliance",
      icon: Scale,
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
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
          >
            <Shield size={20} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              GRC &amp; Audit Readiness
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {greeting}, {user?.displayName || "User"}. Manage risks, audits,
              access reviews, and compliance.
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
          GRC Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: "Risk Register",
              description:
                "Enterprise risk identification, heat map visualization, and treatment tracking",
              href: "/dashboard/grc/risks",
              icon: AlertTriangle,
            },
            {
              title: "Audits",
              description:
                "Audit scheduling, evidence collection, findings tracking, and readiness scoring",
              href: "/dashboard/grc/audits",
              icon: ClipboardList,
            },
            {
              title: "Access Reviews",
              description:
                "Periodic access review campaigns, entitlement certification, and exception tracking",
              href: "/dashboard/grc/access-reviews",
              icon: Eye,
            },
            {
              title: "Compliance",
              description:
                "Framework mapping, control implementation tracking, and compliance posture",
              href: "/dashboard/grc/compliance",
              icon: FileCheck,
            },
            {
              title: "Reports",
              description:
                "GRC analytics, risk trends, finding aging, and compliance dashboards",
              href: "/dashboard/grc/reports",
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
