"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import {
  useReportsOverview,
  useCandidateReports,
  usePlacementReports,
  useJobReports,
  useEmployerReports,
  useTimeMetrics,
  useSkillsDemand,
  useExportReport,
} from "@/hooks/use-reports";
import { toast } from "sonner";
import { ReportTabs } from "@/components/admin/reports/report-tabs";
import { ControlsBar } from "@/components/admin/reports/controls-bar";
import { ReportSkeleton } from "@/components/admin/reports/report-skeleton";
import { TabExecutiveSummary } from "@/components/admin/reports/tab-executive-summary";
import { TabCandidates } from "@/components/admin/reports/tab-candidates";
import { TabJobs } from "@/components/admin/reports/tab-jobs";
import { TabEmployers } from "@/components/admin/reports/tab-employers";
import { TabPlacements } from "@/components/admin/reports/tab-placements";
import { TabPlatformHealth } from "@/components/admin/reports/tab-platform-health";
import type { ReportTab, ControlsState } from "@/components/admin/reports/shared";

// ────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("executive");
  const [controls, setControls] = useState<ControlsState>({
    dateRange: "all",
    autoRefresh: false,
  });

  // ── Data hooks ──

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
  } = useReportsOverview();
  const { data: candidateReport } = useCandidateReports();
  const { data: placementReport } = usePlacementReports();
  const { data: jobReport } = useJobReports();
  const { data: employerReport } = useEmployerReports();
  const { data: timeMetrics } = useTimeMetrics();
  const { data: skillsDemand } = useSkillsDemand(15);
  const exportMutation = useExportReport();

  // ── Export handler ──

  const handleExport = useCallback(
    (format: "csv" | "pdf" | "png") => {
      const typeMap: Record<ReportTab, "overview" | "candidates" | "placements"> = {
        executive: "overview",
        candidates: "candidates",
        jobs: "overview",
        employers: "overview",
        placements: "placements",
        health: "overview",
      };
      exportMutation.mutate(
        { reportType: typeMap[activeTab], format: format === "png" ? "csv" : format },
        {
          onSuccess: () => toast.success("Report exported successfully."),
          onError: () => toast.error("Failed to export report."),
        },
      );
    },
    [activeTab, exportMutation],
  );

  // ── Loading / error ──

  if (overviewLoading) {
    return <ReportSkeleton />;
  }

  if (overviewError || !overview) {
    return (
      <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-16 text-center">
        <AlertCircle size={48} className="mx-auto text-[var(--error)] mb-4" />
        <h3 className="font-semibold text-[var(--text-primary)] mb-2 text-lg">
          Failed to load reports
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }

  // ── Render active tab ──

  const renderTab = () => {
    switch (activeTab) {
      case "executive":
        return (
          <TabExecutiveSummary
            overview={overview}
            candidateReport={candidateReport}
            placementReport={placementReport}
            jobReport={jobReport}
            employerReport={employerReport}
            timeMetrics={timeMetrics}
            skillsDemand={skillsDemand}
          />
        );
      case "candidates":
        return (
          <TabCandidates
            overview={overview}
            candidateReport={candidateReport}
          />
        );
      case "jobs":
        return (
          <TabJobs
            overview={overview}
            jobReport={jobReport}
          />
        );
      case "employers":
        return (
          <TabEmployers
            overview={overview}
            employerReport={employerReport}
          />
        );
      case "placements":
        return (
          <TabPlacements
            overview={overview}
            placementReport={placementReport}
            timeMetrics={timeMetrics}
          />
        );
      case "health":
        return (
          <TabPlatformHealth
            overview={overview}
            candidateReport={candidateReport}
            employerReport={employerReport}
            skillsDemand={skillsDemand}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Analytics &amp; Reports
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Comprehensive platform analytics, funnel metrics, and workforce insights.
          </p>
        </div>
        <ControlsBar
          controls={controls}
          onControlsChange={setControls}
          onExport={handleExport}
          isExporting={exportMutation.isPending}
        />
      </div>

      {/* Tab navigation */}
      <ReportTabs active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <div key={activeTab}>
          {renderTab()}
        </div>
      </AnimatePresence>
    </div>
  );
}
