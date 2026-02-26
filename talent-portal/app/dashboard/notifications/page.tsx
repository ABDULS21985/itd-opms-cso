"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Mail,
  Eye,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Settings2,
  Check,
  ArrowRight,
  Search,
  Filter,
  MailOpen,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { toast } from "sonner";
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@digibit/ui/components";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  type Notification,
} from "@/hooks/use-notifications";
import {
  formatRelativeTime,
  groupNotificationsByDate,
} from "@/lib/date-utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";

// ─── Type config ────────────────────────────────────────

const typeConfig: Record<
  string,
  { icon: typeof Bell; color: string; bg: string; label: string }
> = {
  intro_request: {
    icon: Mail,
    color: "text-[var(--warning)]",
    bg: "bg-[var(--warning)]/10",
    label: "Intro Request",
  },
  profile_view: {
    icon: Eye,
    color: "text-[var(--info)]",
    bg: "bg-[var(--info)]/10",
    label: "Profile View",
  },
  application: {
    icon: Briefcase,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
    label: "Application",
  },
  application_status: {
    icon: Briefcase,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
    label: "Application",
  },
  interview: {
    icon: Calendar,
    color: "text-[var(--primary)]",
    bg: "bg-[var(--primary)]/10",
    label: "Interview",
  },
  placement: {
    icon: CheckCircle2,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
    label: "Placement",
  },
  system: {
    icon: Settings2,
    color: "text-[var(--neutral-gray)]",
    bg: "bg-[var(--surface-2)]",
    label: "System",
  },
  welcome: {
    icon: Bell,
    color: "text-[var(--info)]",
    bg: "bg-[var(--info)]/10",
    label: "Welcome",
  },
};

const defaultTypeConfig = {
  icon: Bell,
  color: "text-[var(--neutral-gray)]",
  bg: "bg-[var(--surface-2)]",
  label: "Notification",
};

function getTypeConfig(type: string) {
  return typeConfig[type] || defaultTypeConfig;
}

// ─── Filter tabs ────────────────────────────────────────

type TabFilter = "all" | "applications" | "intros" | "profile" | "system";

const tabTypeMapping: Record<TabFilter, string[]> = {
  all: [],
  applications: ["application", "application_status", "interview", "placement"],
  intros: ["intro_request"],
  profile: ["profile_view"],
  system: ["system", "welcome"],
};

const tabConfig: {
  value: TabFilter;
  label: string;
  icon: typeof Bell;
}[] = [
  { value: "all", label: "All", icon: Bell },
  { value: "applications", label: "Applications", icon: Briefcase },
  { value: "intros", label: "Intros", icon: Mail },
  { value: "profile", label: "Profile", icon: User },
  { value: "system", label: "System", icon: Settings2 },
];

// ─── Animations ─────────────────────────────────────────

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const groupVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, staggerChildren: 0.04 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// ─── Page ───────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [showConfirm, setShowConfirm] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number | null>(null);

  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useNotifications(page);
  const { data: globalUnreadCount } = useUnreadCount();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();

  const notifications: Notification[] =
    (notificationsData as any)?.data ||
    (notificationsData as any) ||
    [];
  const meta = (notificationsData as any)?.meta || {
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  const unreadCount =
    typeof globalUnreadCount === "number"
      ? globalUnreadCount
      : Array.isArray(notifications)
        ? notifications.filter((n) => !n.isRead).length
        : 0;

  // Detect new notifications arriving via polling
  useEffect(() => {
    if (prevUnreadRef.current !== null && typeof globalUnreadCount === "number") {
      if (globalUnreadCount > prevUnreadRef.current) {
        toast.info("New notification received", {
          description: "You have a new notification.",
          action: {
            label: "Refresh",
            onClick: () => refetch(),
          },
        });
      }
    }
    if (typeof globalUnreadCount === "number") {
      prevUnreadRef.current = globalUnreadCount;
    }
  }, [globalUnreadCount, refetch]);

  // ─── Filtering ──────────────────────────────────────

  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    if (activeTab === "all") return notifications;
    const types = tabTypeMapping[activeTab];
    return notifications.filter((n) => types.includes(n.type));
  }, [notifications, activeTab]);

  // Per-tab unread counts
  const tabUnreadCounts = useMemo(() => {
    if (!Array.isArray(notifications)) return {} as Record<TabFilter, number>;
    const counts: Record<TabFilter, number> = {
      all: 0,
      applications: 0,
      intros: 0,
      profile: 0,
      system: 0,
    };
    for (const n of notifications) {
      if (n.isRead) continue;
      counts.all++;
      for (const [tab, types] of Object.entries(tabTypeMapping)) {
        if (tab !== "all" && types.includes(n.type)) {
          counts[tab as TabFilter]++;
        }
      }
    }
    return counts;
  }, [notifications]);

  // Date grouping
  const groups = useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications],
  );

  // ─── Handlers ───────────────────────────────────────

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await markRead.mutateAsync(id);
      } catch {
        toast.error("Failed to mark notification as read");
      }
    },
    [markRead],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount > 10 && !showConfirm) {
      setShowConfirm(true);
      return;
    }
    setShowConfirm(false);
    try {
      await markAllRead.mutateAsync();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }, [markAllRead, unreadCount, showConfirm]);

  const handleCardClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        handleMarkRead(notification.id);
      }
      const url = notification.actionUrl || notification.link;
      if (url) {
        router.push(url);
      }
    },
    [handleMarkRead, router],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    [],
  );

  // ─── Loading skeleton ──────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6" ref={topRef}>
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-52 bg-[var(--surface-2)] rounded-lg animate-pulse" />
            <div className="h-4 w-36 bg-[var(--surface-2)] rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-36 bg-[var(--surface-2)] rounded-lg animate-pulse" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-9 w-28 bg-[var(--surface-2)] rounded-lg animate-pulse"
            />
          ))}
        </div>
        {/* Card skeletons */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-5 bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] animate-pulse"
            >
              <div className="w-11 h-11 rounded-full bg-[var(--surface-2)] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/5 bg-[var(--surface-2)] rounded" />
                <div className="h-3 w-4/5 bg-[var(--surface-2)] rounded" />
                <div className="h-3 w-24 bg-[var(--surface-2)] rounded" />
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--surface-2)] shrink-0 mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────

  if (error) {
    return (
      <div ref={topRef}>
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-[var(--error)] mb-4" />
          <h3 className="font-semibold text-[var(--foreground)] mb-2">
            Failed to load notifications
          </h3>
          <p className="text-sm text-[var(--neutral-gray)] mb-4">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button onClick={() => refetch()} size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ─── Empty state helpers ────────────────────────────

  const renderEmptyState = () => {
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return (
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)]">
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="We'll notify you when something happens — intro requests, job applications, and more."
          />
        </div>
      );
    }

    if (filteredNotifications.length === 0 && activeTab !== "all") {
      const tabLabel =
        tabConfig.find((t) => t.value === activeTab)?.label || "matching";
      return (
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)]">
          <EmptyState
            icon={Search}
            title={`No ${tabLabel.toLowerCase()} notifications`}
            description={`You don't have any ${tabLabel.toLowerCase()} notifications right now.`}
          />
        </div>
      );
    }

    if (unreadCount === 0 && activeTab === "all") {
      // Still show the list, but note they're caught up
      return null;
    }

    return null;
  };

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="space-y-6" ref={topRef}>
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="h-5 min-w-5 px-1.5 text-[11px] font-bold"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </div>
            <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-[var(--neutral-gray)]">
                <Filter size={15} />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab("all")}>
                <Bell size={14} className="mr-2" />
                All Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-[var(--neutral-gray)]">
                By Type
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setActiveTab("intros")}>
                <Mail size={14} className="mr-2" />
                Intro Requests
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("applications")}>
                <Briefcase size={14} className="mr-2" />
                Applications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("profile")}>
                <User size={14} className="mr-2" />
                Profile Views
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("system")}>
                <Settings2 size={14} className="mr-2" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mark all as read */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markAllRead.isPending}
              className="gap-2"
              isLoading={markAllRead.isPending}
            >
              <Check size={15} />
              Mark all as read
            </Button>

            {/* Confirm popover for > 10 unread */}
            <AnimatePresence>
              {showConfirm && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 z-50 bg-[var(--surface-0)] rounded-xl border border-[var(--border)] shadow-lg p-4 w-72"
                >
                  <p className="text-sm font-medium text-[var(--foreground)] mb-3">
                    Mark {unreadCount} notifications as read?
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleMarkAllRead}
                      isLoading={markAllRead.isPending}
                    >
                      Confirm
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Type Tabs ───────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v: string) => setActiveTab(v as TabFilter)}
      >
        <TabsList className="h-auto bg-transparent p-0 gap-1 flex-wrap">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const count = tabUnreadCounts[tab.value];
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  "data-[state=inactive]:bg-[var(--surface-0)] data-[state=inactive]:border data-[state=inactive]:border-[var(--border)] data-[state=inactive]:text-[var(--neutral-gray)] data-[state=inactive]:shadow-none",
                  "data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white data-[state=active]:shadow-sm",
                )}
              >
                <Icon size={15} />
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                      activeTab === tab.value
                        ? "bg-[var(--surface-0)]/25 text-white"
                        : "bg-[var(--primary)]/10 text-[var(--primary)]",
                    )}
                  >
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* ── Content ─────────────────────────────────── */}
      {renderEmptyState() || (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={groupVariants}
            className="space-y-1"
          >
            {groups.map((group) => (
              <motion.div
                key={group.label}
                variants={groupVariants}
                layout
                className="space-y-0"
              >
                {/* Sticky date header */}
                <div className="sticky top-16 z-10 py-2 bg-[var(--surface-0)]">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                      {group.label}
                    </h3>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className="text-xs text-[var(--neutral-gray)]">
                      {group.items.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {group.items.map((notification, i) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      index={i}
                      onClick={() => handleCardClick(notification)}
                      onMarkRead={() => handleMarkRead(notification.id)}
                      onMarkUnread={() => {
                        // We don't have a markUnread hook — just a toggle visual for now
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Pagination ──────────────────────────────── */}
      {meta.totalPages > 1 && (
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          pageSize={meta.pageSize}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

// ─── NotificationCard ───────────────────────────────────

function NotificationCard({
  notification,
  index,
  onClick,
  onMarkRead,
  onMarkUnread,
}: {
  notification: Notification;
  index: number;
  onClick: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const config = getTypeConfig(notification.type);
  const Icon = config.icon;
  const url = notification.actionUrl || notification.link;

  const actionLabel = getActionLabel(notification.type);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-4 p-4 px-5 rounded-2xl border transition-all duration-200 cursor-pointer",
        notification.isRead
          ? "bg-[var(--surface-0)] border-[var(--border)] hover:bg-[var(--surface-1)] hover:border-[var(--surface-3)]"
          : "bg-[var(--primary)]/[0.03] border-l-2 border-[var(--primary)] hover:bg-[var(--primary)]/[0.06]",
      )}
    >
      {/* Type icon */}
      <div
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-105",
          config.bg,
        )}
      >
        <Icon size={18} className={config.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              notification.isRead
                ? "font-medium text-[var(--foreground)]"
                : "font-semibold text-[var(--foreground)]",
            )}
          >
            {notification.title}
          </p>
          <span className="text-xs text-[var(--neutral-gray)] shrink-0 mt-0.5">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-[var(--neutral-gray)] mt-1 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>

        {/* Inline action buttons on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 mt-2.5"
            >
              {!notification.isRead ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[var(--neutral-gray)] hover:text-[var(--primary)] bg-[var(--surface-1)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                >
                  <MailOpen size={12} />
                  Mark as read
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkUnread();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[var(--neutral-gray)] hover:text-[var(--primary)] bg-[var(--surface-1)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                >
                  <Mail size={12} />
                  Mark as unread
                </button>
              )}

              {url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/15 rounded-lg transition-colors"
                >
                  {actionLabel}
                  <ArrowRight size={11} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right side: Unread dot + action button */}
      <div className="flex items-center gap-2 shrink-0 mt-1">
        {!notification.isRead && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-40" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
          </span>
        )}

        {url && !hovered && (
          <ArrowRight
            size={14}
            className="text-[var(--surface-4)] group-hover:text-[var(--primary)] transition-colors"
          />
        )}
      </div>
    </motion.div>
  );
}

// ─── Helpers ────────────────────────────────────────────

function getActionLabel(type: string): string {
  switch (type) {
    case "application":
    case "application_status":
      return "View Application";
    case "intro_request":
      return "View Intro Request";
    case "profile_view":
      return "View Profile";
    case "interview":
      return "View Interview";
    default:
      return "View";
  }
}
