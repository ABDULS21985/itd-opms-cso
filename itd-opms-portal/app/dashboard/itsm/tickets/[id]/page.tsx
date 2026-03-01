"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle,
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
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
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
import type { TicketComment, TicketStatusHistory, SLABreachEntry } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  P1_critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", label: "P1 - Critical" },
  P2_high: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316", label: "P2 - High" },
  P3_medium: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", label: "P3 - Medium" },
  P4_low: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", label: "P4 - Low" },
};

/** Valid next-status transitions based on current status */
const STATUS_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  new: [
    { value: "assigned", label: "Assign" },
    { value: "in_progress", label: "Start Work" },
    { value: "cancelled", label: "Cancel" },
  ],
  assigned: [
    { value: "in_progress", label: "Start Work" },
    { value: "pending_user", label: "Pending User" },
    { value: "pending_vendor", label: "Pending Vendor" },
    { value: "cancelled", label: "Cancel" },
  ],
  in_progress: [
    { value: "pending_user", label: "Pending User" },
    { value: "pending_vendor", label: "Pending Vendor" },
    { value: "resolved", label: "Resolve" },
    { value: "cancelled", label: "Cancel" },
  ],
  pending_user: [
    { value: "in_progress", label: "Resume Work" },
    { value: "resolved", label: "Resolve" },
    { value: "cancelled", label: "Cancel" },
  ],
  pending_vendor: [
    { value: "in_progress", label: "Resume Work" },
    { value: "resolved", label: "Resolve" },
    { value: "cancelled", label: "Cancel" },
  ],
  resolved: [
    { value: "in_progress", label: "Reopen" },
    { value: "closed", label: "Close" },
  ],
  closed: [],
  cancelled: [],
};

/* ------------------------------------------------------------------ */
/*  SLA Timer Component                                                */
/* ------------------------------------------------------------------ */

function SLATimer({
  label,
  target,
  met,
  metAt,
  isPaused,
  createdAt,
}: {
  label: string;
  target?: string;
  met?: boolean;
  metAt?: string;
  isPaused: boolean;
  createdAt: string;
}) {
  if (!target) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3">
        <Clock size={16} className="text-[var(--neutral-gray)]" />
        <div>
          <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
            {label}
          </p>
          <p className="text-sm text-[var(--neutral-gray)]">No SLA policy</p>
        </div>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border p-3"
        style={{ borderColor: "#9CA3AF", backgroundColor: "rgba(156, 163, 175, 0.05)" }}
      >
        <Pause size={16} style={{ color: "#9CA3AF" }} />
        <div>
          <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
            {label}
          </p>
          <p className="text-sm font-semibold" style={{ color: "#9CA3AF" }}>
            SLA Paused
          </p>
        </div>
      </div>
    );
  }

  if (met === true) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border p-3"
        style={{ borderColor: "#10B98140", backgroundColor: "rgba(16, 185, 129, 0.05)" }}
      >
        <CheckCircle size={16} style={{ color: "#10B981" }} />
        <div>
          <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
            {label}
          </p>
          <p className="text-sm font-semibold" style={{ color: "#10B981" }}>
            Met
            {metAt && (
              <span className="ml-1 font-normal text-xs text-[var(--neutral-gray)]">
                at {new Date(metAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (met === false) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border p-3"
        style={{ borderColor: "#EF444440", backgroundColor: "rgba(239, 68, 68, 0.05)" }}
      >
        <XCircle size={16} style={{ color: "#EF4444" }} />
        <div>
          <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
            {label}
          </p>
          <p className="text-sm font-bold" style={{ color: "#EF4444" }}>
            Breached
          </p>
        </div>
      </div>
    );
  }

  // Active countdown
  const targetTime = new Date(target).getTime();
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const totalDuration = targetTime - created;
  const remaining = targetTime - now;
  const pct = totalDuration > 0 ? ((now - created) / totalDuration) * 100 : 0;

  let color = "#10B981";
  let statusLabel = "On Track";
  if (pct >= 100) {
    color = "#EF4444";
    statusLabel = "Breached";
  } else if (pct >= 80) {
    color = "#F59E0B";
    statusLabel = "At Risk";
  }

  const remainingMinutes = Math.max(0, Math.floor(remaining / 60000));
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;
  const countdown = remaining > 0 ? `${hours}h ${mins}m remaining` : "Overdue";

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Clock size={16} style={{ color }} />
        <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
          {label}
        </p>
        <span
          className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {statusLabel}
        </span>
      </div>
      <p className="text-sm font-semibold tabular-nums" style={{ color }}>
        {countdown}
      </p>
      <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${color}20` }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
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

function TimelineEntry({ item }: { item: TimelineItem }) {
  if (item.kind === "status") {
    const h = item.data;
    return (
      <div className="flex gap-3 py-3">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <ArrowRightCircle size={16} className="text-[var(--neutral-gray)]" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">
              {h.changedBy.slice(0, 8)}...
            </span>
            {" changed status from "}
            <StatusBadge status={h.fromStatus} dot={false} />
            <span className="mx-1">&rarr;</span>
            <StatusBadge status={h.toStatus} dot={false} />
          </p>
          {h.reason && (
            <p className="mt-1 text-xs text-[var(--neutral-gray)] italic">
              Reason: {h.reason}
            </p>
          )}
          <p className="mt-1 text-[10px] text-[var(--neutral-gray)] tabular-nums">
            {new Date(h.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  // Comment
  const c = item.data;
  return (
    <div className="flex gap-3 py-3">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: c.isInternal
            ? "rgba(245, 158, 11, 0.1)"
            : "rgba(59, 130, 246, 0.1)",
        }}
      >
        <MessageSquare
          size={16}
          style={{ color: c.isInternal ? "#F59E0B" : "#3B82F6" }}
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {c.authorId.slice(0, 8)}...
          </span>
          {c.isInternal && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                color: "#F59E0B",
              }}
            >
              <Lock size={8} />
              Internal
            </span>
          )}
        </div>
        <div
          className="rounded-xl p-3 text-sm text-[var(--text-secondary)] whitespace-pre-wrap"
          style={{
            backgroundColor: c.isInternal
              ? "rgba(245, 158, 11, 0.05)"
              : "var(--surface-1)",
            borderLeft: `3px solid ${c.isInternal ? "#F59E0B" : "var(--border)"}`,
          }}
        >
          {c.content}
        </div>
        <p className="mt-1 text-[10px] text-[var(--neutral-gray)] tabular-nums">
          {new Date(c.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
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

  /* ---- Local state ---- */
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "sla">("details");
  const [commentText, setCommentText] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [transitionReason, setTransitionReason] = useState("");

  /* ---- Derived data ---- */
  const comments: TicketComment[] = commentsData ?? [];
  const statusHistory: TicketStatusHistory[] = historyData ?? [];
  const breaches: SLABreachEntry[] = breachesData ?? [];

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...comments.map(
        (c): TimelineItem => ({ kind: "comment", data: c, timestamp: c.createdAt }),
      ),
      ...statusHistory.map(
        (h): TimelineItem => ({ kind: "status", data: h, timestamp: h.createdAt }),
      ),
    ];
    items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return items;
  }, [comments, statusHistory]);

  const isActing =
    transitionTicket.isPending ||
    assignTicket.isPending ||
    resolveTicket.isPending ||
    closeTicket.isPending ||
    declareMajor.isPending;

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--neutral-gray)]">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">Ticket not found.</p>
      </div>
    );
  }

  /* ---- Helpers ---- */

  const priorityInfo = PRIORITY_COLORS[ticket.priority] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
    label: ticket.priority,
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
      {
        onSuccess: () => {
          setCommentText("");
        },
      },
    );
  }

  function handleDeclareMajor() {
    if (!confirm("Declare this ticket as a Major Incident? This will trigger escalation notifications.")) return;
    declareMajor.mutate(id);
  }

  /* ---- Tab content renderers ---- */

  const TABS = [
    { key: "details" as const, label: "Details", icon: Tag },
    { key: "timeline" as const, label: "Timeline", icon: History },
    { key: "sla" as const, label: "SLA", icon: Shield },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/itsm/tickets")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Tickets
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-[var(--neutral-gray)]">
              {ticket.ticketNumber}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: priorityInfo.bg, color: priorityInfo.text }}
            >
              {priorityInfo.label}
            </span>
            <StatusBadge status={ticket.status} />
            {ticket.isMajorIncident && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#EF4444" }}
              >
                <AlertTriangle size={12} />
                Major Incident
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {ticket.title}
          </h1>
          <p className="mt-1 text-xs text-[var(--neutral-gray)]">
            Type: {ticket.type.replace(/_/g, " ")} | Channel: {ticket.channel} | Created{" "}
            {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status transitions */}
          {transitions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {transitions.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  disabled={isActing}
                  onClick={() => handleTransition(t.value)}
                  className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Assign button */}
          <button
            type="button"
            disabled={isActing}
            onClick={() => setShowAssignForm((f) => !f)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
          >
            <UserPlus size={14} />
            Assign
          </button>

          {/* Major Incident button */}
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
                <AlertTriangle size={14} />
                Declare Major
              </button>
            )}
        </div>
      </motion.div>

      {/* Assign inline form */}
      <AnimatePresence>
        {showAssignForm && (
          <motion.form
            onSubmit={handleAssign}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                Assign to User ID
              </label>
              <input
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                placeholder="Enter user UUID"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <button
              type="submit"
              disabled={assignTicket.isPending}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {assignTicket.isPending && <Loader2 size={12} className="animate-spin" />}
              Assign
            </button>
            <button
              type="button"
              onClick={() => setShowAssignForm(false)}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Resolve inline form */}
      <AnimatePresence>
        {showResolveForm && (
          <motion.form
            onSubmit={handleResolve}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Resolution Notes <span className="text-[var(--error)]">*</span>
            </label>
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
                className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {resolveTicket.isPending && <Loader2 size={12} className="animate-spin" />}
                <CheckCircle size={14} />
                Resolve Ticket
              </button>
              <button
                type="button"
                onClick={() => setShowResolveForm(false)}
                className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* SLA Timers */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <SLATimer
          label="Response SLA"
          target={ticket.slaResponseTarget}
          met={ticket.slaResponseMet}
          metAt={ticket.firstResponseAt}
          isPaused={!!ticket.slaPausedAt}
          createdAt={ticket.createdAt}
        />
        <SLATimer
          label="Resolution SLA"
          target={ticket.slaResolutionTarget}
          met={ticket.slaResolutionMet}
          metAt={ticket.resolvedAt}
          isPaused={!!ticket.slaPausedAt}
          createdAt={ticket.createdAt}
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="flex gap-1 border-b border-[var(--border)]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: isActive ? "var(--primary)" : "var(--neutral-gray)",
                  borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-6">
            {/* Description */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                Description
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {/* Ticket Fields */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                Ticket Information
              </h2>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">Type</dt>
                  <dd className="capitalize text-[var(--text-primary)]">
                    {ticket.type.replace(/_/g, " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">Category</dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.category || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">Subcategory</dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.subcategory || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">Urgency</dt>
                  <dd className="capitalize text-[var(--text-primary)]">{ticket.urgency}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">Impact</dt>
                  <dd className="capitalize text-[var(--text-primary)]">{ticket.impact}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">Channel</dt>
                  <dd className="capitalize text-[var(--text-primary)]">{ticket.channel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">Reporter</dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.reporterId.slice(0, 8)}...
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">Assignee</dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.assigneeId ? ticket.assigneeId.slice(0, 8) + "..." : "Unassigned"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">Team Queue</dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.teamQueueId ? ticket.teamQueueId.slice(0, 8) + "..." : "None"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Linked Items */}
            {(ticket.linkedProblemId ||
              ticket.linkedAssetIds.length > 0 ||
              ticket.relatedTicketIds.length > 0) && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                  Linked Items
                </h2>
                <div className="space-y-2">
                  {ticket.linkedProblemId && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon size={14} className="text-[var(--neutral-gray)]" />
                      <span className="text-[var(--neutral-gray)]">Problem:</span>
                      <span className="font-mono text-[var(--primary)]">
                        {ticket.linkedProblemId.slice(0, 8)}...
                      </span>
                    </div>
                  )}
                  {ticket.linkedAssetIds.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon size={14} className="text-[var(--neutral-gray)]" />
                      <span className="text-[var(--neutral-gray)]">
                        Assets: {ticket.linkedAssetIds.length} linked
                      </span>
                    </div>
                  )}
                  {ticket.relatedTicketIds.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon size={14} className="text-[var(--neutral-gray)]" />
                      <span className="text-[var(--neutral-gray)]">
                        Related Tickets: {ticket.relatedTicketIds.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {ticket.tags.length > 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {ticket.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution (when resolved/closed) */}
            {ticket.resolutionNotes && (
              <div
                className="rounded-2xl border p-5"
                style={{
                  borderColor: "#10B98140",
                  backgroundColor: "rgba(16, 185, 129, 0.03)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} style={{ color: "#10B981" }} />
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Resolution
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                  {ticket.resolutionNotes}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--neutral-gray)]">
                  {ticket.resolvedAt && (
                    <span>Resolved at: {new Date(ticket.resolvedAt).toLocaleString()}</span>
                  )}
                  {ticket.closedAt && (
                    <span>Closed at: {new Date(ticket.closedAt).toLocaleString()}</span>
                  )}
                  {ticket.satisfactionScore != null && (
                    <span>
                      CSAT Score:{" "}
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

        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            {/* Add comment form */}
            <form
              onSubmit={handleAddComment}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-[var(--primary)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Add Comment
                </h3>
              </div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
              />
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsInternalComment((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: isInternalComment
                      ? "rgba(245, 158, 11, 0.1)"
                      : "var(--surface-1)",
                    color: isInternalComment ? "#F59E0B" : "var(--neutral-gray)",
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
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-8 text-center">
                <History size={24} className="mx-auto text-[var(--neutral-gray)] mb-2" />
                <p className="text-sm text-[var(--neutral-gray)]">
                  No activity yet. Add a comment to get started.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <div className="divide-y divide-[var(--border)]">
                  {timeline.map((item, idx) => (
                    <TimelineEntry key={`${item.kind}-${item.data.id}-${idx}`} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SLA Tab */}
        {activeTab === "sla" && (
          <div className="space-y-4">
            {/* SLA Policy Info */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                SLA Policy
              </h2>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    Response Target
                  </dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.slaResponseTarget
                      ? new Date(ticket.slaResponseTarget).toLocaleString()
                      : "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    Resolution Target
                  </dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.slaResolutionTarget
                      ? new Date(ticket.slaResolutionTarget).toLocaleString()
                      : "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    Response Met
                  </dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.slaResponseMet === true
                      ? "Yes"
                      : ticket.slaResponseMet === false
                        ? "No (Breached)"
                        : "Pending"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    Resolution Met
                  </dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.slaResolutionMet === true
                      ? "Yes"
                      : ticket.slaResolutionMet === false
                        ? "No (Breached)"
                        : "Pending"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    Paused Duration
                  </dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.slaPausedDurationMinutes > 0
                      ? `${ticket.slaPausedDurationMinutes} minutes`
                      : "None"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--neutral-gray)]">
                    First Response
                  </dt>
                  <dd className="text-[var(--text-primary)]">
                    {ticket.firstResponseAt
                      ? new Date(ticket.firstResponseAt).toLocaleString()
                      : "Awaiting response"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* SLA Breaches */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                SLA Breaches
              </h2>
              {breaches.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-center justify-center">
                  <CheckCircle size={16} style={{ color: "#10B981" }} />
                  <p className="text-sm text-[var(--neutral-gray)]">
                    No SLA breaches recorded
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {breaches.map((breach) => (
                    <div
                      key={breach.id}
                      className="flex items-center justify-between rounded-xl border p-3"
                      style={{
                        borderColor: "#EF444440",
                        backgroundColor: "rgba(239, 68, 68, 0.03)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <XCircle size={16} style={{ color: "#EF4444" }} />
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                            {breach.breachType.replace(/_/g, " ")} Breach
                          </p>
                          <p className="text-xs text-[var(--neutral-gray)]">
                            Target was: {new Date(breach.targetWas).toLocaleString()}
                            {breach.actualDurationMinutes != null &&
                              ` | Actual: ${breach.actualDurationMinutes} min`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
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
    </div>
  );
}
