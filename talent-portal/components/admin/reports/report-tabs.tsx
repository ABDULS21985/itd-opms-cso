"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  Briefcase,
  Building2,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportTab, TabDef } from "./shared";

const TABS: TabDef[] = [
  { id: "executive", label: "Executive Summary", icon: BarChart3 },
  { id: "candidates", label: "Candidates", icon: Users },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "employers", label: "Employers", icon: Building2 },
  { id: "placements", label: "Placements", icon: TrendingUp },
  { id: "health", label: "Platform Health", icon: Activity },
];

interface ReportTabsProps {
  active: ReportTab;
  onChange: (tab: ReportTab) => void;
}

export function ReportTabs({ active, onChange }: ReportTabsProps) {
  return (
    <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-1.5 flex gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="report-tab-pill"
                className="absolute inset-0 bg-[var(--primary)] rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={16} />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { TABS };
