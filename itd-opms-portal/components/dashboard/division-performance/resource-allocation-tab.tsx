"use client";

import { useMemo } from "react";
import type { OfficeMetrics } from "@/lib/division-constants";
import { formatCurrency } from "@/lib/division-constants";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { WaterfallChart } from "@/components/dashboard/charts/waterfall-chart";
import { FunnelChart } from "@/components/dashboard/charts/funnel-chart";

interface ResourceAllocationTabProps {
  metrics: OfficeMetrics[];
  isLoading: boolean;
}

export function ResourceAllocationTab({ metrics, isLoading }: ResourceAllocationTabProps) {
  const waterfallData = useMemo(() => {
    const totalBudget = metrics.reduce((s, m) => s + m.budgetApproved, 0);
    const items: Array<{
      name: string;
      value: number;
      type: "increase" | "decrease" | "total";
    }> = [
      { name: "Total Budget", value: Math.round(totalBudget / 1e3), type: "total" },
    ];
    for (const m of metrics) {
      const spent = Math.round(m.budgetSpent / 1e3);
      items.push({
        name: m.code,
        value: spent,
        type: "decrease",
      });
    }
    const totalSpent = metrics.reduce((s, m) => s + m.budgetSpent, 0);
    const remaining = Math.round(Math.max(0, totalBudget - totalSpent) / 1e3);
    items.push({ name: "Remaining", value: remaining, type: "total" });
    return items;
  }, [metrics]);

  const funnelData = useMemo(() => {
    const proposed = metrics.reduce((s, m) => s + m.proposedProjects, 0);
    const active = metrics.reduce((s, m) => s + m.activeProjects, 0);
    const inProgress = metrics.reduce(
      (s, m) => s + (m.totalProjects - m.completedProjects - m.proposedProjects),
      0,
    );
    const completed = metrics.reduce((s, m) => s + m.completedProjects, 0);
    return [
      { name: "Proposed", value: proposed, color: "#9CA3AF" },
      { name: "Approved/Active", value: active, color: "#3B82F6" },
      { name: "In Progress", value: Math.max(0, inProgress), color: "#8B5CF6" },
      { name: "Completed", value: completed, color: "#22C55E" },
    ];
  }, [metrics]);

  return (
    <div className="space-y-4">
      <ChartCard
        title="Budget Allocation Waterfall"
        subtitle="Budget distribution across divisions (in K)"
      >
        {isLoading ? (
          <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        ) : (
          <WaterfallChart
            data={waterfallData}
            height={300}
            formatValue={(v) => `${v}K`}
          />
        )}
      </ChartCard>
      <ChartCard
        title="Project Pipeline Funnel"
        subtitle="Aggregate project stages across all divisions"
      >
        {isLoading ? (
          <div className="h-72 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        ) : (
          <FunnelChart data={funnelData} height={260} />
        )}
      </ChartCard>
    </div>
  );
}
