"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  User,
  Briefcase,
  Mail,
  Settings,
  LogOut,
  ChevronLeft,
  Sparkles,
  HelpCircle,
  X,
  ShieldCheck,
  Bell,
  ExternalLink,
  UploadCloud,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useMyProfile } from "@/hooks/use-candidates";
import { useUnreadCount } from "@/hooks/use-notifications";
import { Badge } from "@digibit/ui/components";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@digibit/ui/components";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IconType = typeof LayoutDashboard;

interface NavItem {
  href: string;
  label: string;
  icon: IconType;
  badge?: number;
  description?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Navigation structure                                               */
/* ------------------------------------------------------------------ */

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Profile",
    items: [
      {
        href: "/dashboard/profile",
        label: "My Profile",
        icon: User,
        description: "Update personal details and preferences",
      },
    ],
  },
  {
    label: "Opportunities",
    items: [
      {
        href: "/dashboard/recommended-jobs",
        label: "Recommended Jobs",
        icon: Sparkles,
        description: "AI-matched job recommendations",
      },
      {
        href: "/dashboard/applications",
        label: "Applications",
        icon: Briefcase,
        description: "Track jobs you applied to",
      },
      {
        href: "/dashboard/intro-requests",
        label: "Intro Requests",
        icon: Mail,
        description: "Manage recruiter introductions",
      },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        icon: Bell,
        description: "View your notifications",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        description: "Security, preferences, and access",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CandidateSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getInitials(nameOrEmail: string) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "C";
  const parts = s.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.charAt(0).toUpperCase();
}

function strengthColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
}

function approvalLabel(status: string | undefined): { text: string; className: string } {
  switch (status) {
    case "approved":
      return { text: "Approved", className: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" };
    case "submitted":
      return { text: "In Review", className: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20" };
    case "needs_update":
      return { text: "Needs Update", className: "bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/20" };
    case "suspended":
      return { text: "Suspended", className: "bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/20" };
    case "archived":
      return { text: "Archived", className: "bg-[var(--neutral-gray)]/10 text-[var(--neutral-gray)] border-[var(--neutral-gray)]/20" };
    case "draft":
    default:
      return { text: "Draft", className: "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20" };
  }
}

/* ------------------------------------------------------------------ */
/*  Sidebar widths                                                     */
/* ------------------------------------------------------------------ */

const SIDEBAR_W = 280;
const SIDEBAR_COLLAPSED_W = 72;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CandidateSidebar({
  mobileOpen = false,
  onMobileClose = () => {},
}: CandidateSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const { data: profile } = useMyProfile();
  const { data: unreadCount } = useUnreadCount();

  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const identity = useMemo(() => {
    const display = profile?.fullName || user?.displayName || user?.email || "Candidate";
    const email = user?.email || "—";
    const initials = getInitials(display);
    const strength = profile?.profileStrength ?? 0;
    const track = profile?.primaryTrack?.name ?? null;
    const approval = profile?.approvalStatus;
    const photo = profile?.photoUrl ?? null;
    return { display, email, initials, strength, track, approval, photo };
  }, [user, profile]);

  // Persist collapsed state
  useEffect(() => {
    try {
      const stored = localStorage.getItem("candidate-sidebar-collapsed");
      if (stored === "true") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("candidate-sidebar-collapsed", String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Close mobile on route change
  useEffect(() => {
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Escape key handler
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onMobileClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onMobileClose]);

  // Theme toggle keyboard shortcut: Ctrl/Cmd + Shift + D
  const cycleTheme = useCallback(() => {
    const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  useEffect(() => {
    function handleThemeShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        cycleTheme();
      }
    }
    document.addEventListener("keydown", handleThemeShortcut);
    return () => document.removeEventListener("keydown", handleThemeShortcut);
  }, [cycleTheme]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/auth/login");
  }, [logout, router]);

  const isActive = useCallback(
    (href: string) =>
      href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === href || pathname.startsWith(href + "/"),
    [pathname],
  );

  // Inject unread count into notifications nav item
  const navGroupsWithBadges = useMemo(() => {
    return navGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.href === "/dashboard/notifications" && unreadCount && unreadCount > 0) {
          return { ...item, badge: unreadCount };
        }
        return item;
      }),
    }));
  }, [unreadCount]);

  const strengthPct = clamp(identity.strength, 0, 100);
  const sColor = strengthColor(strengthPct);
  const approval = approvalLabel(identity.approval);

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={sidebarRef}
        animate={{ width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={[
          "flex flex-col h-screen",
          "bg-[var(--glass-bg)] backdrop-blur-xl",
          "border-r border-[var(--glass-border)]",
          "fixed inset-y-0 left-0 z-50",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:z-10 lg:translate-x-0",
        ].join(" ")}
        style={{ width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* ──────────────────────────────────────────── */}
        {/*  Top Bar                                     */}
        {/* ──────────────────────────────────────────── */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--glass-border)] flex-shrink-0">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 group"
                  aria-label="Go to dashboard"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center shadow-md shadow-[var(--primary)]/15 group-hover:shadow-[var(--primary)]/30 transition-shadow">
                    <Sparkles size={17} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[15px] text-[var(--foreground)] leading-tight">
                      Talent Portal
                    </span>
                    <span className="text-[10px] font-medium text-[var(--neutral-gray)] leading-tight">
                      Candidate Dashboard
                    </span>
                  </div>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="logo-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mx-auto"
              >
                <Link href="/dashboard" aria-label="Go to dashboard">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center shadow-md shadow-[var(--primary)]/15">
                    <Sparkles size={17} className="text-white" />
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse toggle — desktop */}
          <motion.button
            onClick={() => setCollapsed((v) => !v)}
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-all duration-200 flex-shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={16} />
          </motion.button>

          {/* Close button — mobile */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-all duration-200"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* ──────────────────────────────────────────── */}
        {/*  Profile Card                                */}
        {/* ──────────────────────────────────────────── */}
        <div className={`px-3 pt-3 ${collapsed ? "lg:px-2" : ""}`}>
          <div
            className={[
              "rounded-2xl border border-[var(--glass-border)]",
              "bg-[var(--glass-bg)] backdrop-blur-sm",
              "shadow-[var(--glass-shadow)]",
              "p-3",
              collapsed ? "lg:p-2" : "",
            ].join(" ")}
          >
            <div className={`flex items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`}>
              {/* Avatar with online dot */}
              <div className="relative flex-shrink-0" title={collapsed ? `${identity.display} — ${strengthPct}%` : undefined}>
                {identity.photo ? (
                  <img
                    src={identity.photo}
                    alt={identity.display}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--primary)]/15"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center ring-2 ring-[var(--primary)]/15">
                    <span className="text-sm font-semibold text-white">{identity.initials}</span>
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--success)] ring-2 ring-[var(--surface-0)]" />
              </div>

              {/* Identity text */}
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="min-w-0 flex-1 overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {identity.display}
                      </p>
                    </div>
                    {identity.track && (
                      <p className="text-[11px] font-medium text-[var(--primary)] truncate">
                        {identity.track}
                      </p>
                    )}
                    {!identity.track && (
                      <p className="text-[11px] text-[var(--neutral-gray)] truncate">
                        {identity.email}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Strength Bar + Approval Badge */}
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-semibold text-[var(--foreground)]">Profile strength</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[9px] px-1.5 py-0 h-4 border ${approval.className}`}
                        >
                          {approval.text}
                        </Badge>
                        <span className="text-[11px] font-bold" style={{ color: sColor }}>
                          {strengthPct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${strengthPct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{
                          background: `linear-gradient(90deg, ${sColor}cc, ${sColor})`,
                        }}
                      />
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        href="/dashboard/profile"
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                      >
                        <User size={14} />
                        Edit Profile
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-2 text-[var(--neutral-gray)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                        aria-label="Upload documents"
                        title="Upload documents"
                      >
                        <UploadCloud size={16} />
                      </Link>
                      <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-2 text-[var(--neutral-gray)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                        aria-label="Preview dashboard"
                        title="Preview dashboard"
                      >
                        <ExternalLink size={16} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed quick action */}
            {collapsed && (
              <div className="hidden lg:flex mt-2 justify-center">
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-2 text-[var(--neutral-gray)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                  aria-label="Edit profile"
                  title="Edit profile"
                >
                  <User size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────── */}
        {/*  Navigation                                  */}
        {/* ──────────────────────────────────────────── */}
        <nav className="flex-1 mt-3 px-3 pb-3 overflow-y-auto">
          {navGroupsWithBadges.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex > 0 ? "mt-5" : ""}>
              {/* Section label */}
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="px-2 mb-2 flex items-center gap-2"
                  >
                    <div className="h-px flex-1 bg-[var(--border)]" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--neutral-gray)]">
                      {group.label}
                    </p>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsed divider */}
              {groupIndex > 0 && collapsed && (
                <div className="hidden lg:block mx-3 mb-3 border-t border-[var(--border)]" />
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={[
                        "group relative flex items-center gap-3 rounded-lg text-sm font-semibold",
                        "transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
                        "active:scale-[0.99]",
                        "px-3 py-2.5",
                        collapsed
                          ? "lg:justify-center lg:px-0 lg:w-11 lg:h-11 lg:mx-auto lg:rounded-lg"
                          : "",
                        active
                          ? "bg-[var(--primary)]/10 text-[var(--primary)] border-l-[3px] border-l-[var(--accent-orange,#C4A35A)]"
                          : "text-[var(--neutral-gray)] hover:bg-[var(--primary)]/5 hover:text-[var(--foreground)]",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex items-center justify-center",
                          active
                            ? "text-[var(--primary)]"
                            : "text-[var(--neutral-gray)] group-hover:text-[var(--foreground)]",
                        ].join(" ")}
                      >
                        <Icon size={20} className="flex-shrink-0" />
                      </div>

                      <AnimatePresence>
                        {!collapsed && (
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="min-w-0 flex-1 overflow-hidden"
                          >
                            <p className="truncate">{item.label}</p>
                            {item.description && (
                              <p className="text-[11px] font-medium text-[var(--neutral-gray)] truncate">
                                {item.description}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!collapsed && typeof item.badge === "number" && item.badge > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-[var(--error)] text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}

                      {/* Collapsed badge dot */}
                      {collapsed && typeof item.badge === "number" && item.badge > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--error)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ──────────────────────────────────────────── */}
        {/*  Footer — User DropdownMenu                  */}
        {/* ──────────────────────────────────────────── */}
        <div className="border-t border-[var(--glass-border)] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={[
                  "flex items-center gap-3 w-full rounded-xl transition-all duration-200",
                  "hover:bg-[var(--surface-2)] p-2",
                  collapsed ? "lg:justify-center" : "",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
                ].join(" ")}
                aria-label="User menu"
              >
                <div className="relative flex-shrink-0">
                  {identity.photo ? (
                    <img
                      src={identity.photo}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-[var(--primary)]/15"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center ring-2 ring-[var(--primary)]/15">
                      <span className="text-sm font-semibold text-white">{identity.initials}</span>
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--success)] ring-2 ring-[var(--surface-0)]" />
                </div>

                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 min-w-0 text-left overflow-hidden"
                    >
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {identity.display}
                      </p>
                      <p className="text-[11px] text-[var(--neutral-gray)] truncate">
                        {identity.email}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-56 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xl p-1.5"
            >
              <DropdownMenuLabel className="px-3 py-2">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                  {identity.display}
                </p>
                <p className="text-[11px] text-[var(--neutral-gray)] truncate">
                  {identity.email}
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
                <ShieldCheck size={16} className="text-[var(--neutral-gray)]" />
                <span className="text-sm font-medium">Settings</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                onClick={() => router.push("/dashboard/settings")}
              >
                <HelpCircle size={16} className="text-[var(--neutral-gray)]" />
                <span className="text-sm font-medium">Help & Support</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--error)]"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <div className={`mt-2 ${collapsed ? "flex justify-center" : ""}`}>
            {collapsed ? (
              <button
                onClick={cycleTheme}
                className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-all duration-200"
                aria-label="Toggle theme"
                title={`Theme: ${theme}`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={theme}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {theme === "dark" ? <Sun size={16} /> : theme === "light" ? <Moon size={16} /> : <Monitor size={16} />}
                  </motion.div>
                </AnimatePresence>
              </button>
            ) : (
              <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                {([
                  { value: "light" as const, icon: Sun, label: "Light" },
                  { value: "system" as const, icon: Monitor, label: "System" },
                  { value: "dark" as const, icon: Moon, label: "Dark" },
                ] as const).map((mode) => {
                  const Icon = mode.icon;
                  const isActive = theme === mode.value;
                  return (
                    <button
                      key={mode.value}
                      onClick={() => setTheme(mode.value)}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[var(--surface-0)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--neutral-gray)] hover:text-[var(--foreground)]"
                      }`}
                      aria-label={mode.label}
                      title={mode.value === "system" ? `System (auto)` : mode.label}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={isActive ? "active" : "inactive"}
                          initial={{ rotate: -90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={{ rotate: 90, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Icon size={12} />
                        </motion.div>
                      </AnimatePresence>
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Version meta */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mt-2 px-2 text-[10px] text-[var(--neutral-gray)] flex items-center justify-between"
              >
                <span className="truncate">Talent Portal</span>
                <span className="font-semibold">v1</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
}
