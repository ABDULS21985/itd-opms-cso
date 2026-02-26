import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployerActivityLog } from '../entities/activity-log.entity';
import { ActivityType } from '../../../common/constants/status.constant';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(EmployerActivityLog)
    private readonly activityRepo: Repository<EmployerActivityLog>,
  ) {}

  async log(
    employerId: string,
    userId: string,
    activityType: ActivityType,
    entityType: string,
    entityId: string,
    description: string,
    metadata?: Record<string, unknown>,
    userName?: string,
  ): Promise<EmployerActivityLog> {
    const activity = this.activityRepo.create({
      employerId,
      userId,
      userName: userName || null,
      activityType,
      entityType,
      entityId,
      description,
      metadata: metadata || null,
    });
    return this.activityRepo.save(activity);
  }

  async findByEmployer(
    employerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: EmployerActivityLog[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const [data, total] = await this.activityRepo.findAndCount({
      where: { employerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    employerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: EmployerActivityLog[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const [data, total] = await this.activityRepo.findAndCount({
      where: { entityType, entityId, employerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
