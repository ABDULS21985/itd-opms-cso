"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  List,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  Rocket,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { KPIStatCard } from "@/components/dashboard/charts/kpi-stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useReleases, useReleaseStats } from "@/hooks/use-release";
import type { Release } from "@/types/release";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(value?: string) {
  if (!value) return "\u2014";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const TYPE_ACCENT: Record<string, { color: string; bg: string }> = {
  major:     { color: "#7C3AED", bg: "rgba(124, 58, 237, 0.10)" },
  minor:     { color: "#2563EB", bg: "rgba(37, 99, 235, 0.10)" },
  patch:     { color: "#16A34A", bg: "rgba(22, 163, 74, 0.10)" },
  emergency: { color: "#DC2626", bg: "rgba(220, 38, 38, 0.10)" },
};

/* ------------------------------------------------------------------ */
/*  Quick-link card                                                     */
/* ------------------------------------------------------------------ */

function QuickLink({
  href,
  icon: Icon,
  label,
  description,
  accent,
  index,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  accent: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 + index * 0.06 }}
    >
      <Link
        href={href}
        className="block rounded-xl border border-white/[0.06] p-5 hover:bg-white/[0.02] transition-colors group"
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accent}18` }}
          >
            <Icon size={20} style={{ color: accent }} />
          </div>
          <ArrowRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
        </div>
        <div className="font-semibold text-white text-sm">{label}</div>
        <p className="text-xs text-white/40 mt-1">{description}</p>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReleasesHubPage() {
  const { data: stats, isLoading: statsLoading } = useReleaseStats();
  const { data: releasesData, isLoading: releasesLoading } = useReleases({ page: 1, pageSize: 5 });

  const releases = (releasesData as unknown as { data: Release[] })?.data ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package size={24} className="text-indigo-400" />
            Release Management
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Plan, build, test, and deploy releases across environments
          </p>
        </div>
        <Link
          href="/dashboard/releases/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #1B7340, #0E5A2D)" }}
        >
          <Plus size={16} />
          New Release
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPIStatCard
          label="Total Releases"
          value={stats?.total}
          icon={Package}
          color="#6366F1"
          bgColor="rgba(99, 102, 241, 0.12)"
          isLoading={statsLoading}
          index={0}
        />
        <KPIStatCard
          label="In Progress"
          value={stats?.inProgress}
          icon={Rocket}
          color="#D97706"
          bgColor="rgba(217, 119, 6, 0.12)"
          isLoading={statsLoading}
          index={1}
        />
        <KPIStatCard
          label="Deployed This Month"
          value={stats?.deployedThisMonth}
          icon={CheckCircle2}
          color="#16A34A"
          bgColor="rgba(22, 163, 74, 0.12)"
          isLoading={statsLoading}
          index={2}
        />
        <KPIStatCard
          label="Rollback Rate"
          value={stats?.rollbackRate != null ? `${stats.rollbackRate}%` : undefined}
          icon={RotateCcw}
          color="#EF4444"
          bgColor="rgba(239, 68, 68, 0.12)"
          isLoading={statsLoading}
          index={3}
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink
          href="/dashboard/releases/list"
          icon={List}
          label="All Releases"
          description="View and manage all releases"
          accent="#0E5A2D"
          index={0}
        />
        <QuickLink
          href="/dashboard/releases/new"
          icon={Plus}
          label="New Release"
          description="Create a new release package"
          accent="#16A34A"
          index={1}
        />
        <QuickLink
          href="/dashboard/releases/calendar"
          icon={Calendar}
          label="Release Calendar"
          description="View scheduled deployments"
          accent="#1B7340"
          index={2}
        />
        <QuickLink
          href="/dashboard/releases/list?status=deploying"
          icon={TrendingUp}
          label="Active Deployments"
          description="In-progress deployments"
          accent="#D97706"
          index={3}
        />
      </div>

      {/* Recent Releases */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Recent Releases</h2>
          <Link
            href="/dashboard/releases/list"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all &rarr;
          </Link>
        </div>

        {releasesLoading ? (
          <div className="flex items-center justify-center py-12 text-white/50">
            <Loader2 className="animate-spin mr-2" size={20} />
            Loading releases...
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Package size={36} className="mx-auto mb-3 opacity-30" />
            <p>No releases yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left p-4">Release</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Environment</th>
                  <th className="text-left p-4">Planned</th>
                  <th className="text-right p-4"></th>
                </tr>
              </thead>
              <tbody>
                {releases.map((release: Release) => {
                  const typeMeta = TYPE_ACCENT[release.releaseType] ?? TYPE_ACCENT.minor;
                  return (
                    <tr
                      key={release.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-mono text-xs text-white/50">{release.releaseNumber}</div>
                        <div className="text-white font-medium">{release.title}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                          style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}
                        >
                          {release.releaseType}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={release.status} />
                      </td>
                      <td className="p-4 text-white/50 capitalize">{release.environment}</td>
                      <td className="p-4 text-white/50">{formatDate(release.plannedStartDate)}</td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/dashboard/releases/${release.id}`}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
