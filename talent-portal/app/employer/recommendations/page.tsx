"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Sparkles,
  MapPin,
  Clock,
  Briefcase,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
} from "lucide-react";
import { useRecommendedCandidates } from "@/hooks/use-matching";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { MatchExplanationCard } from "@/components/matching/match-explanation-card";
import type { CandidateRecommendation } from "@/types/matching";

const availabilityLabels: Record<string, string> = {
  immediate: "Available Now",
  one_month: "In 1 Month",
  two_three_months: "In 2-3 Months",
  not_available: "Not Available",
  placed: "Placed",
};

const workModeLabels: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
};

function CandidateCard({ rec }: { rec: CandidateRecommendation }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const candidate = rec.candidate;

  if (!candidate) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-[var(--primary)]/10 flex items-center justify-center overflow-hidden">
          {candidate.photoUrl ? (
            <img
              src={candidate.photoUrl}
              alt={candidate.fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-[var(--primary)]">
              {candidate.fullName.charAt(0)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--foreground)] truncate">
              {candidate.fullName}
            </h3>
            <MatchScoreBadge score={rec.overallScore} size="sm" />
          </div>
          {candidate.primaryTrack && (
            <p className="text-sm text-[var(--primary)] font-medium">
              {candidate.primaryTrack.name}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--neutral-gray)]">
            {candidate.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {candidate.city}{candidate.country ? `, ${candidate.country}` : ""}
              </span>
            )}
            {candidate.yearsOfExperience !== null && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {candidate.yearsOfExperience} yrs exp
              </span>
            )}
            {candidate.availabilityStatus && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {availabilityLabels[candidate.availabilityStatus] || candidate.availabilityStatus}
              </span>
            )}
            {candidate.preferredWorkMode && (
              <span>
                {workModeLabels[candidate.preferredWorkMode] || candidate.preferredWorkMode}
              </span>
            )}
          </div>

          {/* Skills */}
          {candidate.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {candidate.skills.slice(0, 6).map((skill) => (
                <span
                  key={skill.id}
                  className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]"
                >
                  {skill.name}
                </span>
              ))}
              {candidate.skills.length > 6 && (
                <span className="text-[10px] text-[var(--neutral-gray)]">
                  +{candidate.skills.length - 6} more
                </span>
              )}
            </div>
          )}

          {/* Matched job */}
          {rec.job && (
            <p className="mt-1 text-[10px] text-[var(--neutral-gray)]">
              Best match for: <span className="font-medium">{rec.job.title}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Link
            href={`/talents/${candidate.slug}`}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
          >
            View <ExternalLink className="h-3 w-3" />
          </Link>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Why? {showExplanation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
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

export default function RecommendationsPage() {
  const [minScore, setMinScore] = useState(30);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRecommendedCandidates({
    minScore,
    page,
    limit: 20,
  });
  const { data: jobsData } = useEmployerJobs({ limit: 100 });

  const recommendations = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-[var(--primary)]" />
          Recommended Candidates
        </h1>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          AI-matched candidates based on your job requirements, skills, and preferences
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
            {meta.total} candidate{meta.total !== 1 ? "s" : ""} found
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
          <Users className="mx-auto h-12 w-12 text-[var(--neutral-gray)]" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
            No recommendations yet
          </h3>
          <p className="mt-1 text-sm text-[var(--neutral-gray)]">
            Publish job posts to start getting matched candidates.
          </p>
          <Link
            href="/employer/jobs/new"
            className="mt-4 inline-block rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Post a Job
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <CandidateCard key={rec.id} rec={rec} />
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
