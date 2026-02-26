"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Send,
  MessageSquare,
  Lock,
  Globe,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/hooks/use-auth";
import {
  useMyQueue,
  useTransitionTicket,
  useAddComment,
} from "@/hooks/use-itsm";
import type { Ticket } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  P1_critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", label: "P1" },
  P2_high: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316", label: "P2" },
  P3_medium: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", label: "P3" },
  P4_low: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", label: "P4" },
};

const PRIORITY_ORDER: Record<string, number> = {
  P1_critical: 0,
  P2_high: 1,
  P3_medium: 2,
  P4_low: 3,
};

const QUICK_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  new: [{ value: "in_progress", label: "Start Work" }],
  assigned: [{ value: "in_progress", label: "Start Work" }],
  in_progress: [
    { value: "pending_user", label: "Pending User" },
    { value: "resolved", label: "Resolve" },
  ],
  pending_user: [{ value: "in_progress", label: "Resume" }],
  pending_vendor: [{ value: "in_progress", label: "Resume" }],
};

function getSLACountdown(ticket: Ticket): {
  color: string;
  label: string;
} {
  if (ticket.slaResolutionMet === false) {
    return { color: "#EF4444", label: "SLA Breached" };
  }
  if (ticket.slaPausedAt) {
    return { color: "#9CA3AF", label: "SLA Paused" };
  }
  if (ticket.status === "resolved" || ticket.status === "closed") {
    return { color: "#10B981", label: "Resolved" };
  }
  if (ticket.slaResolutionTarget) {
    const target = new Date(ticket.slaResolutionTarget).getTime();
    const now = Date.now();
    const remaining = target - now;

    if (remaining <= 0) {
      return { color: "#EF4444", label: "Overdue" };
    }

    const created = new Date(ticket.createdAt).getTime();
    const totalDuration = target - created;
    const pct = totalDuration > 0 ? ((now - created) / totalDuration) * 100 : 0;

    const mins = Math.floor(remaining / 60000);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const countdown = hours > 0 ? `${hours}h ${remMins}m` : `${remMins}m`;

    if (pct >= 80) {
      return { color: "#F59E0B", label: countdown };
    }
    return { color: "#10B981", label: countdown };
  }
  return { color: "#9CA3AF", label: "No SLA" };
}

/* ------------------------------------------------------------------ */
/*  Ticket Card                                                        */
/* ------------------------------------------------------------------ */

function TicketCard({
  ticket,
  index,
  onNavigate,
}: {
  ticket: Ticket;
  index: number;
  onNavigate: (id: string) => void;
}) {
  const transitionTicket = useTransitionTicket();
  const addComment = useAddComment(ticket.id);

  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const priority = PRIORITY_COLORS[ticket.priority] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
    label: ticket.priority,
  };

  const sla = getSLACountdown(ticket);
  const transitions = QUICK_TRANSITIONS[ticket.status] ?? [];

  function handleTransition(newStatus: string) {
    transitionTicket.mutate({ id: ticket.id, status: newStatus });
  }

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate(
      {
        content: commentText.trim(),
        isInternal: isInternal,
      },
      {
        onSuccess: () => {
          setCommentText("");
          setShowComment(false);
        },
      },
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 transition-shadow hover:shadow-md"
    >
      {/* Top row: priority + ticket number + SLA */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ backgroundColor: priority.bg, color: priority.text }}
          >
            {priority.label}
          </span>
          <span className="text-xs font-mono text-[var(--neutral-gray)]">
            {ticket.ticketNumber}
          </span>
          {ticket.isMajorIncident && (
            <AlertTriangle size={14} style={{ color: "#EF4444" }} />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={12} style={{ color: sla.color }} />
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: sla.color }}
          >
            {sla.label}
          </span>
        </div>
      </div>

      {/* Title */}
      <button
        type="button"
        onClick={() => onNavigate(ticket.id)}
        className="group w-full text-left"
      >
        <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
          {ticket.title}
        </h3>
      </button>

      {/* Status + Type */}
      <div className="flex items-center gap-2 mt-2">
        <StatusBadge status={ticket.status} />
        <span className="text-xs text-[var(--neutral-gray)] capitalize">
          {ticket.type.replace(/_/g, " ")}
        </span>
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
        {transitions.map((t) => (
          <button
            key={t.value}
            type="button"
            disabled={transitionTicket.isPending}
            onClick={() => handleTransition(t.value)}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
          >
            {t.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowComment((v) => !v)}
          className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <MessageSquare size={10} />
          Comment
        </button>

        <button
          type="button"
          onClick={() => onNavigate(ticket.id)}
          className="ml-auto flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] hover:underline"
        >
          View
          <ArrowRight size={10} />
        </button>
      </div>

      {/* Inline comment form */}
      <AnimatePresence>
        {showComment && (
          <motion.form
            onSubmit={handleAddComment}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 border-t border-[var(--border)] pt-3"
          >
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Quick comment..."
              rows={2}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsInternal((v) => !v)}
                className="flex items-center gap-1 text-[10px] font-medium"
                style={{
                  color: isInternal ? "#F59E0B" : "var(--neutral-gray)",
                }}
              >
                {isInternal ? <Lock size={10} /> : <Globe size={10} />}
                {isInternal ? "Internal" : "Public"}
              </button>
              <button
                type="submit"
                disabled={addComment.isPending || !commentText.trim()}
                className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {addComment.isPending ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Send size={10} />
                )}
                Send
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MyQueuePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMyQueue(page, 50);

  const tickets = data?.data ?? [];
  const meta = data?.meta;

  // Sort: P1 first, then P2, P3, P4, then by createdAt ascending
  const sortedTickets = [...tickets].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  function handleNavigate(id: string) {
    router.push(`/dashboard/itsm/tickets/${id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.1)]">
            <Inbox size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              My Queue
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Tickets assigned to{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {user?.displayName ?? "you"}
              </span>
              {" "}({sortedTickets.length} ticket{sortedTickets.length !== 1 ? "s" : ""})
            </p>
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
            <p className="text-sm text-[var(--neutral-gray)]">Loading your queue...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sortedTickets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center justify-center py-24 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] mb-4">
            <Inbox size={28} className="text-[var(--neutral-gray)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Your queue is empty
          </p>
          <p className="text-sm text-[var(--neutral-gray)] mt-1">
            No tickets are currently assigned to you. Nice work!
          </p>
        </motion.div>
      )}

      {/* Ticket Cards */}
      {!isLoading && sortedTickets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {sortedTickets.map((ticket: Ticket, index: number) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              index={index}
              onNavigate={handleNavigate}
            />
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-[var(--neutral-gray)]">
            {meta.totalItems} ticket{meta.totalItems !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[var(--neutral-gray)] tabular-nums">
              {page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
