import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import {
  ProfileApprovalStatus,
  ProfileVisibility,
} from '../../../common/constants/status.constant';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';

@Injectable()
export class CandidateApprovalService {
  private readonly logger = new Logger(CandidateApprovalService.name);

  constructor(
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async approveProfile(
    id: string,
    adminId: string,
  ): Promise<CandidateProfile> {
    const profile = await this.findProfileOrFail(id);

    if (profile.approvalStatus === ProfileApprovalStatus.APPROVED) {
      throw new BadRequestException('Profile is already approved');
    }

    profile.approvalStatus = ProfileApprovalStatus.APPROVED;
    profile.visibilityLevel = ProfileVisibility.PUBLIC;
    profile.approvedBy = adminId;
    profile.approvedAt = new Date();

    const saved = await this.profileRepo.save(profile);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.PROFILE_APPROVED, {
      userId: profile.user.id,
      userEmail: profile.user.email,
      candidateName: profile.user.displayName || profile.user.email,
    });

    this.logger.log(`Profile ${id} approved by admin ${adminId}`);
    return saved;
  }

  async rejectProfile(
    id: string,
    adminId: string,
    reason: string,
  ): Promise<CandidateProfile> {
    const profile = await this.findProfileOrFail(id);

    profile.approvalStatus = ProfileApprovalStatus.NEEDS_UPDATE;
    profile.adminNotes = reason;

    const saved = await this.profileRepo.save(profile);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.PROFILE_NEEDS_UPDATE, {
      userId: profile.user.id,
      userEmail: profile.user.email,
      candidateName: profile.user.displayName || profile.user.email,
      notes: reason,
    });

    this.logger.log(
      `Profile ${id} rejected (needs update) by admin ${adminId}: ${reason}`,
    );
    return saved;
  }

  async suspendProfile(
    id: string,
    adminId: string,
    reason: string,
  ): Promise<CandidateProfile> {
    const profile = await this.findProfileOrFail(id);

    profile.approvalStatus = ProfileApprovalStatus.SUSPENDED;
    profile.visibilityLevel = ProfileVisibility.PRIVATE;
    profile.adminNotes = reason;

    const saved = await this.profileRepo.save(profile);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.PROFILE_SUSPENDED, {
      userId: profile.user.id,
      userEmail: profile.user.email,
      candidateName: profile.user.displayName || profile.user.email,
      reason,
    });

    this.logger.log(
      `Profile ${id} suspended by admin ${adminId}: ${reason}`,
    );
    return saved;
  }

  async archiveProfile(
    id: string,
    adminId: string,
  ): Promise<CandidateProfile> {
    const profile = await this.findProfileOrFail(id);

    profile.approvalStatus = ProfileApprovalStatus.ARCHIVED;
    profile.visibilityLevel = ProfileVisibility.PRIVATE;

    const saved = await this.profileRepo.save(profile);

    this.logger.log(`Profile ${id} archived by admin ${adminId}`);
    return saved;
  }

  // ──────────────────────────────────────────────
  // Admin metadata updates
  // ──────────────────────────────────────────────

  async updateAdminNotes(id: string, notes: string): Promise<CandidateProfile> {
    const profile = await this.findProfileOrFail(id);
    profile.adminNotes = notes;
    return this.profileRepo.save(profile);
  }

  async updateInternalRatings(
    id: string,
    ratings: Record<string, any>,
  ): Promise<CandidateProfile> {
    const profile = await this.findProfileOrFail(id);
    profile.internalRatings = ratings;
    return this.profileRepo.save(profile);
  }

  async updateAdminFlags(
    id: string,
    flags: string[],
  ): Promise<CandidateProfile> {
    const profile = await this.findProfileOrFail(id);
    profile.adminFlags = flags;
    return this.profileRepo.save(profile);
  }

  async updateVisibility(
    id: string,
    visibilityLevel: ProfileVisibility,
  ): Promise<CandidateProfile> {
    const profile = await this.findProfileOrFail(id);
    profile.visibilityLevel = visibilityLevel;
    return this.profileRepo.save(profile);
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  private async findProfileOrFail(id: string): Promise<CandidateProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id },
      relations: ['user', 'primaryTrack', 'cohort'],
    });

    if (!profile) {
      throw new NotFoundException(`Candidate profile with ID ${id} not found`);
    }

    return profile;
  }
}
