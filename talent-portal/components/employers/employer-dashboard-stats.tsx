"use client";

import { Briefcase, Users, MessageSquare, Award } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmployerStats {
  activeJobs: number;
  totalApplications: number;
  pendingIntros: number;
  totalPlacements: number;
}

interface EmployerDashboardStatsProps {
  stats: EmployerStats;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface StatCardConfig {
  key: keyof EmployerStats;
  label: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const cardConfigs: StatCardConfig[] = [
  {
    key: "activeJobs",
    label: "Active Jobs",
    icon: Briefcase,
    iconBg: "bg-[var(--primary)]/10",
    iconColor: "text-[var(--primary)]",
  },
  {
    key: "totalApplications",
    label: "Total Applications",
    icon: Users,
    iconBg: "bg-[var(--info-light)]",
    iconColor: "text-[var(--info)]",
  },
  {
    key: "pendingIntros",
    label: "Pending Intros",
    icon: MessageSquare,
    iconBg: "bg-[var(--warning-light)]",
    iconColor: "text-[var(--warning)]",
  },
  {
    key: "totalPlacements",
    label: "Total Placements",
    icon: Award,
    iconBg: "bg-[var(--success-light)]",
    iconColor: "text-[var(--success)]",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmployerDashboardStats({
  stats,
}: EmployerDashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cardConfigs.map((config) => {
        const Icon = config.icon;
        const value = stats[config.key];

        return (
          <div
            key={config.key}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}
              >
                <Icon className={`h-6 w-6 ${config.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  {value.toLocaleString()}
                </p>
                <p className="text-xs font-medium text-[var(--neutral-gray)]">
                  {config.label}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
