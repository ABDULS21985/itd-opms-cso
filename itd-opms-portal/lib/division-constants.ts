import type { Project, Risk } from "@/types";

export const OFFICES = [
  { id: "4493b788-602f-e1a7-ab04-3058bbe61ff4", name: "Business Intelligence Services", code: "BISO", color: "#3B82F6", bgColor: "rgba(59,130,246,0.1)" },
  { id: "db40aa8c-dc75-1e84-8fc9-ef0f59c80a90", name: "Collaboration Services", code: "CSO", color: "#8B5CF6", bgColor: "rgba(139,92,246,0.1)" },
  { id: "c22d15fd-f6f0-a86a-d541-f4cd13051094", name: "Financial Surveillance Services", code: "FSSO", color: "#F59E0B", bgColor: "rgba(245,158,11,0.1)" },
  { id: "2464f477-fd51-01ff-2cfc-edc0846be881", name: "Internal Support Services", code: "ISSO", color: "#06B6D4", bgColor: "rgba(6,182,212,0.1)" },
  { id: "2a5f2e13-d303-1895-16e1-1b048c9d791d", name: "Payment & Operations Services", code: "POSO", color: "#22C55E", bgColor: "rgba(34,197,94,0.1)" },
] as const;

export type Office = (typeof OFFICES)[number];

export interface OfficeMetrics {
  id: string;
  name: string;
  code: string;
  color: string;
  bgColor: string;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  proposedProjects: number;
  avgCompletion: number;
  budgetApproved: number;
  budgetSpent: number;
  budgetUtilization: number;
  ragGreen: number;
  ragAmber: number;
  ragRed: number;
  onTimePct: number;
  openRisks: number;
  healthScore: number;
  totalWorkItems: number;
  completedWorkItems: number;
  overdueWorkItems: number;
  staffCount: number;
  statusBreakdown: Record<string, number>;
}

const ACTIVE_STATUSES = [
  "active", "in-development", "implementation", "kick-off",
  "project-mode", "requirement-management", "solution-architecture",
];

export function computeOfficeMetrics(
  projects: Project[],
  risks: Risk[],
): OfficeMetrics[] {
  const projectDivisionMap: Record<string, string> = {};
  for (const p of projects) {
    if (p.divisionId) projectDivisionMap[p.id] = p.divisionId;
  }

  return OFFICES.map((office) => {
    const officeProjects = projects.filter((p) => p.divisionId === office.id);
    const total = officeProjects.length;
    const activeProjects = officeProjects.filter((p) =>
      ACTIVE_STATUSES.includes(p.status),
    ).length;
    const completedProjects = officeProjects.filter((p) => p.status === "completed").length;
    const proposedProjects = officeProjects.filter((p) => p.status === "proposed").length;

    const avgCompletion = total > 0
      ? Math.round(officeProjects.reduce((s, p) => s + (p.completionPct || 0), 0) / total)
      : 0;

    const budgetApproved = officeProjects.reduce((s, p) => s + (p.budgetApproved || 0), 0);
    const budgetSpent = officeProjects.reduce((s, p) => s + (p.budgetSpent || 0), 0);
    const budgetUtilization = budgetApproved > 0 ? Math.round((budgetSpent / budgetApproved) * 100) : 0;

    let ragGreen = 0, ragAmber = 0, ragRed = 0;
    for (const p of officeProjects) {
      const rag = (p.ragStatus || "").toLowerCase();
      if (rag === "green") ragGreen++;
      else if (rag === "amber") ragAmber++;
      else if (rag === "red") ragRed++;
    }

    const projectsWithDeadline = officeProjects.filter((p) => p.plannedEnd);
    let onTimeCount = 0;
    const now = new Date().toISOString().slice(0, 10);
    for (const p of projectsWithDeadline) {
      if (p.status === "completed" && p.actualEnd && p.plannedEnd) {
        if (p.actualEnd <= p.plannedEnd) onTimeCount++;
      } else if (p.status !== "completed" && p.status !== "cancelled" && p.plannedEnd) {
        if (now <= p.plannedEnd) onTimeCount++;
      }
    }
    const onTimePct = projectsWithDeadline.length > 0
      ? Math.round((onTimeCount / projectsWithDeadline.length) * 100)
      : 100;

    const officeProjectIds = new Set(officeProjects.map((p) => p.id));
    const officeRisks = risks.filter((r) => r.projectId && officeProjectIds.has(r.projectId));
    const openRisks = officeRisks.filter((r) => r.status === "open").length;

    const statusBreakdown: Record<string, number> = {};
    for (const p of officeProjects) {
      const s = p.status || "unknown";
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }

    const ragHealth = total > 0 ? (ragGreen / total) * 100 : 100;
    const budgetEfficiency = budgetUtilization > 100 ? Math.max(0, 200 - budgetUtilization) : 100;
    const riskScore = total > 0 ? Math.max(0, 100 - (openRisks / total) * 50) : 100;
    const healthScore = Math.round(
      avgCompletion * 0.3 +
      budgetEfficiency * 0.2 +
      onTimePct * 0.2 +
      ragHealth * 0.2 +
      riskScore * 0.1,
    );

    return {
      id: office.id,
      name: office.name,
      code: office.code,
      color: office.color,
      bgColor: office.bgColor,
      totalProjects: total,
      activeProjects,
      completedProjects,
      proposedProjects,
      avgCompletion,
      budgetApproved,
      budgetSpent,
      budgetUtilization,
      ragGreen,
      ragAmber,
      ragRed,
      onTimePct,
      openRisks,
      healthScore,
      totalWorkItems: 0,
      completedWorkItems: 0,
      overdueWorkItems: 0,
      staffCount: 0,
      statusBreakdown,
    };
  });
}

export function enrichWithApiData(
  metrics: OfficeMetrics[],
  apiData: Array<{
    divisionId: string;
    totalWorkItems: number;
    completedWorkItems: number;
    overdueWorkItems: number;
    staffCount: number;
  }> | undefined,
): OfficeMetrics[] {
  if (!apiData) return metrics;
  const lookup = new Map(apiData.map((d) => [d.divisionId, d]));
  return metrics.map((m) => {
    const api = lookup.get(m.id);
    if (!api) return m;
    return {
      ...m,
      totalWorkItems: api.totalWorkItems,
      completedWorkItems: api.completedWorkItems,
      overdueWorkItems: api.overdueWorkItems,
      staffCount: api.staffCount,
    };
  });
}

export function formatCurrency(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

export function generateSyntheticTrend(currentValue: number, length = 7): number[] {
  const trend: number[] = [];
  for (let i = 0; i < length; i++) {
    const noise = (Math.sin(i * 1.5) * 0.15 + Math.cos(i * 0.8) * 0.1) * currentValue;
    trend.push(Math.max(0, Math.round(currentValue + noise - (length - 1 - i) * (currentValue * 0.02))));
  }
  trend[length - 1] = currentValue;
  return trend;
}
