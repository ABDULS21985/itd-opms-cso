"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  GitBranch,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useChanges, useChangeStats } from "@/hooks/use-itsm";
import type { Ticket } from "@/types";
import { CHANGE_CLASSIFICATIONS, CHANGE_STATUSES } from "@/types/itsm";

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

function humanize(value?: string) {
  return value ? value.replace(/_/g, " ") : "\u2014";
}

const CLASSIFICATION_META: Record<string, { icon: LucideIcon; accent: string; bg: string }> = {
  emergency: { icon: Zap, accent: "#DC2626", bg: "rgba(220, 38, 38, 0.10)" },
  standard:  { icon: CheckCircle2, accent: "#2563EB", bg: "rgba(37, 99, 235, 0.10)" },
  normal:    { icon: GitBranch, accent: "#7C3AED", bg: "rgba(124, 58, 237, 0.10)" },
};

const RISK_COLOR: Record<string, string> = {
  low: "#16A34A",
  medium: "#D97706",
  high: "#EA580C",
  critical: "#DC2626",
};

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl border border-white/[0.06] p-5"
      style={{ background: `linear-gradient(135deg, ${accent}08 0%, transparent 60%)` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-white/40">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChangesPage() {
  const [classification, setClassification] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: statsData, isLoading: statsLoading } = useChangeStats();
  const { data: changesData, isLoading } = useChanges({
    classification: classification || undefined,
    status: status || undefined,
    page,
    pageSize,
  });

  const stats = statsData;
  const changes = (changesData as unknown as { data: Ticket[]; meta?: { totalPages: number } })?.data ?? [];
  const totalPages = (changesData as unknown as { meta?: { totalPages: number } })?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Change Management</h1>
          <p className="text-sm text-white/50 mt-1">Emergency, Standard, and Normal changes</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/itsm/changes/calendar"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/70 hover:bg-white/5 transition-colors"
          >
            <Calendar size={16} />
            Calendar
          </Link>
          <Link
            href="/dashboard/itsm/changes/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #1B7340, #0E5A2D)" }}
          >
            <Plus size={16} />
            New Change
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <MetricCard title="Total" value={stats.total} icon={GitBranch} accent="#A8893D" />
          <MetricCard title="Emergency" value={stats.emergency} icon={Zap} accent="#DC2626" />
          <MetricCard title="Standard" value={stats.standard} icon={CheckCircle2} accent="#1B7340" />
          <MetricCard title="Normal" value={stats.normal} icon={GitBranch} accent="#A8893D" />
          <MetricCard title="Pending CAB" value={stats.pendingCab} icon={Shield} accent="#D97706" />
          <MetricCard title="Implementing" value={stats.implementing} icon={RefreshCw} accent="#1B7340" />
          <MetricCard title="Pending PIR" value={stats.pendingPir} icon={Clock} accent="#EA580C" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white"
          value={classification}
          onChange={(e) => { setClassification(e.target.value); setPage(1); }}
        >
          <option value="">All Classifications</option>
          {CHANGE_CLASSIFICATIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {CHANGE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 className="animate-spin mr-2" size={20} />
          Loading changes...
        </div>
      ) : changes.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <GitBranch size={48} className="mx-auto mb-4 opacity-30" />
          <p>No changes found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left p-4">Change #</th>
                <th className="text-left p-4">Title</th>
                <th className="text-left p-4">Classification</th>
                <th className="text-left p-4">Risk</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Scheduled</th>
                <th className="text-left p-4">Assignee</th>
                <th className="text-right p-4"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {changes.map((change: Ticket) => {
                  const clsMeta = CLASSIFICATION_META[change.changeClassification ?? ""] ?? CLASSIFICATION_META.normal;
                  const ClsIcon = clsMeta.icon;

                  return (
                    <motion.tr
                      key={change.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4 font-mono text-white/60">{change.ticketNumber}</td>
                      <td className="p-4 text-white font-medium max-w-[300px] truncate">{change.title}</td>
                      <td className="p-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                          style={{ backgroundColor: clsMeta.bg, color: clsMeta.accent }}
                        >
                          <ClsIcon size={12} />
                          {change.changeClassification}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className="text-xs font-medium capitalize"
                          style={{ color: RISK_COLOR[change.riskLevel ?? "medium"] }}
                        >
                          {change.riskLevel ?? "\u2014"}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={change.status} />
                      </td>
                      <td className="p-4 text-white/50">{formatDate(change.scheduledStart)}</td>
                      <td className="p-4 text-white/50">{change.assigneeName ?? "\u2014"}</td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/dashboard/itsm/changes/${change.id}`}
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
