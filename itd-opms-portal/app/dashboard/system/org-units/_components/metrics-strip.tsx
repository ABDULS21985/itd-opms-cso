"use client";

import { useMemo } from "react";
import {
  Building2,
  Users,
  Layers,
  GitBranch,
  UserX,
  Activity,
} from "lucide-react";
import { KPIStatCard } from "@/components/dashboard/charts/kpi-stat-card";
import type { OrgTreeNode, OrgAnalyticsResponse } from "@/types";

interface MetricsStripProps {
  tree: OrgTreeNode[];
  analytics?: OrgAnalyticsResponse;
  isLoading: boolean;
}

// Client-side tree analysis
function analyzeTree(tree: OrgTreeNode[]) {
  let totalUnits = 0;
  let totalHeadcount = 0;
  let maxDepth = 0;
  let nodesWithChildren = 0;
  let totalChildrenOfParents = 0;
  let vacantCount = 0;
  const levelCounts: Record<string, number> = {};

  function walk(nodes: OrgTreeNode[], depth: number) {
    for (const node of nodes) {
      totalUnits++;
      totalHeadcount += node.userCount || 0;
      if (depth > maxDepth) maxDepth = depth;
      if (!node.managerName) vacantCount++;

      levelCounts[node.level] = (levelCounts[node.level] || 0) + 1;

      if (node.children && node.children.length > 0) {
        nodesWithChildren++;
        totalChildrenOfParents += node.children.length;
        walk(node.children, depth + 1);
      }
    }
  }

  walk(tree, 1);

  const avgSpan = nodesWithChildren > 0
    ? totalChildrenOfParents / nodesWithChildren
    : 0;

  const vacantPct = totalUnits > 0
    ? (vacantCount / totalUnits) * 100
    : 0;

  return { totalUnits, totalHeadcount, maxDepth, avgSpan, vacantCount, vacantPct, levelCounts };
}

export function MetricsStrip({ tree, analytics, isLoading }: MetricsStripProps) {
  const stats = useMemo(() => analyzeTree(tree), [tree]);

  // Use server analytics if available, fallback to client-side
  const totalUnits = analytics?.totalUnits ?? stats.totalUnits;
  const activeUnits = analytics?.activeUnits ?? stats.totalUnits;
  const inactiveUnits = analytics?.inactiveUnits ?? 0;
  const maxDepth = analytics?.maxDepth ?? stats.maxDepth;
  const avgSpan = analytics?.avgSpanOfControl ?? stats.avgSpan;
  const vacantPct = analytics?.vacantLeadership ?? stats.vacantPct;
  const totalHeadcount = analytics?.totalHeadcount ?? stats.totalHeadcount;

  const metrics = [
    {
      label: "Total Units",
      value: totalUnits,
      icon: Building2,
      color: "#6366F1",
      bgColor: "rgba(99, 102, 241, 0.1)",
      subtitle: `${activeUnits} active · ${inactiveUnits} inactive`,
    },
    {
      label: "Total Headcount",
      value: totalHeadcount,
      icon: Users,
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
      subtitle: totalUnits > 0 ? `~${Math.round(totalHeadcount / totalUnits)} per unit` : undefined,
    },
    {
      label: "Max Depth",
      value: maxDepth,
      icon: Layers,
      color: "#8B5CF6",
      bgColor: "rgba(139, 92, 246, 0.1)",
      subtitle: "Levels deep",
    },
    {
      label: "Avg Span of Control",
      value: avgSpan.toFixed(1),
      icon: GitBranch,
      color: avgSpan > 8 ? "#EF4444" : avgSpan > 6 ? "#F59E0B" : "#10B981",
      bgColor: avgSpan > 8 ? "rgba(239, 68, 68, 0.1)" : avgSpan > 6 ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)",
      subtitle: avgSpan > 8 ? "Above ideal (4-8)" : avgSpan >= 4 ? "Within ideal range" : "Below ideal (4-8)",
    },
    {
      label: "Vacant Leadership",
      value: `${vacantPct.toFixed(0)}%`,
      icon: UserX,
      color: vacantPct > 20 ? "#EF4444" : vacantPct > 10 ? "#F59E0B" : "#10B981",
      bgColor: vacantPct > 20 ? "rgba(239, 68, 68, 0.1)" : vacantPct > 10 ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)",
      subtitle: `${stats.vacantCount} units without manager`,
    },
    {
      label: "Active Ratio",
      value: totalUnits > 0 ? `${((activeUnits / totalUnits) * 100).toFixed(0)}%` : "—",
      icon: Activity,
      color: "#10B981",
      bgColor: "rgba(16, 185, 129, 0.1)",
      subtitle: `${activeUnits} of ${totalUnits} active`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.map((m, i) => (
        <KPIStatCard
          key={m.label}
          label={m.label}
          value={m.value}
          icon={m.icon}
          color={m.color}
          bgColor={m.bgColor}
          isLoading={isLoading}
          index={i}
          subtitle={m.subtitle}
        />
      ))}
    </div>
  );
}
