"use client";

import { Code, Layers, GraduationCap, MapPin, type LucideIcon } from "lucide-react";
import { useTaxonomyStats } from "@/hooks/use-taxonomy";
import { AnimatedCard, AnimatedCardGrid } from "@/components/shared/animated-card";
import type { TaxonomyStats } from "@/types/taxonomy";

interface CardDef {
  label: string;
  icon: LucideIcon;
  color: string;
  totalKey: keyof TaxonomyStats;
  activeKey: keyof TaxonomyStats;
}

const cards: CardDef[] = [
  { label: "Skills", icon: Code, color: "var(--primary)", totalKey: "totalSkills", activeKey: "activeSkills" },
  { label: "Tracks", icon: Layers, color: "var(--accent-orange)", totalKey: "totalTracks", activeKey: "activeTracks" },
  { label: "Cohorts", icon: GraduationCap, color: "var(--success)", totalKey: "totalCohorts", activeKey: "activeCohorts" },
  { label: "Locations", icon: MapPin, color: "var(--info)", totalKey: "totalLocations", activeKey: "activeLocations" },
];

export function TaxonomyStatsHeader() {
  const { data: stats, isLoading } = useTaxonomyStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <AnimatedCardGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <AnimatedCard key={card.label} index={i} accentColor={card.color}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" style={{ color: card.color }} />
                <span className="text-sm font-medium text-[var(--neutral-gray)]">
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {stats[card.totalKey]}
              </p>
              <p className="text-xs text-[var(--neutral-gray)] tabular-nums">
                {stats[card.activeKey]} active
              </p>
            </div>
          </AnimatedCard>
        );
      })}
    </AnimatedCardGrid>
  );
}
