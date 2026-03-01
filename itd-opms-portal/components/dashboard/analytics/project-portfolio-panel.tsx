"use client";

import { useMemo } from "react";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { ProgressRing } from "@/components/dashboard/charts/progress-ring";
import { useProjectsByRAG, useProjectsByStatus, useExecutiveSummary } from "@/hooks/use-reporting";
import { exportToCSV } from "@/lib/export-csv";

const RAG_COLORS: Record<string, string> = {
  Green: "#22C55E",
  Amber: "#F59E0B",
  Red: "#EF4444",
};

interface ProjectPortfolioPanelProps {
  delay?: number;
}

export function ProjectPortfolioPanel({ delay }: ProjectPortfolioPanelProps) {
  const { data: ragData, isLoading: ragLoading } = useProjectsByRAG();
  const { data: statusData, isLoading: statusLoading } = useProjectsByStatus();
  const { data: execData, isLoading: execLoading } = useExecutiveSummary();

  const isLoading = ragLoading || statusLoading || execLoading;
  const isEmpty = !ragData || ragData.length === 0;

  const donutData = useMemo(() => {
    if (!ragData) return [];
    return ragData.map((item) => ({
      name: item.label,
      value: item.value,
      color: RAG_COLORS[item.label] || undefined,
    }));
  }, [ragData]);

  const totalProjects = useMemo(
    () => donutData.reduce((sum, d) => sum + d.value, 0),
    [donutData],
  );

  const onTimePct = execData?.onTimeDeliveryPct ?? 0;
  const budgetPct = execData?.milestoneBurnDownPct ?? 0;
  const scopePct = useMemo(() => {
    if (!execData) return 0;
    const active = Math.max(execData.activeProjects, 1);
    return Math.round((execData.projectsRagGreen / active) * 100);
  }, [execData]);

  const handleExportCSV = () => {
    const rows: (string | number)[][] = [];
    if (ragData) {
      ragData.forEach((item) => {
        rows.push(["RAG Status", item.label, item.value]);
      });
    }
    if (statusData) {
      statusData.forEach((item) => {
        rows.push(["Project Status", item.label, item.value]);
      });
    }
    if (execData) {
      rows.push(["KPI", "On-Time Delivery %", execData.onTimeDeliveryPct]);
      rows.push(["KPI", "Milestone Burndown %", execData.milestoneBurnDownPct]);
      rows.push(["KPI", "Active Projects", execData.activeProjects]);
    }
    exportToCSV("project-portfolio", ["Category", "Label", "Value"], rows);
  };

  return (
    <ChartCard
      title="Project Portfolio"
      delay={delay}
      isLoading={isLoading}
      isEmpty={isEmpty}
      expandable
      onExportCSV={handleExportCSV}
    >
      <div>
        <DonutChart
          data={donutData}
          height={160}
          innerRadius={30}
          outerRadius={55}
          showLegend
          centerLabel="Projects"
          centerValue={totalProjects}
        />
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex flex-col items-center">
          <ProgressRing
            value={onTimePct}
            size={56}
            strokeWidth={5}
            color="#22C55E"
            label="On-Time"
            fontSize={11}
            showPercentage
          />
        </div>
        <div className="flex flex-col items-center">
          <ProgressRing
            value={budgetPct}
            size={56}
            strokeWidth={5}
            color="#3B82F6"
            label="Budget"
            fontSize={11}
            showPercentage
          />
        </div>
        <div className="flex flex-col items-center">
          <ProgressRing
            value={scopePct}
            size={56}
            strokeWidth={5}
            color="#8B5CF6"
            label="Scope"
            fontSize={11}
            showPercentage
          />
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mt-3 text-center">
        Milestone Burndown: {budgetPct}%
      </p>
    </ChartCard>
  );
}
