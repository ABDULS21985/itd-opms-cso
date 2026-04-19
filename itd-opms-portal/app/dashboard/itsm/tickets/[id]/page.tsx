"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  UserPlus,
  ArrowRightCircle,
  MessageSquare,
  History,
  Shield,
  Loader2,
  Send,
  Lock,
  Globe,
  Pause,
  Link as LinkIcon,
  Tag,
  Users,
  Layers,
  Hash,
  Radio,
  Zap,
  Target,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  CircleDot,
  Timer,
  Gauge,
  TrendingUp,
  Megaphone,
  Inbox,
  Calendar,
  BarChart3,
  Star,
  BookOpen,
  Search,
  Trash2,
  ThumbsUp,
  ListTree,
  Plus,
  Unlink,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserPicker } from "@/components/shared/pickers";
import { useSearchUsers } from "@/hooks/use-system";
import { useAuth } from "@/hooks/use-auth";
import {
  useTicket,
  useTicketComments,
  useTicketStatusHistory,
  useSLABreaches,
  useAddComment,
  useTransitionTicket,
  useAssignTicket,
  useResolveTicket,
  useCloseTicket,
  useTicketKBLinks,
  useTicketKBSuggestions,
  useTicketKBSearch,
  useLinkArticle,
  useUnlinkArticle,
  useSubtasks,
  useCreateSubtask,
  useUnlinkSubtask,
} from "@/hooks/use-itsm";
import type {
  TicketComment,
  TicketStatusHistory,
  SLABreachEntry,
  SubtaskSummary,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITY_META: Record<
  string,
  { bg: string; text: string; label: string; gradient: string; ring: string }
> = {
  P1_critical: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#EF4444",
    label: "P1 - Critical",
    gradient: "from-red-500/20 via-red-500/5 to-transparent",
    ring: "ring-red-500/30",
  },
  P2_high: {
    bg: "rgba(249, 115, 22, 0.1)",
    text: "#F97316",
    label: "P2 - High",
    gradient: "from-orange-500/20 via-orange-500/5 to-transparent",
    ring: "ring-orange-500/30",
  },
  P3_medium: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#F59E0B",
    label: "P3 - Medium",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    ring: "ring-amber-500/30",
  },
  P4_low: {
    bg: "rgba(59, 130, 246, 0.1)",
    text: "#3B82F6",
    label: "P4 - Low",
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    ring: "ring-blue-500/30",
  },
};

const STATUS_TRANSITIONS: Record<
  string,
  { value: string; label: string; icon?: React.ElementType; variant?: string }[]
> = {
  logged: [
    { value: "classified", label: "Classify", icon: ArrowRightCircle },
    { value: "assigned", label: "Assign", icon: UserPlus },
    { value: "cancelled", label: "Cancel", icon: XCircle, variant: "danger" },
  ],
  classified: [
    { value: "assigned", label: "Assign", icon: UserPlus, variant: "primary" },
    { value: "cancelled", label: "Cancel", icon: XCircle, variant: "danger" },
  ],
  assigned: [
    { value: "in_progress", label: "Start Work", icon: Zap, variant: "primary" },
    { value: "cancelled", label: "Cancel", icon: XCircle, variant: "danger" },
  ],
  in_progress: [
    { value: "pending_customer", label: "Pending Customer", icon: Clock },
    { value: "pending_vendor", label: "Pending Vendor", icon: Clock },
    { value: "resolved", label: "Resolve", icon: CheckCircle, variant: "success" },
    { value: "cancelled", label: "Cancel", icon: XCircle, variant: "danger" },
  ],
  pending_customer: [
    { value: "in_progress", label: "Resume Work", icon: Zap, variant: "primary" },
    { value: "resolved", label: "Resolve", icon: CheckCircle, variant: "success" },
    { value: "cancelled", label: "Cancel", icon: XCircle, variant: "danger" },
  ],
  pending_vendor: [
    { value: "in_progress", label: "Resume Work", icon: Zap, variant: "primary" },
    { value: "resolved", label: "Resolve", icon: CheckCircle, variant: "success" },
    { value: "cancelled", label: "Cancel", icon: XCircle, variant: "danger" },
  ],
  resolved: [
    { value: "in_progress", label: "Reopen", icon: ArrowRightCircle },
    { value: "closed", label: "Close", icon: CheckCircle2, variant: "success" },
  ],
  closed: [],
  cancelled: [],
};

/** Ordered pipeline stages */
const STATUS_PIPELINE = [
  { key: "logged", label: "Logged", icon: CircleDot },
  { key: "classified", label: "Classified", icon: ArrowRightCircle },
  { key: "assigned", label: "Assigned", icon: UserPlus },
  { key: "in_progress", label: "In Progress", icon: Zap },
  { key: "resolved", label: "Resolved", icon: CheckCircle },
  { key: "closed", label: "Closed", icon: CheckCircle2 },
];

const TERMINAL_STATUSES = ["cancelled"];

/* ------------------------------------------------------------------ */
/*  Circular SLA Gauge Component                                       */
/* ------------------------------------------------------------------ */

export function SLAGauge({
  label,
  target,
  met,
  metAt,
  isPaused,
  createdAt,
  slaPausedDurationMinutes = 0,
}: {
  label: string;
  target?: string;
  met?: boolean;
  metAt?: string;
  isPaused: boolean;
  createdAt: string;
  slaPausedDurationMinutes?: number;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  // No SLA
  if (!target) {
    return (
      <div className="flex flex-col items-center gap-2 p-4">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg width="80" height="80" className="rotate-[-90deg]">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="var(--surface-3)"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Clock size={18} className="text-[var(--neutral-gray)]" />
          </div>
        </div>
        <p className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
          {label}
        </p>
        <p className="text-[11px] text-[var(--neutral-gray)]">No SLA policy</p>
      </div>
    );
  }

  // Paused
  if (isPaused) {
    return (
      <div className="flex flex-col items-center gap-2 p-4">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg width="80" height="80" className="rotate-[-90deg]">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="var(--surface-3)"
              strokeWidth="5"
              strokeDasharray={`${circumference * 0.5} ${circumference * 0.5}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Pause size={18} style={{ color: "#9CA3AF" }} />
          </div>
        </div>
        <p className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
          {label}
        </p>
        <p className="text-[11px] font-semibold" style={{ color: "#9CA3AF" }}>
          Paused
        </p>
      </div>
    );
  }

  // Met
  if (met === true) {
    return (
      <div className="flex flex-col items-center gap-2 p-4">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg width="80" height="80" className="rotate-[-90deg]">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="rgba(16, 185, 129, 0.15)"
              strokeWidth="5"
            />
            <motion.circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="#10B981"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle size={18} style={{ color: "#10B981" }} />
          </div>
        </div>
        <p className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
          {label}
        </p>
        <p className="text-[11px] font-bold" style={{ color: "#10B981" }}>
          Met
        </p>
        {metAt && (
          <p className="text-[10px] text-[var(--neutral-gray)]">
            {new Date(metAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  // Breached
  if (met === false) {
    return (
      <div className="flex flex-col items-center gap-2 p-4">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg width="80" height="80" className="rotate-[-90deg]">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="rgba(239, 68, 68, 0.15)"
              strokeWidth="5"
            />
            <motion.circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="#EF4444"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <XCircle size={18} style={{ color: "#EF4444" }} />
          </div>
        </div>
        <p className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
          {label}
        </p>
        <p className="text-[11px] font-bold" style={{ color: "#EF4444" }}>
          Breached
        </p>
      </div>
    );
  }

  // Active countdown — extend the deadline by however long the SLA was paused.
  const targetTime = new Date(target).getTime();
  const pausedMs = slaPausedDurationMinutes * 60 * 1000;
  const effectiveTarget = targetTime + pausedMs;
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const totalDuration = effectiveTarget - created;
  const remaining = effectiveTarget - now;
  const pct = totalDuration > 0 ? Math.min(((now - created) / totalDuration) * 100, 100) : 0;
  const dashOffset = circumference - (pct / 100) * circumference;

  let color = "#10B981";
  let statusLabel = "On Track";
  if (pct >= 100) {
    color = "#EF4444";
    statusLabel = "Overdue";
  } else if (pct >= 80) {
    color = "#F59E0B";
    statusLabel = "At Risk";
  }

  const remainingMinutes = Math.max(0, Math.floor(remaining / 60000));
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;
  const countdown = remaining > 0 ? `${hours}h ${mins}m` : "Overdue";

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg width="80" height="80" className="rotate-[-90deg]">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={`${color}20`}
            strokeWidth="5"
          />
          <motion.circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-sm font-bold tabular-nums leading-none"
            style={{ color }}
          >
            {countdown}
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
        {label}
      </p>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {statusLabel}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Pipeline Component                                          */
/* ------------------------------------------------------------------ */

function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const isCancelled = TERMINAL_STATUSES.includes(currentStatus);

  // Find current stage index
  const currentIdx = STATUS_PIPELINE.findIndex((s) => s.key === currentStatus);
  const activeIdx = currentIdx >= 0 ? currentIdx : STATUS_PIPELINE.length;

  return (
    <div className="flex items-center w-full gap-0">
      {STATUS_PIPELINE.map((stage, idx) => {
        const Icon = stage.icon;
        const isPast = idx < activeIdx;
        const isCurrent = idx === activeIdx;
        const isFuture = idx > activeIdx;

        let dotColor = "var(--surface-3)";
        let dotBg = "var(--surface-1)";
        let textColor = "var(--neutral-gray)";

        if (isCancelled) {
          dotColor = "var(--surface-3)";
          dotBg = "var(--surface-1)";
          textColor = "var(--neutral-gray)";
        } else if (isPast) {
          dotColor = "#10B981";
          dotBg = "rgba(16, 185, 129, 0.1)";
          textColor = "#10B981";
        } else if (isCurrent) {
          dotColor = "var(--primary)";
          dotBg = "rgba(27, 115, 64, 0.1)";
          textColor = "var(--primary)";
        }

        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <motion.div
                className="relative flex h-8 w-8 items-center justify-center rounded-full shrink-0"
                style={{ backgroundColor: dotBg }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.08, duration: 0.3 }}
              >
                {isPast && !isCancelled ? (
                  <CheckCircle size={16} style={{ color: dotColor }} />
                ) : (
                  <Icon size={16} style={{ color: dotColor }} />
                )}
                {isCurrent && !isCancelled && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: `2px solid ${dotColor}` }}
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                style={{ color: textColor }}
              >
                {stage.label}
              </span>
            </div>
            {idx < STATUS_PIPELINE.length - 1 && (
              <div className="flex-1 mx-1 relative" style={{ minWidth: 16 }}>
                <div
                  className="h-[2px] w-full rounded-full"
                  style={{
                    backgroundColor:
                      isPast && !isCancelled ? "#10B981" : "var(--surface-3)",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Cancelled indicator */}
      {isCancelled && (
        <div className="flex items-center ml-3">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
            >
              <XCircle size={16} style={{ color: "#EF4444" }} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#EF4444]">
              Cancelled
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail Card Component                                              */
/* ------------------------------------------------------------------ */

function DetailCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: accent
            ? `radial-gradient(circle at 100% 0%, ${accent}16, transparent 32%)`
            : "radial-gradient(circle at 100% 0%, rgba(148,163,184,0.08), transparent 32%)",
        }}
      />
      <div className="relative flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent ? `${accent}15` : "var(--surface-2)" }}
        >
          <Icon
            size={15}
            style={{ color: accent || "var(--neutral-gray)" }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
            {label}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-[var(--text-primary)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  helper,
  accent,
  inverted = false,
  className = "",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  helper: string;
  accent: string;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.55rem] p-4 ${className}`}
      style={{
        border: inverted ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(148,163,184,0.18)",
        background: inverted
          ? "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.08))"
          : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
        boxShadow: inverted
          ? "0 16px 36px rgba(2, 6, 23, 0.12)"
          : "0 18px 40px rgba(15, 23, 42, 0.06)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: `radial-gradient(circle at 100% 0%, ${accent}${inverted ? "26" : "18"}, transparent 34%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: inverted ? `${accent}22` : `${accent}16`,
              border: inverted ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.6)",
            }}
          >
            <Icon
              size={18}
              style={{ color: inverted ? "#fff" : accent }}
            />
          </div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              inverted ? "text-white/58" : "text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </p>
        </div>
        <p
          className={`mt-5 text-lg font-semibold leading-6 ${
            inverted ? "text-white" : "text-[var(--text-primary)]"
          }`}
        >
          {value}
        </p>
        <p
          className={`mt-2 text-sm leading-6 ${
            inverted ? "text-slate-100/72" : "text-[var(--text-secondary)]"
          }`}
        >
          {helper}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline Entry Component                                           */
/* ------------------------------------------------------------------ */

type TimelineItem =
  | {
      kind: "created";
      data: { id: string; actorId: string; createdAt: string };
      timestamp: string;
    }
  | { kind: "comment"; data: TicketComment; timestamp: string }
  | { kind: "status"; data: TicketStatusHistory; timestamp: string };

function TimelineEntry({ item, index, resolveUser, resolveUserInfo }: { item: TimelineItem; index: number; resolveUser: (id: string | undefined | null) => string; resolveUserInfo: (id: string | undefined | null) => { name: string; department?: string; jobTitle?: string } | null }) {
  if (item.kind === "created") {
    const created = item.data;
    return (
      <motion.div
        className="flex gap-3 py-3 group"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
      >
        <div className="relative flex flex-col items-center">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <CircleDot size={15} className="text-[var(--primary)]" />
          </div>
          <div className="flex-1 w-[2px] bg-[var(--surface-3)] mt-1 opacity-0 group-last:hidden group-[:not(:last-child)]:opacity-100" />
        </div>
        <div className="flex-1 pb-2">
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {resolveUser(created.actorId)}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">created this ticket</span>
          </div>
          {(() => {
            const info = resolveUserInfo(created.actorId);
            if (!info) return null;
            const parts = [info.jobTitle, info.department].filter(Boolean);
            if (parts.length === 0) return null;
            return (
              <p className="mt-0.5 text-[10px] text-[var(--neutral-gray)]">
                {parts.join(" · ")}
              </p>
            );
          })()}
          <p className="mt-1.5 text-[10px] text-[var(--neutral-gray)] tabular-nums">
            {new Date(created.createdAt).toLocaleString()}
          </p>
        </div>
      </motion.div>
    );
  }

  if (item.kind === "status") {
    const h = item.data;
    return (
      <motion.div
        className="flex gap-3 py-3 group"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
      >
        <div className="relative flex flex-col items-center">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
          >
            <ArrowRightCircle size={15} style={{ color: "#8B5CF6" }} />
          </div>
          <div className="flex-1 w-[2px] bg-[var(--surface-3)] mt-1 opacity-0 group-last:hidden group-[:not(:last-child)]:opacity-100" />
        </div>
        <div className="flex-1 pb-2">
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {resolveUser(h.changedBy)}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">changed status</span>
            <StatusBadge status={h.fromStatus} dot={false} />
            <span className="text-xs text-[var(--neutral-gray)]">&rarr;</span>
            <StatusBadge status={h.toStatus} dot={false} />
          </div>
          {(() => {
            const info = resolveUserInfo(h.changedBy);
            if (!info) return null;
            const parts = [info.jobTitle, info.department].filter(Boolean);
            if (parts.length === 0) return null;
            return (
              <p className="mt-0.5 text-[10px] text-[var(--neutral-gray)]">
                {parts.join(" · ")}
              </p>
            );
          })()}
          {h.reason && (
            <p className="mt-1.5 text-xs text-[var(--neutral-gray)] italic bg-[var(--surface-1)] rounded-lg px-2.5 py-1.5 border-l-2 border-purple-300">
              {h.reason}
            </p>
          )}
          <p className="mt-1.5 text-[10px] text-[var(--neutral-gray)] tabular-nums">
            {new Date(h.createdAt).toLocaleString()}
          </p>
        </div>
      </motion.div>
    );
  }

  // Comment
  const c = item.data;
  const isInternal = c.isInternal;
  return (
    <motion.div
      className="flex gap-3 py-3 group"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <div className="relative flex flex-col items-center">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: isInternal
              ? "rgba(245, 158, 11, 0.1)"
              : "rgba(59, 130, 246, 0.1)",
          }}
        >
          <MessageSquare
            size={15}
            style={{ color: isInternal ? "#F59E0B" : "#3B82F6" }}
          />
        </div>
        <div className="flex-1 w-[2px] bg-[var(--surface-3)] mt-1 opacity-0 group-last:hidden group-[:not(:last-child)]:opacity-100" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {resolveUser(c.authorId)}
            </span>
            {(() => {
              const info = resolveUserInfo(c.authorId);
              if (!info) return null;
              const parts = [info.jobTitle, info.department].filter(Boolean);
              if (parts.length === 0) return null;
              return (
                <p className="text-[10px] text-[var(--neutral-gray)]">
                  {parts.join(" · ")}
                </p>
              );
            })()}
          </div>
          {isInternal && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                color: "#F59E0B",
              }}
            >
              <Lock size={8} />
              Internal
            </span>
          )}
          <span className="text-[10px] text-[var(--neutral-gray)] tabular-nums ml-auto">
            {new Date(c.createdAt).toLocaleString()}
          </span>
        </div>
        <div
          className="rounded-xl p-3 text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap"
          style={{
            backgroundColor: isInternal
              ? "rgba(245, 158, 11, 0.04)"
              : "var(--surface-1)",
            borderLeft: `3px solid ${isInternal ? "#F59E0B" : "var(--primary)"}`,
          }}
        >
          {c.content}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Elapsed Time Helper                                                */
/* ------------------------------------------------------------------ */

function getAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getSlaSignal({
  target,
  met,
  isPaused,
  slaPausedDurationMinutes = 0,
}: {
  target?: string;
  met?: boolean;
  isPaused: boolean;
  slaPausedDurationMinutes?: number;
}) {
  if (!target) {
    return { label: "No SLA", helper: "No policy attached yet.", color: "#94A3B8" };
  }

  if (isPaused) {
    return { label: "Paused", helper: "Clock is temporarily paused.", color: "#94A3B8" };
  }

  if (met === true) {
    return { label: "Met", helper: "Target achieved within SLA.", color: "#10B981" };
  }

  if (met === false) {
    return { label: "Breached", helper: "Target exceeded.", color: "#EF4444" };
  }

  const remainingMs =
    new Date(target).getTime() +
    slaPausedDurationMinutes * 60 * 1000 -
    Date.now();

  if (remainingMs <= 0) {
    return { label: "Overdue", helper: "Action window has elapsed.", color: "#EF4444" };
  }

  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingDays = Math.floor(remainingHours / 24);

  if (remainingHours <= 2) {
    return {
      label: "Critical",
      helper: remainingHours > 0 ? `${remainingHours}h remaining.` : "Less than 1h remaining.",
      color: "#EF4444",
    };
  }

  if (remainingHours <= 8) {
    return {
      label: "At Risk",
      helper: `${Math.max(remainingHours, 1)}h remaining.`,
      color: "#F59E0B",
    };
  }

  return {
    label: "On Track",
    helper: remainingDays > 0 ? `${remainingDays}d remaining.` : `${remainingHours}h remaining.`,
    color: "#10B981",
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { user: currentUser } = useAuth();
  const hasManagePermission =
    currentUser?.permissions?.includes("*") ||
    currentUser?.permissions?.includes("itsm.manage") ||
    false;

  const { data: ticket, isLoading } = useTicket(id);
  const { data: commentsData } = useTicketComments(id);
  const { data: historyData } = useTicketStatusHistory(id);
  const { data: breachesData } = useSLABreaches(id);
  const canManage =
    hasManagePermission &&
    (!!currentUser?.permissions?.includes("*") ||
      currentUser?.roles?.includes("admin") ||
      currentUser?.roles?.includes("tenant_admin") ||
      ticket?.reporterId === currentUser?.id ||
      ticket?.assigneeId === currentUser?.id ||
      !ticket?.assigneeId);

  const addComment = useAddComment(id);
  const transitionTicket = useTransitionTicket();
  const assignTicket = useAssignTicket();
  const resolveTicket = useResolveTicket();
  const closeTicket = useCloseTicket();

  /* ---- KB link hooks ---- */
  const { data: kbLinks = [] } = useTicketKBLinks(id);
  const { data: kbSuggestions = [] } = useTicketKBSuggestions(id);
  const linkArticle = useLinkArticle(id);
  const unlinkArticle = useUnlinkArticle(id);

  /* ---- Subtask hooks ---- */
  const { data: subtasksData } = useSubtasks(id);
  const createSubtask = useCreateSubtask(id);
  const unlinkSubtask = useUnlinkSubtask(id);

  /* ---- User name resolution ---- */
  const { data: allUsers } = useSearchUsers("");
  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; department?: string; jobTitle?: string }>();
    if (allUsers) {
      for (const u of allUsers) {
        map.set(u.id, { name: u.displayName, department: u.department, jobTitle: u.jobTitle });
      }
    }
    if (currentUser?.id) {
      map.set(currentUser.id, {
        name: currentUser.displayName,
        department: currentUser.department,
        jobTitle: currentUser.jobTitle,
      });
    }
    return map;
  }, [allUsers, currentUser]);
  const resolveUser = (userId: string | undefined | null) =>
    userId ? userMap.get(userId)?.name ?? userId.slice(0, 12) + "..." : "—";
  const resolveUserInfo = (userId: string | undefined | null) =>
    userId ? userMap.get(userId) ?? null : null;
  const formatActorMeta = (
    userId: string | undefined | null,
    fallbackDepartment?: string,
  ) => {
    const info = resolveUserInfo(userId);
    const parts = [info?.jobTitle, info?.department || fallbackDepartment].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  /* ---- Local state ---- */
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "sla" | "knowledge" | "subtasks">(
    "details",
  );
  const [commentText, setCommentText] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState("");
  const [assigneeDisplay, setAssigneeDisplay] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    info: true,
    links: true,
    tags: true,
  });
  const [kbSearchQuery, setKbSearchQuery] = useState("");
  const { data: kbSearchResults = [] } = useTicketKBSearch(id, kbSearchQuery);
  const [showCreateSubtask, setShowCreateSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState("medium");
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState("");
  const [subtaskAssigneeDisplay, setSubtaskAssigneeDisplay] = useState("");

  /* ---- Derived data ---- */
  const comments: TicketComment[] = commentsData ?? [];
  const statusHistory: TicketStatusHistory[] = historyData ?? [];
  const breaches: SLABreachEntry[] = breachesData ?? [];

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!ticket) return [];

    const items: TimelineItem[] = [
      {
        kind: "created",
        data: {
          id: `${ticket.id}-created`,
          actorId: ticket.reporterId,
          createdAt: ticket.createdAt,
        },
        timestamp: ticket.createdAt,
      },
      ...comments.map(
        (c): TimelineItem => ({
          kind: "comment",
          data: c,
          timestamp: c.createdAt,
        }),
      ),
      ...statusHistory.map(
        (h): TimelineItem => ({
          kind: "status",
          data: h,
          timestamp: h.createdAt,
        }),
      ),
    ];
    items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return items;
  }, [comments, statusHistory, ticket]);

  const latestTimelineItem = timeline[0];
  const latestComment = useMemo(
    () =>
      [...comments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0],
    [comments],
  );
  const resolvedEvent = useMemo(
    () =>
      [...statusHistory]
        .reverse()
        .find((entry) => entry.toStatus === "resolved"),
    [statusHistory],
  );
  const closedEvent = useMemo(
    () =>
      [...statusHistory]
        .reverse()
        .find((entry) => entry.toStatus === "closed"),
    [statusHistory],
  );

  const getTimelineActorId = (item: TimelineItem | undefined) => {
    if (!item) return undefined;
    if (item.kind === "created") return item.data.actorId;
    if (item.kind === "comment") return item.data.authorId;
    return item.data.changedBy;
  };

  const isActing =
    transitionTicket.isPending ||
    assignTicket.isPending ||
    resolveTicket.isPending ||
    closeTicket.isPending;

  /* ---- Copy ticket ID ---- */
  function copyTicketNumber() {
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.ticketNumber);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-[var(--surface-3)]" />
            <motion.div
              className="absolute inset-0 h-12 w-12 rounded-full border-2 border-transparent border-t-[var(--primary)]"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          </div>
          <p className="text-sm text-[var(--neutral-gray)]">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
        >
          <XCircle size={24} style={{ color: "#EF4444" }} />
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Ticket not found
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/itsm/tickets")}
          className="text-sm text-[var(--primary)] hover:underline"
        >
          Go back to tickets
        </button>
      </div>
    );
  }

  /* ---- Helpers ---- */

  const ownershipEntries: Array<{
    label: string;
    name: string;
    meta: string | null;
    timestamp?: string;
  }> = [
    {
      label: "Created by",
      name: ticket.reporterName || resolveUser(ticket.reporterId),
      meta: formatActorMeta(ticket.reporterId, ticket.reporterDepartment),
      timestamp: ticket.createdAt,
    },
    {
      label: "Updated by",
      name:
        latestTimelineItem?.kind === "created"
          ? ticket.reporterName || resolveUser(ticket.reporterId)
          : resolveUser(getTimelineActorId(latestTimelineItem)),
      meta:
        latestTimelineItem?.kind === "created"
          ? formatActorMeta(ticket.reporterId, ticket.reporterDepartment)
          : formatActorMeta(getTimelineActorId(latestTimelineItem)),
      timestamp: latestTimelineItem?.timestamp || ticket.updatedAt,
    },
  ];

  if (resolvedEvent || ticket.resolvedAt) {
    ownershipEntries.push({
      label: "Resolved by",
      name:
        resolvedEvent
          ? resolveUser(resolvedEvent.changedBy)
          : ticket.assigneeName || (ticket.assigneeId ? resolveUser(ticket.assigneeId) : "—"),
      meta:
        resolvedEvent
          ? formatActorMeta(resolvedEvent.changedBy)
          : formatActorMeta(ticket.assigneeId, ticket.assigneeDepartment),
      timestamp: resolvedEvent?.createdAt || ticket.resolvedAt,
    });
  }

  if (closedEvent || ticket.closedAt) {
    ownershipEntries.push({
      label: "Closed by",
      name:
        closedEvent
          ? resolveUser(closedEvent.changedBy)
          : ticket.assigneeName || (ticket.assigneeId ? resolveUser(ticket.assigneeId) : "—"),
      meta:
        closedEvent
          ? formatActorMeta(closedEvent.changedBy)
          : formatActorMeta(ticket.assigneeId, ticket.assigneeDepartment),
      timestamp: closedEvent?.createdAt || ticket.closedAt,
    });
  }

  if (latestComment) {
    ownershipEntries.push({
      label: latestComment.isInternal ? "Last internal note" : "Last comment by",
      name: resolveUser(latestComment.authorId),
      meta: formatActorMeta(latestComment.authorId),
      timestamp: latestComment.createdAt,
    });
  }

  const cardSurface =
    "rounded-[1.7rem] border border-slate-200/70 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";
  const softSurface =
    "rounded-[1.35rem] border border-slate-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] shadow-[0_12px_30px_rgba(15,23,42,0.05)]";
  const heroSecondaryButtonClass =
    "inline-flex items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-white/78 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md disabled:opacity-50";
  const heroPrimaryButtonClass =
    "inline-flex items-center gap-1.5 rounded-2xl bg-[#1B7340] px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow-md disabled:opacity-50";
  const heroSuccessButtonClass =
    "inline-flex items-center gap-1.5 rounded-2xl bg-[#10B981] px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow-md disabled:opacity-50";
  const heroDangerButtonClass =
    "inline-flex items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50/92 px-4 py-3 text-sm font-semibold text-red-700 transition-all hover:-translate-y-0.5 hover:bg-red-100 disabled:opacity-50";
  const heroSummary =
    ticket.description.length > 230
      ? `${ticket.description.slice(0, 227)}...`
      : ticket.description;
  const linkedContextCount =
    (ticket.linkedProblemId ? 1 : 0) +
    ticket.linkedAssetIds.length +
    ticket.relatedTicketIds.length;
  const internalCommentCount = comments.filter((comment) => comment.isInternal).length;
  const publicCommentCount = comments.length - internalCommentCount;
  const responseSignal = getSlaSignal({
    target: ticket.slaResponseTarget,
    met: ticket.slaResponseMet,
    isPaused: !!ticket.slaPausedAt,
    slaPausedDurationMinutes: ticket.slaPausedDurationMinutes,
  });
  const resolutionSignal = getSlaSignal({
    target: ticket.slaResolutionTarget,
    met: ticket.slaResolutionMet,
    isPaused: !!ticket.slaPausedAt,
    slaPausedDurationMinutes: ticket.slaPausedDurationMinutes,
  });
  const currentOwnerName =
    ticket.assigneeName ||
    (ticket.assigneeId ? resolveUser(ticket.assigneeId) : "Unassigned");
  const currentOwnerMeta = formatActorMeta(
    ticket.assigneeId,
    ticket.assigneeDepartment,
  );
  const latestActivityActor =
    latestTimelineItem?.kind === "created"
      ? ticket.reporterName || resolveUser(ticket.reporterId)
      : resolveUser(getTimelineActorId(latestTimelineItem));
  const latestActivityMeta =
    latestTimelineItem?.kind === "created"
      ? formatActorMeta(ticket.reporterId, ticket.reporterDepartment)
      : formatActorMeta(getTimelineActorId(latestTimelineItem));
  const heroMetaItems = [
    {
      icon: Layers,
      label: ticket.type.replace(/_/g, " "),
    },
    {
      icon: Megaphone,
      label: ticket.channel,
    },
    {
      icon: Calendar,
      label: getAge(ticket.createdAt),
    },
    ticket.category
      ? {
          icon: Inbox,
          label: `${ticket.category}${ticket.subcategory ? ` / ${ticket.subcategory}` : ""}`,
        }
      : null,
  ].filter(Boolean) as Array<{ icon: React.ElementType; label: string }>;

  const priorityInfo = PRIORITY_META[ticket.priority] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
    label: ticket.priority,
    gradient: "from-gray-500/10 to-transparent",
    ring: "ring-gray-500/30",
  };

  const transitions = STATUS_TRANSITIONS[ticket.status] ?? [];

  function handleTransition(newStatus: string) {
    if (newStatus === "resolved") {
      setShowResolveForm(true);
      return;
    }
    if (newStatus === "closed") {
      closeTicket.mutate(id);
      return;
    }
    transitionTicket.mutate({
      id,
      status: newStatus,
      reason: transitionReason || undefined,
    });
    setTransitionReason("");
  }

  function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assigneeInput.trim()) return;
    assignTicket.mutate(
      { id, assigneeId: assigneeInput.trim() },
      {
        onSuccess: () => {
          setShowAssignForm(false);
          setAssigneeInput("");
          setAssigneeDisplay("");
        },
      },
    );
  }

  function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;
    resolveTicket.mutate(
      { id, resolutionNotes: resolutionNotes.trim() },
      {
        onSuccess: () => {
          setShowResolveForm(false);
          setResolutionNotes("");
        },
      },
    );
  }

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate(
      {
        content: commentText.trim(),
        isInternal: isInternalComment,
      },
      { onSuccess: () => setCommentText("") },
    );
  }

  function handleDeclareMajor() {
    router.push(`/dashboard/itsm/major-incidents?declare=1&ticketId=${id}`);
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  /* ---- Tab defs ---- */

  const subtasks: SubtaskSummary[] = subtasksData?.subtasks ?? [];
  const subtaskProgress = subtasksData?.progress ?? { total: 0, completed: 0, cancelled: 0 };

  function handleCreateSubtask() {
    if (!subtaskTitle.trim() || !subtaskDescription.trim()) return;
    createSubtask.mutate(
      {
        title: subtaskTitle.trim(),
        description: subtaskDescription.trim(),
        priority: subtaskPriority,
        assigneeId: subtaskAssigneeId || undefined,
      },
      {
        onSuccess: () => {
          setShowCreateSubtask(false);
          setSubtaskTitle("");
          setSubtaskDescription("");
          setSubtaskPriority("medium");
          setSubtaskAssigneeId("");
          setSubtaskAssigneeDisplay("");
        },
      },
    );
  }

  const TABS = [
    { key: "details" as const, label: "Details", icon: Tag },
    { key: "timeline" as const, label: "Activity", icon: History, count: timeline.length },
    { key: "sla" as const, label: "SLA", icon: Shield },
    { key: "subtasks" as const, label: "Subtasks", icon: ListTree, count: subtaskProgress.total },
    { key: "knowledge" as const, label: "Knowledge", icon: BookOpen, count: kbLinks.length },
  ];

  return (
    <div className="relative mx-auto max-w-[96rem] space-y-6 pb-10">
      <div className="pointer-events-none absolute inset-x-10 top-4 h-72 rounded-full bg-[radial-gradient(circle,_rgba(27,115,64,0.16),_transparent_64%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-56 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(37,99,235,0.14),_transparent_68%)] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[2.2rem] border p-6 shadow-[0_32px_90px_-58px_rgba(27,115,64,0.24)] sm:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(27, 115, 64, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(27,115,64,0.16), transparent 32%), radial-gradient(circle at 88% 16%, rgba(37,99,235,0.12), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(27,115,64,0.08),_transparent_24%),radial-gradient(circle_at_16%_18%,_rgba(37,99,235,0.08),_transparent_24%)]" />
        <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(37,99,235,0.12),_transparent_68%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(27,115,64,0.12),_transparent_68%)]" />

        <div className="relative grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="max-w-3xl">
            <button
              type="button"
              onClick={() => router.push("/dashboard/itsm/tickets")}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/78 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white"
            >
              <ArrowLeft size={13} />
              All tickets
            </button>

            <div className="mt-6 flex items-start gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-[1.35rem] border shadow-lg shadow-[rgba(27,115,64,0.12)] ring-1 ${priorityInfo.ring}`}
                style={{
                  borderColor: "rgba(27, 115, 64, 0.14)",
                  backgroundColor: "rgba(255, 255, 255, 0.82)",
                }}
              >
                <Radio className="h-7 w-7 text-[#1B7340]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={copyTicketNumber}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/78 px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)] transition-colors hover:bg-white hover:text-[var(--text-primary)]"
                    title="Copy ticket number"
                  >
                    <Hash size={12} />
                    {ticket.ticketNumber}
                    {copiedId ? (
                      <CheckCircle size={12} className="text-emerald-300" />
                    ) : (
                      <Copy size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold"
                    style={{
                      backgroundColor: priorityInfo.bg,
                      color: priorityInfo.text,
                    }}
                  >
                    {priorityInfo.label}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/78 px-3 py-1 text-[11px] font-semibold capitalize text-[var(--text-primary)]">
                    {ticket.status.replace(/_/g, " ")}
                  </span>
                  {ticket.isMajorIncident && (
                    <motion.span
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase text-red-700"
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <AlertTriangle size={11} />
                      Major Incident
                    </motion.span>
                  )}
                  {ticket.majorIncidentStatus && (
                    <StatusBadge
                      status={ticket.majorIncidentStatus}
                      className="border-[var(--border)] bg-white/78 text-[var(--text-primary)]"
                      dot={false}
                    >
                      MI: {ticket.majorIncidentStatus.replace(/_/g, " ")}
                    </StatusBadge>
                  )}
                  {(ticket.subtaskCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/78 px-3 py-1 text-[11px] font-semibold text-[var(--text-primary)]">
                      <ListTree size={11} />
                      {ticket.subtaskCount} subtask{ticket.subtaskCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {ticket.parentTicketNumber && (
                    <Link
                      href={`/dashboard/itsm/tickets/${ticket.parentTicketId}`}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      <ListTree size={11} />
                      Subtask of {ticket.parentTicketNumber}
                    </Link>
                  )}
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-[-0.045em] text-[var(--text-primary)] sm:text-[2.7rem]">
                  {ticket.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  {heroSummary}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {heroMetaItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={`${item.label}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/78 px-3.5 py-2 text-xs font-medium tracking-[0.08em] text-[var(--text-secondary)]"
                  >
                    <Icon size={13} className="text-[#1B7340]" />
                    {item.label}
                  </div>
                );
              })}
            </div>

            {ticket.isMajorIncident && ticket.majorIncidentRecordId && (
              <Link
                href={`/dashboard/itsm/major-incidents/${ticket.majorIncidentRecordId}`}
                className="mt-6 flex items-center justify-between gap-3 rounded-[24px] border border-red-200 bg-red-50/92 px-5 py-4 text-sm text-red-900 transition-colors hover:bg-red-100"
              >
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600">
                    Major Incident Workflow
                  </p>
                  <p className="font-semibold text-red-950">
                    Linked major incident is {ticket.majorIncidentStatus?.replace(/_/g, " ") ?? "active"}.
                  </p>
                  <p className="text-xs text-red-700/90">
                    Open the workflow workspace for stakeholder updates, bridge coordination, and PIR tracking.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm">
                  Open workflow
                  <ExternalLink size={14} />
                </span>
              </Link>
            )}

            {canManage && (
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                {transitions.map((t) => {
                  const TIcon = t.icon;
                  let btnClass = heroSecondaryButtonClass;
                  if (t.variant === "primary") {
                    btnClass = heroPrimaryButtonClass;
                  }
                  if (t.variant === "success") {
                    btnClass = heroSuccessButtonClass;
                  }
                  if (t.variant === "danger") {
                    btnClass = heroDangerButtonClass;
                  }

                  return (
                    <button
                      key={t.value}
                      type="button"
                      disabled={isActing}
                      onClick={() => handleTransition(t.value)}
                      className={btnClass}
                    >
                      {TIcon && <TIcon size={16} />}
                      {t.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={isActing}
                  onClick={() => setShowAssignForm((f) => !f)}
                  className={heroSecondaryButtonClass}
                >
                  <UserPlus size={16} />
                  Assign
                </button>

                {!ticket.isMajorIncident &&
                  ticket.type === "incident" &&
                  ticket.status !== "closed" &&
                  ticket.status !== "cancelled" && (
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={handleDeclareMajor}
                      className={heroDangerButtonClass}
                    >
                      <AlertTriangle size={16} />
                      Declare Major
                    </button>
                  )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricTile
              icon={Timer}
              label="Response clock"
              value={responseSignal.label}
              helper={responseSignal.helper}
              accent={responseSignal.color}
            />
            <MetricTile
              icon={Gauge}
              label="Resolution clock"
              value={resolutionSignal.label}
              helper={resolutionSignal.helper}
              accent={resolutionSignal.color}
            />
            <MetricTile
              icon={Users}
              label="Current owner"
              value={currentOwnerName}
              helper={currentOwnerMeta || "No current assignee on this ticket."}
              accent="#60A5FA"
            />
            <MetricTile
              icon={TrendingUp}
              label="Latest activity"
              value={latestActivityActor}
              helper={latestActivityMeta || `${timeline.length} activity events recorded.`}
              accent="#34D399"
            />
          </div>
        </div>

        <div className={`relative mt-8 ${softSurface} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                Lifecycle progress
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Move from intake to closure with a single operational view of where the ticket sits right now.
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/78 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)]">
              {ticket.status.replace(/_/g, " ")}
            </div>
          </div>
          <div className="mt-6">
            <StatusPipeline currentStatus={ticket.status} />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <MetricTile
          icon={MessageSquare}
          label="Collaboration"
          value={`${publicCommentCount} public / ${internalCommentCount} internal`}
          helper={`${timeline.length} total activity events recorded on this ticket.`}
          accent="#3B82F6"
        />
        <MetricTile
          icon={LinkIcon}
          label="Linked context"
          value={`${linkedContextCount} connected records`}
          helper="Related tickets, linked assets, and problem records grouped into one view."
          accent="#8B5CF6"
        />
        <MetricTile
          icon={Clock}
          label="Ticket age"
          value={getAge(ticket.createdAt)}
          helper={`Opened ${new Date(ticket.createdAt).toLocaleString()}.`}
          accent="#F59E0B"
        />
        <MetricTile
          icon={Radio}
          label="Delivery channel"
          value={ticket.channel}
          helper={`${ticket.type.replace(/_/g, " ")} workflow with ${ticket.priority.replace("_", " ")} priority.`}
          accent="#10B981"
        />
      </motion.div>

      {/* ============================================================ */}
      {/*  Inline Forms (Assign / Resolve)                             */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showAssignForm && (
          <motion.form
            onSubmit={handleAssign}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className={`${cardSurface} flex items-end gap-3 overflow-hidden p-5`}
          >
            <div className="flex-1">
              <UserPicker
                label="Assign to User"
                value={assigneeInput || undefined}
                displayValue={assigneeDisplay}
                onChange={(id, name) => {
                  setAssigneeInput(id ?? "");
                  setAssigneeDisplay(name);
                }}
                placeholder="Search for a user..."
              />
            </div>
            <button
              type="submit"
              disabled={assignTicket.isPending}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {assignTicket.isPending && (
                <Loader2 size={12} className="animate-spin" />
              )}
              Assign
            </button>
            <button
              type="button"
              onClick={() => setShowAssignForm(false)}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResolveForm && (
          <motion.form
            onSubmit={handleResolve}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="space-y-3 overflow-hidden rounded-[1.7rem] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(255,255,255,0.96))] p-5 shadow-[0_18px_40px_rgba(16,185,129,0.08)]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={16} style={{ color: "#10B981" }} />
              <label className="text-sm font-semibold text-[var(--text-primary)]">
                Resolution Notes <span className="text-[var(--error)]">*</span>
              </label>
            </div>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe how the issue was resolved..."
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={resolveTicket.isPending || !resolutionNotes.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {resolveTicket.isPending && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                <CheckCircle size={14} />
                Resolve Ticket
              </button>
              <button
                type="button"
                onClick={() => setShowResolveForm(false)}
                className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/*  Two-Column Layout                                            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---- Main Column (2/3) ---- */}
        <div className="space-y-6 lg:col-span-2">
          {/* SLA Gauges */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`${cardSurface} overflow-hidden`}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <Timer size={15} className="text-[var(--primary)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  SLA Performance
                </h2>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Response and resolution posture side by side.
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
              <SLAGauge
                label="Response"
                target={ticket.slaResponseTarget}
                met={ticket.slaResponseMet}
                metAt={ticket.firstResponseAt}
                isPaused={!!ticket.slaPausedAt}
                createdAt={ticket.createdAt}
                slaPausedDurationMinutes={ticket.slaPausedDurationMinutes}
              />
              <SLAGauge
                label="Resolution"
                target={ticket.slaResolutionTarget}
                met={ticket.slaResolutionMet}
                metAt={ticket.resolvedAt}
                isPaused={!!ticket.slaPausedAt}
                createdAt={ticket.createdAt}
                slaPausedDurationMinutes={ticket.slaPausedDurationMinutes}
              />
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="flex gap-1 rounded-[1.4rem] border border-slate-200/70 bg-white/78 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[1rem] px-4 py-2.5 text-xs font-semibold transition-all"
                    style={{
                      color: isActive
                        ? "var(--primary)"
                        : "var(--neutral-gray)",
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.95)"
                        : "transparent",
                      boxShadow: isActive
                        ? "0 10px 22px rgba(15,23,42,0.07)"
                        : "none",
                    }}
                  >
                    <Icon size={14} />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                        style={{
                          backgroundColor: isActive
                            ? "var(--primary)"
                            : "var(--surface-3)",
                          color: isActive ? "#fff" : "var(--neutral-gray)",
                        }}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {/* =================== Details Tab =================== */}
              {activeTab === "details" && (
                <div className="space-y-4">
                  {/* Description */}
                  <div className={`${cardSurface} p-5`}>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <MessageSquare size={15} className="text-[var(--primary)]" />
                      Description
                    </h2>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  </div>

                  {/* Linked Items */}
                  {(ticket.linkedProblemId ||
                    ticket.linkedAssetIds.length > 0 ||
                    ticket.relatedTicketIds.length > 0) && (
                    <div className={`${cardSurface} overflow-hidden`}>
                      <button
                        type="button"
                        onClick={() => toggleSection("links")}
                        className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <LinkIcon size={15} className="text-[var(--primary)]" />
                          Linked Items
                          <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-bold text-[var(--neutral-gray)]">
                            {(ticket.linkedProblemId ? 1 : 0) +
                              ticket.linkedAssetIds.length +
                              ticket.relatedTicketIds.length}
                          </span>
                        </span>
                        {expandedSections.links ? (
                          <ChevronDown size={16} className="text-[var(--neutral-gray)]" />
                        ) : (
                          <ChevronRight size={16} className="text-[var(--neutral-gray)]" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedSections.links && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 space-y-2">
                              {ticket.linkedProblemId && (
                                <div className={`flex items-center gap-3 p-3 text-sm ${softSurface}`}>
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
                                    <LinkIcon size={13} style={{ color: "#8B5CF6" }} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase">
                                      Problem
                                    </p>
                                    <p className="font-mono text-xs text-[var(--primary)]">
                                      {ticket.linkedProblemId.slice(0, 12)}...
                                    </p>
                                  </div>
                                </div>
                              )}
                              {ticket.linkedAssetIds.length > 0 && (
                                <div className={`flex items-center gap-3 p-3 text-sm ${softSurface}`}>
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                                    <Layers size={13} style={{ color: "#3B82F6" }} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase">
                                      Assets
                                    </p>
                                    <p className="text-xs text-[var(--text-primary)]">
                                      {ticket.linkedAssetIds.length} linked
                                    </p>
                                  </div>
                                </div>
                              )}
                              {ticket.relatedTicketIds.length > 0 && (
                                <div className={`flex items-center gap-3 p-3 text-sm ${softSurface}`}>
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                                    <CircleDot size={13} style={{ color: "#10B981" }} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase">
                                      Related Tickets
                                    </p>
                                    <p className="text-xs text-[var(--text-primary)]">
                                      {ticket.relatedTicketIds.length} related
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Tags */}
                  {ticket.tags.length > 0 && (
                    <div className={`${cardSurface} p-5`}>
                      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                        <Tag size={15} className="text-[var(--primary)]" />
                        Tags
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {ticket.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)]/8 border border-[var(--primary)]/15 px-2.5 py-1 text-xs font-medium"
                            style={{ color: "var(--primary)" }}
                          >
                            <Hash size={10} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution */}
                  {ticket.resolutionNotes && (
                    <div
                      className="rounded-[1.7rem] border p-5 shadow-[0_18px_40px_rgba(16,185,129,0.08)]"
                      style={{
                        borderColor: "#10B98130",
                        background: "linear-gradient(180deg, rgba(236,253,245,0.78), rgba(255,255,255,0.96))",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                          <CheckCircle size={15} style={{ color: "#10B981" }} />
                        </div>
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                          Resolution
                        </h2>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                        {ticket.resolutionNotes}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--neutral-gray)]">
                        {ticket.resolvedAt && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            Resolved: {new Date(ticket.resolvedAt).toLocaleString()}
                          </span>
                        )}
                        {ticket.closedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            Closed: {new Date(ticket.closedAt).toLocaleString()}
                          </span>
                        )}
                        {ticket.satisfactionScore != null && (
                          <span className="flex items-center gap-1">
                            <Star size={11} style={{ color: "#F59E0B" }} />
                            CSAT:{" "}
                            <span className="font-semibold text-[var(--text-primary)]">
                              {ticket.satisfactionScore}/5
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================== Timeline Tab =================== */}
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  {/* Add comment form */}
                  <form
                    onSubmit={handleAddComment}
                    className={`${cardSurface} p-5`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]/70">
                          Ticket activity
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                          Send an update or leave an internal note
                        </h2>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                        <History size={12} />
                        {timeline.length} events
                      </div>
                    </div>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      className="mt-4 w-full rounded-[1.25rem] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.98))] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10 resize-none transition-all"
                    />
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setIsInternalComment((v) => !v)}
                        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: isInternalComment
                            ? "rgba(245, 158, 11, 0.1)"
                            : "var(--surface-1)",
                          color: isInternalComment
                            ? "#F59E0B"
                            : "var(--neutral-gray)",
                          border: `1px solid ${isInternalComment ? "rgba(245, 158, 11, 0.3)" : "var(--border)"}`,
                        }}
                      >
                        {isInternalComment ? (
                          <>
                            <Lock size={12} />
                            Internal Note
                          </>
                        ) : (
                          <>
                            <Globe size={12} />
                            Public Reply
                          </>
                        )}
                      </button>
                      <button
                        type="submit"
                        disabled={addComment.isPending || !commentText.trim()}
                        className="flex items-center gap-1.5 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40"
                      >
                        {addComment.isPending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                        Send
                      </button>
                    </div>
                  </form>

                  {/* Timeline items */}
                  {timeline.length === 0 ? (
                    <div className={`${cardSurface} p-10 text-center`}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)]">
                          <History
                            size={20}
                            className="text-[var(--neutral-gray)]"
                          />
                        </div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          No activity yet
                        </p>
                        <p className="text-xs text-[var(--neutral-gray)]">
                          Add a comment to get started
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className={`${cardSurface} p-5`}>
                      <div className="space-y-0">
                        {timeline.map((item, idx) => (
                          <TimelineEntry
                            key={`${item.kind}-${item.data.id}-${idx}`}
                            item={item}
                            index={idx}
                            resolveUser={resolveUser}
                            resolveUserInfo={resolveUserInfo}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================== SLA Tab =================== */}
              {activeTab === "sla" && (
                <div className="space-y-4">
                  {/* SLA Policy Info */}
                  <div className={`${cardSurface} p-5`}>
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <Shield size={15} className="text-[var(--primary)]" />
                      SLA Policy Details
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <DetailCard
                        icon={Target}
                        label="Response Target"
                        value={
                          ticket.slaResponseTarget
                            ? new Date(ticket.slaResponseTarget).toLocaleString()
                            : "Not set"
                        }
                        accent="#3B82F6"
                      />
                      <DetailCard
                        icon={Target}
                        label="Resolution Target"
                        value={
                          ticket.slaResolutionTarget
                            ? new Date(ticket.slaResolutionTarget).toLocaleString()
                            : "Not set"
                        }
                        accent="#8B5CF6"
                      />
                      <DetailCard
                        icon={
                          ticket.slaResponseMet === true
                            ? CheckCircle
                            : ticket.slaResponseMet === false
                              ? XCircle
                              : Clock
                        }
                        label="Response Met"
                        value={
                          ticket.slaResponseMet === true
                            ? "Yes"
                            : ticket.slaResponseMet === false
                              ? "No (Breached)"
                              : "Pending"
                        }
                        accent={
                          ticket.slaResponseMet === true
                            ? "#10B981"
                            : ticket.slaResponseMet === false
                              ? "#EF4444"
                              : undefined
                        }
                      />
                      <DetailCard
                        icon={
                          ticket.slaResolutionMet === true
                            ? CheckCircle
                            : ticket.slaResolutionMet === false
                              ? XCircle
                              : Clock
                        }
                        label="Resolution Met"
                        value={
                          ticket.slaResolutionMet === true
                            ? "Yes"
                            : ticket.slaResolutionMet === false
                              ? "No (Breached)"
                              : "Pending"
                        }
                        accent={
                          ticket.slaResolutionMet === true
                            ? "#10B981"
                            : ticket.slaResolutionMet === false
                              ? "#EF4444"
                              : undefined
                        }
                      />
                      <DetailCard
                        icon={Pause}
                        label="Paused Duration"
                        value={
                          ticket.slaPausedDurationMinutes > 0
                            ? `${ticket.slaPausedDurationMinutes} minutes`
                            : "None"
                        }
                      />
                      <DetailCard
                        icon={Zap}
                        label="First Response"
                        value={
                          ticket.firstResponseAt
                            ? new Date(ticket.firstResponseAt).toLocaleString()
                            : "Awaiting response"
                        }
                        accent={ticket.firstResponseAt ? "#10B981" : "#F59E0B"}
                      />
                    </div>
                  </div>

                  {/* SLA Breaches */}
                  <div className={`${cardSurface} p-5`}>
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <AlertTriangle size={15} className="text-red-500" />
                      Breach History
                    </h2>
                    {breaches.length === 0 ? (
                      <div className="flex items-center gap-3 rounded-xl bg-emerald-50/50 border border-emerald-200/50 p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                          <CheckCircle size={16} style={{ color: "#10B981" }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            No breaches
                          </p>
                          <p className="text-xs text-[var(--neutral-gray)]">
                            All SLA targets are on track
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {breaches.map((breach) => (
                          <div
                            key={breach.id}
                            className="flex items-center justify-between rounded-xl border p-3"
                            style={{
                              borderColor: "#EF444430",
                              backgroundColor: "rgba(239, 68, 68, 0.03)",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10">
                                <XCircle size={15} style={{ color: "#EF4444" }} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                                  {breach.breachType.replace(/_/g, " ")} Breach
                                </p>
                                <p className="text-xs text-[var(--neutral-gray)]">
                                  Target: {new Date(breach.targetWas).toLocaleString()}
                                  {breach.actualDurationMinutes != null &&
                                    ` | Actual: ${breach.actualDurationMinutes} min`}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-[var(--neutral-gray)] tabular-nums shrink-0 ml-2">
                              {new Date(breach.breachedAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =================== Subtasks Tab =================== */}
              {activeTab === "subtasks" && (
                <div className="space-y-4">
                  {/* Progress */}
                  {subtaskProgress.total > 0 && (
                    <div className={`${cardSurface} p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                          <TrendingUp size={15} className="text-[var(--primary)]" />
                          Progress
                        </h2>
                        <span className="text-xs font-bold text-[var(--text-secondary)] tabular-nums">
                          {subtaskProgress.completed}/{subtaskProgress.total} completed
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${subtaskProgress.total > 0 ? (subtaskProgress.completed / subtaskProgress.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      {subtaskProgress.cancelled > 0 && (
                        <p className="mt-1.5 text-[10px] text-[var(--neutral-gray)]">
                          {subtaskProgress.cancelled} cancelled
                        </p>
                      )}
                    </div>
                  )}

                  {/* Create Subtask */}
                  {canManage && !ticket.parentTicketId && (
                    <div className={`${cardSurface} p-5`}>
                      {!showCreateSubtask ? (
                        <button
                          type="button"
                          onClick={() => setShowCreateSubtask(true)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          <Plus size={15} />
                          Create Subtask
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                            <Plus size={15} className="text-[var(--primary)]" />
                            New Subtask
                          </h2>
                          <input
                            value={subtaskTitle}
                            onChange={(e) => setSubtaskTitle(e.target.value)}
                            placeholder="Subtask title..."
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                          />
                          <textarea
                            value={subtaskDescription}
                            onChange={(e) => setSubtaskDescription(e.target.value)}
                            placeholder="Subtask description..."
                            rows={3}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                                Priority
                              </label>
                              <select
                                value={subtaskPriority}
                                onChange={(e) => setSubtaskPriority(e.target.value)}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                              >
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                                Assignee
                              </label>
                              <UserPicker
                                value={subtaskAssigneeId || undefined}
                                displayValue={subtaskAssigneeDisplay}
                                onChange={(id, name) => {
                                  setSubtaskAssigneeId(id ?? "");
                                  setSubtaskAssigneeDisplay(name ?? "");
                                }}
                                placeholder="Search assignee..."
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!subtaskTitle.trim() || !subtaskDescription.trim() || createSubtask.isPending}
                              onClick={handleCreateSubtask}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              {createSubtask.isPending && <Loader2 size={14} className="animate-spin" />}
                              Create
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCreateSubtask(false);
                                setSubtaskTitle("");
                                setSubtaskDescription("");
                                setSubtaskPriority("medium");
                                setSubtaskAssigneeId("");
                                setSubtaskAssigneeDisplay("");
                              }}
                              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtask List */}
                  {subtasks.length > 0 ? (
                    <div className={`${cardSurface} overflow-hidden`}>
                      <div className="px-5 py-3.5 border-b border-[var(--border)]">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                          <ListTree size={15} className="text-[var(--primary)]" />
                          Subtasks
                          <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--surface-2)] px-1.5 text-[10px] font-bold text-[var(--neutral-gray)]">
                            {subtasks.length}
                          </span>
                        </h2>
                      </div>
                      <div className="divide-y divide-[var(--border)]">
                        {subtasks.map((st) => {
                          const stPriority = PRIORITY_META[st.priority] ?? PRIORITY_META.medium;
                          return (
                            <div
                              key={st.id}
                              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--surface-1)]"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/dashboard/itsm/tickets/${st.id}`}
                                    className="text-sm font-medium text-[var(--primary)] hover:underline truncate"
                                  >
                                    {st.ticketNumber}
                                  </Link>
                                  <StatusBadge status={st.status} />
                                  <span
                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                                    style={{
                                      backgroundColor: stPriority.bg,
                                      color: stPriority.text,
                                    }}
                                  >
                                    {stPriority.label}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-sm text-[var(--text-secondary)] truncate">
                                  {st.title}
                                </p>
                                <div className="mt-1 flex items-center gap-3 text-[10px] text-[var(--neutral-gray)]">
                                  {st.assigneeName && (
                                    <span className="flex items-center gap-1">
                                      <Users size={10} />
                                      {st.assigneeName}
                                    </span>
                                  )}
                                  <span className="tabular-nums">
                                    {new Date(st.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              {canManage && (
                                <button
                                  type="button"
                                  disabled={unlinkSubtask.isPending}
                                  onClick={() => unlinkSubtask.mutate(st.id)}
                                  className="shrink-0 inline-flex items-center justify-center rounded-lg border border-[var(--border)] p-2 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--error)]"
                                  title="Unlink subtask"
                                >
                                  <Unlink size={13} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className={`${cardSurface} p-8 text-center`}>
                      <ListTree size={32} className="mx-auto text-[var(--neutral-gray)] opacity-40" />
                      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
                        No subtasks yet
                      </p>
                      <p className="mt-1 text-xs text-[var(--neutral-gray)]">
                        Create subtasks to break this ticket into smaller work items.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* =================== Knowledge Base Tab =================== */}
              {activeTab === "knowledge" && (
                <div className="space-y-4">
                  {/* Search */}
                  <div className={`${cardSurface} p-5`}>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <Search size={15} className="text-[var(--primary)]" />
                      Search Knowledge Base
                    </h2>
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                      />
                      <input
                        value={kbSearchQuery}
                        onChange={(e) => setKbSearchQuery(e.target.value)}
                        placeholder="Search articles by keyword..."
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                    </div>

                    {/* Search Results */}
                    {kbSearchQuery.length >= 2 && kbSearchResults.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                          Search Results ({kbSearchResults.length})
                        </p>
                        {kbSearchResults.map((article) => {
                          const alreadyLinked = kbLinks.some((l) => l.articleId === article.id);
                          return (
                            <div
                              key={article.id}
                              className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 p-3 transition-colors ${
                                alreadyLinked ? "opacity-50" : "hover:bg-[var(--surface-1)]"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                  {article.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-semibold text-[var(--primary)] uppercase">
                                    {article.type}
                                  </span>
                                  {article.helpfulCount > 0 && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--neutral-gray)]">
                                      <ThumbsUp size={9} /> {article.helpfulCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!alreadyLinked && (
                                <button
                                  type="button"
                                  disabled={linkArticle.isPending}
                                  onClick={() =>
                                    linkArticle.mutate({
                                      articleId: article.id,
                                      linkType: "reference",
                                    })
                                  }
                                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                  <LinkIcon size={11} />
                                  Link
                                </button>
                              )}
                              {alreadyLinked && (
                                <span className="text-[10px] font-semibold text-emerald-600">
                                  Linked
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {kbSearchQuery.length >= 2 && kbSearchResults.length === 0 && (
                      <p className="mt-3 text-xs text-[var(--neutral-gray)]">
                        No articles found for &ldquo;{kbSearchQuery}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Linked Articles */}
                  <div className={`${cardSurface} p-5`}>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <BookOpen size={15} className="text-[var(--primary)]" />
                      Linked Articles
                      {kbLinks.length > 0 && (
                        <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white">
                          {kbLinks.length}
                        </span>
                      )}
                    </h2>
                    {kbLinks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
                        <BookOpen size={28} className="text-[var(--neutral-gray)] mb-2 opacity-40" />
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          No linked articles
                        </p>
                        <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                          Use the search above or suggested articles below to link relevant KB articles.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {kbLinks.map((link) => (
                          <div
                            key={link.id}
                            className={`flex items-center justify-between gap-3 p-3 ${softSurface}`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                  {link.articleTitle}
                                </p>
                                <span
                                  className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                                  style={{
                                    backgroundColor:
                                      link.linkType === "resolution"
                                        ? "rgba(16, 185, 129, 0.12)"
                                        : link.linkType === "workaround"
                                          ? "rgba(245, 158, 11, 0.12)"
                                          : "rgba(59, 130, 246, 0.12)",
                                    color:
                                      link.linkType === "resolution"
                                        ? "#059669"
                                        : link.linkType === "workaround"
                                          ? "#D97706"
                                          : "#2563EB",
                                  }}
                                >
                                  {link.linkType}
                                </span>
                              </div>
                              <p className="text-[10px] text-[var(--neutral-gray)] mt-0.5">
                                Linked by {link.linkedByName} &middot;{" "}
                                {new Date(link.createdAt).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {link.linkType !== "resolution" && canManage && (
                                <button
                                  type="button"
                                  disabled={linkArticle.isPending}
                                  onClick={() =>
                                    linkArticle.mutate({
                                      articleId: link.articleId,
                                      linkType: "resolution",
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                                  title="Mark as resolution article"
                                >
                                  <CheckCircle size={11} />
                                  Resolution
                                </button>
                              )}
                              {canManage && (
                                <button
                                  type="button"
                                  disabled={unlinkArticle.isPending}
                                  onClick={() => unlinkArticle.mutate(link.id)}
                                  className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] p-1.5 text-[var(--error)] transition-colors hover:bg-red-50"
                                  title="Unlink article"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suggested Articles */}
                  {kbSuggestions.length > 0 && (
                    <div className={`${cardSurface} p-5`}>
                      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                        <Zap size={15} className="text-amber-500" />
                        Suggested Articles
                        <span className="text-[10px] font-normal text-[var(--neutral-gray)]">
                          Based on ticket content
                        </span>
                      </h2>
                      <div className="space-y-2">
                        {kbSuggestions.map((article) => {
                          const alreadyLinked = kbLinks.some((l) => l.articleId === article.id);
                          return (
                            <div
                              key={article.id}
                              className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 p-3 transition-colors ${
                                alreadyLinked ? "opacity-50" : "hover:bg-[var(--surface-1)]"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                  {article.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-semibold text-[var(--primary)] uppercase">
                                    {article.type}
                                  </span>
                                  {article.helpfulCount > 0 && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--neutral-gray)]">
                                      <ThumbsUp size={9} /> {article.helpfulCount}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-[var(--neutral-gray)]">
                                    {article.viewCount} views
                                  </span>
                                </div>
                              </div>
                              {!alreadyLinked && canManage && (
                                <button
                                  type="button"
                                  disabled={linkArticle.isPending}
                                  onClick={() =>
                                    linkArticle.mutate({
                                      articleId: article.id,
                                      linkType: "reference",
                                    })
                                  }
                                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                  <LinkIcon size={11} />
                                  Link
                                </button>
                              )}
                              {alreadyLinked && (
                                <span className="text-[10px] font-semibold text-emerald-600">
                                  Linked
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---- Sidebar (1/3) ---- */}
        <motion.div
          className="space-y-4 self-start lg:sticky lg:top-6"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* People */}
          <div className={`${cardSurface} space-y-3 p-4`}>
            <h3 className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider flex items-center gap-1.5">
              <Users size={13} />
              People
            </h3>
            <div className="space-y-2.5">
              {/* Reporter */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-600 shrink-0">
                  {(ticket.reporterName || resolveUser(ticket.reporterId)).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                    Reporter
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {ticket.reporterName || resolveUser(ticket.reporterId)}
                  </p>
                  {formatActorMeta(ticket.reporterId, ticket.reporterDepartment) && (
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {formatActorMeta(ticket.reporterId, ticket.reporterDepartment)}
                    </p>
                  )}
                </div>
              </div>
              {/* Assignee */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shrink-0"
                  style={{
                    backgroundColor: ticket.assigneeId
                      ? "rgba(16, 185, 129, 0.1)"
                      : "var(--surface-2)",
                    color: ticket.assigneeId ? "#10B981" : "var(--neutral-gray)",
                  }}
                >
                  {ticket.assigneeName
                    ? ticket.assigneeName.charAt(0).toUpperCase()
                    : <UserPlus size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                    Assignee
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {ticket.assigneeName || (ticket.assigneeId ? resolveUser(ticket.assigneeId) : "Unassigned")}
                  </p>
                  {ticket.assigneeId && formatActorMeta(ticket.assigneeId, ticket.assigneeDepartment) && (
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {formatActorMeta(ticket.assigneeId, ticket.assigneeDepartment)}
                    </p>
                  )}
                </div>
              </div>
              {/* Team Queue */}
              {ticket.teamQueueId && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/10 shrink-0">
                    <Layers size={14} style={{ color: "#8B5CF6" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                      Team Queue
                    </p>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {ticket.teamQueueName || ticket.teamQueueId.slice(0, 12) + "..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`${cardSurface} space-y-3 p-4`}>
            <h3 className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider flex items-center gap-1.5">
              <History size={13} />
              Ownership Trail
            </h3>
            <div className="space-y-3">
              {ownershipEntries.map((entry) => (
                <div
                  key={`${entry.label}-${entry.timestamp ?? "na"}`}
                  className={`p-3 ${softSurface}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    {entry.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                    {entry.name}
                  </p>
                  {entry.meta && (
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      {entry.meta}
                    </p>
                  )}
                  {entry.timestamp && (
                    <p className="mt-1.5 text-[10px] tabular-nums text-[var(--neutral-gray)]">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <div className={`${cardSurface} space-y-3 p-4`}>
            <h3 className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 size={13} />
              Classification
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-[11px] text-[var(--neutral-gray)] font-medium">
                  Priority
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: priorityInfo.bg,
                    color: priorityInfo.text,
                  }}
                >
                  {priorityInfo.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-[11px] text-[var(--neutral-gray)] font-medium">
                  Urgency
                </span>
                <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                  {ticket.urgency}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-[11px] text-[var(--neutral-gray)] font-medium">
                  Impact
                </span>
                <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                  {ticket.impact}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-[11px] text-[var(--neutral-gray)] font-medium">
                  Type
                </span>
                <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                  {ticket.type.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-[11px] text-[var(--neutral-gray)] font-medium">
                  Channel
                </span>
                <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                  {ticket.channel}
                </span>
              </div>
              {ticket.category && (
                <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                  <span className="text-[11px] text-[var(--neutral-gray)] font-medium">
                    Category
                  </span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {ticket.category}
                  </span>
                </div>
              )}
              {ticket.subcategory && (
                <div className="flex items-center justify-between py-1.5 last:border-0">
                  <span className="text-[11px] text-[var(--neutral-gray)] font-medium">
                    Subcategory
                  </span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {ticket.subcategory}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className={`${cardSurface} space-y-3 p-4`}>
            <h3 className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} />
              Dates
            </h3>
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                  Created
                </p>
                <p className="text-xs font-medium text-[var(--text-primary)] tabular-nums mt-0.5">
                  {new Date(ticket.createdAt).toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  by {ticket.reporterName || resolveUser(ticket.reporterId)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                  Updated
                </p>
                <p className="text-xs font-medium text-[var(--text-primary)] tabular-nums mt-0.5">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </p>
                {(() => {
                  const lastChange = statusHistory.length > 0
                    ? statusHistory.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
                    : null;
                  if (!lastChange) return null;
                  return (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      by {resolveUser(lastChange.changedBy)}
                    </p>
                  );
                })()}
              </div>
              {ticket.firstResponseAt && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                    First Response
                  </p>
                  <p className="text-xs font-medium text-[var(--text-primary)] tabular-nums mt-0.5">
                    {new Date(ticket.firstResponseAt).toLocaleString()}
                  </p>
                </div>
              )}
              {ticket.resolvedAt && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                    Resolved
                  </p>
                  <p className="text-xs font-medium text-emerald-600 tabular-nums mt-0.5">
                    {new Date(ticket.resolvedAt).toLocaleString()}
                  </p>
                  {(() => {
                    const resolver = statusHistory.find(h => h.toStatus === "resolved");
                    if (!resolver) return null;
                    return (
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        by {resolveUser(resolver.changedBy)}
                      </p>
                    );
                  })()}
                </div>
              )}
              {ticket.closedAt && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                    Closed
                  </p>
                  <p className="text-xs font-medium text-[var(--text-primary)] tabular-nums mt-0.5">
                    {new Date(ticket.closedAt).toLocaleString()}
                  </p>
                  {(() => {
                    const closer = statusHistory.find(h => h.toStatus === "closed");
                    if (!closer) return null;
                    return (
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        by {resolveUser(closer.changedBy)}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* CSAT Score (if available) */}
          {ticket.satisfactionScore != null && (
            <div
              className="rounded-[1.7rem] border p-4 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              style={{
                borderColor:
                  ticket.satisfactionScore >= 4
                    ? "#10B98130"
                    : ticket.satisfactionScore >= 3
                      ? "#F59E0B30"
                      : "#EF444430",
                backgroundColor:
                  ticket.satisfactionScore >= 4
                    ? "rgba(16, 185, 129, 0.03)"
                    : ticket.satisfactionScore >= 3
                      ? "rgba(245, 158, 11, 0.03)"
                      : "rgba(239, 68, 68, 0.03)",
              }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < ticket.satisfactionScore! ? "#F59E0B" : "none"}
                    style={{
                      color: i < ticket.satisfactionScore! ? "#F59E0B" : "var(--surface-3)",
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mt-1">
                Customer Satisfaction
              </p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {ticket.satisfactionScore}/5
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
