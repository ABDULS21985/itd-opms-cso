import { MatchExplanation } from '../entities/match-recommendation.entity';

export class MatchRecommendationResponseDto {
  id!: string;
  overallScore!: number;
  explanation!: MatchExplanation;
  computedAt!: Date;
  isDismissed!: boolean;

  // For employer view - candidate info
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

  // For candidate view - job info
  job?: {
    id: string;
    title: string;
    slug: string;
    jobType: string;
    workMode: string;
    location: string | null;
    experienceLevel: string | null;
    employer: {
      id: string;
      companyName: string;
      logoUrl: string | null;
    };
  };
}

export class MatchStatsResponseDto {
  totalMatches!: number;
  averageScore!: number;
  scoreDistribution!: {
    high: number;   // 70-100
    medium: number; // 40-69
    low: number;    // 0-39
  };
  lastComputedAt!: string | null;
}
