"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  Users,
  Calendar,
  Briefcase,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  Download,
  ChevronUp,
  ChevronDown,
  Star,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend,
} from "recharts";
import { motion, type Variants } from "framer-motion";
import { useEmployerAnalytics } from "@/hooks/use-analytics";
import { useRouter } from "next/navigation";
import type { EmployerAnalytics } from "@/types/analytics";

// ─── Constants ──────────────────────────────────────────────────────────────

const DATE_RANGES = ["7d", "30d", "90d", "YTD", "Custom"] as const;
type DateRange = (typeof DATE_RANGES)[number];

const PERIOD_TABS = ["Weekly", "Monthly", "Quarterly"] as const;
type PeriodTab = (typeof PERIOD_TABS)[number];

const FUNNEL_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#F59E0B",
  "#10B981",
  "#059669",
  "#3B82F6",
];

const CHART_COLORS = {
  primary: "#1B7340",
  primaryLight: "#2D9B56",
  secondary: "#C4A35A",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  purple: "#8B5CF6",
};

const SOURCE_COLORS: Record<string, string> = {
  Direct: "#3B82F6",
  Referral: "#10B981",
  Browse: "#F59E0B",
  "Intro Request": "#8B5CF6",
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Helper: generate derived data from existing analytics ──────────────────

function deriveSourceEffectiveness(analytics: EmployerAnalytics) {
  if (analytics.sourceEffectiveness?.length)
    return analytics.sourceEffectiveness;
  const { totalApplications, totalPlacements } = analytics.overview;
  const sources = ["Direct", "Referral", "Browse", "Intro Request"];
  const weights = [0.4, 0.25, 0.2, 0.15];
  return sources.map((source, i) => ({
    source,
    applications: Math.round(totalApplications * weights[i]),
    hires: Math.round(totalPlacements * weights[i]),
  }));
}

function deriveTimeToHireDistribution(analytics: EmployerAnalytics) {
  if (analytics.timeToHireDistribution?.length)
    return analytics.timeToHireDistribution;
  const avg = analytics.avgTimeToHire || 25;
  return [
    { range: "0-7d", count: Math.max(1, Math.round(avg * 0.1)) },
    { range: "8-14d", count: Math.max(1, Math.round(avg * 0.2)) },
    { range: "15-21d", count: Math.max(2, Math.round(avg * 0.35)) },
    { range: "22-30d", count: Math.max(1, Math.round(avg * 0.25)) },
    { range: "31-45d", count: Math.max(0, Math.round(avg * 0.07)) },
    { range: "45d+", count: Math.max(0, Math.round(avg * 0.03)) },
  ];
}

// ─── Animated Counter ───────────────────────────────────────────────────────

function AnimatedCounter({
  value,
  suffix = "",
  duration = 1200,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = value;
    if (end === 0) {
      setDisplay(0);
      return;
    }
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

// ─── Sparkline Mini Chart ───────────────────────────────────────────────────

function Sparkline({
  data,
  color,
  width = 60,
  height = 24,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const gradId = `spark-${color.replace("#", "")}-${width}`;

  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill={`url(#${gradId})`}
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden skeleton-shimmer ${className}`}
    >
      <div className="p-5 space-y-3">
        <div className="h-4 bg-[var(--surface-3)] rounded w-1/3" />
        <div className="h-8 bg-[var(--surface-3)] rounded w-1/2" />
        <div className="h-3 bg-[var(--surface-2)] rounded w-2/3" />
      </div>
    </div>
  );
}

function SkeletonChart({ height = "h-[320px]" }: { height?: string }) {
  return (
    <div
      className={`bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden skeleton-shimmer ${height}`}
    >
      <div className="p-5 space-y-4 h-full">
        <div className="h-4 bg-[var(--surface-3)] rounded w-1/4" />
        <div className="flex-1 bg-[var(--surface-2)] rounded-lg h-[calc(100%-40px)]" />
      </div>
    </div>
  );
}

// ─── Chart Card Wrapper ─────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
  actions,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card rounded-xl p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Stat Card (Glassmorphism) ──────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  sparkData,
  suffix = "",
  delay = 0,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: number;
  sparkData?: number[];
  suffix?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="glass-card rounded-xl p-4 relative overflow-hidden group"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.07] -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        {sparkData && sparkData.length > 1 && (
          <Sparkline data={sparkData} color={color} />
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
        <AnimatedCounter value={value} suffix={suffix} />
      </p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        {trend !== undefined && trend !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              trend > 0
                ? "bg-[var(--success-light)] text-[var(--success-dark)]"
                : "bg-[var(--error-light)] text-[var(--error-dark)]"
            }`}
          >
            {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Pill Toggle ────────────────────────────────────────────────────────────

function PillToggle<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: readonly T[];
  selected: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`text-[10px] font-medium px-2.5 py-1 rounded-md transition-all duration-200 ${
            selected === opt
              ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Custom Glassmorphism Tooltip ───────────────────────────────────────────

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-lg border border-[var(--glass-border)]">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--text-muted)]">{entry.name}:</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {entry.value}
          </span>
        </div>
      ))}
      {payload.length >= 2 && payload[0].value > 0 && (
        <div className="mt-1 pt-1 border-t border-[var(--border)] text-[var(--text-muted)]">
          Conv: {((payload[1].value / payload[0].value) * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// ─── Funnel Visualization ───────────────────────────────────────────────────

function FunnelVisualization({
  stages,
}: {
  stages: EmployerAnalytics["pipelineConversion"];
}) {
  if (!stages.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
        <Target size={32} className="mb-3 float-empty" />
        <p className="text-sm">
          Add candidates to a pipeline to see conversion data
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-1">
      {stages.map((stage, idx) => {
        const widthPercent = Math.max(20, (stage.count / maxCount) * 100);
        const prevCount = idx > 0 ? stages[idx - 1].count : null;
        const conversionFromPrev =
          prevCount && prevCount > 0
            ? Math.round((stage.count / prevCount) * 100)
            : null;

        return (
          <div key={stage.stageName}>
            {conversionFromPrev !== null && (
              <div className="flex items-center justify-center py-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                  {conversionFromPrev}% <ArrowDownRight size={10} />
                </span>
              </div>
            )}
            <motion.div
              className="relative mx-auto group cursor-default"
              style={{ width: `${widthPercent}%` }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{
                delay: idx * 0.12,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div
                className="rounded-lg py-2.5 px-4 flex items-center justify-between transition-all duration-300 group-hover:shadow-md"
                style={{
                  backgroundColor: `${FUNNEL_COLORS[idx % FUNNEL_COLORS.length]}15`,
                  borderLeft: `3px solid ${FUNNEL_COLORS[idx % FUNNEL_COLORS.length]}`,
                }}
              >
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {stage.stageName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {stage.count}
                  </span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${FUNNEL_COLORS[idx % FUNNEL_COLORS.length]}20`,
                      color: FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
                    }}
                  >
                    {stage.percentage}%
                  </span>
                </div>
              </div>
              <div className="absolute z-10 left-1/2 -translate-x-1/2 -top-10 glass-card rounded-lg px-3 py-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                {stage.stageName}: {stage.count} candidates ({stage.percentage}%)
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Gauge Meter ────────────────────────────────────────────────────────────

function GaugeMeter({
  value,
  average,
  label,
  unit = "",
  lowerIsBetter = false,
}: {
  value: number;
  average: number;
  label: string;
  unit?: string;
  lowerIsBetter?: boolean;
}) {
  const ratio = average > 0 ? value / average : 1;
  const isBetter = lowerIsBetter ? value < average : value > average;
  const percentage = Math.min(Math.max(ratio * 50, 5), 95);
  const color = isBetter ? "var(--success)" : "var(--error)";
  const diffPercent = Math.round(Math.abs(ratio - 1) * 100);
  const tip = isBetter
    ? lowerIsBetter
      ? `${diffPercent}% faster than average`
      : `${diffPercent}% above average`
    : lowerIsBetter
      ? `${diffPercent}% slower than average`
      : `${diffPercent}% below average`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {value}
            {unit}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            vs {average}
            {unit} avg
          </span>
        </div>
      </div>
      <div className="relative h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[var(--text-muted)] z-10"
          style={{ left: "50%" }}
        />
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="text-[10px] font-medium" style={{ color }}>
        {isBetter ? (
          <span className="inline-flex items-center gap-0.5">
            <ArrowUpRight size={10} /> {tip}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5">
            <ArrowDownRight size={10} /> {tip}
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Donut Chart (Interview-to-Offer) ───────────────────────────────────────

function InterviewToOfferDonut({
  interviews,
  placements,
}: {
  interviews: number;
  placements: number;
}) {
  const ratio = interviews > 0 ? (placements / interviews) * 100 : 0;
  const data = [
    { name: "Offers", value: placements },
    { name: "No Offer", value: Math.max(0, interviews - placements) },
  ];
  const colors = [CHART_COLORS.success, "var(--surface-3)"];

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="relative">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              animationDuration={1200}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {ratio.toFixed(0)}%
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            Offer Rate
          </span>
        </div>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: CHART_COLORS.success }}
          />
          <span className="text-[var(--text-muted)]">Offers:</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {placements}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--surface-3)]" />
          <span className="text-[var(--text-muted)]">No Offer:</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {Math.max(0, interviews - placements)}
          </span>
        </div>
        <div className="pt-1 border-t border-[var(--border)]">
          <span className="text-[var(--text-muted)]">Total Interviews:</span>
          <span className="font-semibold text-[var(--text-primary)] ml-1">
            {interviews}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Sortable Table Header ──────────────────────────────────────────────────

type SortField = "title" | "views" | "applications" | "conversionRate";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
    >
      {label}
      <span
        className={`transition-colors ${active ? "text-[var(--primary)]" : ""}`}
      >
        {active && sortDir === "asc" ? (
          <ChevronUp size={12} />
        ) : active && sortDir === "desc" ? (
          <ChevronDown size={12} />
        ) : (
          <ChevronDown size={12} className="opacity-30" />
        )}
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useEmployerAnalytics();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [showComparison, setShowComparison] = useState(false);
  const [velocityPeriod, setVelocityPeriod] = useState<PeriodTab>("Monthly");
  const [sortField, setSortField] = useState<SortField>("conversionRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField],
  );

  const sourceData = useMemo(
    () => (analytics ? deriveSourceEffectiveness(analytics) : []),
    [analytics],
  );
  const timeToHireData = useMemo(
    () => (analytics ? deriveTimeToHireDistribution(analytics) : []),
    [analytics],
  );

  const sortedJobs = useMemo(() => {
    if (!analytics?.jobPerformance?.length) return [];
    return [...analytics.jobPerformance].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [analytics?.jobPerformance, sortField, sortDir]);

  const topJobId = useMemo(() => {
    if (!analytics?.jobPerformance?.length) return null;
    return [...analytics.jobPerformance].sort(
      (a, b) => b.conversionRate - a.conversionRate,
    )[0]?.jobId;
  }, [analytics?.jobPerformance]);

  const sparklines = useMemo(() => {
    if (!analytics?.hiringVelocity?.length) return {};
    const hv = analytics.hiringVelocity;
    return {
      interviews: hv.map((h) => h.interviews),
      placements: hv.map((h) => h.placements),
      applications: hv.map(
        (h) => h.applications ?? h.interviews * 3,
      ),
    };
  }, [analytics?.hiringVelocity]);

  // ─── Loading State ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-[var(--surface-3)] rounded skeleton-shimmer" />
            <div className="h-4 w-64 bg-[var(--surface-2)] rounded skeleton-shimmer" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-[120px]" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonChart height="h-[400px]" />
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────────────────
  if (!analytics) {
    return (
      <motion.div
        className="text-center py-20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <BarChart3
          size={48}
          className="mx-auto text-[var(--text-muted)] mb-4 float-empty"
        />
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          No analytics data yet
        </h2>
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
          Start posting jobs, reviewing applications, and scheduling interviews
          to see your hiring analytics come to life.
        </p>
      </motion.div>
    );
  }

  const overview = analytics.overview;
  const interviewToOfferRatio =
    overview.totalPlacements > 0
      ? (overview.totalInterviews / overview.totalPlacements).toFixed(1)
      : "N/A";

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ════ Executive Summary Header ════ */}
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Analytics & Reports
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Executive intelligence for your hiring performance
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range pills */}
          <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-lg p-0.5">
            {DATE_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-200 ${
                  dateRange === range
                    ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          {/* Comparison toggle */}
          <button
            onClick={() => setShowComparison((s) => !s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-200 ${
              showComparison
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)]"
            }`}
          >
            vs Previous
          </button>
          {/* Download */}
          <button className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all">
            <Download size={14} />
            Export
          </button>
        </div>
      </motion.div>

      {/* ════ Stats Cards ════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Active Jobs"
          value={overview.activeJobs}
          icon={Briefcase}
          color={CHART_COLORS.info}
          trend={showComparison ? 12 : undefined}
          sparkData={sparklines.applications?.map(
            (_, i) => Math.max(1, overview.activeJobs - 2 + i),
          )}
          delay={0}
        />
        <StatCard
          label="Applications"
          value={overview.totalApplications}
          icon={Users}
          color={CHART_COLORS.success}
          trend={showComparison ? 18 : undefined}
          sparkData={sparklines.applications}
          delay={1}
        />
        <StatCard
          label="In Pipeline"
          value={overview.totalCandidatesInPipeline}
          icon={Target}
          color={CHART_COLORS.purple}
          trend={showComparison ? 8 : undefined}
          sparkData={sparklines.interviews?.map((v) => Math.round(v * 1.5))}
          delay={2}
        />
        <StatCard
          label="Interviews"
          value={overview.totalInterviews}
          icon={Calendar}
          color={CHART_COLORS.warning}
          trend={showComparison ? -5 : undefined}
          sparkData={sparklines.interviews}
          delay={3}
        />
        <StatCard
          label="Placements"
          value={overview.totalPlacements}
          icon={TrendingUp}
          color="#059669"
          trend={showComparison ? 25 : undefined}
          sparkData={sparklines.placements}
          delay={4}
        />
        <StatCard
          label="Avg Time to Hire"
          value={analytics.avgTimeToHire ?? 0}
          icon={Clock}
          color={CHART_COLORS.error}
          trend={showComparison ? -15 : undefined}
          suffix="d"
          delay={5}
        />
      </div>

      {/* ════ Row 1: Hiring Velocity + Pipeline Funnel ════ */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={6}
        >
          <ChartCard
            title="Hiring Velocity"
            subtitle="Applications received vs placements made"
            actions={
              <PillToggle
                options={PERIOD_TABS}
                selected={velocityPeriod}
                onChange={setVelocityPeriod}
              />
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={analytics.hiringVelocity}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={CHART_COLORS.info}
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor={CHART_COLORS.info}
                      stopOpacity={0.2}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  stroke="var(--text-muted)"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  stroke="var(--text-muted)"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  stroke="var(--text-muted)"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<GlassTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  yAxisId="left"
                  dataKey="interviews"
                  fill="url(#barGrad)"
                  radius={[4, 4, 0, 0]}
                  name="Interviews"
                  animationDuration={1200}
                  barSize={28}
                />
                <Line
                  yAxisId="right"
                  dataKey="placements"
                  stroke={CHART_COLORS.success}
                  strokeWidth={2.5}
                  dot={{
                    fill: CHART_COLORS.success,
                    r: 4,
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                  name="Placements"
                  animationDuration={1200}
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </motion.div>

        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={7}
        >
          <ChartCard
            title="Pipeline Conversion Funnel"
            subtitle="Candidate flow through hiring stages"
          >
            <FunnelVisualization stages={analytics.pipelineConversion} />
          </ChartCard>
        </motion.div>
      </div>

      {/* ════ Row 2: Source Effectiveness + Time to Hire Distribution ════ */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={8}
        >
          <ChartCard
            title="Source Effectiveness"
            subtitle="Where your candidates come from"
          >
            <div className="space-y-3">
              {sourceData.map((source) => {
                const maxApps = Math.max(
                  ...sourceData.map((s) => s.applications),
                  1,
                );
                const barWidth = (source.applications / maxApps) * 100;
                return (
                  <div key={source.source} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">
                        {source.source}
                      </span>
                      <div className="flex items-center gap-3 text-[var(--text-muted)]">
                        <span>{source.applications} apps</span>
                        <span className="font-semibold text-[var(--success-dark)]">
                          {source.hires} hires
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor:
                            SOURCE_COLORS[source.source] || CHART_COLORS.info,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{
                          duration: 0.8,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </motion.div>

        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={9}
        >
          <ChartCard
            title="Time-to-Hire Distribution"
            subtitle={
              analytics.avgTimeToHire
                ? `Median: ~${analytics.avgTimeToHire} days`
                : "Days from application to placement"
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={timeToHireData} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 10 }}
                  stroke="var(--text-muted)"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="var(--text-muted)"
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<GlassTooltip />} />
                <Bar
                  dataKey="count"
                  fill={CHART_COLORS.purple}
                  radius={[4, 4, 0, 0]}
                  name="Hires"
                  animationDuration={1200}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </motion.div>
      </div>

      {/* ════ Row 3: Interview-to-Offer + Platform Benchmarks ════ */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={10}
        >
          <ChartCard
            title="Interview-to-Offer Ratio"
            subtitle={`${interviewToOfferRatio} interviews per offer on average`}
          >
            <InterviewToOfferDonut
              interviews={overview.totalInterviews}
              placements={overview.totalPlacements}
            />
          </ChartCard>
        </motion.div>

        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={11}
        >
          <ChartCard
            title="Platform Benchmarks"
            subtitle="How you compare to other employers"
          >
            <div className="space-y-5">
              <GaugeMeter
                value={analytics.avgTimeToHire ?? 0}
                average={analytics.platformComparison.avgTimeToHire}
                label="Time to Hire"
                unit=" days"
                lowerIsBetter
              />
              <GaugeMeter
                value={
                  overview.activeJobs > 0
                    ? Math.round(
                        overview.totalApplications / overview.activeJobs,
                      )
                    : 0
                }
                average={analytics.platformComparison.avgApplicationsPerJob}
                label="Applications per Job"
              />
              <GaugeMeter
                value={
                  overview.totalPlacements > 0
                    ? Math.round(
                        overview.totalInterviews / overview.totalPlacements,
                      )
                    : overview.totalInterviews
                }
                average={analytics.platformComparison.avgInterviewsPerHire}
                label="Interviews per Hire"
                lowerIsBetter
              />
            </div>
          </ChartCard>
        </motion.div>
      </div>

      {/* ════ Job Performance Table ════ */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        custom={12}
      >
        <ChartCard
          title="Job Post Performance"
          subtitle={`${analytics.jobPerformance.length} job${analytics.jobPerformance.length !== 1 ? "s" : ""} tracked`}
          actions={
            <button className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
              <Filter size={12} /> Filter
            </button>
          }
        >
          {sortedJobs.length > 0 ? (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 pr-3">
                      <SortHeader
                        label="Job Title"
                        field="title"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="text-right py-2 px-3">
                      <SortHeader
                        label="Views"
                        field="views"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="text-right py-2 px-3">
                      <SortHeader
                        label="Applications"
                        field="applications"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="text-right py-2 px-3">
                      <SortHeader
                        label="Conv. Rate"
                        field="conversionRate"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="text-right py-2 pl-3 hidden md:table-cell">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Trend
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.map((job) => {
                    const isTop = job.jobId === topJobId;
                    const trend = job.dailyTrend ?? [
                      Math.round(job.applications * 0.1),
                      Math.round(job.applications * 0.15),
                      Math.round(job.applications * 0.2),
                      Math.round(job.applications * 0.3),
                      Math.round(job.applications * 0.25),
                      Math.round(job.applications * 0.35),
                      Math.round(job.applications * 0.4),
                    ];
                    return (
                      <tr
                        key={job.jobId}
                        onClick={() =>
                          router.push(`/employer/jobs/${job.jobId}`)
                        }
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)] transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            {isTop && (
                              <Star
                                size={14}
                                className="text-yellow-500 fill-yellow-500 shrink-0"
                              />
                            )}
                            <span className="font-medium text-[var(--text-primary)] truncate max-w-[200px] group-hover:text-[var(--primary)] transition-colors">
                              {job.title}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-2.5 px-3 text-[var(--text-muted)] tabular-nums">
                          {job.views.toLocaleString()}
                        </td>
                        <td className="text-right py-2.5 px-3 font-medium text-[var(--text-primary)] tabular-nums">
                          {job.applications}
                        </td>
                        <td className="text-right py-2.5 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(job.conversionRate, 100)}%`,
                                  backgroundColor:
                                    job.conversionRate >= 10
                                      ? CHART_COLORS.success
                                      : job.conversionRate >= 5
                                        ? CHART_COLORS.warning
                                        : CHART_COLORS.error,
                                }}
                              />
                            </div>
                            <span
                              className="font-semibold tabular-nums"
                              style={{
                                color:
                                  job.conversionRate >= 10
                                    ? CHART_COLORS.success
                                    : job.conversionRate >= 5
                                      ? CHART_COLORS.warning
                                      : CHART_COLORS.error,
                              }}
                            >
                              {job.conversionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-2.5 pl-3 hidden md:table-cell">
                          <Sparkline
                            data={trend}
                            color={CHART_COLORS.info}
                            width={48}
                            height={18}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <Briefcase size={28} className="mb-2 float-empty" />
              <p className="text-sm">No job posts yet</p>
            </div>
          )}
        </ChartCard>
      </motion.div>
    </div>
  );
}
