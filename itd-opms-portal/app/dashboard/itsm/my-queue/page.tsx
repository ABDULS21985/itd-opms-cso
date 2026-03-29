"use client";

import { useMemo, useState, type ElementType } from "react";
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
  Sparkles,
  Activity,
  Search,
  ShieldAlert,
  UserRound,
  Layers3,
  CheckCircle2,
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

const PRIORITY_COLORS: Record<
  string,
  { bg: string; text: string; label: string; accent: string }
> = {
  P1_critical: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#EF4444",
    label: "P1",
    accent: "#DC2626",
  },
  P2_high: {
    bg: "rgba(249, 115, 22, 0.1)",
    text: "#F97316",
    label: "P2",
    accent: "#EA580C",
  },
  P3_medium: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#F59E0B",
    label: "P3",
    accent: "#D97706",
  },
  P4_low: {
    bg: "rgba(59, 130, 246, 0.1)",
    text: "#3B82F6",
    label: "P4",
    accent: "#2563EB",
  },
};

const PRIORITY_ORDER: Record<string, number> = {
  P1_critical: 0,
  P2_high: 1,
  P3_medium: 2,
  P4_low: 3,
};

const PRIORITY_FILTERS = [
  { value: "", label: "All priorities" },
  { value: "P1_critical", label: "P1" },
  { value: "P2_high", label: "P2" },
  { value: "P3_medium", label: "P3" },
  { value: "P4_low", label: "P4" },
];

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending_customer", label: "Pending Customer" },
  { value: "pending_vendor", label: "Pending Vendor" },
  { value: "resolved", label: "Resolved" },
];

const QUICK_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  logged: [{ value: "assigned", label: "Assign" }],
  classified: [{ value: "assigned", label: "Assign" }],
  assigned: [{ value: "in_progress", label: "Start Work" }],
  in_progress: [
    { value: "pending_customer", label: "Pending Customer" },
    { value: "resolved", label: "Resolve" },
  ],
  pending_customer: [{ value: "in_progress", label: "Resume" }],
  pending_vendor: [{ value: "in_progress", label: "Resume" }],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ageLabel(dateStr: string): string {
  const elapsed = Date.now() - new Date(dateStr).getTime();
  const hours = Math.max(1, Math.floor(elapsed / (1000 * 60 * 60)));

  if (hours < 24) return `${hours}h old`;

  const days = Math.floor(hours / 24);
  return `${days}d old`;
}

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

function queuePosture(
  total: number,
  critical: number,
  breached: number,
  waiting: number,
) {
  if (breached > 0 || critical >= 2) {
    return {
      label: "Escalation watch",
      accent: "#DC2626",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "The queue has SLA or severity pressure that should stay front-of-mind until it is stabilized.",
    };
  }

  if (total >= 6 || waiting >= 2) {
    return {
      label: "Busy but controlled",
      accent: "#D97706",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "There is meaningful demand in flight, but it is still manageable with clean triage discipline.",
    };
  }

  return {
    label: "Under control",
    accent: "#1B7340",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "Your personal queue is light and currently free of obvious escalation pressure.",
  };
}

function ticketNarrative(ticket: Ticket): string {
  const route = ticket.teamQueueName ?? ticket.teamQueueId ?? "your lane";

  if (ticket.status === "pending_customer") {
    return `Customer follow-up is the blocker right now, so keep the case warm and watch response time closely in ${route}.`;
  }

  if (ticket.status === "pending_vendor") {
    return `This ticket is waiting on a vendor dependency, so stay ahead of external delay risk in ${route}.`;
  }

  if (ticket.status === "resolved") {
    return `Resolution work is complete and the ticket is sitting in verification before final closure.`;
  }

  if (ticket.isMajorIncident) {
    return `This is major-incident work, so decision speed and clean communication matter more than perfect documentation in the moment.`;
  }

  if (ticket.priority === "P1_critical" || ticket.priority === "P2_high") {
    return `This is elevated-priority work in ${route}, so the next transition should be kept explicit and fast.`;
  }

  return `This ticket is in your active lane and should keep moving without losing SLA or customer context.`;
}

function LoadingValue({ width = "w-16" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function HeroActionButton({
  icon: Icon,
  label,
  primary,
  onClick,
}: {
  icon: ElementType;
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${primary ? "text-white hover:opacity-90" : "border text-[var(--text-primary)] hover:-translate-y-0.5 hover:shadow-md"}`}
      style={
        primary
          ? { backgroundColor: "#2563EB" }
          : {
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-0)",
              backdropFilter: "blur(18px)",
            }
      }
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Stats                                                      */
/* ------------------------------------------------------------------ */

function SummaryStats({
  tickets,
  isLoading,
}: {
  tickets: Ticket[];
  isLoading: boolean;
}) {
  const stats = useMemo(() => {
    const total = tickets.length;
    const critical = tickets.filter(
      (ticket) => ticket.priority === "P1_critical",
    ).length;
    const breached = tickets.filter(
      (ticket) => ticket.slaResolutionMet === false,
    ).length;
    const pendingCustomer = tickets.filter(
      (ticket) => ticket.status === "pending_customer",
    ).length;
    const majorIncidents = tickets.filter(
      (ticket) => ticket.isMajorIncident,
    ).length;

    return {
      total,
      critical,
      breached,
      pendingCustomer,
      majorIncidents,
    };
  }, [tickets]);

  const cards = [
    {
      label: "Tickets in queue",
      value: stats.total,
      color: "#2563EB",
      bg: "rgba(37, 99, 235, 0.1)",
      helper: "Everything currently sitting in your personal execution lane.",
    },
    {
      label: "Critical",
      value: stats.critical,
      color: "#DC2626",
      bg: "rgba(220, 38, 38, 0.1)",
      helper: "P1 tickets needing your fastest attention and cleanest updates.",
    },
    {
      label: "SLA Breached",
      value: stats.breached,
      color: "#F97316",
      bg: "rgba(249, 115, 22, 0.1)",
      helper: "Work already outside target that should be actively recovered.",
    },
    {
      label: "Pending Customer",
      value: stats.pendingCustomer,
      color: "#D97706",
      bg: "rgba(217, 119, 6, 0.1)",
      helper:
        "Tickets waiting on a customer response before execution resumes.",
    },
    {
      label: "Major Incidents",
      value: stats.majorIncidents,
      color: "#7C3AED",
      bg: "rgba(124, 58, 237, 0.1)",
      helper: "Major-incident work currently routed into your queue.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5"
          style={{
            backgroundImage: `radial-gradient(circle at 100% 0%, ${card.color}16, transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
          }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: card.bg }}
          >
            <div
              className="h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: card.color }}
            />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {card.label}
          </p>
          {isLoading ? (
            <div className="mt-3 h-8 w-16 rounded bg-[var(--surface-2)] animate-pulse" />
          ) : (
            <p
              className="mt-3 text-3xl font-bold tabular-nums"
              style={{ color: card.color }}
            >
              {card.value}
            </p>
          )}
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {card.helper}
          </p>
        </motion.div>
      ))}
    </div>
  );
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
    text: "var(--text-secondary)",
    label: ticket.priority,
    accent: "#64748B",
  };
  const sla = getSLACountdown(ticket);
  const transitions = QUICK_TRANSITIONS[ticket.status] ?? [];
  const routeLabel =
    ticket.teamQueueName ?? ticket.teamQueueId ?? "Direct personal assignment";
  const ownerLabel =
    ticket.assigneeName ?? ticket.assigneeId ?? "Assigned to you";
  const narrative = ticketNarrative(ticket);
  const nextMove =
    transitions[0]?.label ??
    (ticket.status === "resolved" || ticket.status === "closed"
      ? "Review closure"
      : "Hold current state");

  function handleTransition(newStatus: string) {
    transitionTicket.mutate({ id: ticket.id, status: newStatus });
  }

  function handleAddComment(event: React.FormEvent) {
    event.preventDefault();
    if (!commentText.trim()) return;

    addComment.mutate(
      {
        content: commentText.trim(),
        isInternal,
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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="overflow-hidden rounded-[30px] border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-48px_rgba(15,23,42,0.5)]"
      style={{
        borderColor: `${priority.accent}24`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${priority.accent}16, transparent 32%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ backgroundColor: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
            <StatusBadge status={ticket.status} />
            <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {ticket.type.replace(/_/g, " ")}
            </span>
            {ticket.isMajorIncident && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700 dark:text-red-300">
                <AlertTriangle size={12} />
                Major incident
              </span>
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

        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Ticket {ticket.ticketNumber}
            </p>
            <button
              type="button"
              onClick={() => onNavigate(ticket.id)}
              className="mt-2 w-full text-left"
            >
              <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] transition-colors hover:text-[var(--primary)]">
                {ticket.title}
              </h3>
            </button>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {narrative}
            </p>
          </div>

          <div
            className="rounded-[24px] border px-4 py-3"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              backdropFilter: "blur(14px)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Next move
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              {nextMove}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {transitions.length > 0
                ? `${transitions.length} quick transition${transitions.length === 1 ? "" : "s"} available`
                : "No fast transition available from this state"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/70 p-4">
            <div className="flex items-center gap-2">
              <Layers3 size={14} className="text-[var(--text-secondary)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Routing
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              {routeLabel}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {ticket.category
                ? `${ticket.category}${ticket.subcategory ? ` / ${ticket.subcategory}` : ""}`
                : "Category details not set on this ticket yet."}
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/70 p-4">
            <div className="flex items-center gap-2">
              <UserRound size={14} className="text-[var(--text-secondary)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Ownership
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              {ownerLabel}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Reporter {ticket.reporterName ?? ticket.reporterId}
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/70 p-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[var(--text-secondary)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Time signal
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              Created {ageLabel(ticket.createdAt)}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Updated {formatDate(ticket.updatedAt)}
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {transitions.map((transition) => (
              <button
                key={transition.value}
                type="button"
                disabled={transitionTicket.isPending}
                onClick={() => handleTransition(transition.value)}
                className="rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                {transition.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowComment((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <MessageSquare size={12} />
              Comment
            </button>

            <button
              type="button"
              onClick={() => onNavigate(ticket.id)}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              Open ticket
              <ArrowRight size={14} />
            </button>
          </div>

          <AnimatePresence>
            {showComment && (
              <motion.form
                onSubmit={handleAddComment}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4"
              >
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Quick comment..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsInternal((value) => !value)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{
                      color: isInternal ? "#D97706" : "var(--text-secondary)",
                    }}
                  >
                    {isInternal ? <Lock size={12} /> : <Globe size={12} />}
                    {isInternal ? "Internal note" : "Public reply"}
                  </button>
                  <button
                    type="submit"
                    disabled={addComment.isPending || !commentText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {addComment.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    Send
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const { data, isLoading } = useMyQueue(page, 50);

  const tickets = data?.data ?? [];
  const meta = data?.meta;

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const left = PRIORITY_ORDER[a.priority] ?? 99;
      const right = PRIORITY_ORDER[b.priority] ?? 99;

      if (left !== right) return left - right;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return sortedTickets.filter((ticket) => {
      const matchesSearch =
        !query ||
        ticket.title.toLowerCase().includes(query) ||
        ticket.ticketNumber.toLowerCase().includes(query) ||
        ticket.type.toLowerCase().includes(query) ||
        ticket.status.toLowerCase().includes(query) ||
        ticket.reporterName?.toLowerCase().includes(query) ||
        ticket.teamQueueName?.toLowerCase().includes(query);

      const matchesStatus = !statusFilter || ticket.status === statusFilter;
      const matchesPriority =
        !priorityFilter || ticket.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [sortedTickets, searchQuery, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    const total = sortedTickets.length;
    const critical = sortedTickets.filter(
      (ticket) => ticket.priority === "P1_critical",
    ).length;
    const breached = sortedTickets.filter(
      (ticket) => ticket.slaResolutionMet === false,
    ).length;
    const pendingCustomer = sortedTickets.filter(
      (ticket) => ticket.status === "pending_customer",
    ).length;
    const majorIncidents = sortedTickets.filter(
      (ticket) => ticket.isMajorIncident,
    ).length;

    return {
      total,
      critical,
      breached,
      pendingCustomer,
      majorIncidents,
    };
  }, [sortedTickets]);

  const posture = queuePosture(
    stats.total,
    stats.critical,
    stats.breached,
    stats.pendingCustomer,
  );

  const activeFilterCount = [searchQuery, statusFilter, priorityFilter].filter(
    Boolean,
  ).length;

  function handleNavigate(id: string) {
    router.push(`/dashboard/itsm/tickets/${id}`);
  }

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("");
    setPriorityFilter("");
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(37, 99, 235, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(37,99,235,0.16), transparent 32%), radial-gradient(circle at 88% 16%, rgba(124,58,237,0.12), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(37, 99, 235, 0.28)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${posture.badgeClass}`}
              >
                <Sparkles size={14} />
                {posture.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <Inbox size={14} className="text-[#2563EB]" />
                Personal triage desk
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                My Queue
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                Work the tickets assigned to{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {user?.displayName ?? "you"}
                </span>{" "}
                with clearer SLA pressure, faster next-action visibility, and a
                stronger personal triage view.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <HeroActionButton
                icon={ShieldAlert}
                label="Focus Critical"
                primary
                onClick={() => setPriorityFilter("P1_critical")}
              />
              <HeroActionButton
                icon={Clock}
                label="Pending Customer"
                onClick={() => setStatusFilter("pending_customer")}
              />
              <HeroActionButton
                icon={CheckCircle2}
                label="Clear Filters"
                onClick={clearFilters}
              />
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Queue posture
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Personal queue pulse
                </h2>
              </div>
              <Activity size={20} className="text-[#2563EB]" />
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {posture.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Tickets assigned
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? <LoadingValue width="w-14" /> : stats.total}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Critical load
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? <LoadingValue width="w-14" /> : stats.critical}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  SLA breaches
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? <LoadingValue width="w-14" /> : stats.breached}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Waiting
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    stats.pendingCustomer
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <SummaryStats tickets={sortedTickets} isLoading={isLoading} />

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Personal triage board
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Assigned tickets in motion
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {isLoading
                  ? "Loading queue..."
                  : `${filteredTickets.length} visible ticket${filteredTickets.length === 1 ? "" : "s"}${activeFilterCount > 0 ? ` from ${stats.total}` : ""}`}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <input
                  type="text"
                  placeholder="Search by ticket, title, type, or route..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((option) => {
                  const active = option.value === statusFilter;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option.value);
                        setPage(1);
                      }}
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
                      style={{
                        borderColor: active ? "#2563EB" : "var(--border)",
                        backgroundColor: active
                          ? "rgba(37, 99, 235, 0.12)"
                          : "var(--surface-0)",
                        color: active ? "#2563EB" : "var(--text-secondary)",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {PRIORITY_FILTERS.map((option) => {
                  const active = option.value === priorityFilter;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setPriorityFilter(option.value);
                        setPage(1);
                      }}
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
                      style={{
                        borderColor: active ? "#7C3AED" : "var(--border)",
                        backgroundColor: active
                          ? "rgba(124, 58, 237, 0.12)"
                          : "var(--surface-0)",
                        color: active ? "#7C3AED" : "var(--text-secondary)",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between rounded-[22px] bg-[var(--surface-1)] px-4 py-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {activeFilterCount} filter
                    {activeFilterCount === 1 ? "" : "s"} active
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-semibold text-[var(--primary)] hover:underline"
                  >
                    Reset board
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {isLoading ? (
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] py-24">
              <div className="flex flex-col items-center gap-3">
                <Loader2
                  size={24}
                  className="animate-spin text-[var(--primary)]"
                />
                <p className="text-sm text-[var(--text-secondary)]">
                  Loading your queue...
                </p>
              </div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--surface-2)]">
                <Inbox size={30} className="text-[var(--text-secondary)]" />
              </div>
              <p className="mt-5 text-base font-semibold text-[var(--text-primary)]">
                {activeFilterCount > 0
                  ? "No tickets match this view"
                  : "Your queue is empty"}
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                {activeFilterCount > 0
                  ? "Try clearing one or more filters to reopen the board."
                  : "No tickets are currently assigned to you. The queue is clear for now."}
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-4"
            >
              {filteredTickets.map((ticket, index) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  index={index}
                  onNavigate={handleNavigate}
                />
              ))}
            </motion.div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-[var(--text-secondary)]">
                Page {page} of {meta.totalPages} ({meta.totalItems} total)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-[var(--text-secondary)] tabular-nums">
                  {page} / {meta.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(meta.totalPages, current + 1))
                  }
                  disabled={page >= meta.totalPages}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Priority pressure
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Current board mix
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Keep the queue weighted toward fast next actions on the
              highest-risk work instead of letting lower-priority tickets absorb
              focus.
            </p>
            <div className="mt-5 space-y-3">
              {Object.entries(PRIORITY_COLORS).map(([key, config]) => {
                const count = sortedTickets.filter(
                  (ticket) => ticket.priority === key,
                ).length;
                const width =
                  stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%";

                return (
                  <div
                    key={key}
                    className="rounded-[24px] bg-[var(--surface-1)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{
                          backgroundColor: config.bg,
                          color: config.text,
                        }}
                      >
                        {config.label}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {isLoading ? <LoadingValue width="w-10" /> : count}
                      </span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width,
                          backgroundColor: config.accent,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Risk lane
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              SLA and escalation
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Use this panel to spot where your queue needs communication,
              escalation, or recovery rather than more silent work.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  SLA breached
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? <LoadingValue width="w-14" /> : stats.breached}
                </p>
              </div>
              <div className="rounded-[24px] bg-[var(--surface-1)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Major incidents
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? (
                    <LoadingValue width="w-14" />
                  ) : (
                    stats.majorIncidents
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Working notes
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Personal execution rhythm
            </h3>
            <div className="mt-4 space-y-3">
              {[
                {
                  title: "Stabilize critical work first",
                  body: "Move P1 and breached tickets before spending deep cycles on lower-risk cleanup.",
                },
                {
                  title: "Make waiting states explicit",
                  body: "If a customer or vendor is the blocker, push the ticket into the correct waiting state instead of holding it in silent limbo.",
                },
                {
                  title: "Use comments to protect context",
                  body: "A short update on the ticket is often enough to preserve continuity across shifts and handoffs.",
                },
              ].map((note) => (
                <div
                  key={note.title}
                  className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {note.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {note.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
