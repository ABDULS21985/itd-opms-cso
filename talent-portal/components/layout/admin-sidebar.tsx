"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Mail,
  TrendingUp,
  BarChart3,
  Tags,
  ScrollText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  HelpCircle,
  Keyboard,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  badgeKey?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Navigation structure — grouped per spec                            */
/* ------------------------------------------------------------------ */

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/reports", label: "Reports", icon: BarChart3, permission: "placement.view_reports" },
    ],
  },
  {
    label: "Moderation",
    items: [
      { href: "/admin/candidates", label: "Candidates", icon: Users, permission: "candidate.read_private", badgeKey: "candidates" },
      { href: "/admin/jobs", label: "Jobs", icon: Briefcase, permission: "placement.moderate_jobs", badgeKey: "jobs" },
      { href: "/admin/intro-requests", label: "Intro Requests", icon: Mail, permission: "placement.manage_intros", badgeKey: "introRequests" },
      { href: "/admin/employers", label: "Employers", icon: Building2, permission: "placement.manage_employers", badgeKey: "employers" },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/admin/placements", label: "Placements", icon: TrendingUp, permission: "placement.update_status" },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/taxonomy", label: "Taxonomy", icon: Tags, permission: "admin.manage_taxonomy" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, permission: "admin.view_audit_logs" },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: "admin.manage_settings" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRoleBadge(roles: string[] | undefined) {
  if (roles?.includes("super_admin"))
    return { label: "Super Admin", className: "bg-red-500/20 text-red-400" };
  if (roles?.includes("placement_manager"))
    return { label: "Manager", className: "bg-blue-500/20 text-blue-400" };
  return { label: "Officer", className: "bg-emerald-500/20 text-emerald-400" };
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  badgeCounts: Record<string, number>;
  onOpenShortcuts?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminSidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
  badgeCounts,
  onOpenShortcuts,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const userPermissions = user?.permissions || [];
  const roleBadge = getRoleBadge(user?.roles);
  const userInitial = (user?.displayName || user?.email || "A")
    .charAt(0)
    .toUpperCase();

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

  // Close menus on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onMobileClose();
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onMobileClose]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  // Filter groups based on permissions
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.permission || userPermissions.includes(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(href + "/");

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          flex flex-col h-screen
          bg-gradient-to-b from-[#0F172A] to-[#1a2332]
          border-r border-white/5 shadow-2xl
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]

          fixed inset-y-0 left-0 z-50
          ${mobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px]"}

          lg:sticky lg:top-0 lg:z-10 lg:translate-x-0
          ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}
        `}
        role="navigation"
        aria-label="Admin navigation"
      >
        {/* -------------------------------------------------------- */}
        {/*  Logo & Branding                                          */}
        {/* -------------------------------------------------------- */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm flex-shrink-0">
          {/* Expanded logo */}
          <Link
            href="/admin"
            className={`flex items-center gap-2.5 group ${collapsed ? "lg:hidden" : ""}`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center shadow-lg shadow-[#1B7340]/20 group-hover:shadow-[#1B7340]/40 transition-shadow">
              <Shield size={16} className="text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Admin Panel
              </span>
              <span className="text-[9px] font-medium bg-[#1B7340]/30 text-[#93b4f5] px-1.5 py-0.5 rounded-md">
                v2.0
              </span>
            </div>
          </Link>

          {/* Collapsed logo */}
          {collapsed && (
            <Link href="/admin" className="hidden lg:flex mx-auto">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center shadow-lg shadow-[#1B7340]/20">
                <Shield size={16} className="text-white" />
              </div>
            </Link>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 flex-shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>

          {/* Close button — mobile only */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Navigation                                                */}
        {/* -------------------------------------------------------- */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex > 0 ? "mt-5" : ""}>
              {/* Section header */}
              <p
                className={`px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 transition-opacity duration-200 ${
                  collapsed ? "lg:opacity-0 lg:h-0 lg:mb-0 lg:overflow-hidden" : ""
                }`}
              >
                {group.label}
              </p>

              {/* Section divider — collapsed desktop */}
              {groupIndex > 0 && collapsed && (
                <div className="hidden lg:block mx-3 mb-3 border-t border-white/5" />
              )}

              {/* Nav items */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const badge = item.badgeKey
                    ? badgeCounts[item.badgeKey] || 0
                    : 0;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`
                        group relative flex items-center gap-3 rounded-xl text-sm font-medium
                        transition-all duration-200
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7340]/50
                        active:scale-[0.98]

                        px-3 py-2.5
                        ${collapsed ? "lg:border-l-0 lg:justify-center lg:px-0 lg:w-10 lg:h-10 lg:mx-auto lg:rounded-xl" : "border-l-[3px]"}

                        ${
                          active
                            ? collapsed
                              ? "bg-[#1B7340]/15 text-white"
                              : "border-[#1B7340] bg-[#1B7340]/15 text-white"
                            : collapsed
                              ? "text-gray-400 hover:bg-white/5 hover:text-white"
                              : "border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                        }
                      `}
                    >
                      <Icon
                        size={20}
                        className={`flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${
                          active
                            ? "text-white"
                            : "text-gray-500 group-hover:text-gray-300"
                        }`}
                      />

                      {/* Label — hidden when collapsed */}
                      <span
                        className={`flex-1 truncate transition-opacity duration-200 ${
                          collapsed ? "lg:hidden" : ""
                        }`}
                      >
                        {item.label}
                      </span>

                      {/* Badge (number) — expanded */}
                      {badge > 0 && (
                        <span
                          className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ${
                            collapsed ? "lg:hidden" : ""
                          }`}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}

                      {/* Badge (dot) — collapsed */}
                      {badge > 0 && collapsed && (
                        <span className="hidden lg:block absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#0F172A]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* -------------------------------------------------------- */}
        {/*  Footer: Quick links                                       */}
        {/* -------------------------------------------------------- */}
        <div
          className={`border-t border-white/5 px-3 py-2 ${collapsed ? "lg:px-1.5" : ""}`}
        >
          {/* Expanded shortcuts button */}
          {!collapsed && (
            <div className="hidden lg:flex items-center gap-1 mb-1">
              <button
                onClick={onOpenShortcuts}
                className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
              >
                <Keyboard size={14} />
                <span>Shortcuts</span>
                <kbd className="ml-auto text-[10px] font-mono text-gray-600">
                  ?
                </kbd>
              </button>
            </div>
          )}
          {/* Collapsed shortcuts button */}
          {collapsed && (
            <div className="hidden lg:flex justify-center mb-1">
              <button
                onClick={onOpenShortcuts}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
                title="Keyboard shortcuts"
              >
                <Keyboard size={16} />
              </button>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------- */}
        {/*  User Section                                              */}
        {/* -------------------------------------------------------- */}
        <div className="relative border-t border-white/5 p-3" ref={userMenuRef}>
          {/* User dropdown popover */}
          {userMenuOpen && (
            <div
              className={`absolute bottom-full mb-2 bg-[#1a2332] border border-white/10 rounded-xl shadow-2xl shadow-black/40 p-2 z-50 ${
                collapsed
                  ? "left-full ml-2 w-[200px]"
                  : "left-0 w-[220px]"
              }`}
            >
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                <User size={16} />
                My Profile
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                <HelpCircle size={16} />
                Help & Support
              </Link>
              <div className="my-1 border-t border-white/5" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}

          {/* User button */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`
              flex items-center gap-3 w-full rounded-xl transition-all duration-200
              hover:bg-white/5 p-2
              ${collapsed ? "lg:justify-center" : ""}
            `}
          >
            {/* Avatar with online indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center ring-2 ring-[#1B7340]/30">
                <span className="text-sm font-semibold text-white">
                  {userInitial}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0F172A]" />
            </div>

            {/* User info — hidden when collapsed */}
            {user && (
              <div
                className={`flex-1 min-w-0 text-left ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                <p className="text-sm font-medium text-white truncate">
                  {user.displayName || user.email}
                </p>
                <span
                  className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md mt-0.5 ${roleBadge.className}`}
                >
                  {roleBadge.label}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Environment indicator */}
        <div className={`px-3 pb-2 ${collapsed ? "lg:hidden" : ""}`}>
          <div className="flex items-center gap-1.5 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-gray-600">
              Development
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
