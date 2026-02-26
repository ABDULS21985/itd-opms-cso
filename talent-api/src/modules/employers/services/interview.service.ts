import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interview } from '../entities/interview.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { InterviewStatus } from '../../../common/constants/status.constant';
import { ScheduleInterviewDto } from '../dto/schedule-interview.dto';
import { UpdateInterviewDto } from '../dto/update-interview.dto';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';
import { ActivityService } from './activity.service';
import { ActivityType } from '../../../common/constants/status.constant';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @InjectRepository(CandidateProfile)
    private readonly candidateRepo: Repository<CandidateProfile>,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityService: ActivityService,
  ) {}

  async schedule(
    employerId: string,
    userId: string,
    data: ScheduleInterviewDto,
  ): Promise<Interview> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: data.candidateId },
      relations: ['user'],
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${data.candidateId} not found`);
    }

    const interview = this.interviewRepo.create({
      employerId,
      candidateId: data.candidateId,
      scheduledBy: userId,
      jobId: data.jobId || null,
      pipelineCandidateId: data.pipelineCandidateId || null,
      scheduledAt: new Date(data.scheduledAt),
      duration: data.duration || 60,
      type: data.type,
      status: InterviewStatus.SCHEDULED,
      location: data.location || null,
      meetingUrl: data.meetingUrl || null,
      notes: data.notes || null,
    });

    const saved = await this.interviewRepo.save(interview);

    // Notify candidate
    if (candidate.user) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.INTERVIEW_SCHEDULED, {
        userId: candidate.user.id,
        candidateName: candidate.fullName,
        scheduledAt: data.scheduledAt,
        interviewType: data.type,
      });
    }

    await this.activityService.log(
      employerId,
      userId,
      ActivityType.INTERVIEW_SCHEDULED,
      'candidate',
      data.candidateId,
      `Scheduled ${data.type} interview with ${candidate.fullName}`,
    );

    this.logger.log(`Interview scheduled: ${saved.id}`);
    return saved;
  }

  async findByEmployer(
    employerId: string,
    filters?: { status?: InterviewStatus; from?: string; to?: string; page?: number; limit?: number },
  ): Promise<{ data: Interview[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const where: Record<string, unknown> = { employerId };
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.from && filters?.to) {
      where.scheduledAt = Between(new Date(filters.from), new Date(filters.to));
    } else if (filters?.from) {
      where.scheduledAt = MoreThanOrEqual(new Date(filters.from));
    } else if (filters?.to) {
      where.scheduledAt = LessThanOrEqual(new Date(filters.to));
    }

    const [data, total] = await this.interviewRepo.findAndCount({
      where,
      relations: ['candidate', 'job'],
      order: { scheduledAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<Interview> {
    const interview = await this.interviewRepo.findOne({
      where: { id },
      relations: ['candidate', 'job'],
    });
    if (!interview) {
      throw new NotFoundException(`Interview with ID ${id} not found`);
    }
    return interview;
  }

  async update(id: string, data: UpdateInterviewDto): Promise<Interview> {
    const interview = await this.findById(id);
    Object.assign(interview, {
      ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
      ...(data.type && { type: data.type }),
      ...(data.duration && { duration: data.duration }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.meetingUrl !== undefined && { meetingUrl: data.meetingUrl }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.feedback !== undefined && { feedback: data.feedback }),
    });
    return this.interviewRepo.save(interview);
  }

  async cancel(id: string, reason?: string): Promise<Interview> {
    const interview = await this.findById(id);

    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled interviews can be cancelled');
    }

    interview.status = InterviewStatus.CANCELLED;
    interview.cancelReason = reason || null;
    const saved = await this.interviewRepo.save(interview);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.INTERVIEW_CANCELLED, {
      candidateId: interview.candidateId,
      scheduledAt: interview.scheduledAt,
    });

    this.logger.log(`Interview cancelled: ${id}`);
    return saved;
  }

  generateIcs(interview: Interview): string {
    const start = new Date(interview.scheduledAt);
    const end = new Date(start.getTime() + interview.duration * 60 * 1000);

    const formatDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TalentPortal//Interview//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:Interview - ${interview.candidate?.fullName || 'Candidate'}`,
      `DESCRIPTION:${interview.type} interview${interview.notes ? '. Notes: ' + interview.notes : ''}`,
      ...(interview.location ? [`LOCATION:${interview.location}`] : []),
      ...(interview.meetingUrl ? [`URL:${interview.meetingUrl}`] : []),
      `STATUS:${interview.status === InterviewStatus.CANCELLED ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    return lines.join('\r\n');
  }
}
