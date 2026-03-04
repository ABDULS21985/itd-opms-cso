"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Search,
  ChevronRight,
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  Monitor,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useBreadcrumbOverrides } from "@/providers/breadcrumb-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { CommandPalette } from "@/components/shared/command-palette";
import { ActivityPanel } from "@/components/dashboard/activity-panel";
import { useActivityPanel } from "@/hooks/use-activity-panel";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------------ */
/*  Theme Toggle                                                       */
/* ------------------------------------------------------------------ */

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const options = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];

  const CurrentIcon =
    theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
        aria-label="Toggle theme"
      >
        <CurrentIcon size={18} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-36 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl shadow-xl z-50 p-1"
          >
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTheme(opt.value);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                    theme === opt.value
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
                      : "text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                  }`}
                >
                  <Icon size={15} />
                  {opt.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  User Menu                                                          */
/* ------------------------------------------------------------------ */

function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userInitial = (user?.displayName || user?.email || "U")
    .charAt(0)
    .toUpperCase();
  const photoUrl = (user as Record<string, unknown>)?.photoUrl as string | undefined;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.push("/auth/login");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center border border-[var(--primary)]/10 hover:ring-2 hover:ring-[var(--primary)]/20 transition-all overflow-hidden"
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-[var(--primary)]">
            {userInitial}
          </span>
        )}
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
                {user?.displayName || user?.email}
              </p>
              <p className="text-xs text-[var(--neutral-gray)] truncate">
                {user?.email}
              </p>
            </div>
            <div className="h-px bg-[var(--border)] mx-1 mb-1" />
            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/profile");
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
            >
              <User size={15} className="text-[var(--neutral-gray)]" />
              My Profile
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/system/settings");
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
            >
              <Settings size={15} className="text-[var(--neutral-gray)]" />
              Preferences
            </button>
            <div className="h-px bg-[var(--border)] mx-1 my-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[var(--error)] hover:bg-[var(--error-light)] transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { open: activityPanelOpen, setOpen: setActivityPanelOpen, toggle: toggleActivityPanel } = useActivityPanel();
  const overrides = useBreadcrumbOverrides();

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Breadcrumbs — use page overrides when available, otherwise auto-generate from URL
  const breadcrumbs = useMemo(() => {
    if (overrides && overrides.length > 0) {
      return overrides.map((item, i) => ({
        label: item.label,
        href: item.href,
        isLast: i === overrides.length - 1,
      }));
    }

    const segments = pathname.split("/").filter(Boolean);
    // Skip "dashboard" prefix — it's implied by the layout
    const display = segments.slice(1);
    return display
      .filter((seg) => !UUID_RE.test(seg)) // Hide raw UUID segments
      .map((seg, i, arr) => ({
        label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
        href: "/" + segments.slice(0, segments.indexOf(seg) + 1).join("/"),
        isLast: i === arr.length - 1,
      }));
  }, [pathname, overrides]);

  return (
    <header className="h-16 bg-[var(--surface-0)] border-b border-[var(--border)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumbs -- desktop */}
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
          {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
        </span>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        {/* Search bar placeholder */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-sm text-[var(--neutral-gray)] min-w-[200px] lg:min-w-[260px] cursor-pointer hover:border-[var(--primary)]/30 transition-colors"
        >
          <Search size={16} />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded text-[var(--neutral-gray)]">
            Cmd+K
          </kbd>
        </button>

        {/* Mobile search button */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="md:hidden p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        {/* Theme toggle */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* Activity panel toggle */}
        <button
          onClick={toggleActivityPanel}
          className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
          aria-label={activityPanelOpen ? "Close activity panel" : "Open activity panel"}
          title="Activity Center"
        >
          {activityPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>

        {/* Notification bell */}
        <NotificationBell
          onClick={() => setNotificationPanelOpen((prev) => !prev)}
        />

        {/* User avatar dropdown */}
        <UserMenu />
      </div>

      {/* Notification slide-in panel */}
      <NotificationPanel
        open={notificationPanelOpen}
        onOpenChange={setNotificationPanelOpen}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Activity Panel */}
      <ActivityPanel
        open={activityPanelOpen}
        onOpenChange={setActivityPanelOpen}
      />
    </header>
  );
}
