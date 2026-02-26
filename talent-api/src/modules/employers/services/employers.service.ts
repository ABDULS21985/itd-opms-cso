import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmployerOrg } from '../entities/employer-org.entity';
import { EmployerUser } from '../entities/employer-user.entity';
import {
  EmployerUserRole,
  EmployerVerificationStatus,
} from '../../../common/constants/status.constant';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { generateUniqueSlug } from '../../../common/utils/slug.util';
import { RegisterEmployerDto } from '../dto/register-employer.dto';
import { UpdateEmployerDto } from '../dto/update-employer.dto';
import { NOTIFICATION_EVENTS, NewEmployerEvent } from '../../notifications/events/notification.events';
import { JobTemplateService } from './job-template.service';

@Injectable()
export class EmployersService {
  private readonly logger = new Logger(EmployersService.name);

  constructor(
    @InjectRepository(EmployerOrg)
    private readonly orgRepo: Repository<EmployerOrg>,
    @InjectRepository(EmployerUser)
    private readonly employerUserRepo: Repository<EmployerUser>,
    private readonly eventEmitter: EventEmitter2,
    private readonly jobTemplateService: JobTemplateService,
  ) {}

  async register(
    userId: string,
    data: RegisterEmployerDto,
  ): Promise<{ org: EmployerOrg; employerUser: EmployerUser }> {
    const existingUser = await this.employerUserRepo.findOne({
      where: { userId },
    });
    if (existingUser) {
      throw new ConflictException('User is already associated with an employer organization');
    }

    const slug = generateUniqueSlug(data.companyName);

    const org = this.orgRepo.create({
      companyName: data.companyName,
      slug,
      websiteUrl: data.websiteUrl,
      description: data.description,
      sector: data.sector,
      locationHq: data.locationHq,
      country: data.country,
      hiringTracks: data.hiringTracks,
      hiringWorkModes: data.hiringWorkModes,
    });
    const savedOrg = await this.orgRepo.save(org);

    const employerUser = this.employerUserRepo.create({
      userId,
      orgId: savedOrg.id,
      contactName: data.contactName,
      roleTitle: data.roleTitle,
      phone: data.phone,
      role: EmployerUserRole.OWNER,
    });
    const savedUser = await this.employerUserRepo.save(employerUser);

    this.logger.log(`Employer org registered: ${savedOrg.id} by user ${userId}`);

    // Seed default job post templates for the new employer
    this.jobTemplateService.seedDefaultTemplates(savedOrg.id).catch((err) => {
      this.logger.warn(`Failed to seed default templates for ${savedOrg.id}: ${err.message}`);
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.NEW_EMPLOYER, {
      adminUserIds: [],
      companyName: data.companyName,
      contactEmail: savedOrg.contactEmail || '',
    } as NewEmployerEvent);

    return { org: savedOrg, employerUser: savedUser };
  }

  async findById(id: string): Promise<EmployerOrg> {
    const org = await this.orgRepo.findOne({
      where: { id },
      relations: ['employerUsers'],
    });
    if (!org) {
      throw new NotFoundException(`Employer organization with ID ${id} not found`);
    }
    return org;
  }

  async findBySlug(slug: string): Promise<EmployerOrg> {
    const org = await this.orgRepo.findOne({
      where: { slug },
      relations: ['employerUsers'],
    });
    if (!org) {
      throw new NotFoundException(`Employer organization with slug "${slug}" not found`);
    }
    return org;
  }

  async updateOrg(id: string, data: UpdateEmployerDto): Promise<EmployerOrg> {
    const org = await this.findById(id);

    if (data.companyName && data.companyName !== org.companyName) {
      org.slug = generateUniqueSlug(data.companyName);
    }

    Object.assign(org, data);
    return this.orgRepo.save(org);
  }

  async getOrgMembers(orgId: string): Promise<EmployerUser[]> {
    return this.employerUserRepo.find({
      where: { orgId },
      relations: ['user'],
    });
  }

  async getUserEmployerOrg(userId: string): Promise<EmployerOrg> {
    const employerUser = await this.employerUserRepo.findOne({
      where: { userId },
      relations: ['org', 'org.employerUsers'],
    });
    if (!employerUser) {
      throw new NotFoundException('User is not associated with any employer organization');
    }
    return employerUser.org;
  }

  async findAll(): Promise<EmployerOrg[]> {
    return this.orgRepo.find({
      relations: ['employerUsers'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    search?: string,
    pagination?: PaginationDto,
    verificationStatus?: EmployerVerificationStatus,
  ): Promise<{ data: EmployerOrg[]; meta: any }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const qb = this.orgRepo
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.employerUsers', 'employerUsers')
      .orderBy('org.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('LOWER(org.companyName) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    if (verificationStatus) {
      qb.andWhere('org.verificationStatus = :verificationStatus', { verificationStatus });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats(): Promise<{ total: number; pending: number; verified: number; rejected: number; suspended: number }> {
    const qb = this.orgRepo.createQueryBuilder('org');
    const [total, pending, verified, rejected, suspended] = await Promise.all([
      qb.getCount(),
      this.orgRepo.count({ where: { verificationStatus: EmployerVerificationStatus.PENDING } }),
      this.orgRepo.count({ where: { verificationStatus: EmployerVerificationStatus.VERIFIED } }),
      this.orgRepo.count({ where: { verificationStatus: EmployerVerificationStatus.REJECTED } }),
      this.orgRepo.count({ where: { verificationStatus: EmployerVerificationStatus.SUSPENDED } }),
    ]);
    return { total, pending, verified, rejected, suspended };
  }

  async findVerified(pagination?: PaginationDto): Promise<{ data: EmployerOrg[]; meta: any }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const [data, total] = await this.orgRepo.findAndCount({
      where: { verificationStatus: EmployerVerificationStatus.VERIFIED },
      order: { companyName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async verifyEmail(
    email: string,
    code: string,
  ): Promise<{ message: string }> {
    const org = await this.orgRepo.findOne({
      where: { contactEmail: email },
    });

    if (!org) {
      throw new NotFoundException(
        'No employer organization found with this email',
      );
    }

    if (org.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!org.emailVerificationCode || org.emailVerificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    org.emailVerified = true;
    org.emailVerificationCode = null;
    await this.orgRepo.save(org);

    this.logger.log(`Email verified for employer org: ${org.id}`);
    return { message: 'Email verified successfully' };
  }
}
