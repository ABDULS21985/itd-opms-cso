"use client";

import { useState } from "react";
import type { MatchExplanation } from "@/types/matching";

interface MatchExplanationCardProps {
  explanation: MatchExplanation;
  compact?: boolean;
  className?: string;
}

interface DimensionBarProps {
  label: string;
  score: number;
  weight: number;
  detail?: string;
}

function DimensionBar({ label, score, weight, detail }: DimensionBarProps) {
  const weighted = Math.round(score * (weight / 100));
  const barColor =
    score >= 70
      ? "bg-emerald-500"
      : score >= 40
        ? "bg-amber-500"
        : "bg-gray-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--foreground)]">{label}</span>
        <span className="text-[var(--neutral-gray)]">
          {score}/100 ({weight}% weight = {weighted}pts)
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200">
        <div
          className={`h-1.5 rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {detail && (
        <p className="text-[10px] text-[var(--neutral-gray)]">{detail}</p>
      )}
    </div>
  );
}

function SkillsDetail({
  matchedRequired,
  matchedOptional,
  missingRequired,
}: {
  matchedRequired: string[];
  matchedOptional: string[];
  missingRequired: string[];
}) {
  return (
    <div className="mt-1 space-y-1 text-xs">
      {matchedRequired.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-emerald-600 font-medium">Matched:</span>
          {matchedRequired.map((s) => (
            <span
              key={s}
              className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {matchedOptional.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-blue-600 font-medium">Bonus:</span>
          {matchedOptional.map((s) => (
            <span
              key={s}
              className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {missingRequired.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-red-500 font-medium">Missing:</span>
          {missingRequired.map((s) => (
            <span
              key={s}
              className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MatchExplanationCard({
  explanation,
  compact = false,
  className = "",
}: MatchExplanationCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const dims = explanation.dimensions;

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`text-xs text-[var(--primary)] hover:underline ${className}`}
      >
        Why this match?
      </button>
    );
  }

  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">
          Match Breakdown
        </h4>
        {compact && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-[var(--neutral-gray)] hover:text-[var(--foreground)]"
          >
            Hide
          </button>
        )}
      </div>

      <div className="space-y-3">
        <DimensionBar
          label="Skills"
          score={dims.skills.score}
          weight={dims.skills.weight}
        />
        <SkillsDetail
          matchedRequired={dims.skills.matchedRequired}
          matchedOptional={dims.skills.matchedOptional}
          missingRequired={dims.skills.missingRequired}
        />

        <DimensionBar
          label="Experience Level"
          score={dims.experience.score}
          weight={dims.experience.weight}
          detail={`Candidate: ${dims.experience.candidateLevel} | Job: ${dims.experience.jobLevel}`}
        />

        <DimensionBar
          label="Work Mode"
          score={dims.workMode.score}
          weight={dims.workMode.weight}
          detail={`Candidate: ${dims.workMode.candidateMode} | Job: ${dims.workMode.jobMode}`}
        />

        <DimensionBar
          label="Location"
          score={dims.location.score}
          weight={dims.location.weight}
          detail={dims.location.reason}
        />

        <DimensionBar
          label="Availability"
          score={dims.availability.score}
          weight={dims.availability.weight}
          detail={`Status: ${dims.availability.status}`}
        />

        <DimensionBar
          label="Profile Strength"
          score={dims.profileStrength.score}
          weight={dims.profileStrength.weight}
          detail={`${dims.profileStrength.strength}% complete`}
        />

        <DimensionBar
          label="Track Alignment"
          score={dims.trackAlignment.score}
          weight={dims.trackAlignment.weight}
          detail={dims.trackAlignment.matched ? "Tracks aligned" : "No track match"}
        />
      </div>

      <p className="mt-3 text-[10px] text-[var(--neutral-gray)]">
        Computed {new Date(explanation.computedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
