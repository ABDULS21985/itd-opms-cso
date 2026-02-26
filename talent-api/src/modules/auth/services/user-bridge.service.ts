import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentUser } from '../../users/entities/talent-user.entity';
import { TalentUserType } from '../../../common/constants/status.constant';

@Injectable()
export class UserBridgeService {
  private readonly logger = new Logger(UserBridgeService.name);

  constructor(
    @InjectRepository(TalentUser)
    private readonly talentUserRepo: Repository<TalentUser>,
  ) {}

  async findOrCreateUser(
    externalUserId: string,
    email: string,
  ): Promise<TalentUser> {
    let user = await this.talentUserRepo.findOne({
      where: { externalUserId },
      relations: ['roles'],
    });

    if (!user) {
      this.logger.log(
        `Creating talent portal user for external ID: ${externalUserId}`,
      );
      user = this.talentUserRepo.create({
        externalUserId,
        email,
        userType: TalentUserType.CANDIDATE,
        permissions: [],
      });
      user = await this.talentUserRepo.save(user);
      // Reload with relations
      user = await this.talentUserRepo.findOne({
        where: { id: user.id },
        relations: ['roles'],
      }) as TalentUser;
    } else {
      // Update last active
      await this.talentUserRepo.update(user.id, {
        lastActiveAt: new Date(),
      });
    }

    return user;
  }

  async findByExternalId(externalUserId: string): Promise<TalentUser | null> {
    return this.talentUserRepo.findOne({
      where: { externalUserId },
      relations: ['roles'],
    });
  }
}
