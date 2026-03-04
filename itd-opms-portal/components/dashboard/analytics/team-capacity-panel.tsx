"use client";

import { useMemo, useCallback } from "react";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { RadarChart } from "@/components/dashboard/charts/radar-chart";
import { ProgressRing } from "@/components/dashboard/charts/progress-ring";
import { useOfficeAnalytics } from "@/hooks/use-reporting";
import { exportToCSV } from "@/lib/export-csv";

interface TeamCapacityPanelProps {
  delay?: number;
}

export function TeamCapacityPanel({ delay }: TeamCapacityPanelProps) {
  const { data, isLoading } = useOfficeAnalytics();

  const radarData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const n = data.length;

    const capacity =
      data.reduce(
        (sum, o) => sum + (o.completedWorkItems / Math.max(o.totalWorkItems, 1)) * 100,
        0,
      ) / n;

    const velocity = data.reduce((sum, o) => sum + o.avgCompletionPct, 0) / n;

    const quality =
      data.reduce(
        (sum, o) => sum + (o.ragGreen / Math.max(o.totalProjects, 1)) * 100,
        0,
      ) / n;

    const sla =
      data.reduce(
        (sum, o) => sum + (o.completedProjects / Math.max(o.totalProjects, 1)) * 100,
        0,
      ) / n;

    const training = Math.max(
      0,
      Math.min(
        100,
        100 -
          data.reduce(
            (sum, o) =>
              sum + (o.overdueWorkItems / Math.max(o.totalWorkItems, 1)) * 100,
            0,
          ) /
            n,
      ),
    );

    return [
      { subject: "Capacity", score: Math.round(capacity * 10) / 10 },
      { subject: "Velocity", score: Math.round(velocity * 10) / 10 },
      { subject: "Quality", score: Math.round(quality * 10) / 10 },
      { subject: "SLA", score: Math.round(sla * 10) / 10 },
      { subject: "Training", score: Math.round(training * 10) / 10 },
    ];
  }, [data]);

  const utilization = useMemo(() => {
    if (!data || data.length === 0) return 0;
    const staffedOffices = data.filter((o) => o.staffCount > 0);
    if (staffedOffices.length === 0) return 0;
    const avg =
      staffedOffices.reduce((sum, o) => sum + o.avgCompletionPct, 0) /
      staffedOffices.length;
    return Math.round(avg * 10) / 10;
  }, [data]);

  const summary = useMemo(() => {
    if (!data || data.length === 0)
      return { offices: 0, staff: 0, active: 0 };
    return {
      offices: data.length,
      staff: data.reduce((sum, o) => sum + o.staffCount, 0),
      active: data.reduce((sum, o) => sum + o.activeProjects, 0),
    };
  }, [data]);

  const handleExportCSV = useCallback(() => {
    const rows: (string | number)[][] = radarData.map((d) => [
      d.subject,
      d.score,
    ]);
    rows.push(["Utilization", utilization]);
    exportToCSV("team-capacity", ["Metric", "Score"], rows);
  }, [radarData, utilization]);

  return (
    <ChartCard
      title="Team & Capacity"
      delay={delay}
      isLoading={isLoading}
      isEmpty={!data || data.length === 0}
      expandable
      onExportCSV={handleExportCSV}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <RadarChart
            data={radarData}
            dataKeys={[
              {
                key: "score",
                label: "Performance",
                color: "#1B7340",
                fillOpacity: 0.25,
              },
            ]}
            angleKey="subject"
            height={200}
            showLegend={false}
          />
        </div>
        <div className="flex-shrink-0 flex flex-col items-center justify-center">
          <ProgressRing
            value={utilization}
            size={80}
            strokeWidth={7}
            color="#1B7340"
            label="Utilization"
            showPercentage
            fontSize={14}
          />
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mt-3">
        {summary.offices} offices | {summary.staff} total staff | {summary.active} active projects
      </p>
    </ChartCard>
  );
}
