"use client";

import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  Award,
  MessageSquare,
  Building2,
  Eye,
  FileText,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatItem {
  label: string;
  value: number;
  change?: number;
  icon: string;
}

interface StatsCardsProps {
  stats: StatItem[];
}

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  briefcase: Briefcase,
  award: Award,
  message: MessageSquare,
  building: Building2,
  eye: Eye,
  file: FileText,
  chart: BarChart3,
};

function resolveIcon(name: string): LucideIcon {
  return iconMap[name] ?? BarChart3;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = resolveIcon(stat.icon);
        const hasChange = stat.change != null && stat.change !== 0;
        const isPositive = (stat.change ?? 0) > 0;

        return (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <Icon className="h-5 w-5 text-[var(--primary)]" />
              </div>
              {hasChange && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isPositive
                      ? "bg-[var(--success-light)] text-[var(--success-dark)]"
                      : "bg-[var(--error-light)] text-[var(--error-dark)]"
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(stat.change!)}%
                </span>
              )}
            </div>

            <div className="mt-4">
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {stat.value.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[var(--neutral-gray)]">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
