import { useMemo } from "react";
import type { CandidateProfile } from "@/types/candidate";

// ──────────────────────────────────────────────
// Profile field weights (total = 100)
// ──────────────────────────────────────────────

const PROFILE_FIELDS: Record<string, { weight: number; label: string }> = {
  fullName: { weight: 10, label: "Full name" },
  photoUrl: { weight: 5, label: "Profile photo" },
  bio: { weight: 10, label: "Bio" },
  city: { weight: 2.5, label: "City" },
  country: { weight: 2.5, label: "Country" },
  candidateSkills: { weight: 15, label: "Skills (at least 3)" },
  primaryTrackId: { weight: 10, label: "Primary track" },
  githubUrl: { weight: 3.3, label: "GitHub URL" },
  linkedinUrl: { weight: 3.3, label: "LinkedIn URL" },
  portfolioUrl: { weight: 3.4, label: "Portfolio URL" },
  availabilityStatus: { weight: 5, label: "Availability status" },
  preferredWorkMode: { weight: 5, label: "Preferred work mode" },
  yearsOfExperience: { weight: 5, label: "Years of experience" },
  candidateProjects: { weight: 10, label: "Projects (at least 1)" },
  candidateConsents: { weight: 10, label: "Required consents granted" },
};

// ──────────────────────────────────────────────
// Field completeness checks
// ──────────────────────────────────────────────

function isFieldComplete(
  profile: CandidateProfile,
  field: string,
): boolean {
  switch (field) {
    case "fullName":
      return !!profile.fullName && profile.fullName.trim().length > 0;
    case "photoUrl":
      return !!profile.photoUrl;
    case "bio":
      return !!profile.bio && profile.bio.trim().length > 0;
    case "city":
      return !!profile.city && profile.city.trim().length > 0;
    case "country":
      return !!profile.country && profile.country.trim().length > 0;
    case "candidateSkills":
      return Array.isArray(profile.candidateSkills) && profile.candidateSkills.length >= 3;
    case "primaryTrackId":
      return !!profile.primaryTrackId;
    case "githubUrl":
      return !!profile.githubUrl;
    case "linkedinUrl":
      return !!profile.linkedinUrl;
    case "portfolioUrl":
      return !!profile.portfolioUrl;
    case "availabilityStatus":
      return !!profile.availabilityStatus;
    case "preferredWorkMode":
      return !!profile.preferredWorkMode;
    case "yearsOfExperience":
      return profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined;
    case "candidateProjects":
      return Array.isArray(profile.candidateProjects) && profile.candidateProjects.length >= 1;
    case "candidateConsents":
      return (
        Array.isArray(profile.candidateConsents) &&
        profile.candidateConsents.length > 0 &&
        profile.candidateConsents.every((c) => c.granted)
      );
    default:
      return false;
  }
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export interface ProfileStrengthResult {
  strength: number;
  maxScore: 100;
  missingFields: string[];
}

export function useProfileStrength(
  profile: CandidateProfile | null | undefined,
): ProfileStrengthResult {
  return useMemo(() => {
    if (!profile) {
      return {
        strength: 0,
        maxScore: 100 as const,
        missingFields: Object.values(PROFILE_FIELDS).map((f) => f.label),
      };
    }

    let strength = 0;
    const missingFields: string[] = [];

    for (const [field, config] of Object.entries(PROFILE_FIELDS)) {
      if (isFieldComplete(profile, field)) {
        strength += config.weight;
      } else {
        missingFields.push(config.label);
      }
    }

    return {
      strength: Math.round(strength * 10) / 10,
      maxScore: 100 as const,
      missingFields,
    };
  }, [profile]);
}
