"use client";

import { motion } from "framer-motion";
import { Code, Layers, GraduationCap, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "skills" | "tracks" | "cohorts" | "locations";

const tabs = [
  { id: "skills" as const, label: "Skills", icon: Code, color: "var(--primary)" },
  { id: "tracks" as const, label: "Tracks", icon: Layers, color: "var(--accent-orange)" },
  { id: "cohorts" as const, label: "Cohorts", icon: GraduationCap, color: "var(--success)" },
  { id: "locations" as const, label: "Locations", icon: MapPin, color: "var(--info)" },
];

interface TaxonomyTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  counts?: Record<Tab, number>;
}

export function TaxonomyTabs({ activeTab, onTabChange, counts }: TaxonomyTabsProps) {
  return (
    <div role="tablist" className="flex border-b border-[var(--border)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium relative -mb-px transition-colors",
              isActive
                ? "text-[var(--text-primary)]"
                : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon size={16} />
            {tab.label}
            {counts && counts[tab.id] !== undefined && (
              <span className="rounded-full bg-[var(--surface-2)] text-xs px-1.5 py-0.5">
                {counts[tab.id]}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="taxonomy-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: tab.color }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
