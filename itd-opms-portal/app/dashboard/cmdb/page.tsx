"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Package,
  Server,
  FileKey,
  Shield,
  Network,
  RefreshCw,
  BarChart3,
  ClipboardCheck,
  Plus,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useAssetStats,
  useLicenseComplianceStats,
  useExpiringWarranties,
} from "@/hooks/use-cmdb";
import { useVerificationStats } from "@/hooks/use-verification";

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

export default function CMDBHubPage() {
  const { user } = useAuth();

  const { data: assetStats, isLoading: assetStatsLoading } = useAssetStats();
  const { data: complianceStats, isLoading: complianceLoading } =
    useLicenseComplianceStats();
  const { data: expiringWarranties, isLoading: warrantiesLoading } =
    useExpiringWarranties(90);
  const { data: verifStats, isLoading: verifLoading } = useVerificationStats();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const compliancePct =
    complianceStats && complianceStats.total > 0
      ? Math.round((complianceStats.compliant / complianceStats.total) * 100)
      : undefined;

  const summaryCards: SummaryCard[] = [
    {
      title: "Total Assets",
      icon: Package,
      value: assetStats?.total,
      loading: assetStatsLoading,
      href: "/dashboard/cmdb/assets",
      color: "#1B7340",
      bgColor: "rgba(27, 115, 64, 0.1)",
    },
    {
      title: "Active Assets",
      icon: Server,
      value: assetStats?.activeCount,
      loading: assetStatsLoading,
      href: "/dashboard/cmdb/assets?status=active",
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      title: "License Compliance",
      icon: FileKey,
      value:
        compliancePct != null ? `${compliancePct}%` : undefined,
      loading: complianceLoading,
      href: "/dashboard/cmdb/licenses",
      color: "#8B5CF6",
      bgColor: "rgba(139, 92, 246, 0.1)",
    },
    {
      title: "Expiring Warranties",
      icon: Shield,
      value: expiringWarranties?.length,
      loading: warrantiesLoading,
      href: "/dashboard/cmdb/warranties",
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)",
    },
  ];

  const verifPct =
    verifStats && verifStats.total > 0
      ? Math.round((verifStats.verified / verifStats.total) * 100)
      : undefined;

  const quickLinks: QuickLink[] = [
    {
      label: "Register Asset",
      href: "/dashboard/cmdb/assets/new",
      icon: Package,
    },
    {
      label: "Add CI",
      href: "/dashboard/cmdb/topology",
      icon: Server,
    },
    {
      label: "Add License",
      href: "/dashboard/cmdb/licenses",
      icon: FileKey,
    },
    {
      label: "New Verification Campaign",
      href: "/dashboard/cmdb/verification",
      icon: ClipboardCheck,
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
            <Package size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Configuration Management Database
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {greeting}, {user?.displayName || "User"}. Manage assets,
              configuration items, licenses, and warranties.
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

      {/* Verification Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <Link
          href="/dashboard/cmdb/verification"
          className="group block rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
              >
                <ClipboardCheck size={18} style={{ color: "#10B981" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Physical Verification
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Asset verification campaign status
                </p>
              </div>
            </div>
            <ArrowRight
              size={16}
              className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all duration-200"
            />
          </div>

          {verifLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1 h-12 rounded-lg bg-[var(--surface-2)] animate-pulse" />
              ))}
            </div>
          ) : verifStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-lg bg-[var(--surface-1)] p-3 text-center">
                <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                  {verifStats.total}
                </p>
                <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Total
                </p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
                <p className="text-lg font-bold tabular-nums" style={{ color: "#10B981" }}>
                  {verifStats.verified}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#10B981" }}>
                  Verified
                </p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                <p className="text-lg font-bold tabular-nums" style={{ color: "#F59E0B" }}>
                  {verifStats.unverified}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#F59E0B" }}>
                  Unverified
                </p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                <p className="text-lg font-bold tabular-nums" style={{ color: "#EF4444" }}>
                  {verifStats.discrepancy}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#EF4444" }}>
                  Discrepancy
                </p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.05)" }}>
                <p className="text-lg font-bold tabular-nums" style={{ color: "#EF4444" }}>
                  {verifStats.overdue}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#EF4444" }}>
                  Overdue
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">No verification data available</p>
          )}

          {verifPct != null && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-secondary)]">Verification coverage</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: "#10B981" }}>
                  {verifPct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${verifPct}%`, backgroundColor: "#10B981" }}
                />
              </div>
            </div>
          )}
        </Link>
      </motion.div>

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
          CMDB Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Assets",
              description:
                "Register, track, and manage hardware, software, and cloud assets",
              href: "/dashboard/cmdb/assets",
              icon: Package,
            },
            {
              title: "Configuration Items",
              description:
                "View CI topology, relationships, and dependency maps",
              href: "/dashboard/cmdb/topology",
              icon: Network,
            },
            {
              title: "Licenses",
              description:
                "Track software licenses, compliance, and entitlements",
              href: "/dashboard/cmdb/licenses",
              icon: FileKey,
            },
            {
              title: "Warranties",
              description:
                "Monitor warranty coverage, renewals, and expiry dates",
              href: "/dashboard/cmdb/warranties",
              icon: Shield,
            },
            {
              title: "Topology",
              description:
                "Visualize CI relationships and network dependencies",
              href: "/dashboard/cmdb/topology",
              icon: Network,
            },
            {
              title: "Reconciliation",
              description:
                "Run discovery reconciliation and review discrepancies",
              href: "/dashboard/cmdb/reconciliation",
              icon: RefreshCw,
            },
            {
              title: "Verification",
              description:
                "Physical verification campaigns and asset stocktake workflows",
              href: "/dashboard/cmdb/verification",
              icon: ClipboardCheck,
            },
            {
              title: "Reports",
              description:
                "Asset analytics, compliance dashboards, and warranty timelines",
              href: "/dashboard/cmdb/reports",
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
