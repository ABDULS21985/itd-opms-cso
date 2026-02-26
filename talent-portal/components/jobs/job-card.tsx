"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  MapPin,
  Wifi,
  Building2,
  ArrowLeftRight,
  BadgeCheck,
  Calendar,
  Clock,
  Users,
  ArrowRight,
} from "lucide-react";
import { Button } from "@digibit/ui/components";
import { cn } from "@/lib/utils";
import { AnimatedCard } from "@/components/shared/animated-card";

// ---------------------------------------------------------------------------
// Types - accept both API and legacy shapes
// ---------------------------------------------------------------------------

interface JobCardData {
  id: string;
  slug: string;
  title: string;
  jobType: string;
  workMode: string;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  experienceLevel?: string | null;
  applicationDeadline?: string | null;
  publishedAt?: string | null;
  postedAt?: string;
  viewCount?: number;
  applicationCount?: number;
  niceToHaveSkills?: string[] | null;
  employer?: {
    companyName: string;
    slug?: string;
    logoUrl?: string | null;
    verificationStatus?: string;
  };
  companyName?: string;
  companyLogoUrl?: string | null;
  companyVerified?: boolean;
  jobSkills?: { isRequired: boolean; skill?: { name: string } }[];
  requiredSkills?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JOB_TYPE_MAP: Record<string, { label: string; className: string }> = {
  full_time: {
    label: "Full Time",
    className: "bg-[var(--success-light)] text-[var(--success-dark)]",
  },
  part_time: {
    label: "Part Time",
    className: "bg-[var(--warning-light)] text-[var(--warning-dark)]",
  },
  contract: {
    label: "Contract",
    className: "bg-[var(--primary)]/10 text-[var(--primary)]",
  },
  internship: {
    label: "Internship",
    className: "bg-[var(--info-light)] text-[var(--info-dark)]",
  },
};

const WORK_MODE_MAP: Record<string, { label: string; Icon: typeof Wifi }> = {
  remote: { label: "Remote", Icon: Wifi },
  hybrid: { label: "Hybrid", Icon: ArrowLeftRight },
  on_site: { label: "On-site", Icon: Building2 },
};

function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
    return n.toLocaleString();
  };
  const cur = currency || "USD";
  if (min && max) return `${cur} ${fmt(min)} - ${fmt(max)}/yr`;
  if (min) return `From ${cur} ${fmt(min)}/yr`;
  if (max) return `Up to ${cur} ${fmt(max)}/yr`;
  return null;
}

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isNewJob(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return diffMs < 48 * 60 * 60 * 1000;
}

function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days >= 0 && days <= 7 ? days : null;
}

function getApplicantBadge(count: number): { color: string; bg: string } {
  if (count < 10) return { color: "text-[var(--success-dark)]", bg: "bg-[var(--success-light)]" };
  if (count <= 50) return { color: "text-[var(--warning-dark)]", bg: "bg-[var(--warning-light)]" };
  return { color: "text-[var(--error-dark)]", bg: "bg-[var(--error-light)]" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface JobCardProps {
  job: JobCardData;
  index?: number;
}

export function JobCard({ job, index = 0 }: JobCardProps) {
  const companyName = job.employer?.companyName || job.companyName || "Company";
  const companyLogo = job.employer?.logoUrl || job.companyLogoUrl;
  const isVerified = job.employer?.verificationStatus === "verified" || job.companyVerified;
  const jobType = JOB_TYPE_MAP[job.jobType] || { label: job.jobType, className: "bg-[var(--surface-1)] text-[var(--foreground)]" };
  const workMode = WORK_MODE_MAP[job.workMode] || WORK_MODE_MAP.remote;
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const postedDate = job.publishedAt || job.postedAt;
  const isNew = isNewJob(postedDate);
  const daysLeft = getDaysUntilDeadline(job.applicationDeadline);
  const appCount = job.applicationCount || 0;

  const skillNames: string[] = job.jobSkills
    ? job.jobSkills.filter((js) => js.isRequired).map((js) => js.skill?.name || "").filter(Boolean)
    : job.requiredSkills || [];

  return (
    <AnimatedCard index={index} hoverable={false} className="group flex flex-col overflow-hidden p-0 hover:shadow-lg hover:border-l-2 hover:border-l-[var(--primary)] transition-all duration-200">
      <Link href={`/jobs/${job.slug}`} className="flex flex-col flex-1">
        {/* Accent bar — always visible */}
        <div className="h-0.5 bg-gradient-to-r from-[var(--primary)] to-[var(--warning)] shrink-0" />

        <div className="relative flex flex-col flex-1 p-5">
          {/* "New" badge */}
          {isNew && (
            <span className="absolute top-3 right-3 bg-[var(--success)] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full leading-none">
              New
            </span>
          )}

          {/* Company header */}
          <div className="flex items-start gap-3">
            {companyLogo ? (
              <div className="relative w-12 h-12 shrink-0 rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-0)]">
                <Image
                  src={companyLogo}
                  alt={companyName}
                  width={48}
                  height={48}
                  className="object-contain p-1"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[#2D9B56] text-lg font-bold text-white">
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-[var(--neutral-gray)] truncate">
                  {companyName}
                </span>
                {isVerified && (
                  <BadgeCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
                )}
              </div>
              <h3 className="mt-0.5 text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors duration-200 line-clamp-1">
                {job.title}
              </h3>
            </div>
          </div>

          {/* Badges row */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", jobType.className)}>
              {jobType.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-1)] px-2.5 py-0.5 text-xs font-medium text-[var(--foreground)]">
              <workMode.Icon className="h-3 w-3" />
              {workMode.label}
            </span>
            {job.experienceLevel && (
              <span className="inline-flex items-center rounded-full bg-[var(--surface-1)] px-2.5 py-0.5 text-xs font-medium text-[var(--neutral-gray)]">
                {job.experienceLevel}
              </span>
            )}
            {appCount > 0 && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", getApplicantBadge(appCount).bg, getApplicantBadge(appCount).color)}>
                <Users className="h-3 w-3" />
                {appCount} applicant{appCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Skills */}
          {skillNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skillNames.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg bg-[var(--primary)]/5 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
                >
                  {skill}
                </span>
              ))}
              {skillNames.length > 4 && (
                <span className="rounded-lg bg-[var(--surface-1)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-gray)]">
                  +{skillNames.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Salary */}
          <div className="mt-3">
            {salary ? (
              <p className="text-base font-semibold text-[var(--foreground)]">{salary}</p>
            ) : (
              <p className="text-sm text-[var(--neutral-gray)] italic">Salary not disclosed</p>
            )}
          </div>

          {/* Deadline urgency */}
          {daysLeft !== null && (
            <div className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--error)]">
              <Clock className="h-3.5 w-3.5" />
              Closes in {daysLeft === 0 ? "today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
            </div>
          )}

          {/* Spacer to push footer down */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--neutral-gray)]">
            {job.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {job.location}
              </span>
            )}
            {postedDate && (
              <span className="ml-auto inline-flex items-center gap-1 shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                {formatRelativeDate(postedDate)}
              </span>
            )}
          </div>

          {/* Quick "View Details" button on hover */}
          <motion.div
            className="absolute inset-x-0 bottom-0 flex justify-center pb-4 pointer-events-none"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 0 }}
          >
            <div className="group-hover:opacity-100 group-hover:translate-y-0 opacity-0 translate-y-2 transition-all duration-200 pointer-events-auto">
              <Button variant="glass" size="sm" className="shadow-lg">
                View Details
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </Link>
    </AnimatedCard>
  );
}
