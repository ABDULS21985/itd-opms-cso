import type { CandidateProfile } from "./candidate";
import type { JobPost } from "./job";
import type { EmployerOrg } from "./employer";

// ──────────────────────────────────────────────
// Match Explanation types
// ──────────────────────────────────────────────

export interface MatchDimensionScore {
  score: number;
  weight: number;
}

export interface SkillsDimensionScore extends MatchDimensionScore {
  matchedRequired: string[];
  matchedOptional: string[];
  missingRequired: string[];
}

export interface ExperienceDimensionScore extends MatchDimensionScore {
  candidateLevel: string;
  jobLevel: string;
}

export interface WorkModeDimensionScore extends MatchDimensionScore {
  candidateMode: string;
  jobMode: string;
}

export interface LocationDimensionScore extends MatchDimensionScore {
  reason: string;
}

export interface AvailabilityDimensionScore extends MatchDimensionScore {
  status: string;
}

export interface ProfileStrengthDimensionScore extends MatchDimensionScore {
  strength: number;
}

export interface TrackAlignmentDimensionScore extends MatchDimensionScore {
  matched: boolean;
}

export interface MatchExplanation {
  overallScore: number;
  dimensions: {
    skills: SkillsDimensionScore;
    experience: ExperienceDimensionScore;
    workMode: WorkModeDimensionScore;
    location: LocationDimensionScore;
    availability: AvailabilityDimensionScore;
    profileStrength: ProfileStrengthDimensionScore;
    trackAlignment: TrackAlignmentDimensionScore;
  };
  computedAt: string;
}

// ──────────────────────────────────────────────
// Recommendation response types
// ──────────────────────────────────────────────

export interface CandidateRecommendation {
  id: string;
  overallScore: number;
  explanation: MatchExplanation;
  computedAt: string;
  isDismissed: boolean;
  jobId: string;
  job?: {
    id: string;
    title: string;
    slug: string;
  };
  candidate?: {
    id: string;
    fullName: string;
    slug: string;
    photoUrl: string | null;
    primaryTrack: { id: string; name: string } | null;
    yearsOfExperience: number | null;
    availabilityStatus: string | null;
    preferredWorkMode: string | null;
    city: string | null;
    country: string | null;
    skills: { id: string; name: string }[];
  };
}

export interface JobRecommendation {
  id: string;
  overallScore: number;
  explanation: MatchExplanation;
  computedAt: string;
  isDismissed: boolean;
  job?: {
    id: string;
    title: string;
    slug: string;
    jobType: string;
    workMode: string;
    location: string | null;
    experienceLevel: string | null;
    employer?: {
      id: string;
      companyName: string;
      logoUrl: string | null;
    };
    skills?: { id: string; name: string; isRequired: boolean }[];
  };
}

export interface MatchStats {
  totalMatches: number;
  averageScore: number;
  scoreDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  lastComputedAt: string | null;
}
