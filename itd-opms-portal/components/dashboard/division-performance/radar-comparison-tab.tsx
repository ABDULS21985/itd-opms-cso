"use client";

import { useState, useMemo } from "react";
import { OFFICES } from "@/lib/division-constants";
import type { OfficeMetrics } from "@/lib/division-constants";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { RadarChart } from "@/components/dashboard/charts/radar-chart";

interface RadarComparisonTabProps {
  metrics: OfficeMetrics[];
  isLoading: boolean;
}

export function RadarComparisonTab({ metrics, isLoading }: RadarComparisonTabProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    OFFICES.slice(0, 3).map((o) => o.id),
  );

  const selectedMetrics = metrics.filter((m) => selectedIds.includes(m.id));

  const radarData = useMemo(() => {
    const axes = [
      "Project Delivery",
      "SLA Performance",
      "Asset Health",
      "Risk Posture",
      "Team Capacity",
      "Budget Efficiency",
    ];
    return axes.map((axis) => {
      const row: Record<string, string | number> = { subject: axis };
      for (const m of selectedMetrics) {
        let val = 0;
        switch (axis) {
          case "Project Delivery":
            val = m.onTimePct;
            break;
          case "SLA Performance":
            val = Math.min(
              100,
              m.onTimePct +
                (m.totalWorkItems > 0
                  ? (m.completedWorkItems / m.totalWorkItems) * 20
                  : 10),
            );
            break;
          case "Asset Health":
            val = m.staffCount > 0 ? Math.min(100, m.staffCount * 10) : 50;
            break;
          case "Risk Posture":
            val =
              m.totalProjects > 0
                ? Math.max(
                    0,
                    Math.round(100 - (m.openRisks / m.totalProjects) * 100),
                  )
                : 100;
            break;
          case "Team Capacity":
            val =
              m.staffCount > 0
                ? Math.min(
                    100,
                    Math.round(
                      (1 - m.overdueWorkItems / Math.max(m.totalWorkItems, 1)) *
                        100,
                    ),
                  )
                : 50;
            break;
          case "Budget Efficiency":
            val =
              m.budgetUtilization > 100
                ? Math.max(0, 200 - m.budgetUtilization)
                : m.budgetUtilization > 0
                  ? Math.min(100, m.budgetUtilization)
                  : 50;
            break;
        }
        row[m.code] = Math.round(Math.min(100, Math.max(0, val)));
      }
      return row;
    });
  }, [selectedMetrics]);

  const dataKeys = selectedMetrics.map((m) => ({
    key: m.code,
    label: m.name,
    color: m.color,
    fillOpacity: 0.15,
  }));

  const handleSelectChange = (index: number, value: string) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return (
    <ChartCard
      title="Division Radar Comparison"
      subtitle="Multi-axis comparison across selected divisions"
    >
      <div className="flex gap-3 mb-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-secondary)]">
              Division {i + 1}
            </label>
            <select
              value={selectedIds[i]}
              onChange={(e) => handleSelectChange(i, e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-xs bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-primary)]"
            >
              {OFFICES.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {isLoading ? (
        <div className="h-80 rounded-lg bg-[var(--surface-2)] animate-pulse" />
      ) : (
        <RadarChart
          data={radarData}
          dataKeys={dataKeys}
          angleKey="subject"
          height={350}
          showLegend
          domain={[0, 100]}
        />
      )}
    </ChartCard>
  );
}
