"use client";

import {
  MapPin,
  Clock,
  Briefcase,
  Monitor,
  Wifi,
  Building2,
  DollarSign,
  Calendar,
  Users,
  Eye,
  CheckCircle2,
  Star,
  ArrowRight,
} from "lucide-react";
import type { JobPost } from "@/types/job";
import { JobType, ExperienceLevel } from "@/types/job";
import { WorkMode } from "@/types/candidate";
import { StatusBadge } from "@/components/shared/status-badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobDetailProps {
  job: JobPost;
  onApply?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getJobTypeLabel(type: JobType): string {
  const map: Record<JobType, string> = {
    [JobType.INTERNSHIP]: "Internship",
    [JobType.CONTRACT]: "Contract",
    [JobType.FULL_TIME]: "Full-Time",
    [JobType.PART_TIME]: "Part-Time",
  };
  return map[type];
}

function getExperienceLevelLabel(level: ExperienceLevel): string {
  const map: Record<ExperienceLevel, string> = {
    [ExperienceLevel.ENTRY]: "Entry Level",
    [ExperienceLevel.MID]: "Mid Level",
    [ExperienceLevel.SENIOR]: "Senior Level",
  };
  return map[level];
}

function getWorkModeConfig(mode: WorkMode) {
  const map: Record<WorkMode, { label: string; Icon: typeof Monitor }> = {
    [WorkMode.REMOTE]: { label: "Remote", Icon: Wifi },
    [WorkMode.HYBRID]: { label: "Hybrid", Icon: Monitor },
    [WorkMode.ON_SITE]: { label: "On-site", Icon: Building2 },
  };
  return map[mode];
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const curr = currency ?? "USD";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: curr,
    maximumFractionDigits: 0,
  });
  if (min != null && max != null) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }
  if (min != null) return `From ${formatter.format(min)}`;
  if (max != null) return `Up to ${formatter.format(max!)}`;
  return null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not specified";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JobDetail({ job, onApply }: JobDetailProps) {
  const workMode = getWorkModeConfig(job.workMode);
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const requiredSkills =
    job.jobSkills?.filter((js) => js.isRequired) ?? [];
  const niceToHaveSkills =
    job.jobSkills?.filter((js) => !js.isRequired) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm sm:p-8">
        {/* Accent bar */}
        <div className="-mx-6 -mt-6 mb-6 h-1 rounded-t-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--warning)] sm:-mx-8 sm:-mt-8 sm:mb-8" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                {job.title}
              </h1>
              <StatusBadge status={job.status} />
            </div>

            {/* Employer info */}
            {job.employer && (
              <div className="mt-2 flex items-center gap-3">
                {job.employer.logoUrl ? (
                  <img
                    src={job.employer.logoUrl}
                    alt={job.employer.companyName}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                    <Building2 className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                )}
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {job.employer.companyName}
                </span>
              </div>
            )}

            {/* Tags row */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--neutral-gray)]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                <Briefcase className="h-3.5 w-3.5" />
                {getJobTypeLabel(job.jobType)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <workMode.Icon className="h-4 w-4" />
                {workMode.label}
              </span>
              {job.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
              )}
              {salary && (
                <span className="inline-flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  {salary}
                </span>
              )}
              {job.experienceLevel && (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4" />
                  {getExperienceLevelLabel(job.experienceLevel)}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-4 text-xs text-[var(--neutral-gray)]">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {job.viewCount} views
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {job.applicationCount} applications
              </span>
              {job.applicationDeadline && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Deadline: {formatDate(job.applicationDeadline)}
                </span>
              )}
            </div>
          </div>

          {/* Apply button */}
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] hover:shadow-md"
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          Description
        </h2>
        <div className="prose prose-sm max-w-none text-[var(--neutral-gray)]">
          <p className="whitespace-pre-wrap leading-relaxed">
            {job.description}
          </p>
        </div>
      </section>

      {/* Responsibilities */}
      {job.responsibilities && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Responsibilities
          </h2>
          <div className="prose prose-sm max-w-none text-[var(--neutral-gray)]">
            <p className="whitespace-pre-wrap leading-relaxed">
              {job.responsibilities}
            </p>
          </div>
        </section>
      )}

      {/* Required Skills */}
      {requiredSkills.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Required Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {requiredSkills.map((js) => (
              <span
                key={js.id}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)]"
              >
                <CheckCircle2 className="h-3 w-3" />
                {js.skill?.name ?? "Skill"}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Nice-to-have Skills */}
      {(niceToHaveSkills.length > 0 ||
        (job.niceToHaveSkills && job.niceToHaveSkills.length > 0)) && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Nice to Have
          </h2>
          <div className="flex flex-wrap gap-2">
            {niceToHaveSkills.map((js) => (
              <span
                key={js.id}
                className="inline-flex items-center rounded-md bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]"
              >
                {js.skill?.name ?? "Skill"}
              </span>
            ))}
            {job.niceToHaveSkills?.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-md bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Hiring Process */}
      {job.hiringProcess && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Hiring Process
          </h2>
          <div className="prose prose-sm max-w-none text-[var(--neutral-gray)]">
            <p className="whitespace-pre-wrap leading-relaxed">
              {job.hiringProcess}
            </p>
          </div>
        </section>
      )}

      {/* Bottom Apply CTA */}
      {onApply && (
        <div className="flex justify-center rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/5 to-[var(--warning)]/5 p-6">
          <div className="text-center">
            <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
              Interested in this position?
            </p>
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-8 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] hover:shadow-md"
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
