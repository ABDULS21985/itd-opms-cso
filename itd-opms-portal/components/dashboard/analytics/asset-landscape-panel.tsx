"use client";

import { useMemo, useCallback } from "react";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { TreemapChart } from "@/components/dashboard/charts/treemap-chart";
import { useAssetsByType, useAssetsByStatus } from "@/hooks/use-reporting";
import { exportToCSV } from "@/lib/export-csv";

const CHART_COLORS = [
  "#1B7340", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#14B8A6", "#6366F1",
];

const TYPE_COLOR_MAP: Record<string, string> = {
  servers: "#1B7340",
  server: "#1B7340",
  laptops: "#3B82F6",
  laptop: "#3B82F6",
  network: "#8B5CF6",
  mobile: "#F59E0B",
  printers: "#06B6D4",
  printer: "#06B6D4",
};

const STATUS_COLOR_MAP: Record<string, string> = {
  active: "#22C55E",
  maintenance: "#F59E0B",
  decommissioned: "#EF4444",
  deployed: "#3B82F6",
  "in storage": "#64748B",
};

interface AssetLandscapePanelProps {
  delay?: number;
}

export function AssetLandscapePanel({ delay }: AssetLandscapePanelProps) {
  const { data: assetsByType, isLoading: typeLoading } = useAssetsByType();
  const { data: assetsByStatus, isLoading: statusLoading } = useAssetsByStatus();

  const isLoading = typeLoading || statusLoading;

  const treemapData = useMemo(() => {
    if (!assetsByType) return [];
    return assetsByType.map((item, index) => {
      const key = item.label.toLowerCase();
      const color = TYPE_COLOR_MAP[key] ?? CHART_COLORS[index % CHART_COLORS.length];
      return { name: item.label, value: item.value, color };
    });
  }, [assetsByType]);

  const treemapColors = useMemo(() => {
    return treemapData.map((item) => item.color);
  }, [treemapData]);

  const handleExportCSV = useCallback(() => {
    const typeRows = (assetsByType ?? []).map((d) => [d.label, d.value] as [string, number]);
    const statusRows = (assetsByStatus ?? []).map((d) => [d.label, d.value] as [string, number]);
    exportToCSV(
      "asset-landscape",
      ["Category", "Count"],
      [...typeRows, ...statusRows],
    );
  }, [assetsByType, assetsByStatus]);

  return (
    <ChartCard
      title="Asset Landscape"
      delay={delay}
      expandable
      onExportCSV={handleExportCSV}
      isLoading={isLoading}
      isEmpty={!assetsByType && !assetsByStatus}
    >
      <TreemapChart
        data={treemapData}
        height={200}
        colors={treemapColors.length > 0 ? treemapColors : undefined}
      />
      {assetsByStatus && assetsByStatus.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
          {assetsByStatus.map((status) => {
            const color =
              STATUS_COLOR_MAP[status.label.toLowerCase()] ?? "var(--text-muted)";
            return (
              <div key={status.label} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {status.label}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {status.value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}
