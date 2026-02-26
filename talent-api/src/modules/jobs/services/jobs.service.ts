import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobPost } from '../entities/job-post.entity';
import { JobSkill } from '../entities/job-skill.entity';
import { JobApplication } from '../entities/job-application.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import {
  JobStatus,
  ApplicationStatus,
  ProfileApprovalStatus,
} from '../../../common/constants/status.constant';
import { generateUniqueSlug } from '../../../common/utils/slug.util';
import { PaginationDto, PaginationMeta } from '../../../common/dto/pagination.dto';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { SearchJobsDto } from '../dto/search-jobs.dto';
import { ApplyJobDto } from '../dto/apply-job.dto';
import { NOTIFICATION_EVENTS, ApplicationReceivedEvent } from '../../notifications/events/notification.events';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(JobPost)
    private readonly jobRepo: Repository<JobPost>,
    @InjectRepository(JobSkill)
    private readonly jobSkillRepo: Repository<JobSkill>,
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
    @InjectRepository(CandidateProfile)
    private readonly candidateRepo: Repository<CandidateProfile>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createJob(
    employerId: string,
    postedById: string,
    data: CreateJobDto,
  ): Promise<JobPost> {
    const slug = generateUniqueSlug(data.title);

    const job = this.jobRepo.create({
      employerId,
      postedById,
      title: data.title,
      slug,
      jobType: data.jobType,
      workMode: data.workMode,
      location: data.location,
      timezonePreference: data.timezonePreference,
      description: data.description,
      responsibilities: data.responsibilities,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      salaryCurrency: data.salaryCurrency,
      experienceLevel: data.experienceLevel,
      applicationDeadline: data.applicationDeadline
        ? new Date(data.applicationDeadline)
        : undefined,
      hiringProcess: data.hiringProcess,
      niceToHaveSkills: data.niceToHaveSkills,
      status: data.status || JobStatus.DRAFT,
    });

    const savedJob = await this.jobRepo.save(job);

    if (data.skills && data.skills.length > 0) {
      const jobSkills = data.skills.map((skill) =>
        this.jobSkillRepo.create({
          jobId: savedJob.id,
          skillId: skill.skillId,
          isRequired: skill.isRequired ?? true,
        }),
      );
      await this.jobSkillRepo.save(jobSkills);
    }

    this.logger.log(`Job created: ${savedJob.id} by employer ${employerId}`);
    return this.findById(savedJob.id);
  }

  async updateJob(id: string, data: UpdateJobDto): Promise<JobPost> {
    const job = await this.findById(id);

    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.REJECTED) {
      throw new BadRequestException(
        'Only jobs in DRAFT or REJECTED status can be updated',
      );
    }

    if (data.title && data.title !== job.title) {
      job.slug = generateUniqueSlug(data.title);
    }

    const { skills, ...jobData } = data;
    Object.assign(job, jobData);

    if (data.applicationDeadline) {
      job.applicationDeadline = new Date(data.applicationDeadline);
    }

    const savedJob = await this.jobRepo.save(job);

    if (skills !== undefined) {
      await this.jobSkillRepo.delete({ jobId: id });
      if (skills.length > 0) {
        const jobSkills = skills.map((skill) =>
          this.jobSkillRepo.create({
            jobId: id,
            skillId: skill.skillId,
            isRequired: skill.isRequired ?? true,
          }),
        );
        await this.jobSkillRepo.save(jobSkills);
      }
    }

    return this.findById(savedJob.id);
  }

  async findById(id: string): Promise<JobPost> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['employer', 'jobSkills', 'jobSkills.skill'],
    });
    if (!job) {
      throw new NotFoundException(`Job post with ID ${id} not found`);
    }
    return job;
  }

  async findBySlug(slug: string): Promise<JobPost> {
    const job = await this.jobRepo.findOne({
      where: { slug },
      relations: ['employer', 'jobSkills', 'jobSkills.skill'],
    });
    if (!job) {
      throw new NotFoundException(`Job post with slug "${slug}" not found`);
    }
    return job;
  }

  async publishJob(id: string): Promise<JobPost> {
    const job = await this.findById(id);

    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.REJECTED) {
      throw new BadRequestException(
        'Only jobs in DRAFT or REJECTED status can be submitted for review',
      );
    }

    job.status = JobStatus.PENDING_REVIEW;
    return this.jobRepo.save(job);
  }

  async closeJob(id: string): Promise<JobPost> {
    const job = await this.findById(id);

    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED jobs can be closed');
    }

    job.status = JobStatus.CLOSED;
    job.closedAt = new Date();
    return this.jobRepo.save(job);
  }

  async searchJobs(
    filters: SearchJobsDto,
  ): Promise<{ data: JobPost[]; meta: PaginationMeta }> {
    const qb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.employer', 'employer')
      .leftJoinAndSelect('job.jobSkills', 'jobSkills')
      .leftJoinAndSelect('jobSkills.skill', 'skill')
      .where('job.status = :status', { status: JobStatus.PUBLISHED });

    if (filters.q) {
      qb.andWhere(
        '(job.title ILIKE :q OR job.description ILIKE :q)',
        { q: `%${filters.q}%` },
      );
    }

    if (filters.jobType) {
      qb.andWhere('job.jobType = :jobType', { jobType: filters.jobType });
    }

    if (filters.workMode) {
      qb.andWhere('job.workMode = :workMode', { workMode: filters.workMode });
    }

    if (filters.experienceLevel) {
      qb.andWhere('job.experienceLevel = :experienceLevel', {
        experienceLevel: filters.experienceLevel,
      });
    }

    if (filters.location) {
      qb.andWhere('job.location ILIKE :location', {
        location: `%${filters.location}%`,
      });
    }

    if (filters.employerId) {
      qb.andWhere('job.employerId = :employerId', {
        employerId: filters.employerId,
      });
    }

    if (filters.skillIds && filters.skillIds.length > 0) {
      qb.andWhere('jobSkills.skillId IN (:...skillIds)', {
        skillIds: filters.skillIds,
      });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    qb.orderBy(
      `job.${filters.sort || 'createdAt'}`,
      filters.order === 'asc' ? 'ASC' : 'DESC',
    );
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }

  async applyToJob(
    jobId: string,
    candidateId: string,
    data: ApplyJobDto,
  ): Promise<JobApplication> {
    const job = await this.findById(jobId);

    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Can only apply to published jobs');
    }

    if (job.applicationDeadline && new Date() > job.applicationDeadline) {
      throw new BadRequestException('Application deadline has passed');
    }

    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate profile not found');
    }

    if (candidate.profileStrength < 70) {
      throw new ForbiddenException(
        'Profile strength must be at least 70% to apply for jobs',
      );
    }

    if (candidate.approvalStatus !== ProfileApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        'Your profile must be approved before applying for jobs',
      );
    }

    const existingApplication = await this.applicationRepo.findOne({
      where: { jobId, candidateId },
    });
    if (existingApplication) {
      throw new ConflictException('You have already applied to this job');
    }

    const application = this.applicationRepo.create({
      jobId,
      candidateId,
      coverNote: data.coverNote,
      cvDocumentId: data.cvDocumentId,
      status: ApplicationStatus.SUBMITTED,
    });

    const saved = await this.applicationRepo.save(application);

    await this.jobRepo.increment({ id: jobId }, 'applicationCount', 1);

    this.logger.log(
      `Candidate ${candidateId} applied to job ${jobId}`,
    );

    this.eventEmitter.emit(NOTIFICATION_EVENTS.APPLICATION_RECEIVED, {
      userId: job.postedById,
      candidateName: candidate.fullName,
      jobTitle: job.title,
    } as ApplicationReceivedEvent);

    return saved;
  }

  async getApplicationsForJob(
    jobId: string,
    pagination: PaginationDto,
  ): Promise<{ data: JobApplication[]; meta: PaginationMeta }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const [data, total] = await this.applicationRepo.findAndCount({
      where: { jobId },
      relations: ['candidate'],
      order: { [pagination.sort || 'createdAt']: pagination.order === 'asc' ? 'ASC' : 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }

  async getCandidateApplications(
    candidateId: string,
    pagination: PaginationDto,
  ): Promise<{ data: JobApplication[]; meta: PaginationMeta }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const [data, total] = await this.applicationRepo.findAndCount({
      where: { candidateId },
      relations: ['job', 'job.employer'],
      order: { [pagination.sort || 'createdAt']: pagination.order === 'asc' ? 'ASC' : 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }

  async getEmployerJobs(
    employerId: string,
    pagination: PaginationDto,
  ): Promise<{ data: JobPost[]; meta: PaginationMeta }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const [data, total] = await this.jobRepo.findAndCount({
      where: { employerId },
      relations: ['jobSkills', 'jobSkills.skill'],
      order: { [pagination.sort || 'createdAt']: pagination.order === 'asc' ? 'ASC' : 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }

  async deleteDraftJob(id: string, employerId: string): Promise<void> {
    const job = await this.findById(id);

    if (job.employerId !== employerId) {
      throw new ForbiddenException('You do not have permission to delete this job');
    }

    if (job.status !== JobStatus.DRAFT) {
      throw new BadRequestException(
        'Only jobs in DRAFT status can be deleted',
      );
    }

    // Remove associated skills first
    await this.jobSkillRepo.delete({ jobId: id });

    // Soft delete the job (BaseEntity has deletedAt column)
    await this.jobRepo.softRemove(job);

    this.logger.log(`Draft job ${id} deleted by employer ${employerId}`);
  }

  async findAllForAdmin(
    pagination: PaginationDto,
    filters?: { employerId?: string; search?: string; status?: string },
  ): Promise<{ data: JobPost[]; meta: PaginationMeta }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const qb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.employer', 'employer')
      .leftJoinAndSelect('job.jobSkills', 'jobSkills')
      .leftJoinAndSelect('jobSkills.skill', 'skill');

    if (filters?.employerId) {
      qb.andWhere('job.employerId = :employerId', { employerId: filters.employerId });
    }
    if (filters?.status) {
      qb.andWhere('job.status = :status', { status: filters.status });
    }
    if (filters?.search) {
      qb.andWhere('(job.title ILIKE :search OR employer.companyName ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy(`job.${pagination.sort || 'createdAt'}`, pagination.order === 'asc' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }
}
