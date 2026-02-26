"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  MapPin,
  Globe,
  Github,
  Linkedin,
  Mail,
  Phone,
  Clock,
  Wifi,
  Building2,
  Briefcase,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Star,
  Eye,
  Code2,
  MessageSquare,
  Award,
  Calendar,
  Languages,
  Layers,
  BarChart3,
  Shield,
  Archive,
  Share2,
  ChevronDown,
  Printer,
  Monitor,
} from "lucide-react";
import { useMyProfile, useSubmitProfile } from "@/hooks/use-candidates";
import { useAuth } from "@/providers/auth-provider";
import {
  ProfileApprovalStatus,
  WorkMode,
  AvailabilityStatus,
} from "@/types/candidate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const workModeConfig: Record<string, { label: string; icon: typeof Wifi }> = {
  [WorkMode.REMOTE]: { label: "Remote", icon: Wifi },
  [WorkMode.HYBRID]: { label: "Hybrid", icon: Building2 },
  [WorkMode.ON_SITE]: { label: "On-site", icon: MapPin },
};

const availabilityConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  [AvailabilityStatus.IMMEDIATE]: { label: "Available Now", color: "text-[var(--success)]", bg: "bg-[var(--success)]/10", dot: "bg-[var(--success)]" },
  [AvailabilityStatus.ONE_MONTH]: { label: "Available in 1 Month", color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10", dot: "bg-[var(--warning)]" },
  [AvailabilityStatus.TWO_THREE_MONTHS]: { label: "Available in 2-3 Months", color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10", dot: "bg-[var(--warning)]" },
  [AvailabilityStatus.NOT_AVAILABLE]: { label: "Not Available", color: "text-[var(--neutral-gray)]", bg: "bg-[var(--surface-2)]", dot: "bg-[var(--neutral-gray)]" },
  [AvailabilityStatus.PLACED]: { label: "Placed", color: "text-[var(--info)]", bg: "bg-[var(--info)]/10", dot: "bg-[var(--info)]" },
};

const approvalStatusConfig: Record<string, { label: string; bg: string; text: string; border: string; icon?: typeof CheckCircle2; bannerGradient: string; message: string; cta?: string; ctaHref?: string }> = {
  [ProfileApprovalStatus.DRAFT]: { label: "Draft", bg: "bg-[var(--surface-2)]", text: "text-[var(--neutral-gray)]", border: "border-[var(--neutral-gray)]/20", icon: AlertCircle, bannerGradient: "from-amber-500 to-orange-500", message: "Your profile is in draft mode. Complete it and submit for review to get discovered by employers.", cta: "Submit for Review" },
  [ProfileApprovalStatus.SUBMITTED]: { label: "Under Review", bg: "bg-[var(--warning)]/10", text: "text-[var(--warning)]", border: "border-[var(--warning)]/20", icon: Clock, bannerGradient: "from-blue-500 to-indigo-500", message: "Your profile is being reviewed by our team. This usually takes 1-2 business days." },
  [ProfileApprovalStatus.APPROVED]: { label: "Approved", bg: "bg-[var(--success)]/10", text: "text-[var(--success)]", border: "border-[var(--success)]/20", icon: CheckCircle2, bannerGradient: "from-emerald-500 to-teal-500", message: "Your profile is approved and visible to employers!" },
  [ProfileApprovalStatus.NEEDS_UPDATE]: { label: "Needs Update", bg: "bg-[var(--error)]/10", text: "text-[var(--error)]", border: "border-[var(--error)]/20", icon: AlertCircle, bannerGradient: "from-amber-500 to-orange-500", message: "Your profile needs some updates. Please review the feedback and make the necessary changes.", cta: "Update Profile", ctaHref: "/dashboard/profile" },
  [ProfileApprovalStatus.SUSPENDED]: { label: "Suspended", bg: "bg-[var(--error)]/10", text: "text-[var(--error)]", border: "border-[var(--error)]/20", icon: Shield, bannerGradient: "from-red-500 to-rose-500", message: "Your profile has been suspended. Please contact support for more information." },
  [ProfileApprovalStatus.ARCHIVED]: { label: "Archived", bg: "bg-[var(--surface-2)]", text: "text-[var(--neutral-gray)]", border: "border-[var(--neutral-gray)]/20", icon: Archive, bannerGradient: "from-gray-500 to-gray-600", message: "Your profile has been archived and is no longer visible to employers." },
};

function ScrollSection({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, badge }: { icon: typeof Star; title: string; badge?: ReactNode }) {
  return (
    <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center">
        <Icon size={15} className="text-[var(--primary)]" />
      </div>
      <span className="text-base">{title}</span>
      {badge}
    </h3>
  );
}

function RadialProgress({ value, size = 44 }: { value: number; size?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = isInView ? circumference - (value / 100) * circumference : circumference;
  return (
    <svg ref={ref} width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary)" strokeWidth={3} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isInView || value === 0) return;
    const duration = 800;
    const startTime = performance.now();
    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, value]);
  return <span ref={ref}>{count}</span>;
}

function WorkHoursBar({ start, end }: { start: string; end: string }) {
  const parseHour = (time: string): number => {
    const match = time.match(/(\d+)/);
    if (!match) return 9;
    let hour = parseInt(match[1], 10);
    if (time.toLowerCase().includes("pm") && hour !== 12) hour += 12;
    if (time.toLowerCase().includes("am") && hour === 12) hour = 0;
    return hour;
  };
  const startHour = parseHour(start);
  const endHour = parseHour(end);
  const startPct = (startHour / 24) * 100;
  const widthPct = ((endHour > startHour ? endHour - startHour : 24 - startHour + endHour) / 24) * 100;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[9px] text-[var(--neutral-gray)] mb-1 px-0.5">
        <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span>
      </div>
      <div className="relative h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <motion.div className="absolute top-0 h-full bg-gradient-to-r from-[var(--primary)] to-[#2D9B56] rounded-full" initial={{ width: 0 }} animate={{ width: `${widthPct}%` }} transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} style={{ left: `${startPct}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string; href?: string }) {
  const content = (
    <>
      <div className="w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center shrink-0 transition-colors group-hover:bg-[var(--primary)]/8">
        <Icon size={14} className="text-[var(--neutral-gray)] transition-colors group-hover:text-[var(--primary)]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--primary)] hover:text-[var(--secondary)] font-medium transition-colors break-all inline-flex items-center gap-1 group-hover:underline">
            {value}
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ) : (
          <p className="text-sm text-[var(--foreground)] font-medium break-all">{value}</p>
        )}
      </div>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 py-2.5 group rounded-lg hover:bg-[var(--surface-1)] -mx-2 px-2 transition-colors">{content}</a>
  ) : (
    <div className="flex items-start gap-3 py-2.5 group">{content}</div>
  );
}

function ProfilePreviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--surface-2)] rounded-xl animate-pulse" />
          <div>
            <div className="h-7 w-44 bg-[var(--surface-2)] rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-[var(--surface-2)] rounded-lg animate-pulse mt-1.5" />
          </div>
        </div>
      </div>
      <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        <div className="h-52 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 animate-pulse" />
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 -mt-16">
            <div className="w-36 h-36 rounded-full border-4 border-white bg-[var(--surface-2)] animate-pulse" />
            <div className="flex-1 pt-2 sm:pt-20">
              <div className="h-9 w-56 bg-[var(--surface-2)] rounded-lg animate-pulse" />
              <div className="h-6 w-40 bg-[var(--surface-2)] rounded-lg mt-2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-4 relative z-10 px-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm"><div className="h-6 w-32 bg-[var(--surface-2)] rounded-lg animate-pulse mb-4" /><div className="space-y-2"><div className="h-4 w-full bg-[var(--surface-2)] rounded animate-pulse" /><div className="h-4 w-5/6 bg-[var(--surface-2)] rounded animate-pulse" /></div></div>)}
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm"><div className="h-6 w-32 bg-[var(--surface-2)] rounded-lg animate-pulse mb-4" /><div className="space-y-2"><div className="h-4 w-full bg-[var(--surface-2)] rounded animate-pulse" /><div className="h-4 w-5/6 bg-[var(--surface-2)] rounded animate-pulse" /></div></div>)}
        </div>
      </div>
    </div>
  );
}

function SkillsShowcase({ verifiedSkills, otherSkills }: { verifiedSkills: Array<{ id: string; isVerified: boolean; skill?: { name: string } | null; customTagName: string | null }>; otherSkills: Array<{ id: string; isVerified: boolean; skill?: { name: string } | null; customTagName: string | null }> }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <ScrollSection className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 print:shadow-none profile-print-section">
      <SectionHeader icon={Award} title="Skills" />
      <div ref={ref} className="space-y-4">
        {verifiedSkills.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--success)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><CheckCircle2 size={12} />Verified Skills</p>
            <div className="flex flex-wrap gap-2">
              {verifiedSkills.map((cs, i) => (
                <motion.span key={cs.id} initial={{ opacity: 0, scale: 0.8 }} animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }} transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 hover:bg-[var(--success)]/15 transition-colors">
                  <CheckCircle2 size={13} className="text-[var(--success)]" />
                  {cs.skill?.name || cs.customTagName || "Skill"}
                </motion.span>
              ))}
            </div>
          </div>
        )}
        {otherSkills.length > 0 && (
          <div>
            {verifiedSkills.length > 0 && <p className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-2.5">Other Skills</p>}
            <div className="flex flex-wrap gap-2">
              {otherSkills.map((cs, i) => (
                <motion.span key={cs.id} initial={{ opacity: 0, scale: 0.8 }} animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }} transition={{ delay: (verifiedSkills.length + i) * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-[var(--surface-1)] text-[#444] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                  {cs.skill?.name || cs.customTagName || "Skill"}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollSection>
  );
}

function ProjectCard({ project, index }: { project: { id: string; title: string; description: string | null; projectUrl: string | null; githubUrl: string | null; imageUrl: string | null; techStack: string[] | null; outcomeMetric: string | null }; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 16 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }} className="rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-lg hover:border-[var(--primary)]/20 transition-all duration-300 group bg-[var(--surface-0)] print:shadow-none">
      {project.imageUrl ? (
        <div className="relative overflow-hidden">
          <img src={project.imageUrl} alt={project.title} className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" />
          {project.techStack && project.techStack.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex flex-wrap gap-1">
                {project.techStack.slice(0, 4).map((tech) => <span key={tech} className="text-[10px] px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-sm font-medium">{tech}</span>)}
                {project.techStack.length > 4 && <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-sm font-medium">+{project.techStack.length - 4}</span>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-48 bg-gradient-to-br from-[var(--primary)] to-[#0f2d6e] flex items-center justify-center overflow-hidden">
          <span className="text-7xl font-bold text-white/10">{project.title.charAt(0).toUpperCase()}</span>
          {project.techStack && project.techStack.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex flex-wrap gap-1">
                {project.techStack.slice(0, 4).map((tech) => <span key={tech} className="text-[10px] px-2 py-0.5 rounded-md bg-white/15 text-white/80 font-medium">{tech}</span>)}
                {project.techStack.length > 4 && <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/15 text-white/80 font-medium">+{project.techStack.length - 4}</span>}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <h4 className="font-semibold text-[var(--foreground)] text-sm group-hover:text-[var(--primary)] transition-colors">{project.title}</h4>
        {project.description && <p className="text-xs text-[var(--neutral-gray)] mt-1.5 line-clamp-3 leading-relaxed">{project.description}</p>}
        {project.outcomeMetric && <p className="text-xs text-[var(--success)] font-medium mt-2 flex items-center gap-1"><BarChart3 size={10} />{project.outcomeMetric}</p>}
        {(project.projectUrl || project.githubUrl) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
            {project.projectUrl && <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"><ExternalLink size={11} /> View Project</a>}
            {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:border-[var(--foreground)] hover:text-[var(--foreground)] transition-colors"><Github size={11} /> View Code</a>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ProfilePreviewPage() {
  const { user } = useAuth();
  const { data: profile, isLoading, error, refetch } = useMyProfile();
  const submitProfile = useSubmitProfile();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -60]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.08]);

  const handleSubmitForReview = async () => {
    try { await submitProfile.mutateAsync(); toast.success("Profile submitted for review!"); } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to submit profile."); }
  };
  const handleShareProfile = async () => {
    const url = `${window.location.origin}/candidates/${profile?.slug || profile?.id || ""}`;
    try { await navigator.clipboard.writeText(url); toast.success("Profile link copied to clipboard!"); } catch { toast.error("Failed to copy link"); }
  };
  const handlePrint = () => window.print();

  useEffect(() => {
    if (profile?.approvalStatus === ProfileApprovalStatus.APPROVED) {
      const timer = setTimeout(() => setBannerDismissed(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [profile?.approvalStatus]);

  if (isLoading) return <ProfilePreviewSkeleton />;
  if (error || !profile) {
    return (
      <motion.div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-16 text-center shadow-sm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <div className="w-16 h-16 rounded-2xl bg-[var(--error)]/10 flex items-center justify-center mx-auto mb-4"><AlertCircle size={28} className="text-[var(--error)]" /></div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Failed to load profile</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">{error instanceof Error ? error.message : "Something went wrong. Please try again."}</p>
        <button onClick={() => refetch()} className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] shadow-md shadow-[var(--primary)]/20 transition-all duration-200">Try Again</button>
      </motion.div>
    );
  }

  const statusConfig = approvalStatusConfig[profile.approvalStatus] || approvalStatusConfig.draft;
  const StatusIcon = statusConfig.icon;
  const workModeInfo = profile.preferredWorkMode ? workModeConfig[profile.preferredWorkMode] : null;
  const availabilityInfo = profile.availabilityStatus ? availabilityConfig[profile.availabilityStatus] : null;
  const hasContactInfo = profile.contactEmail || profile.phone || profile.timezone;
  const hasSocialLinks = profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl || profile.personalWebsite;
  const hasLanguages = (profile.languages && profile.languages.length > 0) || (profile.spokenLanguages && profile.spokenLanguages.length > 0);
  const bioIsLong = profile.bio ? profile.bio.length > 300 : false;
  const verifiedSkills = profile.candidateSkills?.filter((s) => s.isVerified) || [];
  const otherSkills = profile.candidateSkills?.filter((s) => !s.isVerified) || [];
  const showBanner = profile.approvalStatus !== ProfileApprovalStatus.APPROVED || !bannerDismissed;

  return (
    <div className="profile-preview-page space-y-6">
      {/* Approval Status Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div initial={{ opacity: 0, y: -12, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -12, height: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="print:hidden">
            <div className={cn("bg-gradient-to-r rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 shadow-lg", statusConfig.bannerGradient)}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {StatusIcon && <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0"><StatusIcon size={18} className="text-white" /></div>}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{statusConfig.label}</p>
                  <p className="text-xs text-white/80 mt-0.5 leading-relaxed">{statusConfig.message}</p>
                </div>
              </div>
              {statusConfig.cta && (
                <div className="shrink-0">
                  {profile.approvalStatus === ProfileApprovalStatus.DRAFT ? (
                    <button onClick={handleSubmitForReview} disabled={submitProfile.isPending} className="px-4 py-2 bg-white text-[var(--primary)] rounded-xl text-sm font-semibold hover:bg-white/90 disabled:opacity-60 transition-colors shadow-sm">
                      {submitProfile.isPending ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />Submitting...</span> : <span className="flex items-center gap-1.5"><Send size={13} />{statusConfig.cta}</span>}
                    </button>
                  ) : statusConfig.ctaHref ? (
                    <Link href={statusConfig.ctaHref} className="px-4 py-2 bg-white text-[var(--primary)] rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm inline-flex items-center gap-1.5"><Edit3 size={13} />{statusConfig.cta}</Link>
                  ) : null}
                </div>
              )}
              {profile.approvalStatus === ProfileApprovalStatus.APPROVED && <button onClick={() => setBannerDismissed(true)} className="text-white/60 hover:text-white transition-colors text-xs shrink-0" aria-label="Dismiss">Dismiss</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/profile" className="p-2.5 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-all duration-200" aria-label="Back to edit profile"><ArrowLeft size={20} /></Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile Preview</h1>
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border", statusConfig.bg, statusConfig.text, statusConfig.border)}>{StatusIcon && <StatusIcon size={12} />}{statusConfig.label}</span>
            </div>
            <p className="text-sm text-[var(--neutral-gray)] mt-0.5">This is how employers will see your public portfolio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleShareProfile} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all duration-200"><Share2 size={14} /> Share</button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all duration-200"><Printer size={14} /> PDF</button>
          <Link href="/dashboard/profile" className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all duration-200"><Edit3 size={14} /> Edit</Link>
          {profile.approvalStatus === ProfileApprovalStatus.DRAFT && (
            <button onClick={handleSubmitForReview} disabled={submitProfile.isPending} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[var(--primary)]/20 hover:shadow-lg hover:shadow-[var(--primary)]/25 transition-all duration-200">
              {submitProfile.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={14} /> Submit</>}
            </button>
          )}
        </div>
      </motion.div>

      {/* Hero Card */}
      <motion.div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 print:shadow-none print:border-0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
        <div className="h-52 bg-gradient-to-br from-[var(--primary)] via-[#1a44a3] to-[#0f2d6e] relative overflow-hidden print:h-32">
          <motion.div className="absolute inset-0" style={{ y: heroY, scale: heroScale }}>
            <div className="absolute inset-0 opacity-[0.15]">
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(59,109,224,0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(249,198,35,0.15) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(245,154,35,0.1) 0%, transparent 40%)" }} />
            </div>
            <div className="absolute inset-0 opacity-[0.06]">
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 1px, transparent 1px)", backgroundSize: "60px 60px, 40px 40px, 80px 80px" }} />
            </div>
          </motion.div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
        <div className="px-4 sm:px-8 pb-8 relative z-10">
          <div className="flex flex-col sm:flex-row gap-5 -mt-18">
            <div className="shrink-0">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.fullName} className="w-36 h-36 rounded-full border-[5px] border-white object-cover ring-1 ring-black/5" style={{ boxShadow: "var(--shadow-premium)" }} />
              ) : (
                <div className="w-36 h-36 rounded-full border-[5px] border-white bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center ring-1 ring-black/5" style={{ boxShadow: "var(--shadow-premium)" }}>
                  <span className="text-5xl font-bold text-white">{profile.fullName?.charAt(0)?.toUpperCase() || "?"}</span>
                </div>
              )}
            </div>
            <div className="flex-1 pt-2 sm:pt-20">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="font-bold text-[var(--foreground)] leading-tight" style={{ fontSize: "clamp(1.75rem, 1.5rem + 1vw, 2.5rem)" }}>{profile.fullName}</h2>
                  {profile.primaryTrack && <span className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[var(--primary)] to-[#2D9B56] shadow-sm">{profile.primaryTrack.name}</span>}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                    {(profile.city || profile.country) && <span className="flex items-center gap-1.5 text-sm text-[var(--neutral-gray)]"><MapPin size={14} className="shrink-0" />{[profile.city, profile.country].filter(Boolean).join(", ")}</span>}
                    {profile.yearsOfExperience != null && <span className="flex items-center gap-1.5 text-sm text-[var(--neutral-gray)]"><Briefcase size={14} className="shrink-0" />{profile.yearsOfExperience} yr{profile.yearsOfExperience !== 1 ? "s" : ""} exp</span>}
                    {workModeInfo && <span className="flex items-center gap-1.5 text-sm text-[var(--neutral-gray)]"><workModeInfo.icon size={14} className="shrink-0" />{workModeInfo.label}</span>}
                  </div>
                  {hasSocialLinks && (
                    <div className="flex items-center gap-2 mt-4 print:hidden">
                      {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="relative group w-10 h-10 rounded-xl bg-[#24292e] hover:bg-[#1b1f23] flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md" aria-label="GitHub"><Github size={17} className="text-white" /><span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--foreground)] text-[var(--surface-0)] text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">GitHub</span></a>}
                      {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="relative group w-10 h-10 rounded-xl bg-[#0077B5] hover:bg-[#006195] flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md" aria-label="LinkedIn"><Linkedin size={17} className="text-white" /><span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--foreground)] text-[var(--surface-0)] text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">LinkedIn</span></a>}
                      {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="relative group w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[#2D9B56] hover:from-[var(--secondary)] hover:to-[var(--primary)] flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md" aria-label="Portfolio"><Globe size={17} className="text-white" /><span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--foreground)] text-[var(--surface-0)] text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">Portfolio</span></a>}
                      {profile.personalWebsite && <a href={profile.personalWebsite} target="_blank" rel="noopener noreferrer" className="relative group w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[#2D9B56] hover:from-[var(--secondary)] hover:to-[var(--primary)] flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md" aria-label="Website"><ExternalLink size={17} className="text-white" /><span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--foreground)] text-[var(--surface-0)] text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">Website</span></a>}
                      {profile.contactEmail && <a href={`mailto:${profile.contactEmail}`} className="relative group w-10 h-10 rounded-xl border-2 border-[var(--border)] bg-[var(--surface-0)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 flex items-center justify-center transition-all duration-200" aria-label="Email"><Mail size={17} className="text-[var(--neutral-gray)] group-hover:text-[var(--primary)]" /><span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--foreground)] text-[var(--surface-0)] text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">Email</span></a>}
                    </div>
                  )}
                </div>
                {availabilityInfo && (
                  <span className={cn("inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold shrink-0 shadow-sm ring-2", availabilityInfo.bg, availabilityInfo.color, availabilityInfo.dot === "bg-[var(--success)]" ? "ring-[var(--success)]/20" : availabilityInfo.dot === "bg-[var(--warning)]" ? "ring-[var(--warning)]/20" : availabilityInfo.dot === "bg-[var(--neutral-gray)]" ? "ring-[var(--neutral-gray)]/20" : "ring-[var(--info)]/20")}>
                    <span className={cn("w-2 h-2 rounded-full", availabilityInfo.dot, availabilityInfo.dot !== "bg-[var(--neutral-gray)]" && "animate-pulse")} />
                    {availabilityInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 -mt-4 relative z-10 px-2 sm:px-4 print:mt-2 print:px-0">
        {profile.profileStrength > 0 && (
          <ScrollSection delay={0} className="glass-card rounded-2xl p-4 flex items-center gap-3 print:shadow-none print:border print:border-[var(--border)] print:bg-white">
            <RadialProgress value={profile.profileStrength} />
            <div><p className="text-[11px] text-[var(--neutral-gray)] font-medium">Strength</p><p className="text-base font-bold text-[var(--foreground)]">{profile.profileStrength}%</p></div>
          </ScrollSection>
        )}
        <ScrollSection delay={0.05} className="glass-card rounded-2xl p-4 flex items-center gap-3 print:shadow-none print:border print:border-[var(--border)] print:bg-white">
          <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/8 flex items-center justify-center"><Eye size={18} className="text-[var(--primary)]" /></div>
          <div><p className="text-[11px] text-[var(--neutral-gray)] font-medium">Views</p><p className="text-base font-bold text-[var(--foreground)]"><AnimatedCounter value={profile.profileViews || 0} /></p></div>
        </ScrollSection>
        <ScrollSection delay={0.1} className="glass-card rounded-2xl p-4 flex items-center gap-3 print:shadow-none print:border print:border-[var(--border)] print:bg-white">
          <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center"><MessageSquare size={18} className="text-[var(--primary)]" /></div>
          <div><p className="text-[11px] text-[var(--neutral-gray)] font-medium">Intros</p><p className="text-base font-bold text-[var(--foreground)]"><AnimatedCounter value={profile.introRequestsReceived || 0} /></p></div>
        </ScrollSection>
        {profile.nitdaBadgeVerified && (
          <ScrollSection delay={0.15} className="glass-card rounded-2xl p-4 flex items-center gap-3 print:shadow-none print:border print:border-[var(--border)] print:bg-white">
            <div className="w-11 h-11 rounded-xl bg-[var(--success)]/10 flex items-center justify-center"><Shield size={18} className="text-[var(--success)]" /></div>
            <div><p className="text-[11px] text-[var(--neutral-gray)] font-medium">NITDA</p><p className="text-sm font-bold text-[var(--success)]">Verified</p></div>
          </ScrollSection>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1">
        <div className="lg:col-span-2 space-y-6">
          {profile.bio && (
            <ScrollSection className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 print:shadow-none profile-print-section">
              <SectionHeader icon={Star} title="About" badge={profile.yearsOfExperience != null ? <span className="ml-auto text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/8 px-2.5 py-1 rounded-lg">{profile.yearsOfExperience}+ yrs experience</span> : undefined} />
              <div className="relative">
                <p className={cn("text-sm leading-relaxed text-[#444] whitespace-pre-wrap", "first-letter:float-left first-letter:text-[3.2em] first-letter:font-bold first-letter:text-[var(--primary)] first-letter:pr-2 first-letter:leading-[0.8] first-letter:mt-1", !bioExpanded && bioIsLong && "line-clamp-4")}>{profile.bio}</p>
                {bioIsLong && (
                  <button onClick={() => setBioExpanded(!bioExpanded)} className="flex items-center gap-1 mt-3 text-sm font-medium text-[var(--primary)] hover:text-[var(--secondary)] transition-colors print:hidden">
                    {bioExpanded ? "Show less" : "Read more"}
                    <motion.span animate={{ rotate: bioExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={14} /></motion.span>
                  </button>
                )}
              </div>
            </ScrollSection>
          )}
          {profile.candidateSkills && profile.candidateSkills.length > 0 && <SkillsShowcase verifiedSkills={verifiedSkills} otherSkills={otherSkills} />}
          {profile.candidateProjects && profile.candidateProjects.length > 0 && (
            <ScrollSection className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 print:shadow-none profile-print-section">
              <SectionHeader icon={Layers} title="Projects" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{profile.candidateProjects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}</div>
            </ScrollSection>
          )}
          {profile.experienceAreas && profile.experienceAreas.length > 0 && (
            <ScrollSection className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 print:shadow-none profile-print-section">
              <SectionHeader icon={Briefcase} title="Experience Areas" />
              <div className="flex flex-wrap gap-2">{profile.experienceAreas.map((area) => <span key={area} className="px-3.5 py-2 rounded-xl text-sm font-medium bg-[var(--surface-1)] text-[#444] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">{area}</span>)}</div>
            </ScrollSection>
          )}
        </div>

        <div className="space-y-6">
          {(workModeInfo || availabilityInfo || profile.preferredHoursStart || profile.city || profile.country) && (
            <ScrollSection className="space-y-3">
              <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-2.5 mb-1"><div className="w-8 h-8 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center"><Briefcase size={15} className="text-[var(--primary)]" /></div><span className="text-base">Work Preferences</span></h3>
              <div className="grid grid-cols-2 gap-3">
                {workModeInfo && <div className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-4 hover:shadow-md transition-shadow duration-300"><div className="w-9 h-9 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center mb-2.5"><workModeInfo.icon size={16} className="text-[var(--primary)]" /></div><p className="text-[10px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">Work Mode</p><p className="text-sm font-semibold text-[var(--foreground)] mt-0.5">{workModeInfo.label}</p></div>}
                {availabilityInfo && <div className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-4 hover:shadow-md transition-shadow duration-300"><div className="w-9 h-9 rounded-lg bg-[var(--success)]/10 flex items-center justify-center mb-2.5"><Calendar size={16} className="text-[var(--success)]" /></div><p className="text-[10px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">Availability</p><p className={cn("text-sm font-semibold mt-0.5", availabilityInfo.color)}>{availabilityInfo.label.replace("Available ", "")}</p></div>}
                {(profile.city || profile.country) && <div className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-4 hover:shadow-md transition-shadow duration-300"><div className="w-9 h-9 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center mb-2.5"><MapPin size={16} className="text-[var(--warning)]" /></div><p className="text-[10px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">Location</p><p className="text-sm font-semibold text-[var(--foreground)] mt-0.5 truncate">{[profile.city, profile.country].filter(Boolean).join(", ")}</p></div>}
                {(profile.preferredHoursStart || profile.preferredHoursEnd) && <div className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-4 hover:shadow-md transition-shadow duration-300"><div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mb-2.5"><Clock size={16} className="text-[var(--primary)]" /></div><p className="text-[10px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">Hours</p><p className="text-sm font-semibold text-[var(--foreground)] mt-0.5">{profile.preferredHoursStart || "—"} – {profile.preferredHoursEnd || "—"}</p></div>}
              </div>
              {profile.preferredHoursStart && profile.preferredHoursEnd && (
                <div className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] px-4 py-3">
                  <p className="text-[10px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Active Hours</p>
                  <WorkHoursBar start={profile.preferredHoursStart} end={profile.preferredHoursEnd} />
                </div>
              )}
            </ScrollSection>
          )}
          {profile.primaryStacks && profile.primaryStacks.length > 0 && (
            <ScrollSection className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 print:shadow-none profile-print-section">
              <SectionHeader icon={Monitor} title="Tech Stacks" />
              <div className="flex flex-wrap gap-2">{profile.primaryStacks.map((stack) => <span key={stack} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--primary)]/8 text-[var(--primary)] border border-[var(--primary)]/10 hover:bg-[var(--primary)]/15 transition-colors">{stack}</span>)}</div>
            </ScrollSection>
          )}
          {hasLanguages && (
            <ScrollSection className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 print:shadow-none profile-print-section">
              <SectionHeader icon={Languages} title="Languages" />
              <div className="space-y-4">
                {profile.languages && profile.languages.length > 0 && <div><p className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-2">Programming</p><div className="flex flex-wrap gap-1.5">{profile.languages.map((lang) => <span key={lang} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-1)] text-[#444] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"><Code2 size={10} className="text-[var(--neutral-gray)]" />{lang}</span>)}</div></div>}
                {profile.spokenLanguages && profile.spokenLanguages.length > 0 && <div><p className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-2">Spoken</p><div className="flex flex-wrap gap-1.5">{profile.spokenLanguages.map((lang) => <span key={lang} className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-1)] text-[#444] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">{lang}</span>)}</div></div>}
              </div>
            </ScrollSection>
          )}
          {hasContactInfo && (
            <ScrollSection className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 print:shadow-none profile-print-section">
              <SectionHeader icon={Mail} title="Contact" />
              <div className="space-y-1">
                {profile.contactEmail && <InfoRow icon={Mail} label="Email" value={profile.contactEmail} href={`mailto:${profile.contactEmail}`} />}
                {profile.phone && <InfoRow icon={Phone} label="Phone" value={profile.phone} href={`tel:${profile.phone}`} />}
                {profile.timezone && <InfoRow icon={Globe} label="Timezone" value={profile.timezone} />}
              </div>
            </ScrollSection>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <motion.div className="flex items-center justify-between py-4 border-t border-[var(--border)] print:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <Link href="/dashboard/profile" className="flex items-center gap-2 text-sm font-medium text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors rounded-lg px-2 py-1"><ArrowLeft size={16} /> Back to Edit</Link>
        <div className="flex items-center gap-2.5">
          <button onClick={handleShareProfile} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors rounded-lg"><Share2 size={14} /> Share Profile</button>
          {profile.approvalStatus === ProfileApprovalStatus.DRAFT && (
            <button onClick={handleSubmitForReview} disabled={submitProfile.isPending} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[var(--primary)]/20 hover:shadow-lg hover:shadow-[var(--primary)]/25 transition-all duration-200">
              {submitProfile.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={14} /> Submit for Review</>}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
