"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Briefcase,
  Users,
  FileText,
  Send,
  Star,
  Settings,
  BarChart3,
  Tags,
  Shield,
  ClipboardList,
  Building2,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const candidateNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/applications", label: "Applications", icon: ClipboardList },
  { href: "/dashboard/intro-requests", label: "Intro Requests", icon: Send },
  { href: "/dashboard/cv", label: "CV", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const employerNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/candidates", label: "Candidates", icon: Users },
  { href: "/dashboard/intro-requests", label: "Intro Requests", icon: Send },
  { href: "/dashboard/shortlists", label: "Shortlists", icon: Star },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/employers", label: "Employers", icon: Building2 },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/intro-requests", label: "Intro Requests", icon: Send },
  { href: "/admin/placements", label: "Placements", icon: ClipboardList },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/taxonomy", label: "Taxonomy", icon: Tags },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case "admin":
      return adminNav;
    case "employer":
      return employerNav;
    case "candidate":
    default:
      return candidateNav;
  }
}

interface SidebarProps {
  role?: string;
}

export function Sidebar({ role = "candidate" }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavItems(role);

  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`sticky top-16 hidden h-[calc(100vh-4rem)] flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface-0)] transition-all duration-300 ease-[var(--ease-out-expo)] lg:block ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm"
                    : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--foreground)]"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon
                  className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                    active
                      ? "text-[var(--primary)]"
                      : "text-[var(--neutral-gray)] group-hover:text-[var(--foreground)]"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {active && !collapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-[var(--border)] p-3">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--foreground)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
