import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailService } from '../../email/services/email.service';
import { NotificationType } from '../../../common/constants/status.constant';

@Injectable()
export class EmailNotificationsService {
  private readonly logger = new Logger(EmailNotificationsService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  // ──────────────────────────────────────────────
  // Profile notifications
  // ──────────────────────────────────────────────

  async notifyProfileApproved(
    userId: string,
    candidateEmail: string,
    candidateName: string,
  ): Promise<void> {
    await Promise.all([
      this.notificationsService.create({
        userId,
        type: NotificationType.PROFILE_APPROVED,
        title: 'Profile Approved',
        message: 'Your profile has been approved and is now visible to employers.',
        actionUrl: '/dashboard/profile',
      }),
      this.emailService.sendCandidateApproved(candidateEmail, candidateName),
    ]);

    this.logger.log(`Profile approved notification sent to user ${userId}`);
  }

  async notifyProfileNeedsUpdate(
    userId: string,
    candidateEmail: string,
    candidateName: string,
    notes: string,
  ): Promise<void> {
    await Promise.all([
      this.notificationsService.create({
        userId,
        type: NotificationType.PROFILE_NEEDS_UPDATE,
        title: 'Profile Needs Updates',
        message: `Your profile needs some updates: ${notes}`,
        actionUrl: '/dashboard/profile',
      }),
      this.emailService.sendCandidateNeedsUpdate(
        candidateEmail,
        candidateName,
        notes,
      ),
    ]);

    this.logger.log(`Profile needs-update notification sent to user ${userId}`);
  }

  // ──────────────────────────────────────────────
  // Intro request notifications
  // ──────────────────────────────────────────────

  async notifyIntroRequested(
    adminUserIds: string[],
    employerName: string,
    candidateName: string,
    roleTitle: string,
  ): Promise<void> {
    const notificationPromises = adminUserIds.map((adminId) =>
      this.notificationsService.create({
        userId: adminId,
        type: NotificationType.INTRO_REQUESTED,
        title: 'New Intro Request',
        message: `${employerName} has requested an introduction to ${candidateName} for ${roleTitle}.`,
        actionUrl: '/admin/intro-requests',
      }),
    );

    await Promise.all(notificationPromises);

    this.logger.log(
      `Intro request notifications sent to ${adminUserIds.length} admins`,
    );
  }

  async notifyIntroApproved(
    userId: string,
    candidateEmail: string,
    candidateName: string,
    employerName: string,
    roleTitle: string,
  ): Promise<void> {
    await Promise.all([
      this.notificationsService.create({
        userId,
        type: NotificationType.INTRO_APPROVED,
        title: 'Intro Request Approved',
        message: `Your introduction to ${employerName} for ${roleTitle} has been approved.`,
        actionUrl: '/dashboard/intro-requests',
      }),
      this.emailService.sendIntroRequestApproved(
        candidateEmail,
        candidateName,
        employerName,
        roleTitle,
      ),
    ]);

    this.logger.log(`Intro approved notification sent to user ${userId}`);
  }

  // ──────────────────────────────────────────────
  // Employer notifications
  // ──────────────────────────────────────────────

  async notifyEmployerVerified(
    userId: string,
    employerEmail: string,
    companyName: string,
  ): Promise<void> {
    await Promise.all([
      this.notificationsService.create({
        userId,
        type: NotificationType.EMPLOYER_VERIFIED,
        title: 'Organization Verified',
        message: `${companyName} has been verified. You can now browse candidates and post jobs.`,
        actionUrl: '/employer',
      }),
      this.emailService.sendEmployerVerified(employerEmail, companyName),
    ]);

    this.logger.log(`Employer verified notification sent to user ${userId}`);
  }

  // ──────────────────────────────────────────────
  // Job application notifications
  // ──────────────────────────────────────────────

  async notifyJobApplicationReceived(
    userId: string,
    employerEmail: string,
    candidateName: string,
    jobTitle: string,
  ): Promise<void> {
    await Promise.all([
      this.notificationsService.create({
        userId,
        type: NotificationType.APPLICATION_VIEWED,
        title: 'New Application Received',
        message: `${candidateName} has applied for ${jobTitle}.`,
        actionUrl: '/employer/jobs',
      }),
      this.emailService.sendJobApplicationReceived(
        employerEmail,
        candidateName,
        jobTitle,
      ),
    ]);

    this.logger.log(
      `Job application notification sent to user ${userId}`,
    );
  }
}
