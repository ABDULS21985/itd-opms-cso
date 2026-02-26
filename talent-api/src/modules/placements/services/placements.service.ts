import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlacementRecord } from '../entities/placement-record.entity';
import { PlacementStatus } from '../../../common/constants/status.constant';
import { PaginationDto, PaginationMeta } from '../../../common/dto/pagination.dto';
import { CreatePlacementDto } from '../dto/create-placement.dto';
import { UpdatePlacementDto } from '../dto/update-placement.dto';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';

const VALID_TRANSITIONS: Record<PlacementStatus, PlacementStatus[]> = {
  [PlacementStatus.AVAILABLE]: [PlacementStatus.IN_DISCUSSION, PlacementStatus.CANCELLED],
  [PlacementStatus.IN_DISCUSSION]: [PlacementStatus.INTERVIEWING, PlacementStatus.CANCELLED],
  [PlacementStatus.INTERVIEWING]: [PlacementStatus.OFFER, PlacementStatus.CANCELLED],
  [PlacementStatus.OFFER]: [PlacementStatus.PLACED, PlacementStatus.CANCELLED],
  [PlacementStatus.PLACED]: [PlacementStatus.COMPLETED, PlacementStatus.CANCELLED],
  [PlacementStatus.COMPLETED]: [],
  [PlacementStatus.CANCELLED]: [],
};

const STATUS_DATE_FIELD: Partial<Record<PlacementStatus, keyof PlacementRecord>> = {
  [PlacementStatus.IN_DISCUSSION]: 'introDate',
  [PlacementStatus.INTERVIEWING]: 'interviewDate',
  [PlacementStatus.OFFER]: 'offerDate',
  [PlacementStatus.PLACED]: 'placedDate',
  [PlacementStatus.COMPLETED]: 'completedDate',
};

@Injectable()
export class PlacementsService {
  private readonly logger = new Logger(PlacementsService.name);

  constructor(
    @InjectRepository(PlacementRecord)
    private readonly placementRepo: Repository<PlacementRecord>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPlacement(data: CreatePlacementDto): Promise<PlacementRecord> {
    // Check if intro request is already linked to an existing placement
    if (data.introRequestId) {
      const existing = await this.placementRepo.findOne({
        where: { introRequestId: data.introRequestId },
      });
      if (existing) {
        throw new ConflictException(
          `Intro request is already linked to placement ${existing.id}`,
        );
      }
    }

    const placement = this.placementRepo.create({
      candidateId: data.candidateId,
      employerId: data.employerId,
      introRequestId: data.introRequestId,
      jobId: data.jobId,
      status: data.status || PlacementStatus.IN_DISCUSSION,
      placementType: data.placementType,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      salaryRange: data.salaryRange,
      outcomeNotes: data.outcomeNotes,
      managedBy: data.managedBy,
    });

    const saved = await this.placementRepo.save(placement);
    this.logger.log(
      `Placement created: ${saved.id} for candidate ${data.candidateId} at employer ${data.employerId}`,
    );
    return saved;
  }

  async updatePlacement(
    id: string,
    data: UpdatePlacementDto,
  ): Promise<PlacementRecord> {
    const placement = await this.findById(id);

    if (data.startDate) {
      placement.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      placement.endDate = new Date(data.endDate);
    }

    const { startDate, endDate, ...rest } = data;
    Object.assign(placement, rest);

    return this.placementRepo.save(placement);
  }

  async updateStatus(
    id: string,
    newStatus: PlacementStatus,
    adminId: string,
  ): Promise<PlacementRecord> {
    const placement = await this.findById(id);
    const currentStatus = placement.status;

    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions: ${allowedTransitions?.join(', ') || 'none'}`,
      );
    }

    placement.status = newStatus;
    placement.managedBy = adminId;

    const dateField = STATUS_DATE_FIELD[newStatus];
    if (dateField) {
      (placement as any)[dateField] = new Date();
    }

    const saved = await this.placementRepo.save(placement);

    if (placement.candidate) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.PLACEMENT_UPDATE, {
        userId: placement.candidate.userId,
        placementId: saved.id,
        candidateName: placement.candidate.fullName || 'Candidate',
        employerName: placement.employer?.companyName || 'Employer',
        newStatus,
        oldStatus: currentStatus,
      });
    }

    this.logger.log(
      `Placement ${id} status changed from ${currentStatus} to ${newStatus} by admin ${adminId}`,
    );
    return saved;
  }

  async findById(id: string): Promise<PlacementRecord> {
    const placement = await this.placementRepo.findOne({
      where: { id },
      relations: ['candidate', 'employer', 'introRequest', 'job'],
    });
    if (!placement) {
      throw new NotFoundException(`Placement record with ID ${id} not found`);
    }
    return placement;
  }

  async findAll(
    filters: {
      status?: PlacementStatus;
      candidateId?: string;
      employerId?: string;
      managedBy?: string;
    },
    pagination: PaginationDto,
  ): Promise<{ data: PlacementRecord[]; meta: PaginationMeta }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const qb = this.placementRepo
      .createQueryBuilder('placement')
      .leftJoinAndSelect('placement.candidate', 'candidate')
      .leftJoinAndSelect('placement.employer', 'employer')
      .leftJoinAndSelect('placement.introRequest', 'introRequest')
      .leftJoinAndSelect('placement.job', 'job');

    if (filters.status) {
      qb.andWhere('placement.status = :status', { status: filters.status });
    }
    if (filters.candidateId) {
      qb.andWhere('placement.candidateId = :candidateId', {
        candidateId: filters.candidateId,
      });
    }
    if (filters.employerId) {
      qb.andWhere('placement.employerId = :employerId', {
        employerId: filters.employerId,
      });
    }
    if (filters.managedBy) {
      qb.andWhere('placement.managedBy = :managedBy', {
        managedBy: filters.managedBy,
      });
    }

    qb.orderBy(
      `placement.${pagination.sort || 'createdAt'}`,
      pagination.order === 'asc' ? 'ASC' : 'DESC',
    );
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }
}
