"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutGrid,
  List,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Users,
} from "lucide-react";
import type { CandidateProfile } from "@/types/candidate";
import type { PublicCandidate } from "@/lib/server-api";
import { cn } from "@/lib/utils";
import { CandidateCard } from "./candidate-card";
import { AvailabilityBadge } from "./availability-badge";
import { AnimatedCardGrid } from "@/components/shared/animated-card";
import { EmptyState } from "@/components/shared/empty-state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CandidateGridProps {
  candidates: (CandidateProfile | PublicCandidate)[];
  onClearFilters?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  return fullName.charAt(0).toUpperCase();
}

// ---------------------------------------------------------------------------
// List Row Component
// ---------------------------------------------------------------------------

function CandidateListRow({ candidate }: { candidate: CandidateProfile | PublicCandidate }) {
  const topSkills = candidate.candidateSkills?.slice(0, 3) ?? [];
  const remaining = (candidate.candidateSkills?.length ?? 0) - 3;
  const location = [candidate.city, candidate.country].filter(Boolean).join(", ");

  return (
    <Link
      href={`/talents/${candidate.slug}`}
      className="flex items-center gap-4 py-3 px-4 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-1)] transition-colors group"
    >
      {/* Avatar */}
      {candidate.photoUrl ? (
        <Image
          src={candidate.photoUrl}
          alt={candidate.fullName}
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-xs font-bold text-white ring-2 ring-white shadow-sm">
          {getInitials(candidate.fullName)}
        </div>
      )}

      {/* Name & Track */}
      <div className="min-w-0 w-40 flex-shrink-0">
        <p className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
          {candidate.fullName}
        </p>
        {candidate.primaryTrack && (
          <p className="truncate text-xs text-[var(--primary)]">
            {candidate.primaryTrack.name}
          </p>
        )}
      </div>

      {/* Skills */}
      <div className="hidden sm:flex flex-wrap gap-1 flex-1 min-w-0">
        {topSkills.map((cs) => (
          <span
            key={cs.id}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
          >
            {cs.isVerified && (
              <CheckCircle2 className="h-2.5 w-2.5 text-[var(--success)]" />
            )}
            {cs.skill?.name ?? (cs as any).customTagName ?? ""}
          </span>
        ))}
        {remaining > 0 && (
          <span className="inline-flex items-center rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-[11px] font-medium text-[var(--neutral-gray)]">
            +{remaining}
          </span>
        )}
      </div>

      {/* Location */}
      <div className="hidden md:block w-32 flex-shrink-0">
        {location && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--neutral-gray)]">
            <MapPin className="h-3 w-3" />
            {location}
          </span>
        )}
      </div>

      {/* Availability */}
      <div className="hidden lg:block flex-shrink-0">
        {candidate.availabilityStatus && (
          <AvailabilityBadge status={candidate.availabilityStatus as any} size="sm" />
        )}
      </div>

      {/* View Profile */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
          View
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CandidateGrid({
  candidates,
  onClearFilters,
}: CandidateGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Empty state
  if (candidates.length === 0) {
    return (
      <div>
        {/* View mode toggle */}
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        <EmptyState
          icon={Users}
          title="No candidates found"
          description="Try adjusting your filters or search terms"
          action={
            onClearFilters ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] transition-colors"
              >
                Clear Filters
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div>
      {/* View mode toggle */}
      <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

      {/* Grid view */}
      {viewMode === "grid" ? (
        <AnimatedCardGrid className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate, i) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate as any}
              index={i}
            />
          ))}
        </AnimatedCardGrid>
      ) : (
        /* List view — horizontal card rows */
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm">
          {candidates.map((candidate) => (
            <CandidateListRow key={candidate.id} candidate={candidate} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View Toggle
// ---------------------------------------------------------------------------

function ViewToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}) {
  return (
    <div className="mb-5 flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onViewModeChange("grid")}
        className={cn(
          "rounded-lg p-2 transition-colors",
          viewMode === "grid"
            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
            : "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        )}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("list")}
        className={cn(
          "rounded-lg p-2 transition-colors",
          viewMode === "list"
            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
            : "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        )}
        aria-label="List view"
      >
        <List className="h-5 w-5" />
      </button>
    </div>
  );
}
