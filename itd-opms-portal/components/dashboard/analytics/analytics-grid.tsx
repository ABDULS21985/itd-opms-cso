"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { FilterBar } from "@/components/dashboard/charts/filter-bar";
import { useOfficeAnalytics } from "@/hooks/use-reporting";
import { TicketHealthPanel } from "@/components/dashboard/analytics/ticket-health-panel";
import { ProjectPortfolioPanel } from "@/components/dashboard/analytics/project-portfolio-panel";
import { SLAPerformancePanel } from "@/components/dashboard/analytics/sla-performance-panel";
import { AssetLandscapePanel } from "@/components/dashboard/analytics/asset-landscape-panel";
import { RiskHeatmapPanel } from "@/components/dashboard/analytics/risk-heatmap-panel";
import { TeamCapacityPanel } from "@/components/dashboard/analytics/team-capacity-panel";

interface AnalyticsGridProps {
  delay?: number;
}

export function AnalyticsGrid({ delay }: AnalyticsGridProps) {
  const baseDelay = delay ?? 0.6;

  const [timeRange, setTimeRange] = useState("30d");
  const [divisionId, setDivisionId] = useState("");

  const { data } = useOfficeAnalytics();

  const handleReset = useCallback(() => {
    setTimeRange("30d");
    setDivisionId("");
  }, []);

  const filters = useMemo(
    () => [
      {
        key: "timeRange",
        label: "Time Range",
        options: [
          { label: "Today", value: "today" },
          { label: "7 Days", value: "7d" },
          { label: "30 Days", value: "30d" },
          { label: "90 Days", value: "90d" },
        ],
        value: timeRange,
        onChange: setTimeRange,
      },
      {
        key: "division",
        label: "Division",
        options:
          data?.map((d) => ({
            label: d.divisionName,
            value: d.divisionId,
          })) || [],
        value: divisionId,
        onChange: setDivisionId,
      },
    ],
    [timeRange, divisionId, data],
  );

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: baseDelay }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Analytics & Insights
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Interactive operational intelligence
            </p>
          </div>
          <button
            disabled
            className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium opacity-50 cursor-not-allowed"
            style={{
              backgroundColor: "var(--surface-1)",
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <LayoutGrid size={12} />
            Customize Layout
          </button>
        </div>
      </motion.div>

      <FilterBar filters={filters} onReset={handleReset} delay={baseDelay + 0.05} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <TicketHealthPanel delay={baseDelay + 0.1} />
        <ProjectPortfolioPanel delay={baseDelay + 0.15} />
        <SLAPerformancePanel delay={baseDelay + 0.2} timeRange={timeRange} />
        <AssetLandscapePanel delay={baseDelay + 0.25} />
        <RiskHeatmapPanel delay={baseDelay + 0.3} />
        <TeamCapacityPanel delay={baseDelay + 0.35} />
      </div>
    </div>
  );
}
