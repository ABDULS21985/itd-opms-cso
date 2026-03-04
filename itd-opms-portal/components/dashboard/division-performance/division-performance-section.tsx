"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2 } from "lucide-react";
import { useProjects, useRisks } from "@/hooks/use-planning";
import { useOfficeAnalytics } from "@/hooks/use-reporting";
import {
  computeOfficeMetrics,
  enrichWithApiData,
  OfficeMetrics,
} from "@/lib/division-constants";
import { ComparisonTableTab } from "./comparison-table-tab";
import { RadarComparisonTab } from "./radar-comparison-tab";
import { ResourceAllocationTab } from "./resource-allocation-tab";
import { TrendAnalysisTab } from "./trend-analysis-tab";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DivisionPerformanceSectionProps {
  delay?: number;
}

const TABS = [
  { key: "comparison", label: "Comparison", hash: "#comparison" },
  { key: "radar", label: "Radar", hash: "#radar" },
  { key: "resources", label: "Resources", hash: "#resources" },
  { key: "trends", label: "Trends", hash: "#trends" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DivisionPerformanceSection({
  delay,
}: DivisionPerformanceSectionProps) {
  const baseDelay = delay ?? 0.85;

  /* ---- Tab state with hash routing ---- */
  const [activeTab, setActiveTab] = useState<TabKey>("comparison");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    () => new Set(["comparison"]),
  );

  // Read initial hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    const matched = TABS.find((t) => t.hash === hash);
    if (matched) {
      setActiveTab(matched.key);
      setVisitedTabs((prev) => new Set(prev).add(matched.key));
    }
  }, []);

  // Sync hash when activeTab changes
  useEffect(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (tab) {
      window.location.hash = tab.hash;
      setVisitedTabs((prev) => {
        const next = new Set(prev);
        next.add(activeTab);
        return next;
      });
    }
  }, [activeTab]);

  // Listen for external hash changes
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      const matched = TABS.find((t) => t.hash === hash);
      if (matched) {
        setActiveTab(matched.key);
        setVisitedTabs((prev) => new Set(prev).add(matched.key));
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  /* ---- Data fetching ---- */
  const { data: projectsRaw, isLoading: projectsLoading } = useProjects(
    1,
    200,
  );
  const { data: risksRaw, isLoading: risksLoading } = useRisks(1, 200);
  const { data: apiAnalytics } = useOfficeAnalytics();

  /* ---- Normalize paginated data ---- */
  const projects = useMemo(() => {
    if (!projectsRaw) return [];
    if (Array.isArray(projectsRaw)) return projectsRaw;
    if ("data" in projectsRaw && Array.isArray((projectsRaw as any).data))
      return (projectsRaw as any).data;
    return [];
  }, [projectsRaw]);

  const risks = useMemo(() => {
    if (!risksRaw) return [];
    if (Array.isArray(risksRaw)) return risksRaw;
    if ("data" in risksRaw && Array.isArray((risksRaw as any).data))
      return (risksRaw as any).data;
    return [];
  }, [risksRaw]);

  /* ---- Compute metrics ---- */
  const baseMetrics = useMemo(
    () => computeOfficeMetrics(projects, risks),
    [projects, risks],
  );
  const officeMetrics = useMemo(
    () => enrichWithApiData(baseMetrics, apiAnalytics),
    [baseMetrics, apiAnalytics],
  );
  const isLoading = projectsLoading || risksLoading;

  /* ---- Render ---- */
  return (
    <div className="space-y-4">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: baseDelay }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(27,115,64,0.1)" }}
            >
              <Building2 size={18} style={{ color: "#1B7340" }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Division Performance
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Comparative analytics across organizational units
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: baseDelay + 0.05 }}
      >
        <div
          className="flex items-center gap-1 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="division-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: "#1B7340" }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab content with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "comparison" && visitedTabs.has("comparison") && (
            <ComparisonTableTab metrics={officeMetrics} isLoading={isLoading} />
          )}
          {activeTab === "radar" && visitedTabs.has("radar") && (
            <RadarComparisonTab metrics={officeMetrics} isLoading={isLoading} />
          )}
          {activeTab === "resources" && visitedTabs.has("resources") && (
            <ResourceAllocationTab
              metrics={officeMetrics}
              isLoading={isLoading}
            />
          )}
          {activeTab === "trends" && visitedTabs.has("trends") && (
            <TrendAnalysisTab metrics={officeMetrics} isLoading={isLoading} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
