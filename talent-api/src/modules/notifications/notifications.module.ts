import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { UserNotificationPreferences } from './entities/user-notification-preferences.entity';
import { NotificationsService } from './services/notifications.service';
import { EmailNotificationsService } from './services/email-notifications.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { EmailDigestService } from './services/email-digest.service';
import { NotificationEventListener } from './listeners/notification-event.listener';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationPreferencesController } from './controllers/notification-preferences.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, UserNotificationPreferences]),
    AuthModule,
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    EmailNotificationsService,
    NotificationPreferencesService,
    EmailDigestService,
    NotificationEventListener,
    NotificationsGateway,
  ],
  exports: [
    NotificationsService,
    EmailNotificationsService,
    NotificationPreferencesService,
    NotificationsGateway,
  ],
})
export class NotificationsModule {}
