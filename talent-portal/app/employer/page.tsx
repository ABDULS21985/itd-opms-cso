"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Users,
  Mail,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  PlusCircle,
  Eye,
  Bell,
  Calendar,
  KanbanSquare,
  AlertTriangle,
  BarChart3,
  Video,
  Phone,
  MapPin,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";
import { useMyEmployerOrg } from "@/hooks/use-employers";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { useEmployerIntroRequests } from "@/hooks/use-intro-requests";
import { useNotifications } from "@/hooks/use-notifications";
import { useInterviews } from "@/hooks/use-interviews";
import { useActivityFeed } from "@/hooks/use-activity";
import { useEmployerAnalytics } from "@/hooks/use-analytics";
import { usePipelines } from "@/hooks/use-pipeline";
import { useRecommendedCandidates } from "@/hooks/use-matching";
import { MatchScoreInline } from "@/components/matching/match-score-badge";

/* ================================================================== */
/*  Animated Counter                                                   */
/* ================================================================== */

function AnimatedCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

/* ================================================================== */
/*  Mini Sparkline                                                     */
/* ================================================================== */

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ================================================================== */
/*  Glassmorphism Stat Card                                            */
/* ================================================================== */

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  sparkData?: number[];
  href?: string;
}

function StatCard({ label, value, icon, color, trend, sparkData, href }: StatCardProps) {
  const content = (
    <div className="relative overflow-hidden rounded-2xl p-5 h-full group cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
      }}
    >
      {/* Gradient left border */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: color }} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15` }}
            >
              {icon}
            </div>
            {trend !== undefined && trend !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  trend > 0
                    ? "bg-[var(--success-light)] text-[var(--success-dark)]"
                    : "bg-[var(--error-light)] text-[var(--error-dark)]"
                )}
              >
                {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
            <AnimatedCounter value={value} />
          </p>
          <p className="text-sm text-[var(--neutral-gray)] mt-1 font-medium">{label}</p>
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="w-20 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            <Sparkline data={sparkData} color={color} />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}

/* ================================================================== */
/*  Custom Chart Tooltip                                               */
/* ================================================================== */

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <p className="text-xs font-semibold text-[var(--neutral-gray)] mb-1.5">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-[var(--color-neutral-900)] font-medium">
            {entry.name}: {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Pill Tabs                                                          */
/* ================================================================== */

function PillTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--surface-2)] rounded-xl">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
            value === opt.value
              ? "bg-[var(--surface-0)] text-[var(--color-neutral-900)] shadow-sm"
              : "text-[var(--neutral-gray)] hover:text-[var(--color-neutral-700)]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Y-Axis Formatter                                                   */
/* ================================================================== */

function formatAxisValue(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return String(v);
}

/* ================================================================== */
/*  Pipeline Funnel                                                    */
/* ================================================================== */

const FUNNEL_COLORS = ["#6366F1", "#8B5CF6", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"];

function PipelineFunnel({
  stages,
}: {
  stages: { stageName: string; count: number; percentage: number }[];
}) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, idx) => {
        const widthPct = Math.max((stage.count / maxCount) * 100, 8);
        const color = FUNNEL_COLORS[idx % FUNNEL_COLORS.length];
        const nextStage = stages[idx + 1];
        const conversionRate =
          nextStage && stage.count > 0
            ? Math.round((nextStage.count / stage.count) * 100)
            : null;

        return (
          <div key={stage.stageName}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-[var(--color-neutral-900)]">
                    {stage.stageName}
                  </span>
                  <span className="text-sm font-bold text-[var(--color-neutral-700)]">
                    {stage.count}
                    <span className="text-xs font-medium text-[var(--neutral-gray)] ml-1">
                      ({stage.percentage}%)
                    </span>
                  </span>
                </div>
                <div className="h-3 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </div>
            {/* Conversion rate badge between stages */}
            {conversionRate !== null && (
              <div className="flex items-center gap-2 ml-4 my-1.5">
                <div className="w-px h-4 bg-[var(--border)]" />
                <span className="text-[10px] font-bold text-[var(--neutral-gray)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                  {conversionRate}% pass
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Interview Type Icon                                                */
/* ================================================================== */

function InterviewTypeIcon({ type }: { type: string }) {
  switch (type?.toLowerCase()) {
    case "video":
      return <Video size={14} className="text-[var(--info)]" />;
    case "phone":
      return <Phone size={14} className="text-[var(--success)]" />;
    case "in_person":
      return <MapPin size={14} className="text-[var(--accent-orange)]" />;
    default:
      return <Calendar size={14} className="text-[var(--neutral-gray)]" />;
  }
}

/* ================================================================== */
/*  Relative Time                                                      */
/* ================================================================== */

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffDays === 0) {
    if (diffHours <= 0) return "Past";
    if (diffHours < 1) return "< 1h";
    return `in ${diffHours}h`;
  }
  if (diffDays === 1) {
    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `Tomorrow ${time}`;
  }
  if (diffDays > 1 && diffDays <= 7) {
    const day = date.toLocaleDateString("en-US", { weekday: "short" });
    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${day} ${time}`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ================================================================== */
/*  Activity Icon                                                      */
/* ================================================================== */

function activityIcon(type: string) {
  switch (type) {
    case "profile_viewed":
      return { icon: <Eye size={14} />, color: "#3B82F6", bg: "#DBEAFE" };
    case "note_added":
      return { icon: <MessageSquare size={14} />, color: "#8B5CF6", bg: "#EDE9FE" };
    case "stage_moved":
      return { icon: <ArrowRight size={14} />, color: "#10B981", bg: "#D1FAE5" };
    case "interview_scheduled":
      return { icon: <Calendar size={14} />, color: "#F59E0B", bg: "#FEF3C7" };
    case "message_sent":
      return { icon: <Mail size={14} />, color: "#EC4899", bg: "#FCE7F3" };
    case "member_mentioned":
      return { icon: <UserPlus size={14} />, color: "#6366F1", bg: "#E0E7FF" };
    default:
      return { icon: <Bell size={14} />, color: "#6B7280", bg: "#F3F4F6" };
  }
}

/* ================================================================== */
/*  Date Grouping                                                      */
/* ================================================================== */

function dateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ================================================================== */
/*  Section Header                                                     */
/* ================================================================== */

function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-bold text-[var(--color-neutral-900)] flex items-center gap-2.5 text-base">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ================================================================== */
/*  Loading Skeleton                                                   */
/* ================================================================== */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          <div className="h-4 w-48 rounded-lg mt-2 bg-[var(--surface-2)] animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-[var(--surface-2)] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-80 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
        <div className="h-80 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Stagger Animations                                                 */
/* ================================================================== */

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function EmployerDashboardPage() {
  const { data: org, isLoading: orgLoading } = useMyEmployerOrg();
  const { data: jobsData, isLoading: jobsLoading } = useEmployerJobs();
  const { data: introRequestsData, isLoading: introRequestsLoading } =
    useEmployerIntroRequests();
  const { data: notificationsData, isLoading: notificationsLoading } =
    useNotifications(1);
  const { data: interviewsData } = useInterviews({ limit: 5 });
  const { data: activityData } = useActivityFeed(1, 10);
  const { data: analytics } = useEmployerAnalytics();
  const { data: pipelines } = usePipelines();
  const { data: recommendationsData } = useRecommendedCandidates({ limit: 5, minScore: 30 });

  const [velocityView, setVelocityView] = useState<"monthly" | "weekly" | "quarterly">("monthly");

  const isLoading =
    orgLoading || jobsLoading || introRequestsLoading || notificationsLoading;

  const activeJobs = jobsData?.meta?.total ?? 0;
  const introRequests = introRequestsData?.meta?.total ?? 0;
  const placedCandidates = org?.totalPlacements ?? 0;
  const applicationsReceived = analytics?.overview?.totalApplications ?? 0;

  const notifications = notificationsData?.data ?? [];
  const upcomingInterviews = useMemo(() => {
    const raw = Array.isArray(interviewsData?.data)
      ? interviewsData.data
      : Array.isArray(interviewsData)
        ? (interviewsData as any[])
        : [];
    return raw.filter((i: any) => i.status === "scheduled");
  }, [interviewsData]);

  const activityFeed = activityData?.data ?? [];
  const pipelineCount = Array.isArray(pipelines) ? pipelines.length : 0;

  // Expiring jobs (within 7 days of deadline)
  const expiringJobs = useMemo(() => {
    const jobsList = jobsData?.data ?? [];
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return Array.isArray(jobsList)
      ? jobsList.filter(
          (j: any) =>
            j.applicationDeadline &&
            new Date(j.applicationDeadline) <= sevenDaysFromNow &&
            new Date(j.applicationDeadline) > now &&
            j.status === "published",
        )
      : [];
  }, [jobsData]);

  // Generate sparkline data from hiring velocity
  const sparkDataInterviews = useMemo(
    () => analytics?.hiringVelocity?.map((v) => v.interviews) ?? [],
    [analytics],
  );
  const sparkDataPlacements = useMemo(
    () => analytics?.hiringVelocity?.map((v) => v.placements) ?? [],
    [analytics],
  );

  // Group activity feed by date
  const groupedActivity = useMemo(() => {
    const groups: { label: string; items: typeof activityFeed }[] = [];
    for (const item of activityFeed.slice(0, 10)) {
      const group = dateGroup(item.createdAt);
      const existing = groups.find((g) => g.label === group);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ label: group, items: [item] });
      }
    }
    return groups;
  }, [activityFeed]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">
            Command Center
          </h1>
          <p className="text-sm text-[var(--neutral-gray)] mt-1">
            Your hiring overview at a glance
          </p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ background: "var(--gradient-accent)" }}
        >
          <PlusCircle size={16} /> Post a Job
        </Link>
      </motion.div>

      {/* ============================================================ */}
      {/*  Hero Stats Row                                               */}
      {/* ============================================================ */}
      <motion.div
        variants={staggerContainer}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={fadeUp}>
          <StatCard
            label="Active Jobs"
            value={activeJobs}
            icon={<Briefcase size={20} className="text-[#C4A35A]" />}
            color="#C4A35A"
            trend={12}
            sparkData={[3, 5, 4, 7, 6, 8, activeJobs]}
            href="/employer/jobs"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="Applications"
            value={applicationsReceived}
            icon={<Users size={20} className="text-[#1B7340]" />}
            color="#1B7340"
            trend={8}
            sparkData={sparkDataInterviews.length > 1 ? sparkDataInterviews : [2, 4, 3, 6, 5, 7, applicationsReceived]}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="Intro Requests"
            value={introRequests}
            icon={<Mail size={20} className="text-[#F59E0B]" />}
            color="#F59E0B"
            href="/employer/intro-requests"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="Placed Candidates"
            value={placedCandidates}
            icon={<TrendingUp size={20} className="text-[#10B981]" />}
            color="#10B981"
            trend={placedCandidates > 0 ? 5 : undefined}
            sparkData={sparkDataPlacements.length > 1 ? sparkDataPlacements : undefined}
          />
        </motion.div>
      </motion.div>

      {/* ============================================================ */}
      {/*  Alerts                                                       */}
      {/* ============================================================ */}
      <AnimatePresence>
        {expiringJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[var(--warning-light)] border border-[var(--warning)]/20 rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-[var(--warning-dark)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--warning-dark)]">
                  {expiringJobs.length} job post{expiringJobs.length > 1 ? "s" : ""} expiring soon
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {expiringJobs.slice(0, 3).map((job: any) => (
                    <Link
                      key={job.id}
                      href={`/employer/jobs/${job.id}`}
                      className="text-xs px-3 py-1.5 bg-white/80 border border-[var(--warning)]/20 rounded-xl text-[var(--warning-dark)] hover:bg-white font-medium transition-colors"
                    >
                      {job.title} &mdash; expires{" "}
                      {new Date(job.applicationDeadline).toLocaleDateString()}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/*  Top Recommended Candidates                                   */}
      {/* ============================================================ */}
      {recommendationsData?.data && recommendationsData.data.length > 0 && (
        <motion.div variants={fadeUp} className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--primary)]" />
              <h3 className="text-base font-semibold text-[var(--foreground)]">
                Top Recommended Candidates
              </h3>
            </div>
            <Link
              href="/employer/recommendations"
              className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {recommendationsData.data.slice(0, 5).map((rec: any) => (
              <Link
                key={rec.id}
                href={rec.candidate ? `/talents/${rec.candidate.slug}` : "#"}
                className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {rec.candidate?.photoUrl ? (
                    <img src={rec.candidate.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-[var(--primary)]">
                      {rec.candidate?.fullName?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {rec.candidate?.fullName || "Candidate"}
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)] truncate">
                    {rec.candidate?.primaryTrack?.name || "Developer"}
                    {rec.job ? ` - ${rec.job.title}` : ""}
                  </p>
                </div>
                <MatchScoreInline score={rec.overallScore} />
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* ============================================================ */}
      {/*  Hiring Velocity + Pipeline Funnel                            */}
      {/* ============================================================ */}
      <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-6">
        {/* Hiring Velocity Chart */}
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
          <SectionHeader
            icon={<BarChart3 size={18} className="text-[var(--info)]" />}
            title="Hiring Velocity"
            action={
              <div className="flex items-center gap-3">
                <PillTabs
                  options={[
                    { label: "Weekly", value: "weekly" as const },
                    { label: "Monthly", value: "monthly" as const },
                    { label: "Quarterly", value: "quarterly" as const },
                  ]}
                  value={velocityView}
                  onChange={setVelocityView}
                />
                <Link
                  href="/employer/analytics"
                  className="text-xs font-semibold text-[var(--accent-orange)] hover:text-[var(--accent-red)] transition-colors"
                >
                  View details
                </Link>
              </div>
            }
          />

          {analytics?.hiringVelocity && analytics.hiringVelocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={analytics.hiringVelocity}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#1B7340" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-3)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--neutral-gray)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--neutral-gray)" }}
                  tickFormatter={formatAxisValue}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <RechartsTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="interviews"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  name="Interviews"
                  maxBarSize={40}
                />
                <Area
                  type="monotone"
                  dataKey="placements"
                  fill="url(#lineGradient)"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Placements"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="placements"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#10B981", stroke: "white", strokeWidth: 2 }}
                  name="Placements Trend"
                  hide
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px]">
              <BarChart3 size={40} className="text-[var(--surface-4)] mb-3" />
              <p className="text-sm text-[var(--neutral-gray)] font-medium">No hiring data yet</p>
              <p className="text-xs text-[var(--surface-4)] mt-1">Start posting jobs to see velocity</p>
            </div>
          )}
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
          <SectionHeader
            icon={<KanbanSquare size={18} className="text-[#8B5CF6]" />}
            title="Pipeline Conversion"
            action={
              <Link
                href="/employer/pipeline"
                className="text-xs font-semibold text-[var(--accent-orange)] hover:text-[var(--accent-red)] transition-colors"
              >
                Open pipeline
              </Link>
            }
          />

          {pipelineCount > 0 && analytics?.pipelineConversion && analytics.pipelineConversion.length > 0 ? (
            <>
              <div className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-[var(--surface-1)]">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                    <KanbanSquare size={16} className="text-[#8B5CF6]" />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-[var(--color-neutral-900)]">{pipelineCount}</p>
                    <p className="text-[10px] text-[var(--neutral-gray)] uppercase tracking-wider font-semibold">
                      Pipelines
                    </p>
                  </div>
                </div>
                <div className="w-px h-8 bg-[var(--border)]" />
                <div>
                  <p className="text-lg font-bold text-[var(--color-neutral-900)]">
                    {analytics.overview?.totalCandidatesInPipeline ?? 0}
                  </p>
                  <p className="text-[10px] text-[var(--neutral-gray)] uppercase tracking-wider font-semibold">
                    Candidates
                  </p>
                </div>
                {analytics.avgTimeToHire !== null && (
                  <>
                    <div className="w-px h-8 bg-[var(--border)]" />
                    <div>
                      <p className="text-lg font-bold text-[var(--color-neutral-900)]">
                        {analytics.avgTimeToHire}d
                      </p>
                      <p className="text-[10px] text-[var(--neutral-gray)] uppercase tracking-wider font-semibold">
                        Avg. Time
                      </p>
                    </div>
                  </>
                )}
              </div>
              <PipelineFunnel stages={analytics.pipelineConversion.slice(0, 5)} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px]">
              <KanbanSquare size={40} className="text-[var(--surface-4)] mb-3" />
              <p className="text-sm text-[var(--neutral-gray)] font-medium mb-3">No pipelines yet</p>
              <Link
                href="/employer/pipeline"
                className="text-xs px-4 py-2 font-semibold text-white rounded-xl transition-all hover:shadow-md"
                style={{ background: "var(--gradient-accent)" }}
              >
                Create Pipeline
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  Interviews + Activity + Quick Actions                        */}
      {/* ============================================================ */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Interviews */}
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="font-bold text-[var(--color-neutral-900)] flex items-center gap-2.5 text-sm">
              <Calendar size={16} className="text-[var(--accent-orange)]" />
              Upcoming Interviews
            </h2>
            <Link
              href="/employer/interviews"
              className="text-xs font-semibold text-[var(--accent-orange)] hover:text-[var(--accent-red)] transition-colors flex items-center gap-1"
            >
              View all <ChevronRight size={12} />
            </Link>
          </div>

          {upcomingInterviews.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar size={32} className="text-[var(--surface-4)] mx-auto mb-2" />
              <p className="text-sm text-[var(--neutral-gray)] font-medium">No upcoming interviews</p>
              <p className="text-xs text-[var(--surface-4)] mt-1">Schedule one from the pipeline</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {upcomingInterviews.slice(0, 5).map((interview: any) => {
                const statusDot =
                  interview.status === "scheduled"
                    ? "bg-[var(--success)]"
                    : "bg-[var(--warning)]";
                const isVideo = interview.type?.toLowerCase() === "video";

                return (
                  <div
                    key={interview.id}
                    className="group p-4 px-5 hover:bg-[var(--surface-1)] transition-colors relative"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)]/10 to-[var(--info)]/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-[var(--primary)]">
                            {interview.candidate?.fullName?.charAt(0) || "?"}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white",
                            statusDot
                          )}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-neutral-900)] truncate">
                          {interview.candidate?.fullName || "Candidate"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <InterviewTypeIcon type={interview.type} />
                          <p className="text-xs text-[var(--neutral-gray)] font-medium">
                            {relativeTime(interview.scheduledAt)}
                          </p>
                        </div>
                      </div>

                      {/* Type badge + Join button */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--info-light)] text-[var(--info-dark)] uppercase tracking-wider">
                          {interview.type?.replace("_", " ")}
                        </span>
                        {isVideo && interview.meetingUrl && (
                          <a
                            href={interview.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-[var(--primary)] hover:bg-[var(--secondary)] transition-all duration-200"
                          >
                            Join
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="font-bold text-[var(--color-neutral-900)] flex items-center gap-2.5 text-sm">
              <Bell size={16} className="text-[#8B5CF6]" />
              Recent Activity
            </h2>
          </div>

          <div className="p-4">
            {groupedActivity.length > 0 ? (
              <div className="space-y-4">
                {groupedActivity.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] font-bold text-[var(--neutral-gray)] uppercase tracking-widest mb-2 px-1">
                      {group.label}
                    </p>
                    <div className="relative pl-5">
                      {/* Vertical timeline line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--border)]" />

                      <AnimatePresence>
                        {group.items.map((item: any) => {
                          const iconData = activityIcon(item.activityType);
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              transition={{ duration: 0.3 }}
                              className="relative pb-3 last:pb-0"
                            >
                              {/* Timeline dot */}
                              <div
                                className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center z-10"
                                style={{ background: iconData.bg }}
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: iconData.color }}
                                />
                              </div>

                              <div className="hover:bg-[var(--surface-1)] rounded-lg px-2 py-1.5 -mx-1 transition-colors">
                                <p className="text-sm text-[var(--color-neutral-900)] leading-snug">
                                  {item.description}
                                </p>
                                <p className="text-[11px] text-[var(--neutral-gray)] mt-0.5">
                                  {item.userName && (
                                    <span className="font-semibold">{item.userName}</span>
                                  )}
                                  {item.userName && " · "}
                                  {new Date(item.createdAt).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--surface-2)] flex-shrink-0 mt-0.5">
                      <Eye size={14} className="text-[var(--neutral-gray)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-neutral-900)] font-medium">{item.title}</p>
                      {item.message && (
                        <p className="text-xs text-[var(--neutral-gray)] mt-0.5 truncate">{item.message}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--neutral-gray)] flex-shrink-0 font-medium">
                      {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Bell size={32} className="text-[var(--surface-4)] mx-auto mb-2" />
                <p className="text-sm text-[var(--neutral-gray)] font-medium">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Post a Job — accent gradient */}
            <Link
              href="/employer/jobs/new"
              className="group relative overflow-hidden rounded-2xl p-5 text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: "var(--gradient-accent)" }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <PlusCircle size={20} />
              </div>
              <p className="text-sm font-bold">Post a Job</p>
              <p className="text-xs text-white/70 mt-0.5">Create a new listing</p>
              <ArrowUpRight
                size={14}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </Link>

            {/* Open Pipeline */}
            <Link
              href="/employer/pipeline"
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <KanbanSquare size={20} className="text-[#8B5CF6]" />
              </div>
              <p className="text-sm font-bold text-[var(--color-neutral-900)]">Pipeline</p>
              <p className="text-xs text-[var(--neutral-gray)] mt-0.5">Manage candidates</p>
              <ArrowUpRight
                size={14}
                className="absolute top-4 right-4 text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </Link>

            {/* Browse Talent */}
            <Link
              href="/employer/candidates"
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users size={20} className="text-[var(--primary)]" />
              </div>
              <p className="text-sm font-bold text-[var(--color-neutral-900)]">Discover</p>
              <p className="text-xs text-[var(--neutral-gray)] mt-0.5">Browse talent pool</p>
              <ArrowUpRight
                size={14}
                className="absolute top-4 right-4 text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </Link>

            {/* Schedule Interview */}
            <Link
              href="/employer/interviews"
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--success)]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Calendar size={20} className="text-[var(--success)]" />
              </div>
              <p className="text-sm font-bold text-[var(--color-neutral-900)]">Interviews</p>
              <p className="text-xs text-[var(--neutral-gray)] mt-0.5">Schedule & manage</p>
              <ArrowUpRight
                size={14}
                className="absolute top-4 right-4 text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </Link>
          </div>

          {/* Support card */}
          <div
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: "var(--gradient-primary)" }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full -ml-6 -mb-6" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-white/80" />
                <h3 className="font-bold text-base">Need Help?</h3>
              </div>
              <p className="text-white/70 text-sm mb-4 leading-relaxed">
                Our talent team can help you find the perfect candidates.
              </p>
              <button className="bg-white text-[var(--primary)] px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors shadow-sm">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
