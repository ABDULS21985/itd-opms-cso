import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobPost } from '../entities/job-post.entity';
import { JobStatus } from '../../../common/constants/status.constant';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';

@Injectable()
export class JobModerationService {
  private readonly logger = new Logger(JobModerationService.name);

  constructor(
    @InjectRepository(JobPost)
    private readonly jobRepo: Repository<JobPost>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async approveJob(id: string, adminId: string): Promise<JobPost> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['employer'],
    });
    if (!job) {
      throw new NotFoundException(`Job post with ID ${id} not found`);
    }

    if (job.status !== JobStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Only jobs in PENDING_REVIEW status can be approved',
      );
    }

    job.status = JobStatus.PUBLISHED;
    job.moderatedBy = adminId;
    job.moderatedAt = new Date();
    job.publishedAt = new Date();

    const saved = await this.jobRepo.save(job);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.JOB_PUBLISHED, {
      userId: job.postedById,
      jobTitle: job.title,
    });

    this.logger.log(`Job ${id} approved by admin ${adminId}`);
    return saved;
  }

  async rejectJob(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<JobPost> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['employer'],
    });
    if (!job) {
      throw new NotFoundException(`Job post with ID ${id} not found`);
    }

    if (job.status !== JobStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Only jobs in PENDING_REVIEW status can be rejected',
      );
    }

    job.status = JobStatus.REJECTED;
    job.moderatedBy = adminId;
    job.moderatedAt = new Date();

    const saved = await this.jobRepo.save(job);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.JOB_REJECTED, {
      userId: job.postedById,
      jobTitle: job.title,
      reason,
    });

    this.logger.log(`Job ${id} rejected by admin ${adminId}. Reason: ${reason}`);
    return saved;
  }
}
