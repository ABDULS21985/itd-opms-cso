"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Keyboard,
} from "lucide-react";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { useReportsOverview } from "@/hooks/use-reports";
import { useAdminEmployerStats } from "@/hooks/use-admin";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminMobileNav } from "@/components/layout/admin-mobile-nav";
import { AdminCommandPalette } from "@/components/layout/admin-command-palette";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import {
  useKeyboardShortcuts,
  KeyboardShortcutsDialog,
} from "@/components/layout/admin-keyboard-shortcuts";
import {
  NotificationBell,
  NotificationPanel,
} from "@/components/notifications/notification-panel";

const ADMIN_ROLES = ["super_admin", "placement_manager", "placement_officer"];

/* ------------------------------------------------------------------ */
/*  Page transition wrapper                                            */
/* ------------------------------------------------------------------ */

function PageTransition({ children, pathname }: { children: React.ReactNode; pathname: string }) {
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
  onPreferences: () => void;
  onShortcuts: () => void;
  onHelp: () => void;
  onLogout: () => void;
}

function UserMenu({ userInitial, displayName, email, onProfile, onPreferences, onShortcuts, onHelp, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, shortcut?: string, danger?: boolean) => (
    <button
      onClick={() => { setOpen(false); onClick(); }}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
        danger
          ? "text-[var(--error)] hover:bg-[var(--error-light)]"
          : "text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className="text-xs text-[var(--neutral-gray)] opacity-60">{shortcut}</span>}
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center border border-[var(--primary)]/10 hover:ring-2 hover:ring-[var(--primary)]/20 transition-all"
      >
        <span className="text-sm font-semibold text-[var(--primary)]">{userInitial}</span>
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
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{displayName}</p>
              <p className="text-xs text-[var(--neutral-gray)] truncate">{email}</p>
            </div>
            <div className="h-px bg-[var(--border)] mx-1 mb-1" />
            {menuItem(<User size={15} className="text-[var(--neutral-gray)]" />, "My Profile", onProfile)}
            {menuItem(<Settings size={15} className="text-[var(--neutral-gray)]" />, "Preferences", onPreferences)}
            {menuItem(<Keyboard size={15} className="text-[var(--neutral-gray)]" />, "Keyboard Shortcuts", onShortcuts, "?")}
            {menuItem(<HelpCircle size={15} className="text-[var(--neutral-gray)]" />, "Help", onHelp)}
            <div className="h-px bg-[var(--border)] mx-1 my-1" />
            {menuItem(<LogOut size={15} />, "Sign Out", onLogout, undefined, true)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading, user, logout } = useAuth();
  const { data: overview } = useReportsOverview();
  const { data: employerStats } = useAdminEmployerStats();

  // Sidebar state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  // Command palette
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  // Keyboard shortcuts dialog
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Notification panel
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  // Sidebar collapsed: hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Auto-collapse on tablet
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setCollapsed(true);
    };
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setCmdPaletteOpen(true),
    onShowShortcuts: () => setShortcutsOpen(true),
  });

  const hasAdminRole = user?.roles?.some((r: string) => ADMIN_ROLES.includes(r));

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/auth/login");
    } else if (!isLoading && isLoggedIn && !hasAdminRole) {
      router.push("/dashboard");
    }
  }, [isLoading, isLoggedIn, hasAdminRole, router]);

  // Badge counts from real data
  const badgeCounts = useMemo(() => ({
    introRequests: (overview as any)?.introRequests?.total ?? 0,
    employers: (employerStats as any)?.pending ?? 0,
    candidates: 0,
    jobs: 0,
  }), [overview, employerStats]);

  // Breadcrumbs from pathname
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, i) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href: "/" + segments.slice(0, i + 1).join("/"),
      isLast: i === segments.length - 1,
    }));
  }, [pathname]);

  // Color-coded role badge
  const roleBadge = useMemo(() => {
    if (user?.roles?.includes("super_admin"))
      return {
        label: "Super Admin",
        className: "bg-[var(--error-light)] text-[var(--error)] border border-[var(--error)]/20",
      };
    if (user?.roles?.includes("placement_manager"))
      return {
        label: "Manager",
        className: "bg-[var(--info-light)] text-[var(--info)] border border-[var(--info)]/20",
      };
    return {
      label: "Officer",
      className: "bg-[var(--success-light)] text-[var(--success)] border border-[var(--success)]/20",
    };
  }, [user?.roles]);

  const userInitial = (user?.displayName || user?.email || "A")
    .charAt(0)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !hasAdminRole) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-xl focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Sidebar — hidden on mobile (replaced by bottom tabs) */}
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        badgeCounts={badgeCounts}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <main className="flex-1 min-w-0">
        {/* -------------------------------------------------------- */}
        {/*  Top Bar                                                   */}
        {/* -------------------------------------------------------- */}
        <header className="h-16 bg-[var(--surface-0)] border-b border-[var(--border)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
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
                <div
                  key={crumb.href}
                  className="flex items-center gap-1.5"
                >
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
              {breadcrumbs[breadcrumbs.length - 1]?.label || "Admin"}
            </span>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {/* Command palette trigger (search bar) */}
            <button
              onClick={() => setCmdPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-sm text-[var(--neutral-gray)] min-w-[200px] lg:min-w-[260px] cursor-pointer hover:border-[var(--primary)]/30 transition-colors"
            >
              <Search size={16} />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded text-[var(--neutral-gray)]">
                ⌘K
              </kbd>
            </button>

            {/* Mobile search button */}
            <button
              onClick={() => setCmdPaletteOpen(true)}
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

            {/* Role badge */}
            <span
              className={`hidden lg:inline-flex text-xs font-medium px-3 py-1.5 rounded-lg ${roleBadge.className}`}
            >
              {roleBadge.label}
            </span>

            {/* User avatar dropdown */}
            <UserMenu
              userInitial={userInitial}
              displayName={user?.displayName || user?.email || ""}
              email={user?.email || ""}
              onProfile={() => router.push("/admin/settings")}
              onPreferences={() => router.push("/admin/settings")}
              onShortcuts={() => setShortcutsOpen(true)}
              onHelp={() => router.push("/admin/settings")}
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
      <AdminMobileNav badgeCounts={badgeCounts} />

      {/* Command palette */}
      <AdminCommandPalette
        open={cmdPaletteOpen}
        onOpenChange={setCmdPaletteOpen}
      />

      {/* Keyboard shortcuts dialog */}
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />

      {/* Notification panel */}
      <NotificationPanel
        open={notifPanelOpen}
        onOpenChange={setNotifPanelOpen}
      />
    </div>
  );
}
