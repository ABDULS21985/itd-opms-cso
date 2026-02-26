import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobPost } from '../entities/job-post.entity';
import { JobStatus } from '../../../common/constants/status.constant';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';

@Injectable()
export class JobAutoPublishService {
  private readonly logger = new Logger(JobAutoPublishService.name);

  constructor(
    @InjectRepository(JobPost)
    private readonly jobRepo: Repository<JobPost>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoPublishPendingJobs(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const pendingJobs = await this.jobRepo.find({
      where: {
        status: JobStatus.PENDING_REVIEW,
        updatedAt: LessThan(oneHourAgo),
      },
    });

    if (pendingJobs.length === 0) return;

    this.logger.log(`Auto-publishing ${pendingJobs.length} jobs pending for over 1 hour`);

    for (const job of pendingJobs) {
      job.status = JobStatus.PUBLISHED;
      job.publishedAt = new Date();
      job.moderatedBy = null;
      job.moderatedAt = new Date();
      await this.jobRepo.save(job);

      this.eventEmitter.emit(NOTIFICATION_EVENTS.JOB_PUBLISHED, {
        userId: job.postedById,
        jobTitle: job.title,
      });

      this.logger.log(`Auto-published job ${job.id}: "${job.title}"`);
    }
  }
}
