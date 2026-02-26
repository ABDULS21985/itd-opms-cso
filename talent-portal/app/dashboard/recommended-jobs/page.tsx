"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  Briefcase,
  Building2,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  Wifi,
  Building,
  Monitor,
} from "lucide-react";
import {
  useRecommendedJobs,
  useDismissRecommendation,
} from "@/hooks/use-matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { MatchExplanationCard } from "@/components/matching/match-explanation-card";
import type { JobRecommendation } from "@/types/matching";
import { toast } from "sonner";

const jobTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

const workModeConfig: Record<string, { label: string; icon: typeof Monitor }> = {
  remote: { label: "Remote", icon: Wifi },
  hybrid: { label: "Hybrid", icon: Building },
  on_site: { label: "On-site", icon: Monitor },
};

const experienceLabelMap: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior Level",
};

function JobCard({ rec }: { rec: JobRecommendation }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const dismiss = useDismissRecommendation();
  const job = rec.job;

  if (!job) return null;

  const wmConfig = workModeConfig[job.workMode] || workModeConfig.remote;
  const WmIcon = wmConfig.icon;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Company logo */}
        <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-[var(--surface-2)] flex items-center justify-center overflow-hidden">
          {job.employer?.logoUrl ? (
            <img
              src={job.employer.logoUrl}
              alt={job.employer.companyName}
              className="h-full w-full object-cover"
            />
          ) : (
            <Building2 className="h-6 w-6 text-[var(--neutral-gray)]" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/jobs/${job.slug}`}
              className="font-semibold text-[var(--foreground)] hover:text-[var(--primary)] truncate"
            >
              {job.title}
            </Link>
            <MatchScoreBadge score={rec.overallScore} size="sm" />
          </div>
          {job.employer && (
            <p className="text-sm text-[var(--neutral-gray)]">
              {job.employer.companyName}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--neutral-gray)]">
            <span className="flex items-center gap-1">
              <WmIcon className="h-3 w-3" />
              {wmConfig.label}
            </span>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {jobTypeLabels[job.jobType] || job.jobType}
            </span>
            {job.experienceLevel && (
              <span>
                {experienceLabelMap[job.experienceLevel] || job.experienceLevel}
              </span>
            )}
          </div>

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {job.skills.slice(0, 6).map((skill) => (
                <span
                  key={skill.id}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    skill.isRequired
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "bg-[var(--surface-2)] text-[var(--foreground)]"
                  }`}
                >
                  {skill.name}
                </span>
              ))}
              {job.skills.length > 6 && (
                <span className="text-[10px] text-[var(--neutral-gray)]">
                  +{job.skills.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Link
            href={`/jobs/${job.slug}`}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
          >
            View & Apply
          </Link>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Why? {showExplanation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={() => {
              dismiss.mutate(rec.id, {
                onSuccess: () => toast.success("Recommendation dismissed"),
              });
            }}
            disabled={dismiss.isPending}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-gray)] hover:text-[var(--error)] hover:border-[var(--error)]/30 transition-colors"
          >
            <X className="h-3 w-3" /> Dismiss
          </button>
        </div>
      </div>

      {showExplanation && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <MatchExplanationCard explanation={rec.explanation} />
        </div>
      )}
    </div>
  );
}

export default function RecommendedJobsPage() {
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRecommendedJobs({
    minScore: minScore || undefined,
    page,
    limit: 20,
  });

  const recommendations = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-[var(--primary)]" />
          Recommended Jobs
        </h1>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Jobs matched to your skills, experience, and preferences
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <Filter className="h-4 w-4 text-[var(--neutral-gray)]" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[var(--foreground)]">
            Min Score:
          </label>
          <select
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
              setPage(1);
            }}
            className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
          >
            <option value={0}>All matches</option>
            <option value={30}>30+ (Low)</option>
            <option value={50}>50+ (Moderate)</option>
            <option value={70}>70+ (Strong)</option>
            <option value={85}>85+ (Excellent)</option>
          </select>
        </div>
        {meta && (
          <span className="ml-auto text-xs text-[var(--neutral-gray)]">
            {meta.total} job{meta.total !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] py-16 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-[var(--neutral-gray)]" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
            No recommendations yet
          </h3>
          <p className="mt-1 text-sm text-[var(--neutral-gray)]">
            Complete your profile and add skills to get matched with jobs.
          </p>
          <Link
            href="/dashboard/profile"
            className="mt-4 inline-block rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Complete Profile
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <JobCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-[var(--neutral-gray)]">
            Page {page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
