"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Building2,
  Briefcase,
  TrendingUp,
  FileText,
  Activity,
  Shield,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditLogs, type AuditLog } from "@/hooks/use-admin";
import { formatRelativeTime } from "@/lib/date-utils";
import { fmt } from "./shared";

// ────────────────────────────────────────────────────────
// Entity → icon mapping
// ────────────────────────────────────────────────────────

const entityIcons: Record<string, typeof Activity> = {
  CandidateProfile: Users,
  candidate: Users,
  EmployerOrg: Building2,
  employer: Building2,
  JobPost: Briefcase,
  job: Briefcase,
  PlacementRecord: TrendingUp,
  placement: TrendingUp,
  IntroRequest: FileText,
  intro: FileText,
  AdminUser: Shield,
  admin: Shield,
  Report: Download,
  report: Download,
};

const actionColors: Record<string, string> = {
  PROFILE_APPROVED: "var(--success)",
  PROFILE_REJECTED: "var(--error)",
  PROFILE_SUSPENDED: "var(--error)",
  PROFILE_CREATED: "var(--info)",
  PROFILE_UPDATED: "var(--info)",
  PROFILE_SUBMITTED: "var(--badge-purple-dot)",
  EMPLOYER_VERIFIED: "var(--success)",
  EMPLOYER_REJECTED: "var(--error)",
  EMPLOYER_REGISTERED: "var(--info)",
  JOB_PUBLISHED: "var(--success)",
  JOB_CLOSED: "var(--neutral-gray)",
  JOB_REJECTED: "var(--error)",
  JOB_CREATED: "var(--info)",
  INTRO_APPROVED: "var(--success)",
  INTRO_DECLINED: "var(--error)",
  INTRO_REQUESTED: "var(--badge-purple-dot)",
  PLACEMENT_CREATED: "var(--success)",
  PLACEMENT_UPDATED: "var(--warning)",
  ROLE_CHANGED: "#6366F1",
  REPORT_EXPORTED: "#06B6D4",
};

// ────────────────────────────────────────────────────────
// Animation variants
// ────────────────────────────────────────────────────────

const feedItemVariants = {
  initial: { opacity: 0, x: 20, height: 0 },
  animate: {
    opacity: 1,
    x: 0,
    height: "auto",
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    x: -20,
    height: 0,
    transition: { duration: 0.2 },
  },
};

// ────────────────────────────────────────────────────────
// Feed item
// ────────────────────────────────────────────────────────

function FeedItem({ log }: { log: AuditLog }) {
  const entityKey = log.entity?.toLowerCase() ?? "";
  const Icon = entityIcons[log.entity] || entityIcons[entityKey] || Activity;
  const dotColor = actionColors[log.action] || "var(--text-muted)";
  const actionText = fmt(log.action);
  const entityText = log.entity
    ? log.entity.replace(/([A-Z])/g, " $1").trim()
    : "";

  return (
    <motion.div
      variants={feedItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0"
    >
      {/* Icon with dot indicator */}
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center">
          <Icon size={14} className="text-[var(--text-secondary)]" />
        </div>
        <div
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface-1)]"
          style={{ backgroundColor: dotColor }}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--text-secondary)] leading-snug">
          <span className="font-semibold">{actionText}</span>
          {entityText && (
            <span className="text-[var(--text-secondary)]"> {entityText}</span>
          )}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
          {formatRelativeTime(log.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────
// Activity Feed
// ────────────────────────────────────────────────────────

export function ActivityFeed() {
  const { data: auditData, isLoading } = useAuditLogs(
    { limit: 15, sort: "createdAt", order: "desc" },
    { refetchInterval: 30000 },
  );

  const logs = auditData?.data ?? [];

  return (
    <motion.div
      className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
            <Activity size={18} className="text-[var(--primary)]" />
          </div>
          <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">Activity Feed</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-[var(--text-muted)] font-medium">Live</span>
        </div>
      </div>

      {/* Feed list */}
      <div className="overflow-y-auto max-h-[420px] scroll-smooth flex-1 -mx-1 px-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-full h-3 rounded bg-[var(--surface-2)] animate-pulse" />
                  <div className="w-16 h-3 rounded bg-[var(--surface-2)] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length > 0 ? (
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <FeedItem key={log.id} log={log} />
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Activity size={24} className="text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-muted)]">No recent activity</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
