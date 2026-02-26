import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { EmployerOrg } from '../../employers/entities/employer-org.entity';

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

@Entity('match_recommendations')
@Unique(['candidateId', 'jobId'])
export class MatchRecommendation extends BaseEntity {
  @Column({ name: 'candidate_id' })
  @Index()
  candidateId!: string;

  @Column({ name: 'job_id' })
  @Index()
  jobId!: string;

  @Column({ name: 'employer_id' })
  @Index()
  employerId!: string;

  @Column({ name: 'overall_score', type: 'int', default: 0 })
  @Index()
  overallScore!: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  explanation!: MatchExplanation;

  @Column({ name: 'is_dismissed', type: 'boolean', default: false })
  isDismissed!: boolean;

  @ManyToOne(() => CandidateProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;

  @ManyToOne(() => JobPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: JobPost;

  @ManyToOne(() => EmployerOrg, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;
}
