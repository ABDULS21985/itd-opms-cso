import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IntroRequest } from '../entities/intro-request.entity';
import {
  IntroRequestStatus,
  CandidateIntroResponse,
} from '../../../common/constants/status.constant';
import { PaginationDto, PaginationMeta } from '../../../common/dto/pagination.dto';
import { CreateIntroRequestDto } from '../dto/create-intro-request.dto';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';

@Injectable()
export class IntroRequestsService {
  private readonly logger = new Logger(IntroRequestsService.name);

  constructor(
    @InjectRepository(IntroRequest)
    private readonly introRepo: Repository<IntroRequest>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRequest(
    employerId: string,
    requestedById: string,
    candidateId: string,
    data: CreateIntroRequestDto,
  ): Promise<IntroRequest> {
    const introRequest = this.introRepo.create({
      employerId,
      requestedById,
      candidateId,
      jobId: data.jobId || null,
      roleTitle: data.roleTitle,
      roleDescription: data.roleDescription,
      desiredStartDate: data.desiredStartDate
        ? new Date(data.desiredStartDate)
        : undefined,
      workMode: data.workMode,
      locationExpectation: data.locationExpectation,
      notesToPlacementUnit: data.notesToPlacementUnit,
      status: IntroRequestStatus.PENDING,
    });

    const saved = await this.introRepo.save(introRequest);

    // Reload with relations for notification context
    const full = await this.introRepo.findOne({
      where: { id: saved.id },
      relations: ['employer', 'candidate'],
    });

    if (full?.employer && full?.candidate) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.INTRO_REQUESTED, {
        adminUserIds: [],
        employerName: full.employer.companyName || 'Employer',
        candidateName: full.candidate.fullName || 'Candidate',
        roleTitle: data.roleTitle,
      });
    }

    this.logger.log(
      `Intro request created: ${saved.id} by employer ${employerId} for candidate ${candidateId}`,
    );
    return saved;
  }

  async findById(id: string): Promise<IntroRequest> {
    const request = await this.introRepo.findOne({
      where: { id },
      relations: ['employer', 'candidate'],
    });
    if (!request) {
      throw new NotFoundException(`Intro request with ID ${id} not found`);
    }
    return request;
  }

  async getEmployerRequests(
    employerId: string,
    pagination: PaginationDto,
  ): Promise<{ data: IntroRequest[]; meta: PaginationMeta }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const [data, total] = await this.introRepo.findAndCount({
      where: { employerId },
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

  async getCandidateRequests(
    candidateId: string,
    pagination: PaginationDto,
    filterStatus?: string,
  ): Promise<{ data: IntroRequest[]; meta: PaginationMeta }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const where: any = { candidateId };
    if (filterStatus === 'accepted') {
      where.candidateResponse = CandidateIntroResponse.ACCEPTED;
    } else if (filterStatus) {
      where.status = filterStatus;
    }

    const [data, total] = await this.introRepo.findAndCount({
      where,
      relations: ['employer'],
      order: { [pagination.sort || 'createdAt']: pagination.order === 'asc' ? 'ASC' : 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }

  async getAllRequests(
    filters: { status?: IntroRequestStatus; employerId?: string; candidateId?: string },
    pagination: PaginationDto,
  ): Promise<{ data: IntroRequest[]; meta: PaginationMeta }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const qb = this.introRepo
      .createQueryBuilder('intro')
      .leftJoinAndSelect('intro.employer', 'employer')
      .leftJoinAndSelect('intro.candidate', 'candidate');

    if (filters.status) {
      qb.andWhere('intro.status = :status', { status: filters.status });
    }
    if (filters.employerId) {
      qb.andWhere('intro.employerId = :employerId', {
        employerId: filters.employerId,
      });
    }
    if (filters.candidateId) {
      qb.andWhere('intro.candidateId = :candidateId', {
        candidateId: filters.candidateId,
      });
    }

    qb.orderBy(
      `intro.${pagination.sort || 'createdAt'}`,
      pagination.order === 'asc' ? 'ASC' : 'DESC',
    );
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }

  async approveRequest(id: string, adminId: string): Promise<IntroRequest> {
    const request = await this.findById(id);

    if (request.status !== IntroRequestStatus.PENDING && request.status !== IntroRequestStatus.MORE_INFO_NEEDED) {
      throw new BadRequestException(
        'Only requests in PENDING or MORE_INFO_NEEDED status can be approved',
      );
    }

    request.status = IntroRequestStatus.APPROVED;
    request.handledBy = adminId;
    request.handledAt = new Date();

    const saved = await this.introRepo.save(request);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.INTRO_APPROVED, {
      userId: request.requestedById,
      employerName: request.employer?.companyName || 'Employer',
      candidateName: request.candidate?.fullName || 'Candidate',
      roleTitle: request.roleTitle,
    });

    this.logger.log(`Intro request ${id} approved by admin ${adminId}`);
    return saved;
  }

  async declineRequest(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<IntroRequest> {
    const request = await this.findById(id);

    if (request.status !== IntroRequestStatus.PENDING && request.status !== IntroRequestStatus.MORE_INFO_NEEDED) {
      throw new BadRequestException(
        'Only requests in PENDING or MORE_INFO_NEEDED status can be declined',
      );
    }

    request.status = IntroRequestStatus.DECLINED;
    request.handledBy = adminId;
    request.handledAt = new Date();
    request.declineReason = reason || null;

    const saved = await this.introRepo.save(request);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.INTRO_DECLINED, {
      userId: request.requestedById,
      employerName: request.employer?.companyName || 'Employer',
      roleTitle: request.roleTitle,
      reason,
    });

    this.logger.log(`Intro request ${id} declined by admin ${adminId}`);
    return saved;
  }

  async requestMoreInfo(id: string, adminId: string): Promise<IntroRequest> {
    const request = await this.findById(id);

    if (request.status !== IntroRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only requests in PENDING status can be set to MORE_INFO_NEEDED',
      );
    }

    request.status = IntroRequestStatus.MORE_INFO_NEEDED;
    request.handledBy = adminId;
    request.handledAt = new Date();

    const saved = await this.introRepo.save(request);
    this.logger.log(`More info requested for intro request ${id} by admin ${adminId}`);
    return saved;
  }

  async candidateRespond(
    id: string,
    response: CandidateIntroResponse,
  ): Promise<IntroRequest> {
    const request = await this.findById(id);

    if (request.status !== IntroRequestStatus.APPROVED) {
      throw new BadRequestException(
        'Candidates can only respond to APPROVED intro requests',
      );
    }

    if (
      response !== CandidateIntroResponse.ACCEPTED &&
      response !== CandidateIntroResponse.DECLINED
    ) {
      throw new BadRequestException(
        'Response must be ACCEPTED or DECLINED',
      );
    }

    request.candidateResponse = response;
    request.candidateRespondedAt = new Date();

    if (response === CandidateIntroResponse.ACCEPTED) {
      request.status = IntroRequestStatus.SCHEDULED;
    }

    const saved = await this.introRepo.save(request);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.INTRO_CANDIDATE_RESPONDED, {
      userId: request.requestedById,
      candidateName: request.candidate?.fullName || 'Candidate',
      employerName: request.employer?.companyName || 'Employer',
      roleTitle: request.roleTitle,
      response: response === CandidateIntroResponse.ACCEPTED ? 'accepted' : 'declined',
    });

    this.logger.log(
      `Candidate responded to intro request ${id} with ${response}`,
    );
    return saved;
  }
}
