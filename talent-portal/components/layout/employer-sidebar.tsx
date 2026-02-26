"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Mail,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  KanbanSquare,
  Calendar,
  BarChart3,
  UserPlus,
  Sparkles,
  Building2,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  BadgeCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useMyEmployerOrg } from "@/hooks/use-employers";
import { useUnreadCount } from "@/hooks/use-notifications";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "Overview" | "Hiring" | "Collaboration" | "Account";
  description?: string;
  badgeKey?: string;
  cta?: boolean;
}

interface EmployerSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

const navItems: NavItem[] = [
  {
    href: "/employer",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Overview",
    description: "Your hiring overview",
  },
  {
    href: "/employer/analytics",
    label: "Analytics",
    icon: BarChart3,
    group: "Overview",
    description: "Insights & performance",
  },
  {
    href: "/employer/pipeline",
    label: "Pipeline",
    icon: KanbanSquare,
    group: "Hiring",
    description: "Manage candidate stages",
  },
  {
    href: "/employer/jobs",
    label: "My Jobs",
    icon: Briefcase,
    group: "Hiring",
    description: "All job postings",
  },
  {
    href: "/employer/recommendations",
    label: "Recommendations",
    icon: Sparkles,
    group: "Hiring",
    description: "AI-matched candidates",
  },
  {
    href: "/employer/candidates",
    label: "Discover Talent",
    icon: Users,
    group: "Hiring",
    description: "Search candidates",
  },
  {
    href: "/employer/interviews",
    label: "Interviews",
    icon: Calendar,
    group: "Hiring",
    description: "Schedule & manage",
  },
  {
    href: "/employer/intro-requests",
    label: "Intro Requests",
    icon: Mail,
    group: "Collaboration",
    description: "Incoming requests",
    badgeKey: "introRequests",
  },
  {
    href: "/employer/team",
    label: "Team",
    icon: UserPlus,
    group: "Collaboration",
    description: "Members & roles",
  },
  {
    href: "/employer/settings",
    label: "Settings",
    icon: Settings,
    group: "Account",
    description: "Security & preferences",
  },
];

const groups: Array<NavItem["group"]> = [
  "Overview",
  "Hiring",
  "Collaboration",
  "Account",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getInitials(nameOrEmail: string) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "E";
  const parts = s.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.charAt(0).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Tooltip (collapsed hover)                                           */
/* ------------------------------------------------------------------ */

function NavTooltip({
  label,
  children,
  collapsed,
}: {
  label: string;
  children: React.ReactNode;
  collapsed: boolean;
}) {
  const [show, setShow] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (!collapsed) return <>{children}</>;

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        timeout.current = setTimeout(() => setShow(true), 200);
      }}
      onMouseLeave={() => {
        clearTimeout(timeout.current);
        setShow(false);
      }}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg pointer-events-none"
          >
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function EmployerSidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: EmployerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: org } = useMyEmployerOrg();
  const { data: unreadCount = 0 } = useUnreadCount();

  // Close mobile on route change
  useEffect(() => {
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const identity = useMemo(() => {
    const display = user?.displayName || user?.email || "Employer";
    const email = user?.email || "";
    const initials = org?.companyName
      ? getInitials(org.companyName)
      : getInitials(display);
    const orgName = org?.companyName || "Employer Workspace";
    const isVerified = org?.verificationStatus === "verified";
    return { display, email, initials, orgName, isVerified };
  }, [user, org]);

  const isActive = (href: string) =>
    href === "/employer"
      ? pathname === "/employer"
      : pathname === href || pathname.startsWith(href + "/");

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const grouped = useMemo(() => {
    const map = new Map<NavItem["group"], NavItem[]>();
    for (const g of groups) map.set(g, []);
    for (const item of navItems) map.get(item.group)!.push(item);
    return map;
  }, []);

  // Badge counts derived from real data
  const badgeCounts: Record<string, number> = useMemo(
    () => ({
      introRequests: unreadCount,
    }),
    [unreadCount],
  );

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 280 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={[
          "flex flex-col h-screen",
          "bg-gradient-to-b from-[#1a1207] via-[#1c1508] to-[#16120a]",
          "border-r border-white/5 shadow-2xl",
          "fixed inset-y-0 left-0 z-50",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:z-10 lg:translate-x-0",
        ].join(" ")}
        style={{ willChange: "width" }}
        role="navigation"
        aria-label="Employer navigation"
      >
        {/* -------------------------------------------------------- */}
        {/*  Logo & Branding                                          */}
        {/* -------------------------------------------------------- */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-white/[0.02] flex-shrink-0">
          <Link
            href="/employer"
            className={`flex items-center gap-2.5 group ${collapsed ? "lg:hidden" : ""}`}
            aria-label="Go to Employer dashboard"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C4A35A] to-[#A8893D] flex items-center justify-center shadow-lg shadow-[#C4A35A]/20 group-hover:shadow-[#C4A35A]/40 transition-shadow">
              <Sparkles size={17} className="text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Employer
              </span>
              <span className="text-[9px] font-medium bg-[#C4A35A]/20 text-[#F5B563] px-1.5 py-0.5 rounded-md">
                v2.0
              </span>
            </div>
          </Link>

          {/* Collapsed logo */}
          {collapsed && (
            <Link
              href="/employer"
              className="hidden lg:flex mx-auto"
              aria-label="Go to Employer dashboard"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C4A35A] to-[#A8893D] flex items-center justify-center shadow-lg shadow-[#C4A35A]/20">
                <Sparkles size={17} className="text-white" />
              </div>
            </Link>
          )}

          {/* Collapse toggle — desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 flex-shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Close button — mobile */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Employer Org Card                                         */}
        {/* -------------------------------------------------------- */}
        <div className={`px-3 pt-3 flex-shrink-0 ${collapsed ? "lg:px-2" : ""}`}>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            <div
              className={`flex items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`}
            >
              {/* Logo / Initials */}
              <div className="relative flex-shrink-0">
                {org?.logoUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#C4A35A]/20">
                    <Image
                      src={org.logoUrl}
                      alt={identity.orgName}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C4A35A] to-[#A8893D] flex items-center justify-center ring-2 ring-[#C4A35A]/20">
                    <span className="text-sm font-semibold text-white">
                      {identity.initials}
                    </span>
                  </div>
                )}
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#1a1207]" />
              </div>

              {/* Org info — hidden when collapsed */}
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white truncate">
                      {identity.orgName}
                    </p>
                    {identity.isVerified && (
                      <BadgeCheck
                        size={14}
                        className="text-[#C4A35A] flex-shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#C4A35A]/15 text-[#F5B563] ring-1 ring-[#C4A35A]/20">
                      <Building2 size={10} />
                      Employer
                    </span>
                    {identity.isVerified && (
                      <span className="text-[10px] text-emerald-400 font-medium">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Post a Job CTA */}
            {!collapsed && (
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href="/employer/jobs/new"
                  className="relative flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C4A35A] to-[#A8893D] px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#C4A35A]/20 hover:shadow-[#C4A35A]/40 transition-all duration-200 overflow-hidden group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A35A]/40"
                >
                  {/* Shine overlay */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out cta-shine" />
                  <PlusCircle size={14} className="relative z-10" />
                  <span className="relative z-10">Post a Job</span>
                </Link>

                <Link
                  href="/employer"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A35A]/40"
                  aria-label="Open dashboard"
                  title="Open dashboard"
                >
                  <ExternalLink size={16} />
                </Link>
              </div>
            )}

            {/* Collapsed CTA */}
            {collapsed && (
              <NavTooltip label="Post a Job" collapsed>
                <Link
                  href="/employer/jobs/new"
                  className="mt-2 flex items-center justify-center w-full rounded-xl bg-gradient-to-r from-[#C4A35A] to-[#A8893D] p-2 text-white shadow-lg shadow-[#C4A35A]/20 hover:shadow-[#C4A35A]/40 transition-all duration-200 active:scale-[0.95]"
                  aria-label="Post a Job"
                >
                  <PlusCircle size={18} />
                </Link>
              </NavTooltip>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Navigation                                                */}
        {/* -------------------------------------------------------- */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto employer-sidebar-scroll">
          {groups.map((group, idx) => {
            const items = grouped.get(group) || [];
            if (items.length === 0) return null;

            return (
              <div key={group} className={idx > 0 ? "mt-5" : ""}>
                {/* Section header */}
                <p
                  className={`px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 transition-opacity duration-200 ${
                    collapsed
                      ? "lg:opacity-0 lg:h-0 lg:mb-0 lg:overflow-hidden"
                      : ""
                  }`}
                >
                  {group}
                </p>

                {/* Section divider — collapsed */}
                {idx > 0 && collapsed && (
                  <div className="hidden lg:block mx-3 mb-3 border-t border-white/5" />
                )}

                {/* Nav items */}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    const badge = item.badgeKey
                      ? badgeCounts[item.badgeKey] || 0
                      : 0;

                    return (
                      <NavTooltip
                        key={item.href}
                        label={item.label}
                        collapsed={collapsed}
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={[
                            "group relative flex items-center gap-3 rounded-xl text-sm font-medium",
                            "transition-all duration-200",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A35A]/40",
                            "active:scale-[0.98]",
                            collapsed
                              ? "lg:justify-center lg:px-0 lg:w-10 lg:h-10 lg:mx-auto lg:rounded-xl"
                              : "px-3 py-2.5",
                            active
                              ? collapsed
                                ? "bg-[#C4A35A]/15 text-white"
                                : "bg-[#C4A35A]/12 text-white"
                              : "text-gray-400 hover:bg-white/5 hover:text-white",
                          ].join(" ")}
                        >
                          {/* Active left accent — expanded only */}
                          {active && !collapsed && (
                            <motion.span
                              layoutId="employer-nav-active"
                              className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full bg-gradient-to-b from-[#C4A35A] to-[#A8893D]"
                              aria-hidden="true"
                              transition={{
                                type: "spring",
                                stiffness: 380,
                                damping: 30,
                              }}
                            />
                          )}

                          <Icon
                            size={20}
                            className={`flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${
                              active
                                ? "text-[#C4A35A]"
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
                            <span className="hidden lg:block absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#1a1207]" />
                          )}
                        </Link>
                      </NavTooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* -------------------------------------------------------- */}
        {/*  Footer: Quick links                                       */}
        {/* -------------------------------------------------------- */}
        <div
          className={`border-t border-white/5 px-3 py-2 ${collapsed ? "lg:px-1.5" : ""}`}
        >
          {!collapsed && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Link
                href="/employer/settings"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A35A]/40"
                aria-label="Security settings"
              >
                <ShieldCheck size={16} />
                Security
              </Link>
              <Link
                href="/employer/settings"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A35A]/40"
                aria-label="Help and support"
              >
                <HelpCircle size={16} />
                Help
              </Link>
            </div>
          )}

          {collapsed && (
            <div className="hidden lg:flex flex-col items-center gap-1 mb-2">
              <NavTooltip label="Security" collapsed>
                <Link
                  href="/employer/settings"
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
                  aria-label="Security settings"
                >
                  <ShieldCheck size={16} />
                </Link>
              </NavTooltip>
              <NavTooltip label="Help" collapsed>
                <Link
                  href="/employer/settings"
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
                  aria-label="Help and support"
                >
                  <HelpCircle size={16} />
                </Link>
              </NavTooltip>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------- */}
        {/*  User Section                                              */}
        {/* -------------------------------------------------------- */}
        <div className="border-t border-white/5 p-3">
          <NavTooltip label={identity.display} collapsed={collapsed}>
            <button
              onClick={handleLogout}
              className={[
                "flex items-center gap-3 w-full rounded-xl transition-all duration-200",
                "hover:bg-red-500/10 p-2 text-gray-400 hover:text-red-400",
                collapsed ? "lg:justify-center" : "",
              ].join(" ")}
              title={collapsed ? "Sign Out" : undefined}
            >
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C4A35A]/30 to-[#A8893D]/30 flex items-center justify-center ring-2 ring-[#C4A35A]/10">
                  <span className="text-sm font-semibold text-[#F5B563]">
                    {getInitials(identity.display)}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#1a1207]" />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-white truncate">
                    {identity.display}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    Sign Out
                  </p>
                </div>
              )}

              {!collapsed && <LogOut size={16} className="flex-shrink-0" />}
            </button>
          </NavTooltip>
        </div>
      </motion.aside>
    </>
  );
}
