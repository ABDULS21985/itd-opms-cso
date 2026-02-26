import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, MoreThan } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { UserNotificationPreferences } from '../entities/user-notification-preferences.entity';
import { EmailService } from '../../email/services/email.service';

@Injectable()
export class EmailDigestService {
  private readonly logger = new Logger(EmailDigestService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(UserNotificationPreferences)
    private readonly prefsRepo: Repository<UserNotificationPreferences>,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDailyDigests(): Promise<void> {
    this.logger.log('Starting daily notification digest...');

    const users = await this.prefsRepo.find({
      where: { emailDigest: 'daily' },
      relations: ['user'],
    });

    const since = new Date();
    since.setHours(since.getHours() - 24);

    let sentCount = 0;

    for (const prefs of users) {
      try {
        const notifications = await this.notificationRepo.find({
          where: {
            userId: prefs.userId,
            emailSent: false,
            createdAt: MoreThan(since),
          },
          order: { createdAt: 'DESC' },
          take: 50,
        });

        if (notifications.length === 0) continue;

        const items = notifications.map((n) => ({
          title: n.title,
          message: n.message,
          time: n.createdAt.toLocaleString(),
          url: n.actionUrl || '',
        }));

        await this.emailService.sendTemplatedEmail(
          prefs.user.email,
          `Daily Notification Summary - ${notifications.length} updates`,
          'notification-digest',
          {
            userName: prefs.user.displayName || prefs.user.email,
            period: 'daily',
            count: notifications.length,
            items,
          },
        );

        await this.notificationRepo.update(
          notifications.map((n) => n.id),
          { emailSent: true },
        );

        sentCount++;
      } catch (error) {
        this.logger.error(
          `Failed to send daily digest for user ${prefs.userId}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Daily digest completed: sent to ${sentCount}/${users.length} users`,
    );
  }

  @Cron('0 8 * * 1') // Every Monday at 8am
  async sendWeeklyDigests(): Promise<void> {
    this.logger.log('Starting weekly notification digest...');

    const users = await this.prefsRepo.find({
      where: { emailDigest: 'weekly' },
      relations: ['user'],
    });

    const since = new Date();
    since.setDate(since.getDate() - 7);

    let sentCount = 0;

    for (const prefs of users) {
      try {
        const notifications = await this.notificationRepo.find({
          where: {
            userId: prefs.userId,
            emailSent: false,
            createdAt: MoreThan(since),
          },
          order: { createdAt: 'DESC' },
          take: 100,
        });

        if (notifications.length === 0) continue;

        const items = notifications.map((n) => ({
          title: n.title,
          message: n.message,
          time: n.createdAt.toLocaleString(),
          url: n.actionUrl || '',
        }));

        await this.emailService.sendTemplatedEmail(
          prefs.user.email,
          `Weekly Notification Report - ${notifications.length} updates`,
          'notification-digest',
          {
            userName: prefs.user.displayName || prefs.user.email,
            period: 'weekly',
            count: notifications.length,
            items,
          },
        );

        await this.notificationRepo.update(
          notifications.map((n) => n.id),
          { emailSent: true },
        );

        sentCount++;
      } catch (error) {
        this.logger.error(
          `Failed to send weekly digest for user ${prefs.userId}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Weekly digest completed: sent to ${sentCount}/${users.length} users`,
    );
  }
}
