"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Search,
  ChevronRight,
  LogOut,
  User,
  Settings,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { EmployerSidebar } from "@/components/layout/employer-sidebar";
import { EmployerMobileNav } from "@/components/layout/employer-mobile-nav";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import {
  NotificationBell,
  NotificationPanel,
} from "@/components/notifications/notification-panel";

/* ------------------------------------------------------------------ */
/*  Page transition wrapper                                            */
/* ------------------------------------------------------------------ */

function PageTransition({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  User menu dropdown                                                 */
/* ------------------------------------------------------------------ */

interface UserMenuProps {
  userInitial: string;
  displayName: string;
  email: string;
  onProfile: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onLogout: () => void;
}

function UserMenu({
  userInitial,
  displayName,
  email,
  onProfile,
  onSettings,
  onHelp,
  onLogout,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const menuItem = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    danger?: boolean,
  ) => (
    <button
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
        danger
          ? "text-[var(--error)] hover:bg-[var(--error-light)]"
          : "text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C4A35A]/20 to-[#A8893D]/20 flex items-center justify-center border border-[#C4A35A]/10 hover:ring-2 hover:ring-[#C4A35A]/20 transition-all"
      >
        <span className="text-sm font-semibold text-[#C4A35A]">
          {userInitial}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl shadow-xl z-50 p-1.5"
          >
            <div className="px-3 py-2.5 mb-1">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {displayName}
              </p>
              <p className="text-xs text-[var(--neutral-gray)] truncate">
                {email}
              </p>
            </div>
            <div className="h-px bg-[var(--border)] mx-1 mb-1" />
            {menuItem(
              <User size={15} className="text-[var(--neutral-gray)]" />,
              "My Profile",
              onProfile,
            )}
            {menuItem(
              <Settings size={15} className="text-[var(--neutral-gray)]" />,
              "Settings",
              onSettings,
            )}
            {menuItem(
              <HelpCircle size={15} className="text-[var(--neutral-gray)]" />,
              "Help",
              onHelp,
            )}
            <div className="h-px bg-[var(--border)] mx-1 my-1" />
            {menuItem(<LogOut size={15} />, "Sign Out", onLogout, true)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loading state                                             */
/* ------------------------------------------------------------------ */

function LayoutSkeleton() {
  return (
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-[280px] bg-[var(--surface-0)] border-r border-[var(--border)]">
        <div className="h-16 border-b border-[var(--border)] px-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 bg-[var(--surface-2)] rounded animate-pulse" />
            <div className="h-2 w-14 bg-[var(--surface-2)] rounded animate-pulse" />
          </div>
        </div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-[var(--surface-2)] rounded-xl animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Main area skeleton */}
      <div className="flex-1 min-w-0">
        <div className="h-16 bg-[var(--surface-0)] border-b border-[var(--border)] flex items-center justify-between px-6">
          <div className="h-4 w-40 bg-[var(--surface-2)] rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-[200px] bg-[var(--surface-2)] rounded-xl animate-pulse" />
            <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] animate-pulse" />
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="h-8 w-64 bg-[var(--surface-2)] rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 bg-[var(--surface-2)] rounded-2xl animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading, user, logout } = useAuth();

  // Sidebar state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  // Notification panel
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  // Sidebar collapsed: hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("employer-sidebar-collapsed");
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem("employer-sidebar-collapsed", String(collapsed));
    } catch {}
  }, [collapsed]);

  // Auto-collapse on tablet
  useEffect(() => {
    const mql = window.matchMedia(
      "(min-width: 768px) and (max-width: 1024px)",
    );
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setCollapsed(true);
    };
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Cmd+K shortcut placeholder
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Future: open command palette
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Auth guard — must be logged in AND have an employer role
  const isEmployer =
    user?.userType === "employer" ||
    user?.roles?.some((r) =>
      ["employer_admin", "employer_member", "super_admin"].includes(r),
    );

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.push("/auth/login");
    } else if (!isEmployer) {
      router.push("/dashboard");
    }
  }, [isLoading, isLoggedIn, isEmployer, router]);

  // Breadcrumbs from pathname
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, i) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href: "/" + segments.slice(0, i + 1).join("/"),
      isLast: i === segments.length - 1,
    }));
  }, [pathname]);

  const userInitial = (user?.displayName || user?.email || "E")
    .charAt(0)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  // Header scroll blur
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isLoading) {
    return <LayoutSkeleton />;
  }

  if (!isLoggedIn || !isEmployer) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#C4A35A] focus:text-white focus:rounded-xl focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Sidebar — hidden on mobile (replaced by bottom tabs) */}
      <EmployerSidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <main className="flex-1 min-w-0">
        {/* -------------------------------------------------------- */}
        {/*  Top Bar                                                   */}
        {/* -------------------------------------------------------- */}
        <header
          className={`h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 border-b transition-all duration-200 ${
            scrolled
              ? "bg-[var(--surface-0)]/80 backdrop-blur-md border-[var(--border)]"
              : "bg-[var(--surface-0)] border-[var(--border)]"
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs — desktop */}
            <nav
              className="hidden sm:flex items-center gap-1.5 text-sm"
              aria-label="Breadcrumb"
            >
              {breadcrumbs.map((crumb, i) => (
                <div key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <ChevronRight
                      size={14}
                      className="text-[var(--neutral-gray)] opacity-50"
                    />
                  )}
                  {crumb.isLast ? (
                    <span className="font-semibold text-[var(--text-primary)]">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Mobile: simple page title */}
            <span className="sm:hidden text-sm font-semibold text-[var(--text-primary)]">
              {breadcrumbs[breadcrumbs.length - 1]?.label || "Employer"}
            </span>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {/* Search bar — desktop */}
            <button className="hidden md:flex items-center gap-2 px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-sm text-[var(--neutral-gray)] min-w-[200px] lg:min-w-[260px] cursor-pointer hover:border-[#C4A35A]/30 transition-colors">
              <Search size={16} />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded text-[var(--neutral-gray)]">
                ⌘K
              </kbd>
            </button>

            {/* Mobile search button */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            {/* Theme toggle */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Notification bell */}
            <NotificationBell onClick={() => setNotifPanelOpen(true)} />

            {/* User avatar dropdown */}
            <UserMenu
              userInitial={userInitial}
              displayName={user?.displayName || user?.email || ""}
              email={user?.email || ""}
              onProfile={() => router.push("/employer/settings")}
              onSettings={() => router.push("/employer/settings")}
              onHelp={() => router.push("/employer/settings")}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Page content with transition */}
        <div id="main-content" className="p-4 lg:p-6">
          <PageTransition pathname={pathname}>{children}</PageTransition>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <EmployerMobileNav />

      {/* Notification panel */}
      <NotificationPanel
        open={notifPanelOpen}
        onOpenChange={setNotifPanelOpen}
      />
    </div>
  );
}
