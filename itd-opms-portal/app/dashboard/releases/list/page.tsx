"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Loader2,
  Package,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useReleases } from "@/hooks/use-release";
import type { Release } from "@/types/release";
import { RELEASE_STATUSES, RELEASE_TYPES, RELEASE_ENVIRONMENTS } from "@/types/release";

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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReleasesListPage() {
  const [status, setStatus] = useState("");
  const [releaseType, setReleaseType] = useState("");
  const [environment, setEnvironment] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: releasesData, isLoading } = useReleases({
    status: status || undefined,
    releaseType: releaseType || undefined,
    environment: environment || undefined,
    page,
    pageSize,
  });

  const releases = (releasesData as unknown as { data: Release[] })?.data ?? [];
  const totalPages = (releasesData as unknown as { meta?: { totalPages: number } })?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package size={24} className="text-indigo-400" />
            Releases
          </h1>
          <p className="text-sm text-white/50 mt-1">All release packages across environments</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/releases/calendar"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/70 hover:bg-white/5 transition-colors"
          >
            <Calendar size={16} />
            Calendar
          </Link>
          <Link
            href="/dashboard/releases/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #1B7340, #0E5A2D)" }}
          >
            <Plus size={16} />
            New Release
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {RELEASE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white"
          value={releaseType}
          onChange={(e) => { setReleaseType(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          {RELEASE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white"
          value={environment}
          onChange={(e) => { setEnvironment(e.target.value); setPage(1); }}
        >
          <option value="">All Environments</option>
          {RELEASE_ENVIRONMENTS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 className="animate-spin mr-2" size={20} />
          Loading releases...
        </div>
      ) : releases.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <Package size={48} className="mx-auto mb-4 opacity-30" />
          <p>No releases found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left p-4">Release #</th>
                <th className="text-left p-4">Title</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Environment</th>
                <th className="text-left p-4">Manager</th>
                <th className="text-left p-4">Planned Date</th>
                <th className="text-right p-4"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {releases.map((release: Release) => {
                  const typeMeta = TYPE_ACCENT[release.releaseType] ?? TYPE_ACCENT.minor;
                  return (
                    <motion.tr
                      key={release.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4 font-mono text-white/60">{release.releaseNumber}</td>
                      <td className="p-4 text-white font-medium max-w-[300px] truncate">{release.title}</td>
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
                      <td className="p-4 text-white/50">{release.releaseManagerName ?? "\u2014"}</td>
                      <td className="p-4 text-white/50">{formatDate(release.plannedStartDate)}</td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/dashboard/releases/${release.id}`}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded border border-white/10 text-sm text-white/60 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-sm text-white/50">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded border border-white/10 text-sm text-white/60 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
