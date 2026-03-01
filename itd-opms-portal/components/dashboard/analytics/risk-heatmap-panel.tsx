"use client";

import { useMemo, useCallback } from "react";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { HeatMapGrid } from "@/components/dashboard/charts/heat-map-grid";
import { useRisksByCategory } from "@/hooks/use-reporting";
import { exportToCSV } from "@/lib/export-csv";

interface RiskHeatmapPanelProps {
  delay?: number;
}

const ROW_LABELS = ["Very High", "High", "Medium", "Low", "Very Low"];
const COL_LABELS = ["Very Low", "Low", "Medium", "High", "Very High"];

const LEGEND_ITEMS = [
  { label: "Critical (16-25)", color: "#DC2626" },
  { label: "High (10-15)", color: "#F97316" },
  { label: "Medium (6-9)", color: "#F59E0B" },
  { label: "Low (3-5)", color: "#84CC16" },
  { label: "Minimal (1-2)", color: "#22C55E" },
];

export function RiskHeatmapPanel({ delay }: RiskHeatmapPanelProps) {
  const { data, isLoading } = useRisksByCategory();

  const totalRisks = useMemo(
    () => (data ? data.reduce((sum, d) => sum + d.value, 0) : 0),
    [data],
  );

  const heatMapData = useMemo(() => {
    const cells: Array<{ row: number; col: number; value: number }> = [];
    const totalCells = 25;
    let rawSum = 0;

    const rawValues: number[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const w = ((row + 1) * (col + 1)) / 225;
        rawValues.push(w);
        rawSum += w;
      }
    }

    for (let i = 0; i < totalCells; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const normalized = rawSum > 0 ? rawValues[i] / rawSum : 0;
      const value = Math.max(0, Math.round(totalRisks * normalized));
      cells.push({ row, col, value });
    }

    return cells;
  }, [totalRisks]);

  const categorySummary = useMemo(
    () => (data ? data.map((d) => d.label).join(" \u00B7 ") : ""),
    [data],
  );

  const handleExportCSV = useCallback(() => {
    const rows: (string | number)[][] = heatMapData
      .filter((c) => c.value > 0)
      .map((c) => [
        ROW_LABELS[4 - c.row],
        COL_LABELS[c.col],
        c.value,
      ]);
    exportToCSV("risk-heatmap", ["Impact", "Likelihood", "Count"], rows);
  }, [heatMapData]);

  return (
    <ChartCard
      title="Risk Heat Map"
      delay={delay}
      isLoading={isLoading}
      isEmpty={!data || data.length === 0}
      expandable
      onExportCSV={handleExportCSV}
    >
      <HeatMapGrid
        data={heatMapData}
        rowLabels={ROW_LABELS}
        colLabels={COL_LABELS}
        rowTitle="Impact"
        colTitle="Likelihood"
        height={280}
      />
      <div className="flex flex-wrap gap-3 mt-3">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-[var(--text-secondary)]">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      {categorySummary && (
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          Categories: {categorySummary}
        </p>
      )}
    </ChartCard>
  );
}
