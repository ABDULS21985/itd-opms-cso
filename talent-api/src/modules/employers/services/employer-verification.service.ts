import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmployerOrg } from '../entities/employer-org.entity';
import { EmployerVerificationStatus } from '../../../common/constants/status.constant';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';

@Injectable()
export class EmployerVerificationService {
  private readonly logger = new Logger(EmployerVerificationService.name);

  constructor(
    @InjectRepository(EmployerOrg)
    private readonly orgRepo: Repository<EmployerOrg>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async verifyEmployer(orgId: string, adminId: string): Promise<EmployerOrg> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['employerUsers'],
    });
    if (!org) {
      throw new NotFoundException(`Employer organization with ID ${orgId} not found`);
    }

    if (org.verificationStatus === EmployerVerificationStatus.VERIFIED) {
      throw new BadRequestException('Employer organization is already verified');
    }

    org.verificationStatus = EmployerVerificationStatus.VERIFIED;
    org.verifiedBy = adminId;
    org.verifiedAt = new Date();
    org.rejectionReason = null;

    const saved = await this.orgRepo.save(org);

    const ownerUser = org.employerUsers?.[0];
    if (ownerUser) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.EMPLOYER_VERIFIED, {
        userId: ownerUser.userId,
        userEmail: org.contactEmail,
        companyName: org.companyName,
      });
    }

    this.logger.log(`Employer ${orgId} verified by admin ${adminId}`);
    return saved;
  }

  async rejectEmployer(
    orgId: string,
    adminId: string,
    reason?: string,
  ): Promise<EmployerOrg> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['employerUsers'],
    });
    if (!org) {
      throw new NotFoundException(`Employer organization with ID ${orgId} not found`);
    }

    org.verificationStatus = EmployerVerificationStatus.REJECTED;
    org.verifiedBy = adminId;
    org.verifiedAt = new Date();
    org.rejectionReason = reason || null;

    const saved = await this.orgRepo.save(org);

    const ownerUser = org.employerUsers?.[0];
    if (ownerUser) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.EMPLOYER_REJECTED, {
        userId: ownerUser.userId,
        userEmail: org.contactEmail,
        companyName: org.companyName,
        reason,
      });
    }

    this.logger.log(`Employer ${orgId} rejected by admin ${adminId}`);
    return saved;
  }

  async suspendEmployer(
    orgId: string,
    adminId: string,
    reason?: string,
  ): Promise<EmployerOrg> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Employer organization with ID ${orgId} not found`);
    }

    org.verificationStatus = EmployerVerificationStatus.SUSPENDED;
    org.verifiedBy = adminId;
    org.verifiedAt = new Date();
    org.rejectionReason = reason || null;

    const saved = await this.orgRepo.save(org);
    this.logger.log(`Employer ${orgId} suspended by admin ${adminId}`);
    return saved;
  }
}
