"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  Mail,
  Briefcase,
  ArrowRight,
  ArrowUpRight,
  Bell,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  User,
  FileText,
  ChevronRight,
  Shield,
  Upload,
  Code2,
  FolderKanban,
  Settings,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/providers/auth-provider";
import { useMyProfile } from "@/hooks/use-candidates";
import { useNotifications, useUnreadCount } from "@/hooks/use-notifications";
import { useMyApplications } from "@/hooks/use-jobs";
import { useCandidateIntroRequests } from "@/hooks/use-intro-requests";
import { useRecommendedJobs } from "@/hooks/use-matching";
import { MatchScoreInline } from "@/components/matching/match-score-badge";

/* ──────────────────────────────────────────── */
/*  Animation variants                          */
/* ──────────────────────────────────────────── */

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

/* ──────────────────────────────────────────── */
/*  Quick links config                          */
/* ──────────────────────────────────────────── */

const quickLinks = [
  {
    key: "profile",
    label: "My Profile",
    href: "/dashboard/profile",
    icon: User,
    description: "Edit your public profile",
    color: "var(--primary)",
    gradient: "from-[#1B7340] to-[#0E5A2D]",
  },
  {
    key: "applications",
    label: "Applications",
    href: "/dashboard/applications",
    icon: FileText,
    description: "Track your job applications",
    color: "#10B981",
    gradient: "from-[#10B981] to-[#059669]",
  },
  {
    key: "intros",
    label: "Intro Requests",
    href: "/dashboard/intro-requests",
    icon: Mail,
    description: "Messages from employers",
    color: "var(--warning)",
    gradient: "from-[#C4A35A] to-[#A8893D]",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Notifications & preferences",
    color: "#6B7280",
    gradient: "from-[#6B7280] to-[#4B5563]",
  },
];

/* ──────────────────────────────────────────── */
/*  Helper: relative time using Intl            */
/* ──────────────────────────────────────────── */

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return rtf.format(-seconds, "second");
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return rtf.format(-mins, "minute");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return rtf.format(-hrs, "hour");
  const days = Math.floor(hrs / 24);
  if (days < 7) return rtf.format(-days, "day");
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/* ──────────────────────────────────────────── */
/*  Animated counter component                  */
/* ──────────────────────────────────────────── */

function AnimatedCounter({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent = `${v}${suffix}`;
      }
    });
    return unsubscribe;
  }, [display, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

/* ──────────────────────────────────────────── */
/*  Mini sparkline data (static mock trend)     */
/* ──────────────────────────────────────────── */

const sparklineData = [
  { v: 3 },
  { v: 5 },
  { v: 4 },
  { v: 7 },
  { v: 6 },
  { v: 8 },
  { v: 9 },
];

/* ──────────────────────────────────────────── */
/*  Notification type config                    */
/* ──────────────────────────────────────────── */

const notifConfig: Record<
  string,
  { icon: typeof Mail; color: string; bg: string; dot: string }
> = {
  intro_request: {
    icon: Mail,
    color: "text-[var(--warning)]",
    bg: "bg-[var(--warning)]/10",
    dot: "bg-[var(--warning)]",
  },
  intro_requested: {
    icon: Mail,
    color: "text-[var(--warning)]",
    bg: "bg-[var(--warning)]/10",
    dot: "bg-[var(--warning)]",
  },
  intro_approved: {
    icon: CheckCircle2,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
    dot: "bg-[var(--success)]",
  },
  intro_declined: {
    icon: AlertCircle,
    color: "text-[var(--error)]",
    bg: "bg-[var(--error)]/10",
    dot: "bg-[var(--error)]",
  },
  profile_view: {
    icon: Eye,
    color: "text-[var(--primary)]",
    bg: "bg-[var(--primary)]/10",
    dot: "bg-[var(--primary)]",
  },
  profile_approved: {
    icon: Shield,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
    dot: "bg-[var(--success)]",
  },
  profile_needs_update: {
    icon: AlertCircle,
    color: "text-[var(--warning)]",
    bg: "bg-[var(--warning)]/10",
    dot: "bg-[var(--warning)]",
  },
  application_received: {
    icon: Briefcase,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
    dot: "bg-[var(--success)]",
  },
  application_viewed: {
    icon: Eye,
    color: "text-[var(--primary)]",
    bg: "bg-[var(--primary)]/10",
    dot: "bg-[var(--primary)]",
  },
  application_shortlisted: {
    icon: TrendingUp,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
    dot: "bg-[var(--success)]",
  },
};

const defaultNotifConfig = {
  icon: Bell,
  color: "text-[var(--neutral-gray)]",
  bg: "bg-[var(--surface-2)]",
  dot: "bg-[var(--neutral-gray)]",
};

function getNotifConfig(type: string) {
  return notifConfig[type] || defaultNotifConfig;
}

/* ──────────────────────────────────────────── */
/*  Approval status pill                        */
/* ──────────────────────────────────────────── */

function ApprovalPill({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; bg: string; text: string; pulse?: boolean }
  > = {
    draft: {
      label: "Draft",
      bg: "bg-[var(--warning-light)]",
      text: "text-[var(--warning-dark)]",
    },
    submitted: {
      label: "Under Review",
      bg: "bg-[var(--info-light)]",
      text: "text-[var(--info-dark)]",
      pulse: true,
    },
    approved: {
      label: "Approved",
      bg: "bg-[var(--success-light)]",
      text: "text-[var(--success-dark)]",
    },
    needs_update: {
      label: "Needs Update",
      bg: "bg-[var(--warning-light)]",
      text: "text-[var(--warning-dark)]",
    },
    suspended: {
      label: "Suspended",
      bg: "bg-[var(--error-light)]",
      text: "text-[var(--error-dark)]",
    },
  };

  const c = config[status] || config.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}
    >
      {c.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]" />
        </span>
      )}
      {c.label}
    </span>
  );
}

/* ──────────────────────────────────────────── */
/*  Motivational subline                        */
/* ──────────────────────────────────────────── */

function getMotivation(strength: number, hasBio: boolean): string {
  if (strength >= 80)
    return "Your profile looks great — employers are taking notice.";
  if (strength >= 60) return "Almost there — a few more details will boost your visibility.";
  if (!hasBio) return "Start strong — add your bio and skills to stand out.";
  return "Keep going — complete your profile to attract top employers.";
}

/* ──────────────────────────────────────────── */
/*  Missing profile fields                      */
/* ──────────────────────────────────────────── */

interface ProfileGap {
  label: string;
  href: string;
  icon: typeof User;
}

function getProfileGaps(profile: any): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  if (!profile?.bio) gaps.push({ label: "Bio", href: "/dashboard/profile", icon: User });
  if (!profile?.primaryStacks?.length) gaps.push({ label: "Skills", href: "/dashboard/profile", icon: Code2 });
  if (!profile?.candidateProjects?.length) gaps.push({ label: "Projects", href: "/dashboard/profile", icon: FolderKanban });
  if (!profile?.candidateDocuments?.length) gaps.push({ label: "CV", href: "/dashboard/cv", icon: Upload });
  if (!profile?.photoUrl) gaps.push({ label: "Photo", href: "/dashboard/profile", icon: User });
  return gaps;
}

/* ──────────────────────────────────────────── */
/*  Component                                   */
/* ──────────────────────────────────────────── */

export default function CandidateDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: notificationsData, isLoading: notificationsLoading } =
    useNotifications(1);
  const { data: applicationsData, isLoading: applicationsLoading } =
    useMyApplications();
  const { data: introRequestsData, isLoading: introRequestsLoading } =
    useCandidateIntroRequests();
  const { data: unreadData } = useUnreadCount();
  const { data: recommendedJobsData } = useRecommendedJobs({ limit: 5, minScore: 30 });

  const isLoading =
    profileLoading ||
    notificationsLoading ||
    applicationsLoading ||
    introRequestsLoading;

  const profileStrength = profile?.profileStrength ?? 0;
  const profileViews = profile?.profileViews ?? 0;
  const introRequests = introRequestsData?.meta?.total ?? 0;
  const applications = applicationsData?.meta?.total ?? 0;
  const unreadCount = unreadData ?? 0;
  const notifications = notificationsData?.data ?? [];
  const approvalStatus = profile?.approvalStatus ?? "draft";

  const strengthColor =
    profileStrength >= 80
      ? "var(--success)"
      : profileStrength >= 60
        ? "var(--primary)"
        : profileStrength >= 40
          ? "var(--accent-orange)"
          : "var(--error)";

  const strengthLabel =
    profileStrength >= 80
      ? "Strong"
      : profileStrength >= 60
        ? "Good"
        : profileStrength >= 40
          ? "Fair"
          : "Weak";

  const circumference = 2 * Math.PI * 40;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.displayName?.split(" ")[0] || "there";
  const profileGaps = getProfileGaps(profile);

  // Action items computation
  const actionItems: {
    key: string;
    icon: typeof User;
    title: string;
    description: string;
    href: string;
    done: boolean;
    color: string;
  }[] = [
    {
      key: "bio",
      icon: User,
      title: "Add your bio & photo",
      description: "Make a great first impression on employers",
      href: "/dashboard/profile",
      done: !!profile?.bio && !!profile?.photoUrl,
      color: "var(--primary)",
    },
    {
      key: "skills",
      icon: Code2,
      title: "Add your skills",
      description: "Highlight your technical expertise",
      href: "/dashboard/profile",
      done: (profile?.primaryStacks?.length ?? 0) > 0,
      color: "#8B5CF6",
    },
    {
      key: "cv",
      icon: Upload,
      title: "Upload your CV",
      description: "Let employers see your full experience",
      href: "/dashboard/cv",
      done: (profile?.candidateDocuments?.length ?? 0) > 0,
      color: "#10B981",
    },
    {
      key: "email",
      icon: CheckCircle2,
      title: "Verify your email",
      description: "Required for receiving notifications",
      href: "/dashboard/settings",
      done: true,
      color: "#10B981",
    },
  ];

  const completedActions = actionItems.filter((a) => a.done).length;
  const totalActions = actionItems.length;

  // Quick link recommendation
  const recommendedLink = !profile?.bio
    ? "profile"
    : (profile?.candidateDocuments?.length ?? 0) === 0
      ? "applications"
      : introRequests > 0
        ? "intros"
        : null;

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Hero banner skeleton */}
        <div className="relative overflow-hidden rounded-2xl h-[160px] md:h-[140px]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B7340]/20 to-[#0E5A2D]/20 skeleton-shimmer" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[7.5rem] rounded-2xl overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] skeleton-shimmer" />
            </div>
          ))}
        </div>

        {/* Content row skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl overflow-hidden relative h-[380px]">
            <div className="absolute inset-0 bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] skeleton-shimmer" />
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl overflow-hidden relative h-[280px]">
              <div className="absolute inset-0 bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] skeleton-shimmer" />
            </div>
            <div className="rounded-2xl overflow-hidden relative h-[220px]">
              <div className="absolute inset-0 bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] skeleton-shimmer" />
            </div>
          </div>
        </div>

        {/* Quick links skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[5.5rem] rounded-2xl overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════ */}
      {/*  HERO WELCOME BANNER                          */}
      {/* ══════════════════════════════════════════════ */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-8">
          {/* Gradient mesh background */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 20% 40%, rgba(30, 77, 183, 0.15), transparent),
                radial-gradient(ellipse 60% 80% at 80% 60%, rgba(245, 154, 35, 0.08), transparent),
                radial-gradient(ellipse 70% 50% at 50% 20%, rgba(20, 58, 143, 0.1), transparent),
                linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.6))
              `,
              backdropFilter: "blur(40px)",
            }}
          />
          <div className="absolute inset-0 -z-10 border border-[var(--glass-border)] rounded-2xl" />

          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--primary)]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#C4A35A]/5 rounded-full blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
                  {greeting},{" "}
                  <span className="bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] bg-clip-text text-transparent">
                    {firstName}
                  </span>
                </h1>
                <ApprovalPill status={approvalStatus} />
              </div>
              <p className="text-sm text-[var(--neutral-gray)] max-w-lg">
                {getMotivation(profileStrength, !!profile?.bio)}
              </p>
            </div>

            {profileStrength < 80 && (
              <Link
                href="/dashboard/profile"
                className="shrink-0 inline-flex items-center gap-2 bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[var(--primary)]/25 transition-all duration-300"
              >
                Complete Profile
                <ArrowRight size={16} />
              </Link>
            )}
          </div>

          {/* Progress bar */}
          <div className="relative mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[var(--neutral-gray)]">
                Profile Completion
              </span>
              <span className="text-[11px] font-semibold" style={{ color: strengthColor }}>
                {profileStrength}%
              </span>
            </div>
            <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${strengthColor}, ${strengthColor}dd)`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${profileStrength}%` }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════ */}
      {/*  STAT CARDS GRID                              */}
      {/* ══════════════════════════════════════════════ */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {/* Profile Views */}
        <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
          <motion.div
            className="relative overflow-hidden bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] p-5 cursor-default group"
            whileHover={{
              rotateX: -2,
              rotateY: 3,
              scale: 1.02,
              boxShadow: "0 12px 24px rgba(30, 77, 183, 0.1)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ transformStyle: "preserve-3d", perspective: 800 }}
          >
            {/* Sparkline background */}
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="sparkBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1B7340" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1B7340" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#1B7340"
                    strokeWidth={1.5}
                    fill="url(#sparkBlue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center shadow-sm">
                  <Eye size={18} className="text-white" />
                </div>
                <div className="flex items-center gap-1 text-[var(--success)]">
                  <TrendingUp size={14} />
                  <span className="text-xs font-medium">+12%</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                <AnimatedCounter value={profileViews} />
              </p>
              <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                Profile Views
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Intro Requests */}
        <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
          <Link href="/dashboard/intro-requests">
            <motion.div
              className="relative overflow-hidden bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] p-5 cursor-pointer group"
              whileHover={{
                rotateX: -2,
                rotateY: -3,
                scale: 1.02,
                boxShadow: "0 12px 24px rgba(245, 154, 35, 0.1)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ transformStyle: "preserve-3d", perspective: 800 }}
            >
              <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <defs>
                      <linearGradient id="sparkOrange" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C4A35A" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#C4A35A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#C4A35A"
                      strokeWidth={1.5}
                      fill="url(#sparkOrange)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C4A35A] to-[#A8893D] flex items-center justify-center shadow-sm">
                    <Mail size={18} className="text-white" />
                  </div>
                  {introRequests > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/15">
                      {introRequests} new
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  <AnimatedCounter value={introRequests} />
                </p>
                <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                  Intro Requests
                </p>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Applications */}
        <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
          <Link href="/dashboard/applications">
            <motion.div
              className="relative overflow-hidden bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] p-5 cursor-pointer group"
              whileHover={{
                rotateX: 2,
                rotateY: 3,
                scale: 1.02,
                boxShadow: "0 12px 24px rgba(16, 185, 129, 0.1)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ transformStyle: "preserve-3d", perspective: 800 }}
            >
              <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <defs>
                      <linearGradient id="sparkGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#10B981"
                      strokeWidth={1.5}
                      fill="url(#sparkGreen)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-sm">
                    <Briefcase size={18} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  <AnimatedCounter value={applications} />
                </p>
                <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                  Applications
                </p>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Profile Strength mini */}
        <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
          <Link href="/dashboard/profile">
            <motion.div
              className="relative overflow-hidden bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] p-5 cursor-pointer group"
              whileHover={{
                rotateX: 2,
                rotateY: -3,
                scale: 1.02,
                boxShadow: "0 12px 24px rgba(30, 77, 183, 0.1)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ transformStyle: "preserve-3d", perspective: 800 }}
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B7340]/10 to-[#0E5A2D]/10 flex items-center justify-center">
                    <Sparkles size={18} className="text-[var(--primary)]" />
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: strengthColor }}
                  >
                    {strengthLabel}
                  </span>
                </div>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  <AnimatedCounter value={profileStrength} suffix="%" />
                </p>
                <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                  Profile Strength
                </p>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>

      {/* ══════════════════════════════════════════════ */}
      {/*  Recommended Jobs                              */}
      {/* ══════════════════════════════════════════════ */}
      {recommendedJobsData?.data && recommendedJobsData.data.length > 0 && (
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.12 }}>
          <div className="bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                Recommended Jobs
              </h2>
              <Link
                href="/dashboard/recommended-jobs"
                className="text-sm text-[var(--primary)] hover:text-[var(--secondary)] font-medium flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-2">
              {recommendedJobsData.data.slice(0, 5).map((rec: any) => (
                <Link
                  key={rec.id}
                  href={rec.job ? `/jobs/${rec.job.slug}` : "#"}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-[var(--surface-2)] transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                    <Briefcase size={16} className="text-[var(--neutral-gray)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {rec.job?.title || "Job"}
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)] truncate">
                      {rec.job?.employer?.companyName || "Company"}
                      {rec.job?.location ? ` · ${rec.job.location}` : ""}
                    </p>
                  </div>
                  <MatchScoreInline score={rec.overallScore} />
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  MAIN CONTENT ROW                             */}
      {/* ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Recent Activity Feed (2 cols) ── */}
        <motion.div
          className="lg:col-span-2"
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <div className="bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center">
                  <Bell size={14} className="text-white" />
                </div>
                Recent Activity
                {unreadCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-[var(--primary)] rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </h2>
              <Link
                href="/dashboard/notifications"
                className="text-sm text-[var(--primary)] hover:text-[var(--secondary)] font-medium flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>

            <div className="relative">
              {notifications.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-3">
                      <Bell size={22} className="text-[var(--neutral-gray)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      No activity yet
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)] mt-1 max-w-[280px] mx-auto">
                      When employers view your profile or send requests,
                      you&apos;ll see it here.
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="relative pl-8">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[1.125rem] top-4 bottom-4 w-px bg-gradient-to-b from-[var(--border)] via-[var(--border)] to-transparent" />

                  <AnimatePresence mode="popLayout">
                    {notifications.slice(0, 5).map((notification: any, index: number) => {
                      const cfg = getNotifConfig(notification.type);
                      const Icon = cfg.icon;

                      return (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12, height: 0 }}
                          transition={{
                            duration: 0.25,
                            delay: 0.04 * index,
                            layout: { duration: 0.2 },
                          }}
                          className={`relative px-4 py-3.5 group cursor-pointer transition-colors duration-150 ${
                            !notification.isRead
                              ? "bg-[var(--primary)]/[0.03] hover:bg-[var(--primary)]/[0.06]"
                              : "hover:bg-[var(--surface-1)]"
                          }`}
                          onClick={() => {
                            const url = notification.actionUrl || notification.link;
                            if (url) router.push(url);
                          }}
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute left-[-0.9rem] top-[1.15rem] w-2.5 h-2.5 rounded-full border-2 border-[var(--surface-0)] ${cfg.dot} shadow-sm`}
                          />

                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}
                            >
                              <Icon size={15} className={cfg.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={`text-sm leading-snug ${
                                    notification.isRead
                                      ? "text-[var(--foreground)]"
                                      : "font-semibold text-[var(--foreground)]"
                                  }`}
                                >
                                  {notification.title}
                                </p>
                                <span className="text-[10px] text-[var(--neutral-gray)] shrink-0 mt-0.5 whitespace-nowrap">
                                  {relativeTime(notification.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--neutral-gray)] mt-0.5 line-clamp-1">
                                {notification.message}
                              </p>

                              {/* Hover-reveal action */}
                              {notification.actionUrl && (
                                <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--primary)]">
                                    View <ExternalLink size={10} />
                                  </span>
                                </div>
                              )}
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0 mt-2 animate-pulse" />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Right sidebar ── */}
        <motion.div
          className="space-y-5"
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          {/* ── Profile Strength Ring ── */}
          <div className="bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] p-6 shadow-sm">
            <h2 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              Profile Strength
            </h2>

            {/* Animated radial gauge */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg
                  className="w-32 h-32 -rotate-90"
                  viewBox="0 0 100 100"
                >
                  {/* Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="var(--surface-3)"
                    strokeWidth="7"
                    fill="none"
                    opacity={0.5}
                  />
                  {/* Progress */}
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={strengthColor}
                    strokeWidth="7"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{
                      strokeDashoffset:
                        circumference -
                        (profileStrength / 100) * circumference,
                    }}
                    transition={{
                      duration: 1.5,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.4,
                    }}
                    style={{
                      filter: `drop-shadow(0 0 6px ${strengthColor}44)`,
                    }}
                  />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-[var(--foreground)]">
                    <AnimatedCounter value={profileStrength} suffix="%" />
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
                    style={{ color: strengthColor }}
                  >
                    {strengthLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Missing field pills */}
            {profileGaps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                {profileGaps.map((gap) => (
                  <Link
                    key={gap.label}
                    href={gap.href}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors"
                  >
                    <gap.icon size={10} />
                    {gap.label}
                  </Link>
                ))}
              </div>
            )}

            <p className="text-xs text-center text-[var(--neutral-gray)]">
              {profileStrength < 80
                ? "Add more details to improve visibility."
                : "Great profile! Employers love it."}
            </p>
            <Link
              href="/dashboard/profile"
              className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] hover:shadow-md hover:shadow-[var(--primary)]/20 transition-all duration-200"
            >
              Edit Profile <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* ── Action Items Panel ── */}
          <div className="bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl border border-[var(--glass-border)] p-6 shadow-sm">
            <h2 className="font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-orange)]/10 flex items-center justify-center">
                <AlertCircle size={14} className="text-[var(--accent-orange)]" />
              </div>
              Action Items
            </h2>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-[var(--neutral-gray)]">
                  {completedActions} of {totalActions} completed
                </span>
                <span className="text-[11px] font-semibold text-[var(--primary)]">
                  {Math.round((completedActions / totalActions) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(completedActions / totalActions) * 100}%`,
                  }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {actionItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-150 group ${
                      item.done
                        ? "opacity-50"
                        : "hover:bg-[var(--surface-1)] hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.done
                          ? "bg-[var(--success)]/10"
                          : `bg-[${item.color}]/10`
                      }`}
                      style={{
                        backgroundColor: item.done
                          ? "rgba(16, 185, 129, 0.1)"
                          : `${item.color}15`,
                      }}
                    >
                      {item.done ? (
                        <CheckCircle2
                          size={14}
                          className="text-[var(--success)]"
                        />
                      ) : (
                        <ItemIcon
                          size={14}
                          style={{ color: item.color }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          item.done
                            ? "line-through text-[var(--neutral-gray)]"
                            : "text-[var(--foreground)] group-hover:text-[var(--primary)]"
                        } transition-colors`}
                      >
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[var(--neutral-gray)] truncate">
                        {item.description}
                      </p>
                    </div>
                    {!item.done && (
                      <ChevronRight
                        size={14}
                        className="text-[var(--surface-4)] group-hover:text-[var(--primary)] transition-colors shrink-0"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/*  QUICK LINKS GRID                             */}
      {/* ══════════════════════════════════════════════ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
        <h2 className="font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center">
            <ArrowRight size={14} className="text-[var(--neutral-gray)]" />
          </div>
          Quick Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map((link, index) => {
            const Icon = link.icon;
            const isRecommended = link.key === recommendedLink;

            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.3 + 0.05 * index }}
              >
                <Link
                  href={link.href}
                  className={`group relative flex items-center gap-3 p-4 rounded-2xl border bg-[var(--glass-bg)] backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${
                    isRecommended
                      ? "border-[var(--primary)]/20 shadow-sm shadow-[var(--primary)]/5 hover:shadow-md hover:shadow-[var(--primary)]/10 hover:border-[var(--primary)]/30"
                      : "border-[var(--glass-border)] hover:shadow-md hover:border-[var(--surface-4)]"
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2.5 left-4 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] text-white shadow-sm">
                      Recommended
                    </span>
                  )}
                  <motion.div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center shrink-0 shadow-sm`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Icon size={20} className="text-white" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                      {link.label}
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)] truncate">
                      {link.description}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-[var(--surface-4)] group-hover:text-[var(--primary)] transition-colors shrink-0"
                  />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
