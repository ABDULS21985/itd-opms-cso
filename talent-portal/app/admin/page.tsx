"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Building2,
  Briefcase,
  TrendingUp,
  FileText,
  BarChart3,
  Layers,
  Award,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  useReportsOverview,
  useCandidateReports,
  usePlacementReports,
  useJobReports,
  useEmployerReports,
  useTimeMetrics,
  useSkillsDemand,
} from "@/hooks/use-reports";
import { useAuditLogs } from "@/hooks/use-admin";

// Dashboard components
import { HeroMetricsStrip } from "@/components/admin/dashboard/hero-metrics-strip";
import { PlacementFunnel } from "@/components/admin/dashboard/placement-funnel";
import { SmartAlertsPanel } from "@/components/admin/dashboard/smart-alerts";
import { ActivityFeed } from "@/components/admin/dashboard/activity-feed";
import { HeatmapCalendar } from "@/components/admin/dashboard/heatmap-calendar";
import { DashboardSkeleton } from "@/components/admin/dashboard/dashboard-skeleton";
import {
  C,
  CHART_COLORS,
  STATUS_COLORS,
  tooltipStyle,
  fmt,
  pct,
} from "@/components/admin/dashboard/shared";
import type {
  MetricItem,
  SmartAlert,
  FunnelStage,
  HeatmapDay,
} from "@/components/admin/dashboard/shared";

// ────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: overview, isLoading } = useReportsOverview();
  const { data: candidateReport } = useCandidateReports();
  const { data: placementReport } = usePlacementReports();
  const { data: jobReport } = useJobReports();
  const { data: employerReport } = useEmployerReports();
  const { data: timeMetrics } = useTimeMetrics();
  const { data: skillsDemand } = useSkillsDemand(8);
  const { data: heatmapAuditData } = useAuditLogs({ limit: 100, sort: "createdAt", order: "desc" });

  // ── Derived: KPI metrics ──

  const totalCandidates = overview?.candidates?.total ?? 0;
  const approvedCandidates = overview?.candidates?.approved ?? 0;
  const totalEmployers = overview?.employers?.total ?? 0;
  const verifiedEmployers = overview?.employers?.verified ?? 0;
  const totalJobs = overview?.jobs?.total ?? 0;
  const publishedJobs = overview?.jobs?.published ?? 0;
  const totalPlacements = overview?.placements?.total ?? 0;
  const activePlacements = overview?.placements?.active ?? 0;
  const totalIntros = overview?.introRequests?.total ?? 0;

  const metrics: MetricItem[] = useMemo(() => [
    {
      label: "Total Candidates", value: totalCandidates,
      sub: `${approvedCandidates} approved`, icon: Users, color: C.primary,
      href: "/admin/candidates",
      trendValue: pct(approvedCandidates, totalCandidates),
      trendDirection: pct(approvedCandidates, totalCandidates) >= 50 ? "up" : "down",
    },
    {
      label: "Total Employers", value: totalEmployers,
      sub: `${verifiedEmployers} verified`, icon: Building2, color: C.orange,
      href: "/admin/employers",
      trendValue: pct(verifiedEmployers, totalEmployers),
      trendDirection: pct(verifiedEmployers, totalEmployers) >= 50 ? "up" : "down",
    },
    {
      label: "Total Jobs", value: totalJobs,
      sub: `${publishedJobs} published`, icon: Briefcase, color: C.primaryLight,
      href: "/admin/jobs",
      trendValue: pct(publishedJobs, totalJobs),
      trendDirection: pct(publishedJobs, totalJobs) >= 50 ? "up" : "down",
    },
    {
      label: "Placements", value: totalPlacements,
      sub: `${activePlacements} active`, icon: TrendingUp, color: C.green,
      href: "/admin/placements",
      trendValue: pct(activePlacements, totalPlacements),
      trendDirection: activePlacements > 0 ? "up" : "down",
    },
    {
      label: "Intro Requests", value: totalIntros,
      sub: "Total submitted", icon: FileText, color: C.purple,
      href: "/admin/intro-requests",
      trendValue: totalIntros > 0 ? 100 : 0,
      trendDirection: totalIntros > 0 ? "up" : "down",
    },
  ], [totalCandidates, approvedCandidates, totalEmployers, verifiedEmployers, totalJobs, publishedJobs, totalPlacements, activePlacements, totalIntros]);

  // ── Derived: Smart alerts ──

  const alerts: SmartAlert[] = useMemo(() => {
    const result: SmartAlert[] = [];
    const pendingCandidates = candidateReport?.pendingProfiles ?? 0;
    if (pendingCandidates > 0) {
      result.push({
        id: "pending-candidates",
        severity: pendingCandidates > 5 ? "urgent" : "warning",
        title: `${pendingCandidates} candidate${pendingCandidates !== 1 ? "s" : ""} awaiting review`,
        description: "Profiles pending admin approval",
        actionLabel: "Review Now",
        actionHref: "/admin/candidates?status=SUBMITTED",
        count: pendingCandidates,
      });
    }
    const pendingEmployers = employerReport?.pendingEmployers ?? 0;
    if (pendingEmployers > 0) {
      result.push({
        id: "pending-employers",
        severity: pendingEmployers > 3 ? "urgent" : "warning",
        title: `${pendingEmployers} employer${pendingEmployers !== 1 ? "s" : ""} pending verification`,
        description: "Organizations awaiting verification",
        actionLabel: "Verify",
        actionHref: "/admin/employers?status=PENDING",
        count: pendingEmployers,
      });
    }
    if (totalIntros > 0) {
      result.push({
        id: "pending-intros",
        severity: "info",
        title: `${totalIntros} intro request${totalIntros !== 1 ? "s" : ""} submitted`,
        description: "Intro requests requiring attention",
        actionLabel: "Review",
        actionHref: "/admin/intro-requests",
        count: totalIntros,
      });
    }
    return result;
  }, [candidateReport, employerReport, totalIntros]);

  // ── Derived: Funnel stages ──

  const funnelStages: FunnelStage[] = useMemo(() => {
    if (!placementReport || !Array.isArray(placementReport)) return [];
    const statusMap: Record<string, { label: string; color: string; order: number }> = {
      IN_DISCUSSION: { label: "Screening", color: C.orange, order: 0 },
      INTERVIEWING: { label: "Interview", color: C.purple, order: 1 },
      OFFER: { label: "Offer", color: C.amber, order: 2 },
      PLACED: { label: "Placed", color: C.green, order: 3 },
      COMPLETED: { label: "Completed", color: C.emerald, order: 4 },
    };
    return (placementReport as unknown as { status: string; count: string }[])
      .filter((r) => statusMap[r.status])
      .map((r) => ({
        label: statusMap[r.status].label,
        status: r.status,
        count: parseInt(String(r.count), 10),
        color: statusMap[r.status].color,
        _order: statusMap[r.status].order,
      }))
      .sort((a, b) => (a as any)._order - (b as any)._order)
      .map(({ label, status, count, color }) => ({ label, status, count, color }));
  }, [placementReport]);

  // ── Derived: Health rates ──

  const healthRates = useMemo(() => [
    { label: "Approval Rate", value: pct(approvedCandidates, totalCandidates), color: C.green },
    { label: "Verification Rate", value: pct(verifiedEmployers, totalEmployers), color: C.primaryLight },
    { label: "Publication Rate", value: pct(publishedJobs, totalJobs), color: C.purple },
    { label: "Active Placement", value: pct(activePlacements, totalPlacements), color: C.orange },
  ], [approvedCandidates, totalCandidates, verifiedEmployers, totalEmployers, publishedJobs, totalJobs, activePlacements, totalPlacements]);

  // ── Derived: Heatmap data ──

  const heatmapData: HeatmapDay[] = useMemo(() => {
    const counts: Record<string, number> = {};
    if (heatmapAuditData?.data) {
      for (const log of heatmapAuditData.data) {
        const date = new Date(log.createdAt).toISOString().split("T")[0];
        counts[date] = (counts[date] ?? 0) + 1;
      }
    }
    const result: HeatmapDay[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      result.push({ date: dateStr, count: counts[dateStr] ?? 0 });
    }
    return result;
  }, [heatmapAuditData]);

  // ── Derived: Pipeline charts ──

  const placementStatusData = useMemo(() => {
    if (!placementReport || !Array.isArray(placementReport)) return [];
    return (placementReport as unknown as { status: string; count: string }[]).map((r, i) => ({
      name: fmt(r.status),
      value: parseInt(String(r.count), 10),
      fill: STATUS_COLORS[r.status] || CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [placementReport]);

  const jobStatusData = useMemo(() => {
    if (!jobReport || !Array.isArray(jobReport)) return [];
    return (jobReport as unknown as { status: string; count: string }[]).map((r, i) => ({
      name: fmt(r.status),
      value: parseInt(String(r.count), 10),
      fill: STATUS_COLORS[r.status] || CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [jobReport]);

  const candidateStatusData = useMemo(() => {
    if (!candidateReport?.byStatus) return [];
    return (candidateReport.byStatus as { status: string; count: string }[]).map((r, i) => ({
      name: fmt(r.status),
      value: parseInt(String(r.count), 10),
      fill: STATUS_COLORS[r.status] || CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [candidateReport]);

  const trackDistribution = candidateReport?.byTrack ?? [];
  const totalByTrack = trackDistribution.reduce((s, t) => s + t.count, 0);
  const topTracks = useMemo(
    () => [...trackDistribution].sort((a, b) => b.count - a.count).slice(0, 5),
    [trackDistribution],
  );

  const topSkills = useMemo(
    () => (skillsDemand ?? []).slice(0, 8).map((s) => ({ name: s.skillName, value: s.demandCount })),
    [skillsDemand],
  );

  // ── Loading state ──

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Platform overview, pipeline health, and key metrics at a glance.</p>
        </div>
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--secondary)] transition-colors shadow-sm"
        >
          <BarChart3 size={16} />
          View Full Reports
        </Link>
      </div>

      {/* ═══════════════════════════════════════
          SECTION — Smart Alerts
          ═══════════════════════════════════════ */}

      <SmartAlertsPanel alerts={alerts} />

      {/* ═══════════════════════════════════════
          SECTION — Hero Metrics Strip
          ═══════════════════════════════════════ */}

      <HeroMetricsStrip metrics={metrics} />

      {/* ═══════════════════════════════════════
          SECTION — Funnel + Activity Feed
          ═══════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PlacementFunnel
            stages={funnelStages}
            timeMetrics={timeMetrics}
            healthRates={healthRates}
            onStageClick={(status) => router.push(`/admin/placements?status=${status}`)}
          />
        </div>
        <ActivityFeed />
      </div>

      {/* ═══════════════════════════════════════
          SECTION — Heatmap Calendar
          ═══════════════════════════════════════ */}

      <HeatmapCalendar data={heatmapData} />

      {/* ═══════════════════════════════════════
          SECTION — Pipeline Charts
          ═══════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {([
          { title: "Placement Pipeline", icon: TrendingUp, data: placementStatusData, empty: "No placement data" },
          { title: "Candidate Status", icon: Users, data: candidateStatusData, empty: "No candidate data" },
          { title: "Job Pipeline", icon: Briefcase, data: jobStatusData, empty: "No job data" },
        ] as const).map((chart) => {
          const ChartIcon = chart.icon;
          return (
            <div key={chart.title} className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <ChartIcon size={18} className="text-[var(--primary)]" />
                </div>
                <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">{chart.title}</h2>
              </div>
              {chart.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={chart.data}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {chart.data.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                      formatter={(v: string) => <span className="text-[var(--text-secondary)]">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-sm text-[var(--text-muted)]">
                  {chart.empty}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════
          SECTION — Track Distribution + Top Skills
          ═══════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tracks */}
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
              <Layers size={18} className="text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">Top Candidate Tracks</h2>
              <p className="text-xs text-[var(--text-secondary)]">{totalByTrack} candidates across {trackDistribution.length} tracks</p>
            </div>
          </div>
          {topTracks.length > 0 ? (
            <div className="space-y-4">
              {topTracks.map((t, idx) => {
                const percentage = pct(t.count, totalByTrack);
                return (
                  <div key={t.track}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-[var(--text-secondary)] font-medium">{t.track || "Unassigned"}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                        {t.count.toLocaleString()}
                        <span className="text-[var(--text-muted)] font-normal text-xs ml-1">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--surface-1)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-[var(--text-muted)]">No track data available</div>
          )}
        </div>

        {/* Top Skills in Demand */}
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                <Award size={18} className="text-[var(--primary)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">Top Skills in Demand</h2>
                <p className="text-xs text-[var(--text-secondary)]">Most requested across job postings</p>
              </div>
            </div>
            <Link href="/admin/reports" className="text-xs text-[var(--primary)] font-medium hover:underline">
              View all
            </Link>
          </div>
          {topSkills.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topSkills} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" fill={C.primary} radius={[0, 6, 6, 0]} maxBarSize={24} name="Job Postings" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-sm text-[var(--text-muted)]">No skills data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
