import { Injectable } from '@nestjs/common';
import {
  AvailabilityStatus,
  ExperienceLevel,
  WorkMode,
} from '../../../common/constants/status.constant';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { EmployerOrg } from '../../employers/entities/employer-org.entity';
import {
  MatchExplanation,
  SkillsDimensionScore,
  ExperienceDimensionScore,
  WorkModeDimensionScore,
  LocationDimensionScore,
  AvailabilityDimensionScore,
  ProfileStrengthDimensionScore,
  TrackAlignmentDimensionScore,
} from '../entities/match-recommendation.entity';

// Scoring weights (must sum to 100)
const WEIGHTS = {
  skills: 35,
  experience: 20,
  workMode: 15,
  location: 10,
  availability: 10,
  profileStrength: 5,
  trackAlignment: 5,
} as const;

// Experience level numeric mapping
const EXPERIENCE_LEVEL_MAP: Record<ExperienceLevel, number> = {
  [ExperienceLevel.ENTRY]: 0,
  [ExperienceLevel.MID]: 1,
  [ExperienceLevel.SENIOR]: 2,
};

// Candidate years → experience level
function yearsToLevel(years: number | null): ExperienceLevel {
  if (years === null || years === undefined) return ExperienceLevel.ENTRY;
  if (years <= 2) return ExperienceLevel.ENTRY;
  if (years <= 5) return ExperienceLevel.MID;
  return ExperienceLevel.SENIOR;
}

@Injectable()
export class MatchingScoringService {
  /**
   * Core method: score a candidate against a job post.
   * Both candidate and job must have their relations loaded (skills, employer, tracks).
   */
  scoreCandidate(
    candidate: CandidateProfile,
    job: JobPost,
    employer: EmployerOrg | null,
  ): MatchExplanation {
    const candidateSkillIds = (candidate.candidateSkills || [])
      .map((cs) => cs.skillId || cs.skill?.id)
      .filter((id): id is string => !!id);

    const candidateSkillNames = (candidate.candidateSkills || [])
      .map((cs) => cs.skill?.name || cs.customTagName)
      .filter((n): n is string => !!n);

    const jobRequiredSkills = (job.jobSkills || []).filter((js) => js.isRequired);
    const jobOptionalSkills = (job.jobSkills || []).filter((js) => !js.isRequired);

    const jobRequiredSkillIds = jobRequiredSkills
      .map((js) => js.skillId)
      .filter((id): id is string => !!id);
    const jobOptionalSkillIds = jobOptionalSkills
      .map((js) => js.skillId)
      .filter((id): id is string => !!id);

    const jobRequiredSkillNames = jobRequiredSkills
      .map((js) => js.skill?.name)
      .filter((n): n is string => !!n);
    const jobOptionalSkillNames = jobOptionalSkills
      .map((js) => js.skill?.name)
      .filter((n): n is string => !!n);

    const candidateTrackIds = [
      candidate.primaryTrackId,
      ...(candidate.tracks || []).map((t) => t.id),
    ].filter((id): id is string => !!id);

    const skills = this.scoreSkillsMatch(
      candidateSkillIds,
      candidateSkillNames,
      jobRequiredSkillIds,
      jobRequiredSkillNames,
      jobOptionalSkillIds,
      jobOptionalSkillNames,
    );

    const experience = this.scoreExperienceMatch(
      candidate.yearsOfExperience,
      job.experienceLevel,
    );

    const workMode = this.scoreWorkModeMatch(
      candidate.preferredWorkMode,
      job.workMode,
    );

    const location = this.scoreLocationMatch(
      candidate.country,
      candidate.city,
      job.location,
      job.workMode,
    );

    const availability = this.scoreAvailability(candidate.availabilityStatus);

    const profileStrength = this.scoreProfileStrength(candidate.profileStrength);

    const trackAlignment = this.scoreTrackAlignment(
      candidateTrackIds,
      employer?.hiringTracks || null,
    );

    const overallScore = Math.round(
      skills.score * (skills.weight / 100) +
      experience.score * (experience.weight / 100) +
      workMode.score * (workMode.weight / 100) +
      location.score * (location.weight / 100) +
      availability.score * (availability.weight / 100) +
      profileStrength.score * (profileStrength.weight / 100) +
      trackAlignment.score * (trackAlignment.weight / 100),
    );

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      dimensions: {
        skills,
        experience,
        workMode,
        location,
        availability,
        profileStrength,
        trackAlignment,
      },
      computedAt: new Date().toISOString(),
    };
  }

  scoreSkillsMatch(
    candidateSkillIds: string[],
    candidateSkillNames: string[],
    jobRequiredSkillIds: string[],
    jobRequiredSkillNames: string[],
    jobOptionalSkillIds: string[],
    jobOptionalSkillNames: string[],
  ): SkillsDimensionScore {
    // If the job has no required skills, give full score
    if (jobRequiredSkillIds.length === 0 && jobOptionalSkillIds.length === 0) {
      return {
        score: 100,
        weight: WEIGHTS.skills,
        matchedRequired: [],
        matchedOptional: [],
        missingRequired: [],
      };
    }

    const candidateSkillSet = new Set(candidateSkillIds);

    // Required skills matching
    const matchedRequiredIds = jobRequiredSkillIds.filter((id) => candidateSkillSet.has(id));
    const missingRequiredIds = jobRequiredSkillIds.filter((id) => !candidateSkillSet.has(id));

    const matchedRequired = matchedRequiredIds.map((id) => {
      const idx = jobRequiredSkillIds.indexOf(id);
      return jobRequiredSkillNames[idx] || id;
    });
    const missingRequired = missingRequiredIds.map((id) => {
      const idx = jobRequiredSkillIds.indexOf(id);
      return jobRequiredSkillNames[idx] || id;
    });

    // Optional skills matching
    const matchedOptionalIds = jobOptionalSkillIds.filter((id) => candidateSkillSet.has(id));
    const matchedOptional = matchedOptionalIds.map((id) => {
      const idx = jobOptionalSkillIds.indexOf(id);
      return jobOptionalSkillNames[idx] || id;
    });

    // Calculate score:
    // Required skills = 80% of the skills score, Optional = 20%
    let requiredScore = 0;
    if (jobRequiredSkillIds.length > 0) {
      requiredScore = (matchedRequiredIds.length / jobRequiredSkillIds.length) * 100;
    } else {
      requiredScore = 100; // No requirements = full score for required portion
    }

    let optionalScore = 0;
    if (jobOptionalSkillIds.length > 0) {
      optionalScore = (matchedOptionalIds.length / jobOptionalSkillIds.length) * 100;
    } else {
      optionalScore = 100;
    }

    const score = Math.round(requiredScore * 0.8 + optionalScore * 0.2);

    return {
      score,
      weight: WEIGHTS.skills,
      matchedRequired,
      matchedOptional,
      missingRequired,
    };
  }

  scoreExperienceMatch(
    candidateYears: number | null,
    jobLevel: ExperienceLevel | null,
  ): ExperienceDimensionScore {
    const candidateLevel = yearsToLevel(candidateYears);

    // If the job doesn't specify experience, full score
    if (!jobLevel) {
      return {
        score: 100,
        weight: WEIGHTS.experience,
        candidateLevel,
        jobLevel: 'any',
      };
    }

    const candidateRank = EXPERIENCE_LEVEL_MAP[candidateLevel];
    const jobRank = EXPERIENCE_LEVEL_MAP[jobLevel];
    const diff = Math.abs(candidateRank - jobRank);

    let score: number;
    if (diff === 0) {
      score = 100;
    } else if (diff === 1) {
      score = 50;
    } else {
      score = 10;
    }

    return {
      score,
      weight: WEIGHTS.experience,
      candidateLevel,
      jobLevel,
    };
  }

  scoreWorkModeMatch(
    candidateMode: WorkMode | null,
    jobMode: WorkMode,
  ): WorkModeDimensionScore {
    // If candidate hasn't set preference, partial match
    if (!candidateMode) {
      return {
        score: 50,
        weight: WEIGHTS.workMode,
        candidateMode: 'not_set',
        jobMode,
      };
    }

    let score: number;
    if (candidateMode === jobMode) {
      score = 100;
    } else if (candidateMode === WorkMode.HYBRID || jobMode === WorkMode.HYBRID) {
      // HYBRID is compatible with both REMOTE and ON_SITE at 60%
      score = 60;
    } else {
      // REMOTE vs ON_SITE - low compatibility
      score = 20;
    }

    return {
      score,
      weight: WEIGHTS.workMode,
      candidateMode,
      jobMode,
    };
  }

  scoreLocationMatch(
    candidateCountry: string | null,
    candidateCity: string | null,
    jobLocation: string | null,
    jobWorkMode: WorkMode,
  ): LocationDimensionScore {
    // Remote jobs get full score regardless of location
    if (jobWorkMode === WorkMode.REMOTE) {
      return {
        score: 100,
        weight: WEIGHTS.location,
        reason: 'Remote job - location not relevant',
      };
    }

    // If job has no location, full score
    if (!jobLocation) {
      return {
        score: 100,
        weight: WEIGHTS.location,
        reason: 'Job has no location requirement',
      };
    }

    // If candidate has no location, partial score
    if (!candidateCountry && !candidateCity) {
      return {
        score: 30,
        weight: WEIGHTS.location,
        reason: 'Candidate location unknown',
      };
    }

    const jobLocationLower = jobLocation.toLowerCase();
    const candidateCountryLower = (candidateCountry || '').toLowerCase();
    const candidateCityLower = (candidateCity || '').toLowerCase();

    // Check city match first
    if (candidateCityLower && jobLocationLower.includes(candidateCityLower)) {
      return {
        score: 100,
        weight: WEIGHTS.location,
        reason: `City match: ${candidateCity}`,
      };
    }

    // Check country match
    if (candidateCountryLower && jobLocationLower.includes(candidateCountryLower)) {
      return {
        score: 80,
        weight: WEIGHTS.location,
        reason: `Country match: ${candidateCountry}`,
      };
    }

    // Check if job location contains candidate's country or vice versa
    if (candidateCountryLower && candidateCountryLower.includes(jobLocationLower)) {
      return {
        score: 80,
        weight: WEIGHTS.location,
        reason: `Country match: ${candidateCountry}`,
      };
    }

    return {
      score: 20,
      weight: WEIGHTS.location,
      reason: `No location match: candidate in ${candidateCity || candidateCountry}, job in ${jobLocation}`,
    };
  }

  scoreAvailability(
    status: AvailabilityStatus | null,
  ): AvailabilityDimensionScore {
    if (!status) {
      return {
        score: 40,
        weight: WEIGHTS.availability,
        status: 'not_set',
      };
    }

    const scoreMap: Record<AvailabilityStatus, number> = {
      [AvailabilityStatus.IMMEDIATE]: 100,
      [AvailabilityStatus.ONE_MONTH]: 70,
      [AvailabilityStatus.TWO_THREE_MONTHS]: 40,
      [AvailabilityStatus.NOT_AVAILABLE]: 0,
      [AvailabilityStatus.PLACED]: 0,
    };

    return {
      score: scoreMap[status],
      weight: WEIGHTS.availability,
      status,
    };
  }

  scoreProfileStrength(strength: number): ProfileStrengthDimensionScore {
    // Map 0-100 profile strength directly to score
    return {
      score: strength || 0,
      weight: WEIGHTS.profileStrength,
      strength: strength || 0,
    };
  }

  scoreTrackAlignment(
    candidateTrackIds: string[],
    employerHiringTracks: string[] | null,
  ): TrackAlignmentDimensionScore {
    // If employer hasn't specified hiring tracks, full score
    if (!employerHiringTracks || employerHiringTracks.length === 0) {
      return {
        score: 100,
        weight: WEIGHTS.trackAlignment,
        matched: true,
      };
    }

    // Check if any candidate track matches employer's hiring tracks
    const employerTrackSet = new Set(
      employerHiringTracks.map((t) => t.toLowerCase()),
    );
    const matched = candidateTrackIds.some((id) =>
      employerTrackSet.has(id.toLowerCase()),
    );

    return {
      score: matched ? 100 : 0,
      weight: WEIGHTS.trackAlignment,
      matched,
    };
  }
}
