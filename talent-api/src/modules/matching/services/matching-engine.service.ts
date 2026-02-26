import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MatchRecommendation } from '../entities/match-recommendation.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { EmployerOrg } from '../../employers/entities/employer-org.entity';
import { MatchingScoringService } from './matching-scoring.service';
import {
  JobStatus,
  ProfileApprovalStatus,
  ProfileVisibility,
} from '../../../common/constants/status.constant';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';
import { PaginationDto, PaginationMeta } from '../../../common/dto/pagination.dto';
import { MatchQueryDto } from '../dto/match-query.dto';

@Injectable()
export class MatchingEngineService {
  private readonly logger = new Logger(MatchingEngineService.name);

  constructor(
    @InjectRepository(MatchRecommendation)
    private readonly matchRepo: Repository<MatchRecommendation>,
    @InjectRepository(CandidateProfile)
    private readonly candidateRepo: Repository<CandidateProfile>,
    @InjectRepository(JobPost)
    private readonly jobRepo: Repository<JobPost>,
    @InjectRepository(EmployerOrg)
    private readonly employerRepo: Repository<EmployerOrg>,
    private readonly scoringService: MatchingScoringService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Score all eligible candidates against a specific job.
   */
  async computeMatchesForJob(jobId: string): Promise<number> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId, status: JobStatus.PUBLISHED },
      relations: ['jobSkills', 'jobSkills.skill', 'employer'],
    });
    if (!job) return 0;

    const employer = await this.employerRepo.findOne({
      where: { id: job.employerId },
    });

    const candidates = await this.candidateRepo.find({
      where: {
        approvalStatus: ProfileApprovalStatus.APPROVED,
        visibilityLevel: In([ProfileVisibility.PUBLIC, ProfileVisibility.EMPLOYER_ONLY]),
      },
      relations: ['candidateSkills', 'candidateSkills.skill', 'primaryTrack', 'tracks'],
    });

    let count = 0;
    for (const candidate of candidates) {
      const explanation = this.scoringService.scoreCandidate(candidate, job, employer);

      await this.matchRepo.upsert(
        {
          candidateId: candidate.id,
          jobId: job.id,
          employerId: job.employerId,
          overallScore: explanation.overallScore,
          explanation,
          isDismissed: false,
        },
        {
          conflictPaths: ['candidateId', 'jobId'],
        },
      );
      count++;
    }

    this.logger.log(`Computed ${count} matches for job ${jobId}`);

    // Notify candidates about high-score matches
    const topMatches = await this.matchRepo.find({
      where: { jobId, overallScore: 70 },
      relations: ['candidate'],
      take: 20,
    });

    for (const match of topMatches) {
      if (match.overallScore >= 70 && match.candidate) {
        this.eventEmitter.emit(NOTIFICATION_EVENTS.JOB_MATCH_FOUND, {
          userId: match.candidate.userId,
          jobTitle: job.title,
          matchScore: match.overallScore,
          jobSlug: job.slug,
        });
      }
    }

    return count;
  }

  /**
   * Score all published jobs against a specific candidate.
   */
  async computeMatchesForCandidate(candidateId: string): Promise<number> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ['candidateSkills', 'candidateSkills.skill', 'primaryTrack', 'tracks'],
    });
    if (!candidate) return 0;

    const jobs = await this.jobRepo.find({
      where: { status: JobStatus.PUBLISHED },
      relations: ['jobSkills', 'jobSkills.skill', 'employer'],
    });

    let count = 0;
    for (const job of jobs) {
      const employer = job.employer || null;
      const explanation = this.scoringService.scoreCandidate(candidate, job, employer);

      await this.matchRepo.upsert(
        {
          candidateId: candidate.id,
          jobId: job.id,
          employerId: job.employerId,
          overallScore: explanation.overallScore,
          explanation,
          isDismissed: false,
        },
        {
          conflictPaths: ['candidateId', 'jobId'],
        },
      );
      count++;
    }

    this.logger.log(`Computed ${count} matches for candidate ${candidateId}`);
    return count;
  }

  /**
   * Nightly batch: recompute all matches for published jobs × approved candidates.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async batchRecomputeMatches(): Promise<void> {
    this.logger.log('Starting nightly batch match recomputation...');

    const jobs = await this.jobRepo.find({
      where: { status: JobStatus.PUBLISHED },
      select: ['id'],
    });

    let totalMatches = 0;
    for (const job of jobs) {
      const count = await this.computeMatchesForJob(job.id);
      totalMatches += count;
    }

    // Clean up stale recommendations for closed/archived jobs
    await this.matchRepo
      .createQueryBuilder()
      .delete()
      .where(
        'job_id IN (SELECT id FROM job_posts WHERE status NOT IN (:...statuses))',
        { statuses: [JobStatus.PUBLISHED] },
      )
      .execute();

    this.logger.log(`Nightly batch complete: ${totalMatches} total matches computed`);
  }

  /**
   * Manual trigger for full recomputation (admin endpoint).
   */
  async recomputeAllMatches(): Promise<{ jobsProcessed: number; totalMatches: number }> {
    const jobs = await this.jobRepo.find({
      where: { status: JobStatus.PUBLISHED },
      select: ['id'],
    });

    let totalMatches = 0;
    for (const job of jobs) {
      const count = await this.computeMatchesForJob(job.id);
      totalMatches += count;
    }

    return { jobsProcessed: jobs.length, totalMatches };
  }

  /**
   * Event listener: recompute matches when a job is published.
   */
  @OnEvent(NOTIFICATION_EVENTS.JOB_PUBLISHED)
  async onJobPublished(event: { userId: string; jobTitle: string; jobId?: string }): Promise<void> {
    if (!event.jobId) {
      // Find by title if jobId not in event payload
      const job = await this.jobRepo.findOne({
        where: { status: JobStatus.PUBLISHED },
        order: { publishedAt: 'DESC' },
      });
      if (job) {
        await this.computeMatchesForJob(job.id);
      }
      return;
    }
    await this.computeMatchesForJob(event.jobId);
  }

  /**
   * Event listener: recompute matches when a candidate profile is approved.
   */
  @OnEvent(NOTIFICATION_EVENTS.PROFILE_APPROVED)
  async onProfileApproved(event: { userId: string; candidateId?: string }): Promise<void> {
    // Find the candidate by userId
    const candidate = await this.candidateRepo.findOne({
      where: { userId: event.userId },
    });
    if (candidate) {
      await this.computeMatchesForCandidate(candidate.id);
    }
  }

  // ────────────────────────────────────────
  // Query Methods
  // ────────────────────────────────────────

  /**
   * Get recommended candidates for a specific job.
   */
  async getRecommendedCandidatesForJob(
    jobId: string,
    query: MatchQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const minScore = query.minScore || 0;

    const qb = this.matchRepo
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.candidate', 'candidate')
      .leftJoinAndSelect('candidate.candidateSkills', 'candidateSkills')
      .leftJoinAndSelect('candidateSkills.skill', 'skill')
      .leftJoinAndSelect('candidate.primaryTrack', 'primaryTrack')
      .where('mr.jobId = :jobId', { jobId })
      .andWhere('mr.overallScore >= :minScore', { minScore })
      .andWhere('mr.isDismissed = false')
      .orderBy('mr.overallScore', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map((item) => this.formatCandidateRecommendation(item)),
      meta: new PaginationMeta(total, page, limit),
    };
  }

  /**
   * Get recommended candidates across all of an employer's published jobs.
   */
  async getRecommendedCandidatesForEmployer(
    employerId: string,
    query: MatchQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const minScore = query.minScore || 0;

    // Get best score per candidate across all employer's jobs
    const qb = this.matchRepo
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.candidate', 'candidate')
      .leftJoinAndSelect('candidate.candidateSkills', 'candidateSkills')
      .leftJoinAndSelect('candidateSkills.skill', 'skill')
      .leftJoinAndSelect('candidate.primaryTrack', 'primaryTrack')
      .leftJoinAndSelect('mr.job', 'job')
      .where('mr.employerId = :employerId', { employerId })
      .andWhere('mr.overallScore >= :minScore', { minScore })
      .andWhere('mr.isDismissed = false')
      .orderBy('mr.overallScore', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map((item) => this.formatCandidateRecommendation(item)),
      meta: new PaginationMeta(total, page, limit),
    };
  }

  /**
   * Get recommended jobs for a candidate.
   */
  async getRecommendedJobsForCandidate(
    candidateId: string,
    query: MatchQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const minScore = query.minScore || 0;

    const qb = this.matchRepo
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.job', 'job')
      .leftJoinAndSelect('job.employer', 'employer')
      .leftJoinAndSelect('job.jobSkills', 'jobSkills')
      .leftJoinAndSelect('jobSkills.skill', 'skill')
      .where('mr.candidateId = :candidateId', { candidateId })
      .andWhere('mr.overallScore >= :minScore', { minScore })
      .andWhere('mr.isDismissed = false')
      .andWhere('job.status = :status', { status: JobStatus.PUBLISHED })
      .orderBy('mr.overallScore', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map((item) => this.formatJobRecommendation(item)),
      meta: new PaginationMeta(total, page, limit),
    };
  }

  /**
   * Dismiss a recommendation.
   */
  async dismissRecommendation(id: string): Promise<void> {
    const rec = await this.matchRepo.findOne({ where: { id } });
    if (!rec) {
      throw new NotFoundException(`Recommendation ${id} not found`);
    }
    rec.isDismissed = true;
    await this.matchRepo.save(rec);
  }

  /**
   * Get on-demand match explanation between a candidate and a job.
   */
  async getMatchExplanation(candidateId: string, jobId: string) {
    // Check for existing recommendation
    const existing = await this.matchRepo.findOne({
      where: { candidateId, jobId },
    });
    if (existing) {
      return existing.explanation;
    }

    // Compute on the fly
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ['candidateSkills', 'candidateSkills.skill', 'primaryTrack', 'tracks'],
    });
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['jobSkills', 'jobSkills.skill', 'employer'],
    });

    if (!candidate || !job) {
      throw new NotFoundException('Candidate or job not found');
    }

    const employer = job.employer || null;
    return this.scoringService.scoreCandidate(candidate, job, employer);
  }

  /**
   * Get match statistics for admin dashboard.
   */
  async getMatchStats() {
    const totalMatches = await this.matchRepo.count();

    const avgResult = await this.matchRepo
      .createQueryBuilder('mr')
      .select('AVG(mr.overallScore)', 'avg')
      .getRawOne();

    const highCount = await this.matchRepo.count({
      where: { isDismissed: false },
    });

    // Score distribution
    const distribution = await this.matchRepo
      .createQueryBuilder('mr')
      .select([
        'SUM(CASE WHEN mr.overall_score >= 70 THEN 1 ELSE 0 END) as high',
        'SUM(CASE WHEN mr.overall_score >= 40 AND mr.overall_score < 70 THEN 1 ELSE 0 END) as medium',
        'SUM(CASE WHEN mr.overall_score < 40 THEN 1 ELSE 0 END) as low',
      ])
      .getRawOne();

    const lastComputed = await this.matchRepo
      .createQueryBuilder('mr')
      .select('MAX(mr.updatedAt)', 'lastComputed')
      .getRawOne();

    return {
      totalMatches,
      averageScore: Math.round(parseFloat(avgResult?.avg || '0')),
      scoreDistribution: {
        high: parseInt(distribution?.high || '0', 10),
        medium: parseInt(distribution?.medium || '0', 10),
        low: parseInt(distribution?.low || '0', 10),
      },
      lastComputedAt: lastComputed?.lastComputed || null,
    };
  }

  // ────────────────────────────────────────
  // Formatting helpers
  // ────────────────────────────────────────

  private formatCandidateRecommendation(rec: MatchRecommendation) {
    const candidate = rec.candidate;
    return {
      id: rec.id,
      overallScore: rec.overallScore,
      explanation: rec.explanation,
      computedAt: rec.updatedAt,
      isDismissed: rec.isDismissed,
      jobId: rec.jobId,
      job: rec.job
        ? {
            id: rec.job.id,
            title: rec.job.title,
            slug: rec.job.slug,
          }
        : undefined,
      candidate: candidate
        ? {
            id: candidate.id,
            fullName: candidate.fullName,
            slug: candidate.slug,
            photoUrl: candidate.photoUrl,
            primaryTrack: candidate.primaryTrack
              ? { id: candidate.primaryTrack.id, name: candidate.primaryTrack.name }
              : null,
            yearsOfExperience: candidate.yearsOfExperience,
            availabilityStatus: candidate.availabilityStatus,
            preferredWorkMode: candidate.preferredWorkMode,
            city: candidate.city,
            country: candidate.country,
            skills: (candidate.candidateSkills || [])
              .map((cs) => cs.skill)
              .filter((s) => !!s)
              .map((s) => ({ id: s.id, name: s.name })),
          }
        : undefined,
    };
  }

  private formatJobRecommendation(rec: MatchRecommendation) {
    const job = rec.job;
    return {
      id: rec.id,
      overallScore: rec.overallScore,
      explanation: rec.explanation,
      computedAt: rec.updatedAt,
      isDismissed: rec.isDismissed,
      job: job
        ? {
            id: job.id,
            title: job.title,
            slug: job.slug,
            jobType: job.jobType,
            workMode: job.workMode,
            location: job.location,
            experienceLevel: job.experienceLevel,
            employer: job.employer
              ? {
                  id: job.employer.id,
                  companyName: job.employer.companyName,
                  logoUrl: job.employer.logoUrl,
                }
              : undefined,
            skills: (job.jobSkills || [])
              .map((js) => js.skill)
              .filter((s) => !!s)
              .map((s) => ({ id: s.id, name: s.name, isRequired: true })),
          }
        : undefined,
    };
  }
}
