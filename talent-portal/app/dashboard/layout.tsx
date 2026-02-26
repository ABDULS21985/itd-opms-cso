"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Bell,
  LayoutDashboard,
  User,
  Briefcase,
  Mail,
  Settings,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useMyProfile } from "@/hooks/use-candidates";
import {
  useUnreadCount,
  useNotifications,
  useMarkAsRead,
} from "@/hooks/use-notifications";
import { CandidateSidebar } from "@/components/layout/candidate-sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@digibit/ui/components";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@digibit/ui/components";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@digibit/ui/components";

/* ------------------------------------------------------------------ */
/*  Breadcrumb icon mapping                                            */
/* ------------------------------------------------------------------ */

const breadcrumbIcons: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  profile: User,
  applications: Briefcase,
  "intro-requests": Mail,
  settings: Settings,
  notifications: Bell,
};

/* ------------------------------------------------------------------ */
/*  Mobile bottom nav items                                            */
/* ------------------------------------------------------------------ */

interface BottomNavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const bottomNavItems: BottomNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/applications", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/intro-requests", label: "Intros", icon: Mail },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(nameOrEmail: string) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "C";
  const parts = s.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.charAt(0).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Motion settings                                                    */
/* ------------------------------------------------------------------ */

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/* ------------------------------------------------------------------ */
/*  Skeleton components                                                */
/* ------------------------------------------------------------------ */

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-[var(--surface-2)] skeleton-shimmer ${className ?? ""}`} />
  );
}

function LayoutSkeleton() {
  return (
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-[280px] h-screen border-r border-[var(--border)] bg-[var(--surface-0)] p-4 gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <SkeletonBlock className="w-9 h-9 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="h-2.5 w-16" />
          </div>
        </div>
        <SkeletonBlock className="h-28 rounded-2xl" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Main area skeleton */}
      <div className="flex-1 min-w-0">
        {/* Header skeleton */}
        <div className="h-16 bg-[var(--surface-0)] border-b border-[var(--border)] flex items-center px-6 gap-4">
          <SkeletonBlock className="h-4 w-40" />
          <div className="ml-auto flex items-center gap-3">
            <SkeletonBlock className="h-8 w-8 rounded-full" />
            <SkeletonBlock className="h-9 w-9 rounded-full" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="p-6 space-y-4">
          <SkeletonBlock className="h-7 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <SkeletonBlock className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Layout                                                        */
/* ------------------------------------------------------------------ */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading, user, logout } = useAuth();

  const { data: profile } = useMyProfile();
  const { data: unreadCount } = useUnreadCount();
  const { data: notificationsData } = useNotifications(1);
  const markAsRead = useMarkAsRead();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/auth/login");
    }
  }, [isLoading, isLoggedIn, router]);

  // Scroll shadow detection with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, isLoggedIn]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, i) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href: "/" + segments.slice(0, i + 1).join("/"),
      isLast: i === segments.length - 1,
      segment: seg,
    }));
  }, [pathname]);

  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard";

  const userInitial = getInitials(
    profile?.fullName || user?.displayName || user?.email || "C",
  );
  const photoUrl = profile?.photoUrl ?? null;

  const recentNotifications = useMemo(() => {
    const items = notificationsData?.data ?? [];
    return items.slice(0, 5);
  }, [notificationsData]);

  const isBottomNavActive = useCallback(
    (href: string) =>
      href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === href || pathname.startsWith(href + "/"),
    [pathname],
  );

  // Reduced motion check
  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  if (isLoading) {
    return <LayoutSkeleton />;
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      <CandidateSidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        {/* Scroll sentinel */}
        <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

        {/* ── Sticky Header ── */}
        <header
          className={[
            "h-auto bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--glass-border)] sticky top-0 z-30",
            "transition-shadow duration-300",
            scrolled ? "shadow-[var(--shadow-sm)]" : "",
          ].join(" ")}
        >
          <div className="h-16 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>

              {/* Breadcrumbs — desktop */}
              <Breadcrumb className="hidden sm:block">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, i) => {
                    const Icon = breadcrumbIcons[crumb.segment];
                    return (
                      <BreadcrumbItem key={crumb.href}>
                        {i > 0 && <BreadcrumbSeparator />}
                        {crumb.isLast ? (
                          <BreadcrumbPage className="flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                            {Icon && <Icon size={14} />}
                            {crumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link
                              href={crumb.href}
                              className="flex items-center gap-1.5 text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-colors"
                            >
                              {Icon && <Icon size={14} />}
                              {crumb.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>

              {/* Mobile: page title */}
              <span className="sm:hidden text-sm font-semibold text-[var(--foreground)]">
                {pageTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    className="relative p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell size={20} />
                    {typeof unreadCount === "number" && unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--error)] text-white text-[10px] font-bold px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-full sm:max-w-sm bg-[var(--surface-0)] border-l border-[var(--border)] p-0"
                >
                  <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--border)]">
                    <SheetTitle className="text-lg font-bold text-[var(--foreground)]">
                      Notifications
                    </SheetTitle>
                    <SheetDescription className="text-sm text-[var(--neutral-gray)]">
                      {unreadCount ? `${unreadCount} unread` : "All caught up"}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="px-3 py-2 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <AnimatePresence>
                      {recentNotifications.length === 0 && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-[var(--neutral-gray)] text-center py-8"
                        >
                          No notifications yet
                        </motion.p>
                      )}
                      {recentNotifications.map((n, idx) => (
                        <motion.button
                          key={n.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            if (!n.isRead) markAsRead.mutate(n.id);
                            if (n.actionUrl || n.link) {
                              router.push(n.actionUrl || n.link || "/dashboard/notifications");
                            }
                          }}
                          className={[
                            "w-full text-left flex gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--surface-1)]",
                            !n.isRead ? "border-l-[3px] border-l-[var(--primary)]" : "",
                          ].join(" ")}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${!n.isRead ? "font-semibold text-[var(--foreground)]" : "text-[var(--neutral-gray)]"}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-[var(--neutral-gray)] truncate mt-0.5">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-[var(--neutral-gray)] mt-1">
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>
                          {!n.isRead && (
                            <span className="mt-1 w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0" />
                          )}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="px-5 py-3 border-t border-[var(--border)]">
                    <Link
                      href="/dashboard/notifications"
                      className="block text-center text-sm font-semibold text-[var(--primary)] hover:underline"
                    >
                      View All Notifications
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>

              {/* User greeting + avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40">
                    <div className="hidden sm:block text-right mr-1">
                      <p className="text-xs text-[var(--neutral-gray)] leading-tight">
                        Welcome back
                      </p>
                      <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">
                        {profile?.fullName || user?.displayName || user?.email || "Candidate"}
                      </p>
                    </div>
                    <div className="relative">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-[var(--primary)]/10"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)]/15 to-[var(--secondary)]/15 flex items-center justify-center border border-[var(--primary)]/10">
                          <span className="text-sm font-semibold text-[var(--primary)]">
                            {userInitial}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-56 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xl p-1.5"
                >
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                      {profile?.fullName || user?.displayName || "Candidate"}
                    </p>
                    <p className="text-[11px] text-[var(--neutral-gray)] truncate">
                      {user?.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                    onClick={() => router.push("/dashboard/profile")}
                  >
                    <User size={16} className="text-[var(--neutral-gray)]" />
                    <span className="text-sm font-medium">View Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                    onClick={() => router.push("/dashboard/settings")}
                  >
                    <Settings size={16} className="text-[var(--neutral-gray)]" />
                    <span className="text-sm font-medium">Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--error)]"
                    onClick={() => {
                      logout();
                      router.push("/auth/login");
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <span className="text-sm font-medium">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Page title below breadcrumb */}
          <div className="hidden sm:block px-4 lg:px-6 pb-3">
            <h1 className="text-xl font-bold text-[var(--foreground)]">{pageTitle}</h1>
          </div>
        </header>

        {/* ── Page Content with Transition ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            variants={prefersReduced ? undefined : pageVariants}
            initial={prefersReduced ? undefined : "initial"}
            animate={prefersReduced ? undefined : "animate"}
            exit={prefersReduced ? undefined : "exit"}
            transition={prefersReduced ? undefined : { duration: 0.2, ease: "easeOut" }}
            className="p-4 lg:p-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[var(--glass-bg)] backdrop-blur-xl border-t border-[var(--glass-border)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around h-14">
          {bottomNavItems.map((item) => {
            const active = isBottomNavActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  active ? "text-[var(--primary)]" : "text-[var(--neutral-gray)]",
                ].join(" ")}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  {item.href === "/dashboard/intro-requests" &&
                    typeof unreadCount === "number" &&
                    unreadCount > 0 && (
                      <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[var(--error)]" />
                    )}
                </div>
                <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More menu */}
          <DropdownMenu open={mobileMoreOpen} onOpenChange={setMobileMoreOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[var(--neutral-gray)] transition-colors">
                <MoreHorizontal size={20} />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="end"
              sideOffset={12}
              className="w-48 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xl p-1.5 mb-2"
            >
              <DropdownMenuItem
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                onClick={() => { setMobileMoreOpen(false); router.push("/dashboard/notifications"); }}
              >
                <Bell size={16} className="text-[var(--neutral-gray)]" />
                <span className="text-sm font-medium flex-1">Notifications</span>
                {typeof unreadCount === "number" && unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--error)] text-white text-[10px] font-bold px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                onClick={() => { setMobileMoreOpen(false); router.push("/dashboard/settings"); }}
              >
                <Settings size={16} className="text-[var(--neutral-gray)]" />
                <span className="text-sm font-medium">Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
