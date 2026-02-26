import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HiringPipeline } from '../entities/hiring-pipeline.entity';
import { PipelineCandidate } from '../entities/pipeline-candidate.entity';
import { Interview } from '../entities/interview.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { JobApplication } from '../../jobs/entities/job-application.entity';
import { InterviewStatus } from '../../../common/constants/status.constant';

export interface EmployerAnalyticsData {
  overview: {
    totalPipelines: number;
    totalCandidatesInPipeline: number;
    totalInterviews: number;
    totalPlacements: number;
    activeJobs: number;
    totalApplications: number;
  };
  hiringVelocity: {
    month: string;
    placements: number;
    interviews: number;
  }[];
  pipelineConversion: {
    stageName: string;
    count: number;
    percentage: number;
  }[];
  avgTimeToHire: number | null;
  jobPerformance: {
    jobId: string;
    title: string;
    views: number;
    applications: number;
    conversionRate: number;
  }[];
  platformComparison: {
    avgTimeToHire: number;
    avgApplicationsPerJob: number;
    avgInterviewsPerHire: number;
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(HiringPipeline)
    private readonly pipelineRepo: Repository<HiringPipeline>,
    @InjectRepository(PipelineCandidate)
    private readonly pipelineCandidateRepo: Repository<PipelineCandidate>,
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @InjectRepository(JobPost)
    private readonly jobRepo: Repository<JobPost>,
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
  ) {}

  async getEmployerAnalytics(employerId: string): Promise<EmployerAnalyticsData> {
    // Overview counts
    const [totalPipelines, totalCandidatesInPipeline, totalInterviews, activeJobs, totalApplications] =
      await Promise.all([
        this.pipelineRepo.count({ where: { employerId } }),
        this.pipelineCandidateRepo
          .createQueryBuilder('pc')
          .innerJoin('pc.pipeline', 'p')
          .where('p.employer_id = :employerId', { employerId })
          .getCount(),
        this.interviewRepo.count({ where: { employerId } }),
        this.jobRepo.count({ where: { employerId, status: 'published' as any } }),
        this.applicationRepo
          .createQueryBuilder('app')
          .innerJoin('app.job', 'j')
          .where('j.employer_id = :employerId', { employerId })
          .getCount(),
      ]);

    // Hiring velocity (last 6 months)
    const hiringVelocity = await this.getHiringVelocity(employerId);

    // Pipeline conversion
    const pipelineConversion = await this.getPipelineConversion(employerId);

    // Average time to hire (from first interview to placement in days)
    const avgTimeToHire = await this.getAvgTimeToHire(employerId);

    // Job performance
    const jobPerformance = await this.getJobPerformance(employerId);

    // Platform averages (simplified)
    const platformComparison = {
      avgTimeToHire: 30,
      avgApplicationsPerJob: 25,
      avgInterviewsPerHire: 5,
    };

    return {
      overview: {
        totalPipelines,
        totalCandidatesInPipeline,
        totalInterviews,
        totalPlacements: 0,
        activeJobs,
        totalApplications,
      },
      hiringVelocity,
      pipelineConversion,
      avgTimeToHire,
      jobPerformance,
      platformComparison,
    };
  }

  private async getHiringVelocity(
    employerId: string,
  ): Promise<{ month: string; placements: number; interviews: number }[]> {
    const months: { month: string; placements: number; interviews: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const interviews = await this.interviewRepo
        .createQueryBuilder('i')
        .where('i.employer_id = :employerId', { employerId })
        .andWhere('i.scheduled_at >= :start', { start: date })
        .andWhere('i.scheduled_at < :end', { end: nextMonth })
        .getCount();

      months.push({ month: monthStr, placements: 0, interviews });
    }

    return months;
  }

  private async getPipelineConversion(
    employerId: string,
  ): Promise<{ stageName: string; count: number; percentage: number }[]> {
    const defaultPipeline = await this.pipelineRepo.findOne({
      where: { employerId, isDefault: true },
    });

    if (!defaultPipeline) {
      const anyPipeline = await this.pipelineRepo.findOne({
        where: { employerId },
        order: { createdAt: 'DESC' },
      });
      if (!anyPipeline) return [];
      return this.calculateConversion(anyPipeline);
    }

    return this.calculateConversion(defaultPipeline);
  }

  private async calculateConversion(
    pipeline: HiringPipeline,
  ): Promise<{ stageName: string; count: number; percentage: number }[]> {
    const total = await this.pipelineCandidateRepo.count({
      where: { pipelineId: pipeline.id },
    });

    if (total === 0) {
      return pipeline.stages.map((s) => ({
        stageName: s.name,
        count: 0,
        percentage: 0,
      }));
    }

    const results: { stageName: string; count: number; percentage: number }[] = [];
    for (const stage of pipeline.stages) {
      const count = await this.pipelineCandidateRepo.count({
        where: { pipelineId: pipeline.id, stageId: stage.id },
      });
      results.push({
        stageName: stage.name,
        count,
        percentage: Math.round((count / total) * 100),
      });
    }

    return results;
  }

  private async getAvgTimeToHire(employerId: string): Promise<number | null> {
    const result = await this.interviewRepo
      .createQueryBuilder('i')
      .select('AVG(EXTRACT(EPOCH FROM (i.updated_at - i.created_at)) / 86400)', 'avgDays')
      .where('i.employer_id = :employerId', { employerId })
      .andWhere('i.status = :status', { status: InterviewStatus.COMPLETED })
      .getRawOne();

    return result?.avgDays ? Math.round(Number(result.avgDays)) : null;
  }

  private async getJobPerformance(
    employerId: string,
  ): Promise<{ jobId: string; title: string; views: number; applications: number; conversionRate: number }[]> {
    const jobs = await this.jobRepo.find({
      where: { employerId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return jobs.map((job) => ({
      jobId: job.id,
      title: job.title,
      views: job.viewCount || 0,
      applications: job.applicationCount || 0,
      conversionRate:
        job.viewCount && job.viewCount > 0
          ? Math.round((job.applicationCount / job.viewCount) * 100)
          : 0,
    }));
  }
}
