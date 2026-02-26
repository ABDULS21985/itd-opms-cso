import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { EmployerOrg } from '../../employers/entities/employer-org.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { JobSkill } from '../../jobs/entities/job-skill.entity';
import { PlacementRecord } from '../../placements/entities/placement-record.entity';
import { IntroRequest } from '../../intro-requests/entities/intro-request.entity';
import {
  ProfileApprovalStatus,
  EmployerVerificationStatus,
  JobStatus,
  PlacementStatus,
  IntroRequestStatus,
} from '../../../common/constants/status.constant';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(CandidateProfile)
    private readonly candidateRepo: Repository<CandidateProfile>,
    @InjectRepository(EmployerOrg)
    private readonly employerRepo: Repository<EmployerOrg>,
    @InjectRepository(JobPost)
    private readonly jobRepo: Repository<JobPost>,
    @InjectRepository(PlacementRecord)
    private readonly placementRepo: Repository<PlacementRecord>,
    @InjectRepository(IntroRequest)
    private readonly introRequestRepo: Repository<IntroRequest>,
    @InjectRepository(JobSkill)
    private readonly jobSkillRepo: Repository<JobSkill>,
  ) {}

  async getOverview() {
    const [
      totalCandidates,
      approvedCandidates,
      totalEmployers,
      verifiedEmployers,
      totalJobs,
      publishedJobs,
      totalPlacements,
      activePlacements,
      totalIntroRequests,
    ] = await Promise.all([
      this.candidateRepo.count(),
      this.candidateRepo.count({
        where: { approvalStatus: ProfileApprovalStatus.APPROVED },
      }),
      this.employerRepo.count(),
      this.employerRepo.count({
        where: { verificationStatus: EmployerVerificationStatus.VERIFIED },
      }),
      this.jobRepo.count(),
      this.jobRepo.count({ where: { status: JobStatus.PUBLISHED } }),
      this.placementRepo.count(),
      this.placementRepo.count({
        where: { status: PlacementStatus.PLACED },
      }),
      this.introRequestRepo.count(),
    ]);

    return {
      candidates: { total: totalCandidates, approved: approvedCandidates },
      employers: { total: totalEmployers, verified: verifiedEmployers },
      jobs: { total: totalJobs, published: publishedJobs },
      placements: { total: totalPlacements, active: activePlacements },
      introRequests: { total: totalIntroRequests },
    };
  }

  async getCandidatesByTrack() {
    return this.candidateRepo
      .createQueryBuilder('cp')
      .select('cp.primaryTrackId', 'trackId')
      .addSelect('COUNT(cp.id)', 'count')
      .groupBy('cp.primaryTrackId')
      .getRawMany();
  }

  async getCandidatesByStatus() {
    return this.candidateRepo
      .createQueryBuilder('cp')
      .select('cp.approvalStatus', 'status')
      .addSelect('COUNT(cp.id)', 'count')
      .groupBy('cp.approvalStatus')
      .getRawMany();
  }

  async getPlacementsByStatus() {
    return this.placementRepo
      .createQueryBuilder('pr')
      .select('pr.status', 'status')
      .addSelect('COUNT(pr.id)', 'count')
      .groupBy('pr.status')
      .getRawMany();
  }

  async getJobsByStatus() {
    return this.jobRepo
      .createQueryBuilder('jp')
      .select('jp.status', 'status')
      .addSelect('COUNT(jp.id)', 'count')
      .groupBy('jp.status')
      .getRawMany();
  }

  // ──────────────────────────────────────────────
  // Employer engagement KPIs
  // ──────────────────────────────────────────────

  async getEmployerReport() {
    const [
      totalEmployers,
      verifiedEmployers,
      pendingEmployers,
      bySector,
      totalJobsPosted,
      totalIntroRequests,
    ] = await Promise.all([
      this.employerRepo.count(),
      this.employerRepo.count({
        where: { verificationStatus: EmployerVerificationStatus.VERIFIED },
      }),
      this.employerRepo.count({
        where: { verificationStatus: EmployerVerificationStatus.PENDING },
      }),
      this.employerRepo
        .createQueryBuilder('eo')
        .select('eo.sector', 'sector')
        .addSelect('COUNT(eo.id)', 'count')
        .where('eo.sector IS NOT NULL')
        .groupBy('eo.sector')
        .orderBy('count', 'DESC')
        .getRawMany(),
      this.jobRepo.count(),
      this.introRequestRepo.count(),
    ]);

    return {
      totalEmployers,
      verifiedEmployers,
      pendingEmployers,
      bySector,
      totalJobsPosted,
      totalIntroRequests,
    };
  }

  // ──────────────────────────────────────────────
  // Time metrics: time-to-intro, time-to-placement
  // ──────────────────────────────────────────────

  async getTimeMetrics() {
    // Average time from intro request creation to first candidate response
    const avgTimeToResponseResult = await this.introRequestRepo
      .createQueryBuilder('ir')
      .select(
        'AVG(EXTRACT(EPOCH FROM (ir.candidate_responded_at - ir.created_at)))',
        'avgSecondsToResponse',
      )
      .where('ir.candidate_responded_at IS NOT NULL')
      .getRawOne();

    const avgSecondsToResponse = parseFloat(
      avgTimeToResponseResult?.avgSecondsToResponse || '0',
    );
    const avgDaysToResponse = avgSecondsToResponse > 0
      ? Math.round((avgSecondsToResponse / 86400) * 100) / 100
      : 0;

    // Average time from intro request to placement (placed_date)
    const avgTimeToPlacementResult = await this.placementRepo
      .createQueryBuilder('pr')
      .innerJoin('pr.introRequest', 'ir')
      .select(
        'AVG(EXTRACT(EPOCH FROM (pr.placed_date - ir.created_at)))',
        'avgSecondsToPlacement',
      )
      .where('pr.placed_date IS NOT NULL')
      .andWhere('pr.status = :status', { status: PlacementStatus.PLACED })
      .getRawOne();

    const avgSecondsToPlacement = parseFloat(
      avgTimeToPlacementResult?.avgSecondsToPlacement || '0',
    );
    const avgDaysToPlacement = avgSecondsToPlacement > 0
      ? Math.round((avgSecondsToPlacement / 86400) * 100) / 100
      : 0;

    // Average time from intro to interview
    const avgTimeToInterviewResult = await this.placementRepo
      .createQueryBuilder('pr')
      .select(
        'AVG(EXTRACT(EPOCH FROM (pr.interview_date - pr.intro_date)))',
        'avgSecondsToInterview',
      )
      .where('pr.interview_date IS NOT NULL')
      .andWhere('pr.intro_date IS NOT NULL')
      .getRawOne();

    const avgSecondsToInterview = parseFloat(
      avgTimeToInterviewResult?.avgSecondsToInterview || '0',
    );
    const avgDaysToInterview = avgSecondsToInterview > 0
      ? Math.round((avgSecondsToInterview / 86400) * 100) / 100
      : 0;

    // Total intro requests by status for funnel analysis
    const introsByStatus = await this.introRequestRepo
      .createQueryBuilder('ir')
      .select('ir.status', 'status')
      .addSelect('COUNT(ir.id)', 'count')
      .groupBy('ir.status')
      .getRawMany();

    return {
      avgDaysToResponse,
      avgDaysToPlacement,
      avgDaysToInterview,
      introsByStatus,
    };
  }

  // ──────────────────────────────────────────────
  // Skills demand: most demanded skills from job postings
  // ──────────────────────────────────────────────

  async getSkillsDemand(limit: number = 20) {
    const skillsDemand = await this.jobSkillRepo
      .createQueryBuilder('js')
      .innerJoin('js.skill', 'skill')
      .select('skill.id', 'skillId')
      .addSelect('skill.name', 'skillName')
      .addSelect('skill.category', 'category')
      .addSelect('COUNT(js.id)', 'demandCount')
      .addSelect(
        'SUM(CASE WHEN js.is_required = true THEN 1 ELSE 0 END)',
        'requiredCount',
      )
      .addSelect(
        'SUM(CASE WHEN js.is_required = false THEN 1 ELSE 0 END)',
        'niceToHaveCount',
      )
      .groupBy('skill.id')
      .addGroupBy('skill.name')
      .addGroupBy('skill.category')
      .orderBy('COUNT(js.id)', 'DESC')
      .limit(limit)
      .getRawMany();

    return skillsDemand.map((row) => ({
      skillId: row.skillId,
      skillName: row.skillName,
      category: row.category,
      demandCount: parseInt(row.demandCount, 10),
      requiredCount: parseInt(row.requiredCount, 10),
      niceToHaveCount: parseInt(row.niceToHaveCount, 10),
    }));
  }
}
