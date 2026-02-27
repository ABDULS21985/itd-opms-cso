"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Shield,
  FileText,
  GitBranch,
  Calendar,
  Target,
  Users,
  Brain,
  UserPlus,
  ClipboardList,
  FolderKanban,
  Briefcase,
  ListTodo,
  AlertTriangle,
  Headphones,
  BookOpen,
  CircleDot,
  TicketCheck,
  Bug,
  HardDrive,
  Server,
  KeyRound,
  ScrollText,
  Settings,
  Library,
  Search,
  PenSquare,
  ShieldCheck,
  AlertOctagon,
  ClipboardCheck,
  Scale,
  UserCheck,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  HelpCircle,
  X,
  Building2,
  Network,
  MonitorSmartphone,
  Mail,
  Activity,
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
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Navigation structure -- 7 domain groups per spec                   */
/* ------------------------------------------------------------------ */

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/dashboard/governance/policies", label: "Policies", icon: FileText, permission: "governance.view" },
      { href: "/dashboard/governance/raci", label: "RACI", icon: GitBranch, permission: "governance.view" },
      { href: "/dashboard/governance/meetings", label: "Meetings", icon: Calendar, permission: "governance.view" },
      { href: "/dashboard/governance/actions", label: "Action Tracker", icon: ClipboardList, permission: "governance.view" },
      { href: "/dashboard/governance/okrs", label: "OKRs", icon: Target, permission: "governance.view" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/dashboard/people/directory", label: "Directory", icon: Users, permission: "people.view" },
      { href: "/dashboard/people/skills", label: "Skills", icon: Brain, permission: "people.view" },
      { href: "/dashboard/people/onboarding", label: "Onboarding", icon: UserPlus, permission: "people.view" },
      { href: "/dashboard/people/roster", label: "Roster", icon: ClipboardList, permission: "people.view" },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/dashboard/planning/portfolios", label: "Portfolios", icon: FolderKanban, permission: "planning.view" },
      { href: "/dashboard/planning/projects", label: "Projects", icon: Briefcase, permission: "planning.view" },
      { href: "/dashboard/planning/work-items", label: "Work Items", icon: ListTodo, permission: "planning.view" },
      { href: "/dashboard/planning/risks", label: "Risks & Issues", icon: AlertTriangle, permission: "planning.view" },
      { href: "/dashboard/planning/pir", label: "PIR Reviews", icon: ClipboardCheck, permission: "planning.view" },
    ],
  },
  {
    label: "ITSM",
    items: [
      { href: "/dashboard/itsm/service-catalog", label: "Service Catalog", icon: BookOpen, permission: "itsm.view" },
      { href: "/dashboard/itsm/tickets", label: "Tickets", icon: CircleDot, permission: "itsm.view" },
      { href: "/dashboard/itsm/my-queue", label: "My Queue", icon: TicketCheck, permission: "itsm.view" },
      { href: "/dashboard/itsm/problems", label: "Problems", icon: Bug, permission: "itsm.view" },
    ],
  },
  {
    label: "Assets",
    items: [
      { href: "/dashboard/assets/inventory", label: "Inventory", icon: HardDrive, permission: "assets.view" },
      { href: "/dashboard/assets/cmdb", label: "CMDB", icon: Server, permission: "assets.view" },
      { href: "/dashboard/assets/licenses", label: "Licenses", icon: KeyRound, permission: "assets.view" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { href: "/dashboard/knowledge", label: "Knowledge Base", icon: Library, permission: "knowledge.view" },
      { href: "/dashboard/knowledge/search", label: "Search", icon: Search, permission: "knowledge.view" },
      { href: "/dashboard/knowledge/articles/new", label: "New Article", icon: PenSquare, permission: "knowledge.manage" },
    ],
  },
  {
    label: "GRC",
    items: [
      { href: "/dashboard/grc", label: "GRC Dashboard", icon: ShieldCheck, permission: "grc.view" },
      { href: "/dashboard/grc/risks", label: "Risks", icon: AlertOctagon, permission: "grc.view" },
      { href: "/dashboard/grc/audits", label: "Audits", icon: ClipboardCheck, permission: "grc.view" },
      { href: "/dashboard/grc/compliance", label: "Compliance", icon: Scale, permission: "grc.view" },
      { href: "/dashboard/grc/access-reviews", label: "Access Reviews", icon: UserCheck, permission: "grc.view" },
      { href: "/dashboard/grc/reports", label: "Reports", icon: FileBarChart, permission: "grc.view" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/system", label: "Overview", icon: LayoutDashboard, permission: "system.view" },
      { href: "/dashboard/system/users", label: "Users", icon: Users, permission: "system.manage" },
      { href: "/dashboard/system/roles", label: "Roles & Permissions", icon: Shield, permission: "system.manage" },
      { href: "/dashboard/system/tenants", label: "Tenants", icon: Building2, permission: "system.manage" },
      { href: "/dashboard/system/org-units", label: "Org Structure", icon: Network, permission: "system.manage" },
      { href: "/dashboard/system/audit-logs", label: "Audit Logs", icon: ScrollText, permission: "system.view" },
      { href: "/dashboard/system/sessions", label: "Sessions", icon: MonitorSmartphone, permission: "system.manage" },
      { href: "/dashboard/system/settings", label: "Settings", icon: Settings, permission: "system.manage" },
      { href: "/dashboard/system/email-templates", label: "Email Templates", icon: Mail, permission: "system.manage" },
      { href: "/dashboard/system/health", label: "Platform Health", icon: Activity, permission: "system.view" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRoleBadge(roles: string[] | undefined) {
  if (roles?.includes("global_admin") || roles?.includes("super_admin"))
    return { label: "Global Admin", className: "bg-red-500/20 text-red-400" };
  if (roles?.includes("itd_director"))
    return { label: "ITD Director", className: "bg-blue-500/20 text-blue-400" };
  if (roles?.includes("head_of_division") || roles?.includes("department_head"))
    return { label: "Head of Division", className: "bg-purple-500/20 text-purple-400" };
  if (roles?.includes("supervisor") || roles?.includes("team_lead") || roles?.includes("manager"))
    return { label: "Supervisor", className: "bg-amber-500/20 text-amber-400" };
  if (roles?.includes("auditor"))
    return { label: "Auditor", className: "bg-cyan-500/20 text-cyan-400" };
  if (roles?.includes("service_desk_agent"))
    return { label: "Service Desk", className: "bg-orange-500/20 text-orange-400" };
  return { label: "Staff", className: "bg-emerald-500/20 text-emerald-400" };
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Sidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const userPermissions = user?.permissions || [];
  const roleBadge = getRoleBadge(user?.roles);
  const userInitial = (user?.displayName || user?.email || "U")
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

  // Filter groups based on permissions (show all if wildcard or no permissions defined yet)
  const hasWildcard = userPermissions.includes("*");
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.permission ||
          userPermissions.length === 0 ||
          hasWildcard ||
          userPermissions.includes(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const exactMatchRoutes = ["/dashboard", "/dashboard/system"];
  const isActive = (href: string) =>
    exactMatchRoutes.includes(href)
      ? pathname === href
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
        aria-label="Main navigation"
      >
        {/* -------------------------------------------------------- */}
        {/*  Logo & Branding                                          */}
        {/* -------------------------------------------------------- */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm flex-shrink-0">
          {/* Expanded logo */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 group ${collapsed ? "lg:hidden" : ""}`}
          >
            <Image
              src="/logo.jpeg"
              alt="CBN Logo"
              width={32}
              height={32}
              className="rounded-lg shadow-lg shadow-[#1B7340]/20 group-hover:shadow-[#1B7340]/40 transition-shadow"
            />
            <div className="flex items-center gap-2">
              <span className="font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                CBN OPMS
              </span>
              <span className="text-[9px] font-medium bg-[#1B7340]/30 text-[#C4A962] px-1.5 py-0.5 rounded-md">
                v1.0
              </span>
            </div>
          </Link>

          {/* Collapsed logo */}
          {collapsed && (
            <Link href="/dashboard" className="hidden lg:flex mx-auto">
              <Image
                src="/logo.jpeg"
                alt="CBN Logo"
                width={32}
                height={32}
                className="rounded-lg shadow-lg shadow-[#1B7340]/20"
              />
            </Link>
          )}

          {/* Collapse toggle -- desktop only */}
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

          {/* Close button -- mobile only */}
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
        <nav className="flex-1 py-3 px-3 overflow-y-auto sidebar-scroll">
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex > 0 ? "mt-5" : ""}>
              {/* Section header */}
              <p
                className={`px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 transition-opacity duration-200 ${
                  collapsed
                    ? "lg:opacity-0 lg:h-0 lg:mb-0 lg:overflow-hidden"
                    : ""
                }`}
              >
                {group.label}
              </p>

              {/* Section divider -- collapsed desktop */}
              {groupIndex > 0 && collapsed && (
                <div className="hidden lg:block mx-3 mb-3 border-t border-white/5" />
              )}

              {/* Nav items */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
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

                      {/* Label -- hidden when collapsed */}
                      <span
                        className={`flex-1 truncate transition-opacity duration-200 ${
                          collapsed ? "lg:hidden" : ""
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* -------------------------------------------------------- */}
        {/*  User Section                                              */}
        {/* -------------------------------------------------------- */}
        <div
          className="relative border-t border-white/5 p-3"
          ref={userMenuRef}
        >
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
                href="/dashboard/system/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                <User size={16} />
                My Profile
              </Link>
              <Link
                href="/dashboard/system/settings"
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

            {/* User info -- hidden when collapsed */}
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
