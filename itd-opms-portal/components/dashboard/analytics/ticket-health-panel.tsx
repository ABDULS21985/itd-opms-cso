"use client";

import { useMemo } from "react";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { StackedBarChart } from "@/components/dashboard/charts/stacked-bar-chart";
import { useTicketsByPriority, useTicketsByStatus } from "@/hooks/use-reporting";
import { exportToCSV } from "@/lib/export-csv";

const STATUS_COLORS: Record<string, string> = {
  Open: "#EF4444",
  "In Progress": "#F59E0B",
  Resolved: "#22C55E",
  Closed: "#64748B",
};

const CHART_COLORS = [
  "#1B7340", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#14B8A6", "#6366F1",
];

interface TicketHealthPanelProps {
  delay?: number;
}

export function TicketHealthPanel({ delay }: TicketHealthPanelProps) {
  const { data: statusData, isLoading: statusLoading } = useTicketsByStatus();
  const { data: priorityData, isLoading: priorityLoading } = useTicketsByPriority();

  const isLoading = statusLoading && priorityLoading;
  const isEmpty = (!statusData || statusData.length === 0) && (!priorityData || priorityData.length === 0);

  const donutData = useMemo(() => {
    if (!statusData) return [];
    return statusData.map((item, index) => ({
      name: item.label,
      value: item.value,
      color: STATUS_COLORS[item.label] || CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [statusData]);

  const totalTickets = useMemo(
    () => donutData.reduce((sum, d) => sum + d.value, 0),
    [donutData],
  );

  const barData = useMemo(() => {
    if (!priorityData) return { rows: [] as Record<string, string | number>[], categories: [] as string[] };
    const row: Record<string, string | number> = { name: "Tickets" };
    const categories: string[] = [];
    priorityData.forEach((item) => {
      row[item.label] = item.value;
      categories.push(item.label);
    });
    return { rows: [row], categories };
  }, [priorityData]);

  const openCount = useMemo(
    () => statusData?.find((d) => d.label === "Open")?.value ?? 0,
    [statusData],
  );

  const resolvedCount = useMemo(
    () => statusData?.find((d) => d.label === "Resolved")?.value ?? 0,
    [statusData],
  );

  const handleExportCSV = () => {
    const rows: (string | number)[][] = [];
    if (statusData) {
      statusData.forEach((item) => {
        rows.push(["Status", item.label, item.value]);
      });
    }
    if (priorityData) {
      priorityData.forEach((item) => {
        rows.push(["Priority", item.label, item.value]);
      });
    }
    exportToCSV("ticket-health", ["Category", "Label", "Count"], rows);
  };

  return (
    <ChartCard
      title="Ticket Health"
      delay={delay}
      isLoading={isLoading}
      isEmpty={isEmpty}
      expandable
      onExportCSV={handleExportCSV}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <DonutChart
            data={donutData}
            height={180}
            innerRadius={35}
            outerRadius={65}
            showLegend={false}
            centerLabel="Tickets"
            centerValue={totalTickets}
          />
        </div>
        <div className="flex-1 min-w-0">
          <StackedBarChart
            data={barData.rows}
            categories={barData.categories}
            height={180}
            layout="vertical"
            showGrid={false}
            showLegend
            barSize={24}
          />
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mt-3">
        {totalTickets} total | {openCount} open | {resolvedCount} resolved
      </p>
    </ChartCard>
  );
}
