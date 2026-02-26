import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserNotificationPreferences,
  NotificationChannel,
} from '../entities/user-notification-preferences.entity';
import { NotificationType } from '../../../common/constants/status.constant';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(UserNotificationPreferences)
    private readonly prefsRepo: Repository<UserNotificationPreferences>,
  ) {}

  async getPreferences(
    userId: string,
  ): Promise<UserNotificationPreferences> {
    let prefs = await this.prefsRepo.findOne({ where: { userId } });

    if (!prefs) {
      prefs = this.prefsRepo.create({
        userId,
        preferences: this.getDefaultPreferences(),
        emailDigest: 'immediate',
      });
      await this.prefsRepo.save(prefs);
    }

    return prefs;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreferences> {
    const prefs = await this.getPreferences(userId);

    if (dto.preferences !== undefined) {
      prefs.preferences = { ...prefs.preferences, ...dto.preferences };
    }
    if (dto.emailDigest !== undefined) {
      prefs.emailDigest = dto.emailDigest;
    }
    if (dto.quietHoursStart !== undefined) {
      prefs.quietHoursStart = dto.quietHoursStart || null;
    }
    if (dto.quietHoursEnd !== undefined) {
      prefs.quietHoursEnd = dto.quietHoursEnd || null;
    }
    if (dto.browserPushEnabled !== undefined) {
      prefs.browserPushEnabled = dto.browserPushEnabled;
    }

    return this.prefsRepo.save(prefs);
  }

  async shouldSendChannel(
    userId: string,
    type: NotificationType,
    channel: 'in_app' | 'email',
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    const pref = prefs.preferences[type] || NotificationChannel.BOTH;

    if (pref === NotificationChannel.NONE) return false;
    if (pref === NotificationChannel.BOTH) return true;

    return (
      (channel === 'in_app' && pref === NotificationChannel.IN_APP) ||
      (channel === 'email' && pref === NotificationChannel.EMAIL)
    );
  }

  private getDefaultPreferences(): Record<string, NotificationChannel> {
    return Object.values(NotificationType).reduce(
      (acc, type) => {
        acc[type] = NotificationChannel.BOTH;
        return acc;
      },
      {} as Record<string, NotificationChannel>,
    );
  }
}
