"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  FolderPlus,
  AlertTriangle,
  HardDrive,
  Search,
  FileBarChart,
  CircleDot,
  Briefcase,
  Shield,
  Server,
  FileText,
  Zap,
  Clock,
  ChevronRight,
  Loader2,
  CalendarDays,
  Milestone,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import {
  useRecentActivity,
  useMyTasks,
  useUpcomingEvents,
  type ActivityFeedItem,
  type MyTasksSummary,
  type UpcomingEvent,
} from "@/hooks/use-reporting";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/*  Activity type → icon / color mapping                               */
/* ------------------------------------------------------------------ */

const ACTIVITY_ICON_MAP: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  "ticket.created":       { icon: CircleDot,       color: "text-blue-500",   bg: "bg-blue-500/10" },
  "ticket.resolved":      { icon: CheckCircle2,    color: "text-green-500",  bg: "bg-green-500/10" },
  "ticket.escalated":     { icon: AlertCircle,     color: "text-amber-500",  bg: "bg-amber-500/10" },
  "project.status_changed": { icon: Briefcase,     color: "text-purple-500", bg: "bg-purple-500/10" },
  "risk.identified":      { icon: AlertTriangle,   color: "text-orange-500", bg: "bg-orange-500/10" },
  "risk.mitigated":       { icon: Shield,          color: "text-emerald-500", bg: "bg-emerald-500/10" },
  "asset.deployed":       { icon: Server,          color: "text-cyan-500",   bg: "bg-cyan-500/10" },
  "asset.decommissioned": { icon: HardDrive,       color: "text-gray-400",   bg: "bg-gray-400/10" },
  "policy.approved":      { icon: FileText,        color: "text-green-500",  bg: "bg-green-500/10" },
  "policy.expired":       { icon: FileText,        color: "text-red-500",    bg: "bg-red-500/10" },
  "sla.breached":         { icon: Zap,             color: "text-red-500",    bg: "bg-red-500/10" },
};

function getActivityMeta(type: string) {
  return ACTIVITY_ICON_MAP[type] || { icon: CircleDot, color: "text-[var(--neutral-gray)]", bg: "bg-[var(--surface-2)]" };
}

/* ------------------------------------------------------------------ */
/*  Quick Action button config                                         */
/* ------------------------------------------------------------------ */

interface QuickAction {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  action: "navigate" | "cmd-k";
  href?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "New Ticket",  icon: Plus,          color: "text-blue-600",   bg: "bg-blue-500/8",    action: "navigate", href: "/dashboard/itsm/tickets?action=create" },
  { label: "New Project", icon: FolderPlus,    color: "text-purple-600", bg: "bg-purple-500/8",  action: "navigate", href: "/dashboard/planning/projects?action=create" },
  { label: "Log Risk",    icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-500/8",  action: "navigate", href: "/dashboard/planning/risks?action=create" },
  { label: "Add Asset",   icon: HardDrive,     color: "text-cyan-600",   bg: "bg-cyan-500/8",    action: "navigate", href: "/dashboard/cmdb/assets?action=create" },
  { label: "Search",      icon: Search,        color: "text-emerald-600", bg: "bg-emerald-500/8", action: "cmd-k" },
  { label: "Reports",     icon: FileBarChart,  color: "text-indigo-600", bg: "bg-indigo-500/8",  action: "navigate", href: "/dashboard/analytics" },
];

/* ------------------------------------------------------------------ */
/*  Upcoming event type → icon                                         */
/* ------------------------------------------------------------------ */

const UPCOMING_ICON_MAP: Record<string, LucideIcon> = {
  deadline: Clock,
  meeting: Users,
  milestone: Milestone,
  expiration: GraduationCap,
};

/* ------------------------------------------------------------------ */
/*  Section 1 — Quick Actions                                          */
/* ------------------------------------------------------------------ */

function QuickActionsGrid({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const handleAction = (qa: QuickAction) => {
    if (qa.action === "cmd-k") {
      // Dispatch Cmd+K to open command palette
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
      );
      onClose();
    } else if (qa.href) {
      onClose();
      router.push(qa.href);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-[var(--border)]">
      <h3 className="text-[11px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mb-2.5">
        Quick Actions
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ACTIONS.map((qa) => {
          const Icon = qa.icon;
          return (
            <button
              key={qa.label}
              onClick={() => handleAction(qa)}
              className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl ${qa.bg} hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group`}
            >
              <Icon size={18} className={`${qa.color} group-hover:scale-110 transition-transform`} />
              <span className="text-[11px] font-medium text-[var(--text-primary)] leading-tight">
                {qa.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 2 — Activity Timeline                                      */
/* ------------------------------------------------------------------ */

function ActivityTimeline() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRecentActivity(page);

  const items: ActivityFeedItem[] = (data as any)?.data || [];
  const total = (data as any)?.total || 0;
  const hasMore = items.length > 0 && items.length < total;

  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center py-10 text-[var(--neutral-gray)]">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-[var(--neutral-gray)]">
        <Inbox size={24} className="opacity-40 mb-2" />
        <p className="text-xs">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[27px] top-2 bottom-2 w-px bg-[var(--border)]" />

      <div className="space-y-0.5">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const meta = getActivityMeta(item.type);
            const Icon = meta.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="flex gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)]/50 transition-colors relative"
              >
                {/* Icon dot */}
                <div className={`relative z-10 w-[22px] h-[22px] rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon size={12} className={meta.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    <span className="font-semibold">{item.actor.name}</span>{" "}
                    {item.description}
                  </p>
                  {item.entity && (
                    <button
                      onClick={() => router.push(item.entity.href)}
                      className="text-[11px] text-[var(--primary)] hover:underline truncate block mt-0.5"
                    >
                      {item.entity.label}
                    </button>
                  )}
                  <span className="text-[10px] text-[var(--neutral-gray)] mt-0.5 block">
                    {relativeTime(item.timestamp)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {hasMore && (
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={isLoading}
          className="w-full py-2.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)]/50 transition-colors flex items-center justify-center gap-1"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Load more"}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 3 — My Tasks                                               */
/* ------------------------------------------------------------------ */

function MyTasksSection() {
  const router = useRouter();
  const { data, isLoading } = useMyTasks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-[var(--neutral-gray)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  const tasks = data as MyTasksSummary | undefined;
  if (!tasks) return null;

  const sections = [
    {
      label: "Open Tickets",
      count: tasks.openTickets?.count ?? 0,
      items: tasks.openTickets?.items ?? [],
      icon: CircleDot,
      color: "text-blue-500",
    },
    {
      label: "Tasks Due This Week",
      count: tasks.tasksDueThisWeek?.count ?? 0,
      items: tasks.tasksDueThisWeek?.items ?? [],
      icon: ListTodo,
      color: "text-purple-500",
    },
    {
      label: "Pending Approvals",
      count: tasks.pendingApprovals?.count ?? 0,
      items: tasks.pendingApprovals?.items ?? [],
      icon: CheckCircle2,
      color: "text-amber-500",
    },
    {
      label: "Overdue Items",
      count: tasks.overdueItems?.count ?? 0,
      items: tasks.overdueItems?.items ?? [],
      icon: AlertCircle,
      color: "text-red-500",
      isOverdue: true,
    },
  ];

  return (
    <div className="space-y-1">
      {sections.map((sec) => {
        const SIcon = sec.icon;
        return (
          <div key={sec.label}>
            <div className="flex items-center gap-2 px-4 py-1.5">
              <SIcon size={13} className={sec.color} />
              <span className="text-xs font-medium text-[var(--text-primary)] flex-1">
                {sec.label}
              </span>
              <span className={`text-xs font-bold ${sec.isOverdue && sec.count > 0 ? "text-red-500" : "text-[var(--neutral-gray)]"}`}>
                {sec.count}
              </span>
            </div>
            {sec.items.slice(0, 3).map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-2 w-full text-left px-4 pl-9 py-1 hover:bg-[var(--surface-2)]/50 transition-colors ${sec.isOverdue ? "text-red-500" : "text-[var(--text-secondary)]"}`}
              >
                <span className="text-[11px] truncate flex-1">{item.title}</span>
                <ChevronRight size={12} className="opacity-40 flex-shrink-0" />
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 4 — Upcoming                                               */
/* ------------------------------------------------------------------ */

function UpcomingSection() {
  const router = useRouter();
  const { data, isLoading } = useUpcomingEvents(5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-[var(--neutral-gray)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  const events = (data || []) as UpcomingEvent[];
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 text-[var(--neutral-gray)]">
        <CalendarDays size={20} className="opacity-40 mb-1" />
        <p className="text-[11px]">Nothing upcoming</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {events.map((evt) => {
        const EvtIcon = UPCOMING_ICON_MAP[evt.type] || CalendarDays;
        const dateStr = new Date(evt.date).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        return (
          <button
            key={evt.id}
            onClick={() => evt.href && router.push(evt.href)}
            className="flex items-center gap-2.5 w-full text-left px-4 py-2 hover:bg-[var(--surface-2)]/50 transition-colors"
          >
            <EvtIcon size={14} className="text-[var(--primary)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-primary)] truncate">{evt.title}</p>
              <p className="text-[10px] text-[var(--neutral-gray)]">{dateStr}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible section wrapper                                        */
/* ------------------------------------------------------------------ */

function PanelSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-[var(--surface-2)]/30 transition-colors"
      >
        <h3 className="text-[11px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
          {title}
        </h3>
        <ChevronRight
          size={14}
          className={`text-[var(--neutral-gray)] transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Activity Panel                                                */
/* ------------------------------------------------------------------ */

interface ActivityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityPanel({ open, onOpenChange }: ActivityPanelProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — mobile only */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-40 w-full sm:max-w-[320px] bg-[var(--surface-0)] border-l border-[var(--border)] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Activity Center
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
                aria-label="Close activity panel"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Actions — always visible at top */}
            <QuickActionsGrid onClose={() => onOpenChange(false)} />

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
              {/* Activity Timeline */}
              <PanelSection title="Activity Feed">
                <ActivityTimeline />
              </PanelSection>

              {/* My Tasks */}
              <PanelSection title="My Tasks">
                <MyTasksSection />
              </PanelSection>

              {/* Upcoming */}
              <PanelSection title="Upcoming">
                <UpcomingSection />
              </PanelSection>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
