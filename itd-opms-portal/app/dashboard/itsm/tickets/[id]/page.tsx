"use client";

import { use, useState, useMemo, useEffect, useRef } from "react";
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
  User,
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
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserPicker } from "@/components/shared/pickers";
import { useSearchUsers } from "@/hooks/use-system";
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
  useDeclareMajorIncident,
} from "@/hooks/use-itsm";
import type {
  TicketComment,
  TicketStatusHistory,
  SLABreachEntry,
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
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
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
        <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline Entry Component                                           */
/* ------------------------------------------------------------------ */

type TimelineItem =
  | { kind: "comment"; data: TicketComment; timestamp: string }
  | { kind: "status"; data: TicketStatusHistory; timestamp: string };

function TimelineEntry({ item, index, resolveUser }: { item: TimelineItem; index: number; resolveUser: (id: string | undefined | null) => string }) {
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
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {resolveUser(c.authorId)}
          </span>
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

  const { data: ticket, isLoading } = useTicket(id);
  const { data: commentsData } = useTicketComments(id);
  const { data: historyData } = useTicketStatusHistory(id);
  const { data: breachesData } = useSLABreaches(id);

  const addComment = useAddComment(id);
  const transitionTicket = useTransitionTicket();
  const assignTicket = useAssignTicket();
  const resolveTicket = useResolveTicket();
  const closeTicket = useCloseTicket();
  const declareMajor = useDeclareMajorIncident();

  /* ---- User name resolution ---- */
  const { data: allUsers } = useSearchUsers("");
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    if (allUsers) {
      for (const u of allUsers) {
        map.set(u.id, u.displayName);
      }
    }
    return map;
  }, [allUsers]);
  const resolveUser = (userId: string | undefined | null) =>
    userId ? userMap.get(userId) ?? userId.slice(0, 12) + "..." : "—";

  /* ---- Local state ---- */
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "sla">(
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

  /* ---- Derived data ---- */
  const comments: TicketComment[] = commentsData ?? [];
  const statusHistory: TicketStatusHistory[] = historyData ?? [];
  const breaches: SLABreachEntry[] = breachesData ?? [];

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
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
  }, [comments, statusHistory]);

  const isActing =
    transitionTicket.isPending ||
    assignTicket.isPending ||
    resolveTicket.isPending ||
    closeTicket.isPending ||
    declareMajor.isPending;

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
    if (
      !confirm(
        "Declare this ticket as a Major Incident? This will trigger escalation notifications.",
      )
    )
      return;
    declareMajor.mutate(id);
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  /* ---- Tab defs ---- */

  const TABS = [
    { key: "details" as const, label: "Details", icon: Tag },
    { key: "timeline" as const, label: "Activity", icon: History, count: timeline.length },
    { key: "sla" as const, label: "SLA", icon: Shield },
  ];

  const isPendingStatus =
    ticket.status === "pending_customer" || ticket.status === "pending_vendor";

  return (
    <div className="mx-auto max-w-7xl space-y-0">
      {/* ============================================================ */}
      {/*  Priority Accent Bar + Back Navigation                       */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div
          className={`rounded-t-2xl bg-gradient-to-r ${priorityInfo.gradient} px-5 pt-4 pb-3`}
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard/itsm/tickets")}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={14} />
            All Tickets
          </button>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  Hero Header                                                  */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-b-2xl border border-t-0 border-[var(--border)] bg-[var(--surface-0)] px-5 pb-5"
      >
        {/* Ticket Number + Badges Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pt-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <button
                type="button"
                onClick={copyTicketNumber}
                className="group flex items-center gap-1.5 text-sm font-mono text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
                title="Copy ticket number"
              >
                <Hash size={13} />
                {ticket.ticketNumber}
                {copiedId ? (
                  <CheckCircle size={12} style={{ color: "#10B981" }} />
                ) : (
                  <Copy
                    size={12}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </button>
              <span className="text-[var(--surface-3)]">|</span>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{
                  backgroundColor: priorityInfo.bg,
                  color: priorityInfo.text,
                }}
              >
                {priorityInfo.label}
              </span>
              <StatusBadge status={ticket.status} />
              {ticket.isMajorIncident && (
                <motion.span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                    color: "#EF4444",
                  }}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <AlertTriangle size={11} />
                  Major Incident
                </motion.span>
              )}
            </div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
              {ticket.title}
            </h1>
            <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--neutral-gray)]">
              <span className="flex items-center gap-1">
                <Layers size={12} />
                {ticket.type.replace(/_/g, " ")}
              </span>
              <span className="flex items-center gap-1">
                <Megaphone size={12} />
                {ticket.channel}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {getAge(ticket.createdAt)}
              </span>
              {ticket.category && (
                <span className="flex items-center gap-1">
                  <Inbox size={12} />
                  {ticket.category}
                  {ticket.subcategory && ` / ${ticket.subcategory}`}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {transitions.map((t) => {
              const TIcon = t.icon;
              let btnClass =
                "rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--surface-1)] disabled:opacity-50";
              if (t.variant === "primary")
                btnClass =
                  "rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
              if (t.variant === "success")
                btnClass =
                  "rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
              if (t.variant === "danger")
                btnClass =
                  "rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-50 disabled:opacity-50";

              return (
                <button
                  key={t.value}
                  type="button"
                  disabled={isActing}
                  onClick={() => handleTransition(t.value)}
                  className={btnClass}
                >
                  <span className="flex items-center gap-1.5">
                    {TIcon && <TIcon size={13} />}
                    {t.label}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              disabled={isActing}
              onClick={() => setShowAssignForm((f) => !f)}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--surface-1)] disabled:opacity-50"
            >
              <UserPlus size={13} />
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
                  className="flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <AlertTriangle size={13} />
                  Major
                </button>
              )}
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="mt-5 pt-4 border-t border-[var(--border)]">
          <StatusPipeline currentStatus={ticket.status} />
        </div>
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
            className="flex items-end gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 overflow-hidden"
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
            className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 overflow-hidden"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        {/* ---- Main Column (2/3) ---- */}
        <div className="lg:col-span-2 space-y-5">
          {/* SLA Gauges */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
          >
            <div className="px-5 pt-4 pb-2 flex items-center gap-2">
              <Timer size={15} className="text-[var(--primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                SLA Performance
              </h2>
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
            <div className="flex gap-0.5 bg-[var(--surface-1)] rounded-xl p-1 border border-[var(--border)]">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all flex-1 justify-center"
                    style={{
                      color: isActive
                        ? "var(--primary)"
                        : "var(--neutral-gray)",
                      backgroundColor: isActive
                        ? "var(--surface-0)"
                        : "transparent",
                      boxShadow: isActive
                        ? "0 1px 3px rgba(0,0,0,0.08)"
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
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
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
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
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
                                <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-1)] p-3 text-sm">
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
                                <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-1)] p-3 text-sm">
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
                                <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-1)] p-3 text-sm">
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
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
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
                      className="rounded-2xl border p-5"
                      style={{
                        borderColor: "#10B98130",
                        backgroundColor: "rgba(16, 185, 129, 0.03)",
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
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
                  >
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:bg-[var(--surface-0)] resize-none transition-all"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIsInternalComment((v) => !v)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
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
                        className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
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
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-10 text-center">
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
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                      <div className="space-y-0">
                        {timeline.map((item, idx) => (
                          <TimelineEntry
                            key={`${item.kind}-${item.data.id}-${idx}`}
                            item={item}
                            index={idx}
                            resolveUser={resolveUser}
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
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
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
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---- Sidebar (1/3) ---- */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* People */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 space-y-3">
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
                  {ticket.reporterDepartment && (
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {ticket.reporterDepartment}
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
                  {ticket.assigneeDepartment && (
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {ticket.assigneeDepartment}
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

          {/* Quick Info */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 space-y-3">
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
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 space-y-3">
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
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                  Updated
                </p>
                <p className="text-xs font-medium text-[var(--text-primary)] tabular-nums mt-0.5">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </p>
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
                </div>
              )}
            </div>
          </div>

          {/* CSAT Score (if available) */}
          {ticket.satisfactionScore != null && (
            <div
              className="rounded-2xl border p-4 text-center"
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
