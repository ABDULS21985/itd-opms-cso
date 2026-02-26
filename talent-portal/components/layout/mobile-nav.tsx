"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
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
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

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

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  role?: string;
}

export function MobileNav({ open, onClose, role = "candidate" }: MobileNavProps) {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();
  const navItems = getNavItems(role);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Close on route change
  useEffect(() => {
    handleClose();
  }, [pathname, handleClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleClose]);

  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-[var(--surface-0)] shadow-2xl">
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
          <div className="flex items-center gap-2.5">
            <svg
              width="32"
              height="32"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="18" cy="18" r="18" fill="var(--primary)" />
              <text
                x="18"
                y="22"
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                D
              </text>
            </svg>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-[var(--foreground)]">
                Digibit
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-gray)]">
                Talent Portal
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)]"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        {isLoggedIn && user && (
          <div className="border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
                {user.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : user.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  {user.displayName ?? "User"}
                </p>
                <p className="truncate text-xs text-[var(--neutral-gray)]">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] flex-shrink-0 ${
                      active ? "text-[var(--primary)]" : ""
                    }`}
                  />
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom action */}
        {isLoggedIn && (
          <div className="border-t border-[var(--border)] p-3">
            <button
              type="button"
              onClick={() => {
                logout();
                handleClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[var(--error-light)]"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
