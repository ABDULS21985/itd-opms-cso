import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditAction } from '../../../common/constants/status.constant';
import { PaginationDto, PaginationMeta } from '../../../common/dto/pagination.dto';

export interface AuditLogEntry {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousValues?: object;
  newValues?: object;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<AuditLog> {
    const auditLog = this.auditLogRepo.create(entry);
    const saved = await this.auditLogRepo.save(auditLog);
    this.logger.log(
      `Audit: ${entry.action} on ${entry.entityType}:${entry.entityId} by ${entry.actorEmail}`,
    );
    return saved;
  }

  async findAll(
    filters: {
      actorId?: string;
      action?: AuditAction;
      entityType?: string;
      entityId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination: PaginationDto,
  ): Promise<{ data: AuditLog[]; meta: PaginationMeta }> {
    const qb = this.auditLogRepo.createQueryBuilder('audit');

    if (filters.actorId) {
      qb.andWhere('audit.actorId = :actorId', { actorId: filters.actorId });
    }
    if (filters.action) {
      qb.andWhere('audit.action = :action', { action: filters.action });
    }
    if (filters.entityType) {
      qb.andWhere('audit.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }
    if (filters.entityId) {
      qb.andWhere('audit.entityId = :entityId', {
        entityId: filters.entityId,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('audit.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('audit.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    qb.orderBy(`audit.${pagination.sort || 'createdAt'}`, pagination.order === 'asc' ? 'ASC' : 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }
}
