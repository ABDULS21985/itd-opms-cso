import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { PlacementRecord } from '../../placements/entities/placement-record.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { EmployerOrg } from '../../employers/entities/employer-org.entity';
import { IntroRequest } from '../../intro-requests/entities/intro-request.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { ReportsService } from './reports.service';

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);

  constructor(
    @InjectRepository(CandidateProfile)
    private readonly candidateRepo: Repository<CandidateProfile>,
    @InjectRepository(PlacementRecord)
    private readonly placementRepo: Repository<PlacementRecord>,
    @InjectRepository(JobPost)
    private readonly jobRepo: Repository<JobPost>,
    @InjectRepository(EmployerOrg)
    private readonly employerRepo: Repository<EmployerOrg>,
    @InjectRepository(IntroRequest)
    private readonly introRequestRepo: Repository<IntroRequest>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly reportsService: ReportsService,
  ) {}

  // ──────────────────────────────────────────────
  // CSV conversion
  // ──────────────────────────────────────────────

  exportCSV(data: Record<string, any>[], columns: string[]): string {
    if (data.length === 0) {
      return columns.join(',') + '\n';
    }

    const header = columns.join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col];
          if (value === null || value === undefined) return '';
          const str = String(value).replace(/"/g, '""');
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str}"`
            : str;
        })
        .join(','),
    );

    return [header, ...rows].join('\n');
  }

  // ──────────────────────────────────────────────
  // Overview report
  // ──────────────────────────────────────────────

  async exportOverviewReport(): Promise<string> {
    const overview = await this.reportsService.getOverview();

    const data = [
      { metric: 'Total Candidates', value: overview.candidates.total },
      { metric: 'Approved Candidates', value: overview.candidates.approved },
      { metric: 'Total Employers', value: overview.employers.total },
      { metric: 'Verified Employers', value: overview.employers.verified },
      { metric: 'Total Jobs', value: overview.jobs.total },
      { metric: 'Published Jobs', value: overview.jobs.published },
      { metric: 'Total Placements', value: overview.placements.total },
      { metric: 'Active Placements', value: overview.placements.active },
      { metric: 'Total Intro Requests', value: overview.introRequests.total },
    ];

    this.logger.log('Overview report exported');
    return this.exportCSV(data, ['metric', 'value']);
  }

  // ──────────────────────────────────────────────
  // Candidates report
  // ──────────────────────────────────────────────

  async exportCandidatesReport(filters?: any): Promise<string> {
    const qb = this.candidateRepo
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.primaryTrack', 'track')
      .leftJoinAndSelect('cp.candidateSkills', 'cs')
      .leftJoinAndSelect('cs.skill', 'skill');

    if (filters?.approvalStatus) {
      qb.andWhere('cp.approvalStatus = :status', {
        status: filters.approvalStatus,
      });
    }

    if (filters?.trackId) {
      qb.andWhere('cp.primaryTrackId = :trackId', {
        trackId: filters.trackId,
      });
    }

    const candidates = await qb.getMany();

    const data = candidates.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      slug: c.slug,
      city: c.city || '',
      country: c.country || '',
      approvalStatus: c.approvalStatus,
      primaryTrack: c.primaryTrack?.name || '',
      skills: (c.candidateSkills || [])
        .map((cs) => cs.skill?.name || '')
        .filter(Boolean)
        .join('; '),
      yearsOfExperience: c.yearsOfExperience ?? '',
      availabilityStatus: c.availabilityStatus || '',
      profileStrength: c.profileStrength,
      createdAt: c.createdAt,
    }));

    const columns = [
      'id',
      'fullName',
      'slug',
      'city',
      'country',
      'approvalStatus',
      'primaryTrack',
      'skills',
      'yearsOfExperience',
      'availabilityStatus',
      'profileStrength',
      'createdAt',
    ];

    this.logger.log(`Candidates report exported: ${data.length} records`);
    return this.exportCSV(data, columns);
  }

  // ──────────────────────────────────────────────
  // Placements report
  // ──────────────────────────────────────────────

  async exportPlacementsReport(filters?: any): Promise<string> {
    const qb = this.placementRepo
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.candidate', 'candidate')
      .leftJoinAndSelect('pr.employer', 'employer');

    if (filters?.status) {
      qb.andWhere('pr.status = :status', { status: filters.status });
    }

    const placements = await qb.getMany();

    const data = placements.map((p) => ({
      id: p.id,
      candidateName: (p as any).candidate?.fullName || '',
      employerName: (p as any).employer?.companyName || '',
      status: p.status,
      placementType: p.placementType,
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      createdAt: p.createdAt,
    }));

    const columns = [
      'id',
      'candidateName',
      'employerName',
      'status',
      'placementType',
      'startDate',
      'endDate',
      'createdAt',
    ];

    this.logger.log(`Placements report exported: ${data.length} records`);
    return this.exportCSV(data, columns);
  }

  // ──────────────────────────────────────────────
  // Jobs report
  // ──────────────────────────────────────────────

  async exportJobsReport(filters?: any): Promise<string> {
    const qb = this.jobRepo
      .createQueryBuilder('jp')
      .leftJoinAndSelect('jp.employer', 'employer')
      .leftJoinAndSelect('jp.jobSkills', 'js')
      .leftJoinAndSelect('js.skill', 'skill');

    if (filters?.status) {
      qb.andWhere('jp.status = :status', { status: filters.status });
    }

    const jobs = await qb.getMany();

    const data = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      employer: (j as any).employer?.companyName || '',
      jobType: j.jobType,
      workMode: j.workMode,
      location: j.location || '',
      status: j.status,
      experienceLevel: j.experienceLevel || '',
      salaryMin: j.salaryMin ?? '',
      salaryMax: j.salaryMax ?? '',
      salaryCurrency: j.salaryCurrency || '',
      skills: ((j as any).jobSkills || [])
        .map((js: any) => js.skill?.name || '')
        .filter(Boolean)
        .join('; '),
      viewCount: j.viewCount,
      applicationCount: j.applicationCount,
      publishedAt: j.publishedAt || '',
      createdAt: j.createdAt,
    }));

    const columns = [
      'id',
      'title',
      'employer',
      'jobType',
      'workMode',
      'location',
      'status',
      'experienceLevel',
      'salaryMin',
      'salaryMax',
      'salaryCurrency',
      'skills',
      'viewCount',
      'applicationCount',
      'publishedAt',
      'createdAt',
    ];

    this.logger.log(`Jobs report exported: ${data.length} records`);
    return this.exportCSV(data, columns);
  }

  // ──────────────────────────────────────────────
  // Employers report
  // ──────────────────────────────────────────────

  async exportEmployersReport(filters?: any): Promise<string> {
    const qb = this.employerRepo.createQueryBuilder('eo');

    if (filters?.verificationStatus) {
      qb.andWhere('eo.verificationStatus = :status', {
        status: filters.verificationStatus,
      });
    }

    const employers = await qb.getMany();

    const data = employers.map((e) => ({
      id: e.id,
      companyName: e.companyName,
      slug: e.slug,
      sector: e.sector || '',
      locationHq: e.locationHq || '',
      country: e.country || '',
      verificationStatus: e.verificationStatus,
      totalRequests: e.totalRequests,
      totalPlacements: e.totalPlacements,
      websiteUrl: e.websiteUrl || '',
      createdAt: e.createdAt,
    }));

    const columns = [
      'id',
      'companyName',
      'slug',
      'sector',
      'locationHq',
      'country',
      'verificationStatus',
      'totalRequests',
      'totalPlacements',
      'websiteUrl',
      'createdAt',
    ];

    this.logger.log(`Employers report exported: ${data.length} records`);
    return this.exportCSV(data, columns);
  }

  // ──────────────────────────────────────────────
  // Intro Requests report
  // ──────────────────────────────────────────────

  async exportIntroRequestsReport(filters?: any): Promise<string> {
    const qb = this.introRequestRepo
      .createQueryBuilder('ir')
      .leftJoinAndSelect('ir.employer', 'employer')
      .leftJoinAndSelect('ir.candidate', 'candidate');

    if (filters?.status) {
      qb.andWhere('ir.status = :status', { status: filters.status });
    }

    const requests = await qb.getMany();

    const data = requests.map((r) => ({
      id: r.id,
      employerName: (r as any).employer?.companyName || '',
      candidateName: (r as any).candidate?.fullName || '',
      roleTitle: r.roleTitle,
      status: r.status,
      workMode: r.workMode || '',
      candidateResponse: r.candidateResponse || '',
      candidateRespondedAt: r.candidateRespondedAt || '',
      createdAt: r.createdAt,
    }));

    const columns = [
      'id',
      'employerName',
      'candidateName',
      'roleTitle',
      'status',
      'workMode',
      'candidateResponse',
      'candidateRespondedAt',
      'createdAt',
    ];

    this.logger.log(`Intro requests report exported: ${data.length} records`);
    return this.exportCSV(data, columns);
  }

  // ──────────────────────────────────────────────
  // Audit Logs report
  // ──────────────────────────────────────────────

  async exportAuditLogsReport(filters?: any): Promise<string> {
    const qb = this.auditLogRepo.createQueryBuilder('al');

    if (filters?.action) {
      qb.andWhere('al.action = :action', { action: filters.action });
    }

    if (filters?.entityType) {
      qb.andWhere('al.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    qb.orderBy('al.createdAt', 'DESC');

    const logs = await qb.getMany();

    const data = logs.map((l) => ({
      id: l.id,
      actorEmail: l.actorEmail,
      actorRole: l.actorRole,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      reason: l.reason || '',
      ipAddress: l.ipAddress || '',
      createdAt: l.createdAt,
    }));

    const columns = [
      'id',
      'actorEmail',
      'actorRole',
      'action',
      'entityType',
      'entityId',
      'reason',
      'ipAddress',
      'createdAt',
    ];

    this.logger.log(`Audit logs report exported: ${data.length} records`);
    return this.exportCSV(data, columns);
  }
}
