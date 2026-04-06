"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  GitBranch,
  Network,
  OctagonX,
  ArrowUpCircle,
  ShieldAlert,
  Info,
} from "lucide-react";
import { InfoHint } from "@/components/shared/info-hint";
import {
  useProjects,
  useRisks,
  useIssues,
} from "@/hooks/use-planning";
import { useExecutiveSummary } from "@/hooks/use-reporting";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  StackedBarChart,
} from "@/components/dashboard/charts";
import type { Project, Risk, ProjectIssue } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const OFFICES = [
  { id: "4493b788-602f-e1a7-ab04-3058bbe61ff4", name: "Business Intelligence", code: "BISO", color: "#3B82F6" },
  { id: "db40aa8c-dc75-1e84-8fc9-ef0f59c80a90", name: "Collaboration", code: "CSO", color: "#8B5CF6" },
  { id: "c22d15fd-f6f0-a86a-d541-f4cd13051094", name: "Financial Surveillance", code: "FSSO", color: "#F59E0B" },
  { id: "2464f477-fd51-01ff-2cfc-edc0846be881", name: "Internal Support", code: "ISSO", color: "#06B6D4" },
  { id: "2a5f2e13-d303-1895-16e1-1b048c9d791d", name: "Payment & Operations", code: "POSO", color: "#22C55E" },
];

const OFFICE_MAP = new Map(OFFICES.map((o) => [o.id, o]));

const RAG_DOT: Record<string, string> = {
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#84CC16",
};

const analyticsPages = [
  { label: "Executive Overview", href: "/dashboard/analytics" },
  { label: "Portfolio", href: "/dashboard/analytics/portfolio" },
  { label: "Projects", href: "/dashboard/analytics/projects" },
  { label: "Risks & Issues", href: "/dashboard/analytics/risks" },
  { label: "Resources", href: "/dashboard/analytics/resources" },
  { label: "Governance", href: "/dashboard/analytics/governance" },
  { label: "Office Analytics", href: "/dashboard/analytics/offices" },
  { label: "Collaboration", href: "/dashboard/analytics/collaboration", active: true },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function officeForProject(p: Project) {
  const id = p.divisionId;
  if (id && OFFICE_MAP.has(id)) return OFFICE_MAP.get(id)!;
  return null;
}

/** Produce a 5x5 collaboration matrix measuring shared-portfolio links between offices. */
function buildCollaborationMatrix(
  projects: Project[],
  risks: Risk[],
) {
  // Group projects by office
  const officeProjects = new Map<string, Project[]>();
  for (const p of projects) {
    const office = officeForProject(p);
    if (!office) continue;
    if (!officeProjects.has(office.id)) officeProjects.set(office.id, []);
    officeProjects.get(office.id)!.push(p);
  }

  // Build portfolio->offices map (shared portfolio = collaboration link)
  const portfolioOffices = new Map<string, Set<string>>();
  for (const p of projects) {
    if (!p.portfolioId) continue;
    const office = officeForProject(p);
    if (!office) continue;
    if (!portfolioOffices.has(p.portfolioId)) portfolioOffices.set(p.portfolioId, new Set());
    portfolioOffices.get(p.portfolioId)!.add(office.id);
  }

  // Count cross-links from shared portfolios
  const matrix: Record<string, Record<string, number>> = {};
  for (const o of OFFICES) {
    matrix[o.id] = {};
    for (const o2 of OFFICES) matrix[o.id][o2.id] = 0;
  }

  Array.from(portfolioOffices.values()).forEach((officeIds) => {
    const arr = Array.from(officeIds);
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        matrix[arr[i]][arr[j]]++;
      }
    }
  });

  // Add cross-office risk links
  const projectOfficeMap = new Map<string, string>();
  for (const p of projects) {
    const office = officeForProject(p);
    if (office) projectOfficeMap.set(p.id, office.id);
  }

  // Risks with the same category that span multiple offices count as shared
  const riskCategoryOffices = new Map<string, Set<string>>();
  for (const r of risks) {
    if (!r.projectId) continue;
    const officeId = projectOfficeMap.get(r.projectId);
    if (!officeId) continue;
    const cat = r.category || "other";
    if (!riskCategoryOffices.has(cat)) riskCategoryOffices.set(cat, new Set());
    riskCategoryOffices.get(cat)!.add(officeId);
  }

  Array.from(riskCategoryOffices.values()).forEach((officeIds) => {
    if (officeIds.size < 2) return;
    const arr = Array.from(officeIds);
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i !== j) matrix[arr[i]][arr[j]]++;
      }
    }
  });

  return matrix;
}

function getMatrixMax(matrix: Record<string, Record<string, number>>): number {
  let max = 0;
  for (const row of Object.values(matrix)) {
    for (const val of Object.values(row)) {
      if (val > max) max = val;
    }
  }
  return max || 1;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CollaborationDashboardPage() {
  const { data: projectsRaw, isLoading: projectsLoading } = useProjects(1, 200);
  const { data: risksRaw, isLoading: risksLoading } = useRisks(1, 200);
  const { data: issuesRaw, isLoading: issuesLoading } = useIssues(1, 200);
  const { data: _summary } = useExecutiveSummary();

  // Normalise paginated / array responses
  const projects = useMemo<Project[]>(() => {
    if (!projectsRaw) return [];
    if (Array.isArray(projectsRaw)) return projectsRaw;
    if ("data" in projectsRaw && Array.isArray((projectsRaw as { data: Project[] }).data))
      return (projectsRaw as { data: Project[] }).data;
    return [];
  }, [projectsRaw]);

  const risks = useMemo<Risk[]>(() => {
    if (!risksRaw) return [];
    if (Array.isArray(risksRaw)) return risksRaw;
    if ("data" in risksRaw && Array.isArray((risksRaw as { data: Risk[] }).data))
      return (risksRaw as { data: Risk[] }).data;
    return [];
  }, [risksRaw]);

  const issues = useMemo<ProjectIssue[]>(() => {
    if (!issuesRaw) return [];
    if (Array.isArray(issuesRaw)) return issuesRaw;
    if ("data" in issuesRaw && Array.isArray((issuesRaw as { data: ProjectIssue[] }).data))
      return (issuesRaw as { data: ProjectIssue[] }).data;
    return [];
  }, [issuesRaw]);

  const anyLoading = projectsLoading || risksLoading || issuesLoading;

  // ---- Build project-to-office map ----
  const projectOfficeMap = useMemo(() => {
    const m = new Map<string, typeof OFFICES[number]>();
    for (const p of projects) {
      const o = officeForProject(p);
      if (o) m.set(p.id, o);
    }
    return m;
  }, [projects]);

  // ---- Group projects by office ----
  const officeProjectGroups = useMemo(() => {
    const m = new Map<string, Project[]>();
    for (const o of OFFICES) m.set(o.id, []);
    for (const p of projects) {
      const o = officeForProject(p);
      if (o) m.get(o.id)!.push(p);
    }
    return m;
  }, [projects]);

  // ---- KPI: Cross-office projects (projects in portfolios shared with another office) ----
  const crossOfficeProjectCount = useMemo(() => {
    const portfolioOffices = new Map<string, Set<string>>();
    for (const p of projects) {
      if (!p.portfolioId) continue;
      const o = officeForProject(p);
      if (!o) continue;
      if (!portfolioOffices.has(p.portfolioId)) portfolioOffices.set(p.portfolioId, new Set());
      portfolioOffices.get(p.portfolioId)!.add(o.id);
    }
    const crossPortfolios = new Set<string>();
    Array.from(portfolioOffices.entries()).forEach(([pid, officeIds]) => {
      if (officeIds.size > 1) crossPortfolios.add(pid);
    });
    const crossProjects = new Set<string>();
    for (const p of projects) {
      if (p.portfolioId && crossPortfolios.has(p.portfolioId)) crossProjects.add(p.id);
    }
    return crossProjects.size;
  }, [projects]);

  // ---- KPI: Active cross-office dependency links ----
  const collaborationMatrix = useMemo(
    () => buildCollaborationMatrix(projects, risks),
    [projects, risks],
  );

  const activeDependencyLinks = useMemo(() => {
    let total = 0;
    for (const src of OFFICES) {
      for (const tgt of OFFICES) {
        if (src.id !== tgt.id) total += (collaborationMatrix[src.id]?.[tgt.id] || 0);
      }
    }
    return total;
  }, [collaborationMatrix]);

  // ---- KPI: Blocked items ----
  const blockedProjects = useMemo(
    () => projects.filter((p) => ["on_hold", "on-hold"].includes((p.status || "").toLowerCase()) || (p.ragStatus || "").toLowerCase() === "red"),
    [projects],
  );

  // ---- KPI: Pending escalations ----
  const escalatedIssues = useMemo(
    () => issues.filter((i) => i.escalationLevel > 0),
    [issues],
  );

  // ---- KPI: Shared risks (risks in categories spanning multiple offices) ----
  const sharedRiskCount = useMemo(() => {
    const categoryOffices = new Map<string, Set<string>>();
    for (const r of risks) {
      if (!r.projectId) continue;
      const officeId = projectOfficeMap.get(r.projectId)?.id;
      if (!officeId) continue;
      const cat = r.category || "other";
      if (!categoryOffices.has(cat)) categoryOffices.set(cat, new Set());
      categoryOffices.get(cat)!.add(officeId);
    }
    let count = 0;
    for (const r of risks) {
      if (!r.projectId) continue;
      const cat = r.category || "other";
      if ((categoryOffices.get(cat)?.size || 0) > 1) count++;
    }
    return count;
  }, [risks, projectOfficeMap]);

  // ---- Row 2: Donut — cross-office vs intra-office ----
  const dependencyDonut = useMemo(() => {
    let inter = 0;
    let intra = 0;
    for (const src of OFFICES) {
      for (const tgt of OFFICES) {
        const val = collaborationMatrix[src.id]?.[tgt.id] || 0;
        if (src.id === tgt.id) intra += val;
        else inter += val;
      }
    }
    return [
      { name: "Inter-Office", value: inter, color: "#8B5CF6" },
      { name: "Intra-Office", value: intra, color: "#3B82F6" },
    ];
  }, [collaborationMatrix]);

  // ---- Row 3: Blocked work by office ----
  const blockedByOfficeData = useMemo(() => {
    const officeBlockedMap: Record<string, Record<string, number>> = {};
    for (const p of blockedProjects) {
      const office = officeForProject(p);
      const officeName = office?.code || "Unassigned";
      const severity = (p.ragStatus || "amber").toLowerCase();
      if (!officeBlockedMap[officeName]) officeBlockedMap[officeName] = {};
      officeBlockedMap[officeName][severity] = (officeBlockedMap[officeName][severity] || 0) + 1;
    }
    const severities = new Set<string>();
    for (const s of Object.values(officeBlockedMap)) {
      for (const k of Object.keys(s)) severities.add(k);
    }
    const severityList = Array.from(severities).sort();
    const data = Object.entries(officeBlockedMap).map(([name, statuses]) => {
      const row: Record<string, string | number> = { name };
      for (const s of severityList) row[s] = statuses[s] || 0;
      return row;
    });
    return { data, categories: severityList };
  }, [blockedProjects]);

  // ---- Row 3: Escalation by office ----
  const escalationByOfficeData = useMemo(() => {
    const officeLevelMap: Record<string, Record<string, number>> = {};
    for (const issue of escalatedIssues) {
      const projectId = issue.projectId;
      const office = projectId ? projectOfficeMap.get(projectId) : null;
      const officeName = office?.code || "Unassigned";
      const level = `Level ${issue.escalationLevel}`;
      if (!officeLevelMap[officeName]) officeLevelMap[officeName] = {};
      officeLevelMap[officeName][level] = (officeLevelMap[officeName][level] || 0) + 1;
    }
    const levels = new Set<string>();
    for (const s of Object.values(officeLevelMap)) {
      for (const k of Object.keys(s)) levels.add(k);
    }
    const levelList = Array.from(levels).sort();
    const data = Object.entries(officeLevelMap).map(([name, statuses]) => {
      const row: Record<string, string | number> = { name };
      for (const s of levelList) row[s] = statuses[s] || 0;
      return row;
    });
    return { data, categories: levelList };
  }, [escalatedIssues, projectOfficeMap]);

  // ---- Row 4: Dependency detail table — projects with cross-office portfolio links ----
  const dependencyTableRows = useMemo(() => {
    // Build portfolio -> list of projects grouped by office
    const portfolioOfficeProjects = new Map<string, Map<string, Project[]>>();
    for (const p of projects) {
      if (!p.portfolioId) continue;
      const o = officeForProject(p);
      if (!o) continue;
      if (!portfolioOfficeProjects.has(p.portfolioId)) portfolioOfficeProjects.set(p.portfolioId, new Map());
      const byOffice = portfolioOfficeProjects.get(p.portfolioId)!;
      if (!byOffice.has(o.id)) byOffice.set(o.id, []);
      byOffice.get(o.id)!.push(p);
    }

    const rows: Array<{
      sourceProject: Project;
      sourceOffice: typeof OFFICES[number];
      targetProject: Project;
      targetOffice: typeof OFFICES[number];
      linkType: string;
      portfolioId: string;
    }> = [];

    Array.from(portfolioOfficeProjects.entries()).forEach(([pid, byOffice]) => {
      const officeIds = Array.from(byOffice.keys());
      if (officeIds.length < 2) return;
      // Create pairwise links between the first project of each office
      for (let i = 0; i < officeIds.length; i++) {
        for (let j = i + 1; j < officeIds.length; j++) {
          const srcProjects = byOffice.get(officeIds[i])!;
          const tgtProjects = byOffice.get(officeIds[j])!;
          const srcOffice = OFFICE_MAP.get(officeIds[i])!;
          const tgtOffice = OFFICE_MAP.get(officeIds[j])!;
          // Pair first project from each office
          rows.push({
            sourceProject: srcProjects[0],
            sourceOffice: srcOffice,
            targetProject: tgtProjects[0],
            targetOffice: tgtOffice,
            linkType: "Shared Portfolio",
            portfolioId: pid,
          });
        }
      }
    });
    return rows.slice(0, 20);
  }, [projects]);

  // ---- Row 5: Shared risks by office ----
  const sharedRisksByOffice = useMemo(() => {
    const officeRiskCounts: Record<string, number> = {};
    const categoryOffices = new Map<string, Set<string>>();
    for (const r of risks) {
      if (!r.projectId) continue;
      const office = projectOfficeMap.get(r.projectId);
      if (!office) continue;
      const cat = r.category || "other";
      if (!categoryOffices.has(cat)) categoryOffices.set(cat, new Set());
      categoryOffices.get(cat)!.add(office.id);
    }
    for (const r of risks) {
      if (!r.projectId) continue;
      const office = projectOfficeMap.get(r.projectId);
      if (!office) continue;
      const cat = r.category || "other";
      if ((categoryOffices.get(cat)?.size || 0) > 1) {
        officeRiskCounts[office.code] = (officeRiskCounts[office.code] || 0) + 1;
      }
    }
    return Object.entries(officeRiskCounts).map(([name, value]) => ({
      name,
      value,
      color: OFFICES.find((o) => o.code === name)?.color || "#9CA3AF",
    }));
  }, [risks, projectOfficeMap]);

  // ---- Row 5: Critical cross-office issues ----
  const criticalCrossOfficeIssues = useMemo(() => {
    return issues
      .filter((i) => {
        const sev = (i.severity || "").toLowerCase();
        return (sev === "critical" || sev === "high") && i.escalationLevel > 0;
      })
      .map((i) => {
        const office = i.projectId ? projectOfficeMap.get(i.projectId) : null;
        return { ...i, office };
      })
      .slice(0, 10);
  }, [issues, projectOfficeMap]);

  // Matrix max for color scaling
  const matrixMax = useMemo(() => getMatrixMax(collaborationMatrix), [collaborationMatrix]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(139,92,246,0.1)" }}
          >
            <Network size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Collaboration &amp; Dependency Dashboard
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Cross-office dependencies, blocked work, escalations, and inter-office analytics
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sub-navigation tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-1 overflow-x-auto pb-1"
      >
        {analyticsPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              page.active ? "text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
            }`}
            style={page.active ? { backgroundColor: "#8B5CF6" } : undefined}
          >
            {page.label}
          </Link>
        ))}
      </motion.div>

      {/* Row 1 — KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="relative">
          <InfoHint text="Projects that share a portfolio with projects from other offices, indicating collaboration between teams." />
          <KPIStatCard
            label="Cross-Office Projects"
            value={anyLoading ? undefined : crossOfficeProjectCount}
            icon={GitBranch}
            color="#8B5CF6"
            bgColor="rgba(139,92,246,0.1)"
            isLoading={anyLoading}
            index={0}
            subtitle="Shared portfolio links"
            href="/dashboard/planning/projects"
          />
        </div>
        <div className="relative">
          <InfoHint text="Number of active cross-office dependency links based on shared portfolios and common risk categories." />
          <KPIStatCard
            label="Active Dependencies"
            value={anyLoading ? undefined : activeDependencyLinks}
            icon={Network}
            color="#3B82F6"
            bgColor="rgba(59,130,246,0.1)"
            isLoading={anyLoading}
            index={1}
            subtitle="Cross-office links"
            href="/dashboard/planning/projects"
          />
        </div>
        <div className="relative">
          <InfoHint text="Projects that are on-hold or have a red RAG status. These may be causing downstream delays for dependent offices." />
          <KPIStatCard
            label="Blocked Items"
            value={anyLoading ? undefined : blockedProjects.length}
            icon={OctagonX}
            color="#EF4444"
            bgColor="rgba(239,68,68,0.1)"
            isLoading={anyLoading}
            index={2}
            subtitle="On-hold or red RAG"
            href="/dashboard/planning/projects"
          />
        </div>
        <div className="relative">
          <InfoHint text="Issues that have been escalated beyond their initial team. Higher escalation levels indicate more severe coordination gaps." />
          <KPIStatCard
            label="Pending Escalations"
            value={anyLoading ? undefined : escalatedIssues.length}
            icon={ArrowUpCircle}
            color="#F97316"
            bgColor="rgba(249,115,22,0.1)"
            isLoading={anyLoading}
            index={3}
            subtitle={`${escalatedIssues.filter((i) => i.escalationLevel >= 2).length} at level 2+`}
            href="/dashboard/planning/issues"
          />
        </div>
        <div className="relative">
          <InfoHint text="Risks in categories that span multiple offices. These systemic risks require cross-office mitigation strategies." />
          <KPIStatCard
            label="Shared Risk Count"
            value={anyLoading ? undefined : sharedRiskCount}
            icon={ShieldAlert}
            color="#F59E0B"
            bgColor="rgba(245,158,11,0.1)"
            isLoading={anyLoading}
            index={4}
            subtitle="Multi-office risk exposure"
            href="/dashboard/planning/risks"
          />
        </div>
      </div>

      {/* Row 2 — Primary Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Office Dependency Matrix */}
        <ChartCard title="Office Dependency Matrix" subtitle="Cross-office collaboration intensity" delay={0.2}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Heatmap showing collaboration intensity between offices. Darker cells indicate stronger dependencies through shared portfolios and risk categories. Diagonal cells show intra-office links.
            </span>
          </div>
          {anyLoading ? (
            <div className="h-80 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                {/* Column headers */}
                <div className="flex items-end mb-1 pl-20">
                  {OFFICES.map((o) => (
                    <div
                      key={o.id}
                      className="flex-1 text-center text-[10px] font-semibold text-[var(--text-secondary)] truncate px-0.5"
                      title={o.name}
                    >
                      {o.code}
                    </div>
                  ))}
                </div>

                {/* Matrix rows */}
                {OFFICES.map((rowOffice) => (
                  <div key={rowOffice.id} className="flex items-center mb-1">
                    {/* Row label */}
                    <div
                      className="w-20 text-right pr-2 text-[10px] font-semibold truncate"
                      style={{ color: rowOffice.color }}
                      title={rowOffice.name}
                    >
                      {rowOffice.code}
                    </div>

                    {/* Cells */}
                    {OFFICES.map((colOffice) => {
                      const val = collaborationMatrix[rowOffice.id]?.[colOffice.id] || 0;
                      const isDiagonal = rowOffice.id === colOffice.id;
                      const intensity = matrixMax > 0 ? Math.min(val / matrixMax, 1) : 0;
                      const bgAlpha = isDiagonal
                        ? intensity * 0.5
                        : intensity * 0.8;
                      const cellColor = isDiagonal ? rowOffice.color : "#8B5CF6";

                      return (
                        <div
                          key={colOffice.id}
                          className="flex-1 aspect-square flex items-center justify-center rounded-md mx-0.5 transition-all hover:scale-105 cursor-default"
                          style={{
                            backgroundColor: val > 0
                              ? `${cellColor}${Math.round(bgAlpha * 255).toString(16).padStart(2, "0")}`
                              : "var(--surface-2)",
                            border: isDiagonal ? `1.5px solid ${rowOffice.color}40` : "1px solid var(--border)",
                          }}
                          title={`${rowOffice.code} -> ${colOffice.code}: ${val} link(s)`}
                        >
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{
                              color: val > 0
                                ? intensity > 0.5 ? "#FFFFFF" : "var(--text-primary)"
                                : "var(--text-muted)",
                            }}
                          >
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }} />
                    <span className="text-[10px] text-[var(--text-muted)]">None</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(139,92,246,0.3)" }} />
                    <span className="text-[10px] text-[var(--text-muted)]">Low</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(139,92,246,0.6)" }} />
                    <span className="text-[10px] text-[var(--text-muted)]">Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(139,92,246,0.9)" }} />
                    <span className="text-[10px] text-[var(--text-muted)]">High</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Cross-Office Project Flow */}
        <ChartCard title="Cross-Office Project Flow" subtitle="Inter-office vs intra-office dependencies" delay={0.25}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Proportion of inter-office vs intra-office dependency links. Higher inter-office ratio indicates more cross-team collaboration.
            </span>
          </div>
          {anyLoading ? (
            <div className="h-80 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : (
            <DonutChart
              data={dependencyDonut}
              height={300}
              innerRadius={55}
              outerRadius={90}
              centerLabel="Links"
              showLabel
            />
          )}
        </ChartCard>
      </div>

      {/* Row 3 — Detail Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Blocked Work by Office */}
        <ChartCard title="Blocked Work by Office" subtitle="On-hold / Red RAG projects per office" delay={0.3}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Projects on-hold or with red RAG status, grouped by office. Offices with more blocked items may need additional support or escalation.
            </span>
          </div>
          {anyLoading ? (
            <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : blockedByOfficeData.data.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-xs text-[var(--text-muted)]">No blocked items found</p>
            </div>
          ) : (
            <StackedBarChart
              data={blockedByOfficeData.data}
              categories={blockedByOfficeData.categories}
              height={260}
              layout="vertical"
              colors={["#22C55E", "#F59E0B", "#EF4444", "#9CA3AF"]}
            />
          )}
        </ChartCard>

        {/* Escalation Summary */}
        <ChartCard title="Escalation Summary" subtitle="Escalated issues by office and level" delay={0.35}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Escalated issues grouped by office and escalation level. Higher levels indicate issues requiring more senior attention.
            </span>
          </div>
          {anyLoading ? (
            <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : escalationByOfficeData.data.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-xs text-[var(--text-muted)]">No escalated issues found</p>
            </div>
          ) : (
            <StackedBarChart
              data={escalationByOfficeData.data}
              categories={escalationByOfficeData.categories}
              height={260}
              layout="vertical"
              colors={["#F59E0B", "#F97316", "#EF4444", "#DC2626"]}
            />
          )}
        </ChartCard>
      </div>

      {/* Row 4 — Dependency Details Table */}
      <ChartCard title="Cross-Office Dependency Details" subtitle="Projects linked via shared portfolios" delay={0.4}>
        <div className="flex items-center gap-1.5 mb-3">
          <Info size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">
            Specific project pairs linked through shared portfolios. RAG status shows health of each linked project — mismatched RAGs may indicate coordination issues.
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {["Source Project", "Source Office", "Target Project", "Target Office", "Link Type", "Source RAG", "Target RAG"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {dependencyTableRows.map((row, idx) => (
                <tr
                  key={`${row.sourceProject.id}-${row.targetProject.id}-${idx}`}
                  className="border-b hover:bg-[var(--surface-1)] transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="py-2 px-3 font-medium text-[var(--text-primary)] max-w-40 truncate">
                    {row.sourceProject.title}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: row.sourceOffice.color }}
                    >
                      {row.sourceOffice.code}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium text-[var(--text-primary)] max-w-40 truncate">
                    {row.targetProject.title}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: row.targetOffice.color }}
                    >
                      {row.targetOffice.code}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[var(--text-secondary)]">{row.linkType}</td>
                  <td className="py-2 px-3">
                    <span
                      className="inline-flex items-center gap-1.5"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            RAG_DOT[(row.sourceProject.ragStatus || "").toLowerCase()] || "#9CA3AF",
                        }}
                      />
                      <span className="capitalize text-[var(--text-secondary)]">
                        {row.sourceProject.ragStatus || "N/A"}
                      </span>
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className="inline-flex items-center gap-1.5"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            RAG_DOT[(row.targetProject.ragStatus || "").toLowerCase()] || "#9CA3AF",
                        }}
                      />
                      <span className="capitalize text-[var(--text-secondary)]">
                        {row.targetProject.ragStatus || "N/A"}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dependencyTableRows.length === 0 && !anyLoading && (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">
              No cross-office dependencies found
            </p>
          )}
          {anyLoading && (
            <div className="h-32 rounded-lg bg-[var(--surface-2)] animate-pulse mt-2" />
          )}
        </div>
      </ChartCard>

      {/* Row 5 — Risk Sharing View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shared Risks by Office */}
        <ChartCard title="Shared Risks by Office" subtitle="Risks in categories spanning multiple offices" delay={0.45}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              Number of risks in categories that affect multiple offices. Longer bars indicate higher cross-office risk exposure.
            </span>
          </div>
          {anyLoading ? (
            <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : sharedRisksByOffice.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-xs text-[var(--text-muted)]">No shared risks found</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {sharedRisksByOffice
                .sort((a, b) => b.value - a.value)
                .map((item) => {
                  const maxVal = Math.max(...sharedRisksByOffice.map((s) => s.value), 1);
                  const pct = (item.value / maxVal) * 100;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span
                        className="w-14 text-right text-[11px] font-bold"
                        style={{ color: item.color }}
                      >
                        {item.name}
                      </span>
                      <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-md flex items-center justify-end pr-2"
                          style={{ backgroundColor: item.color }}
                        >
                          {pct > 20 && (
                            <span className="text-[10px] font-bold text-white">{item.value}</span>
                          )}
                        </motion.div>
                      </div>
                      {pct <= 20 && (
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{item.value}</span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </ChartCard>

        {/* Critical Cross-Office Issues */}
        <ChartCard title="Critical Cross-Office Issues" subtitle="High/critical escalated issues" delay={0.5}>
          <div className="flex items-center gap-1.5 mb-3">
            <Info size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              High and critical severity issues that have been escalated. These require cross-office coordination to resolve.
            </span>
          </div>
          {anyLoading ? (
            <div className="h-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    {["Title", "Severity", "Level", "Office", "Status"].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 px-3 font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criticalCrossOfficeIssues.map((issue) => (
                    <tr
                      key={issue.id}
                      className="border-b hover:bg-[var(--surface-1)] transition-colors"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="py-2 px-3 font-medium text-[var(--text-primary)] max-w-40 truncate">
                        {issue.title}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{
                            backgroundColor:
                              SEVERITY_COLORS[(issue.severity || "medium").toLowerCase()] || "#9CA3AF",
                          }}
                        >
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">{issue.escalationLevel}</td>
                      <td className="py-2 px-3">
                        {issue.office ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: issue.office.color }}
                          >
                            {issue.office.code}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">--</span>
                        )}
                      </td>
                      <td className="py-2 px-3 capitalize text-[var(--text-secondary)]">{issue.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {criticalCrossOfficeIssues.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] text-center py-8">
                  No critical cross-office issues found
                </p>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Office Project Distribution Summary */}
      <ChartCard title="Office Project Distribution" subtitle="Project count and health per office" delay={0.55}>
        <div className="flex items-center gap-1.5 mb-2">
          <Info size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">
            Project count and RAG status per office. Offices with more red dots may need additional project management support.
          </span>
        </div>
        {anyLoading ? (
          <div className="h-32 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {OFFICES.map((office) => {
              const officePs = officeProjectGroups.get(office.id) || [];
              const greenCount = officePs.filter((p) => (p.ragStatus || "").toLowerCase() === "green").length;
              const amberCount = officePs.filter((p) => (p.ragStatus || "").toLowerCase() === "amber").length;
              const redCount = officePs.filter((p) => (p.ragStatus || "").toLowerCase() === "red").length;

              return (
                <motion.div
                  key={office.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: `${office.color}30`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: office.color }}
                    />
                    <span className="text-xs font-bold text-[var(--text-primary)]">{office.code}</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: office.color }}>
                    {officePs.length}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mb-2">Projects</p>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22C55E" }} />
                      {greenCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
                      {amberCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#EF4444" }} />
                      {redCount}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
