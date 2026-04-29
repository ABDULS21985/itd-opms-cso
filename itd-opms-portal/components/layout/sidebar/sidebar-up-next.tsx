"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckSquare,
  ShieldCheck,
  Handshake,
  Bug,
  Server,
  ShieldAlert,
  TicketCheck,
  FileEdit,
  UserCheck,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface UpNextProps {
  /** href → numeric count, as returned by /sidebar/badges */
  counts: Record<string, number>;
  pathname: string;
}

interface UpNextRow {
  href: string;
  icon: LucideIcon;
  label: (n: number) => string;
  /** Higher priority items appear first when ranking. */
  weight: number;
}

const ROWS: UpNextRow[] = [
  {
    href: "/dashboard/itsm/major-incidents",
    icon: ShieldAlert,
    label: (n) => (n === 1 ? "1 major incident open" : `${n} major incidents open`),
    weight: 100,
  },
  {
    href: "/dashboard/itsm/my-queue",
    icon: TicketCheck,
    label: (n) =>
      n === 1 ? "1 ticket in your queue" : `${n} tickets in your queue`,
    weight: 90,
  },
  {
    href: "/dashboard/governance/approvals",
    icon: CheckSquare,
    label: (n) => (n === 1 ? "1 approval awaiting you" : `${n} approvals awaiting you`),
    weight: 85,
  },
  {
    href: "/dashboard/ssa/approvals",
    icon: Server,
    label: (n) =>
      n === 1 ? "1 server request to review" : `${n} server requests to review`,
    weight: 80,
  },
  {
    href: "/dashboard/grc/access-reviews",
    icon: UserCheck,
    label: (n) =>
      n === 1 ? "1 active access review" : `${n} active access reviews`,
    weight: 70,
  },
  {
    href: "/dashboard/planning/change-requests",
    icon: FileEdit,
    label: (n) =>
      n === 1 ? "1 change request open" : `${n} change requests open`,
    weight: 60,
  },
  {
    href: "/dashboard/itsm/problems",
    icon: Bug,
    label: (n) => (n === 1 ? "1 open problem" : `${n} open problems`),
    weight: 55,
  },
  {
    href: "/dashboard/planning/risks",
    icon: AlertTriangle,
    label: (n) => (n === 1 ? "1 risk to address" : `${n} risks to address`),
    weight: 50,
  },
  {
    href: "/dashboard/cmdb/warranties",
    icon: ShieldCheck,
    label: (n) =>
      n === 1
        ? "1 warranty expiring in 30 days"
        : `${n} warranties expiring in 30 days`,
    weight: 40,
  },
  {
    href: "/dashboard/cmdb/contracts",
    icon: Handshake,
    label: (n) =>
      n === 1
        ? "1 contract expiring in 60 days"
        : `${n} contracts expiring in 60 days`,
    weight: 35,
  },
];

const MAX_ROWS = 4;

export function SidebarUpNext({ counts, pathname }: UpNextProps) {
  const rows = useMemo(() => {
    const filled = ROWS.map((r) => ({
      ...r,
      count: counts[r.href] || 0,
    })).filter((r) => r.count > 0);
    filled.sort((a, b) => {
      if (b.count === a.count) return b.weight - a.weight;
      // Heavier-weight items break ties first; otherwise, higher count wins.
      return b.count * (b.weight / 50) - a.count * (a.weight / 50);
    });
    return filled.slice(0, MAX_ROWS);
  }, [counts]);

  if (rows.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--sidebar-text-subtle)] flex items-center gap-1.5">
        <Sparkles size={10} className="text-[color:var(--sidebar-accent)]" />
        Up Next
      </p>
      <div className="space-y-0.5">
        {rows.map((row) => {
          const Icon = row.icon;
          const active = pathname === row.href || pathname.startsWith(row.href + "/");
          return (
            <Link
              key={row.href}
              href={row.href}
              className={`group flex items-center gap-2.5 rounded-xl text-xs transition-all duration-200 px-3 py-2 border-l-[3px] ${
                active
                  ? "border-[color:var(--sidebar-accent)] bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                  : "border-transparent text-[color:var(--sidebar-text-muted)] hover:bg-[color:var(--sidebar-hover-bg)] hover:text-[color:var(--sidebar-text)]"
              }`}
            >
              <Icon size={13} className="flex-shrink-0" />
              <span className="flex-1 truncate">{row.label(row.count)}</span>
              <ChevronRight
                size={12}
                className="flex-shrink-0 text-[color:var(--sidebar-text-faint)] group-hover:text-[color:var(--sidebar-text-muted)] transition-colors"
              />
            </Link>
          );
        })}
      </div>
      <div className="mx-3 mt-2 border-t border-[color:var(--sidebar-border)]" />
    </div>
  );
}
