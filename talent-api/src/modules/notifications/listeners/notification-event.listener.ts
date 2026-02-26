import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../services/notifications.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import { EmailService } from '../../email/services/email.service';
import { NotificationType } from '../../../common/constants/status.constant';
import {
  NOTIFICATION_EVENTS,
  ProfileApprovedEvent,
  ProfileNeedsUpdateEvent,
  ProfileSuspendedEvent,
  IntroRequestedEvent,
  IntroApprovedEvent,
  IntroDeclinedEvent,
  IntroCandidateRespondedEvent,
  JobPublishedEvent,
  JobRejectedEvent,
  ApplicationReceivedEvent,
  ApplicationStatusEvent,
  EmployerVerifiedEvent,
  EmployerRejectedEvent,
  PlacementUpdateEvent,
  NewCandidateEvent,
  NewEmployerEvent,
  InterviewScheduledEvent,
  InterviewCancelledEvent,
  CandidateStageMovedEvent,
  MentionInNoteEvent,
  TeamInviteEvent,
} from '../events/notification.events';

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly notificationPreferencesService: NotificationPreferencesService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Helper that respects user notification preferences before sending.
   * Checks the in_app channel preference before creating a DB notification
   * and pushing via WebSocket, and checks the email channel preference
   * before invoking the optional email callback.
   */
  private async sendNotification(
    userId: string,
    type: NotificationType,
    data: { title: string; message: string; actionUrl: string },
    emailCallback?: () => Promise<void>,
  ): Promise<any | null> {
    let notification: any = null;

    const shouldInApp =
      await this.notificationPreferencesService.shouldSendChannel(
        userId,
        type,
        'in_app',
      );

    if (shouldInApp) {
      notification = await this.notificationsService.create({
        userId,
        type,
        ...data,
      });
      this.notificationsGateway.sendToUser(userId, notification);
    }

    if (emailCallback) {
      const shouldEmail =
        await this.notificationPreferencesService.shouldSendChannel(
          userId,
          type,
          'email',
        );

      if (shouldEmail) {
        await emailCallback().catch((err) =>
          this.logger.error(`Failed to send email: ${err.message}`),
        );
      }
    }

    return notification;
  }

  // ──────────────────────────────────────────────
  // Profile events
  // ──────────────────────────────────────────────

  @OnEvent(NOTIFICATION_EVENTS.PROFILE_APPROVED)
  async handleProfileApproved(event: ProfileApprovedEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.PROFILE_APPROVED,
      {
        title: 'Profile Approved',
        message:
          'Your profile has been approved and is now visible to employers.',
        actionUrl: '/dashboard/profile',
      },
      event.userEmail
        ? () =>
            this.emailService.sendCandidateApproved(
              event.userEmail!,
              event.candidateName,
            )
        : undefined,
    );

    this.logger.log(
      `Profile approved notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.PROFILE_NEEDS_UPDATE)
  async handleProfileNeedsUpdate(
    event: ProfileNeedsUpdateEvent,
  ): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.PROFILE_NEEDS_UPDATE,
      {
        title: 'Profile Needs Updates',
        message: `Your profile needs some updates: ${event.notes}`,
        actionUrl: '/dashboard/profile',
      },
      event.userEmail
        ? () =>
            this.emailService.sendCandidateNeedsUpdate(
              event.userEmail!,
              event.candidateName,
              event.notes,
            )
        : undefined,
    );

    this.logger.log(
      `Profile needs-update notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.PROFILE_SUSPENDED)
  async handleProfileSuspended(event: ProfileSuspendedEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.PROFILE_SUSPENDED,
      {
        title: 'Profile Suspended',
        message: `Your profile has been suspended: ${event.reason}`,
        actionUrl: '/dashboard/profile',
      },
    );

    this.logger.log(
      `Profile suspended notification sent to user ${event.userId}`,
    );
  }

  // ──────────────────────────────────────────────
  // Intro request events
  // ──────────────────────────────────────────────

  @OnEvent(NOTIFICATION_EVENTS.INTRO_REQUESTED)
  async handleIntroRequested(event: IntroRequestedEvent): Promise<void> {
    for (const adminId of event.adminUserIds) {
      await this.sendNotification(
        adminId,
        NotificationType.INTRO_REQUESTED,
        {
          title: 'New Intro Request',
          message: `${event.employerName} has requested an introduction to ${event.candidateName} for ${event.roleTitle}.`,
          actionUrl: '/admin/intro-requests',
        },
      );
    }

    this.logger.log(
      `Intro request notifications sent to ${event.adminUserIds.length} admins`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.INTRO_APPROVED)
  async handleIntroApproved(event: IntroApprovedEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.INTRO_APPROVED,
      {
        title: 'Intro Request Approved',
        message: `Your introduction to ${event.employerName} for ${event.roleTitle} has been approved.`,
        actionUrl: '/dashboard/intro-requests',
      },
      event.userEmail
        ? () =>
            this.emailService.sendIntroRequestApproved(
              event.userEmail!,
              event.candidateName,
              event.employerName,
              event.roleTitle,
            )
        : undefined,
    );

    this.logger.log(
      `Intro approved notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.INTRO_DECLINED)
  async handleIntroDeclined(event: IntroDeclinedEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.INTRO_DECLINED,
      {
        title: 'Intro Request Declined',
        message: `Your introduction request for ${event.roleTitle} at ${event.employerName} was declined.${event.reason ? ` Reason: ${event.reason}` : ''}`,
        actionUrl: '/dashboard/intro-requests',
      },
    );

    this.logger.log(
      `Intro declined notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.INTRO_CANDIDATE_RESPONDED)
  async handleIntroCandidateResponded(
    event: IntroCandidateRespondedEvent,
  ): Promise<void> {
    const accepted = event.response === 'accepted';

    await this.sendNotification(
      event.userId,
      NotificationType.INTRO_RESPONSE,
      {
        title: accepted
          ? 'Candidate Accepted Intro'
          : 'Candidate Declined Intro',
        message: `${event.candidateName} has ${event.response} the introduction for ${event.roleTitle} at ${event.employerName}.`,
        actionUrl: '/employer/intro-requests',
      },
    );

    this.logger.log(
      `Intro response notification sent to user ${event.userId}`,
    );
  }

  // ──────────────────────────────────────────────
  // Job events
  // ──────────────────────────────────────────────

  @OnEvent(NOTIFICATION_EVENTS.JOB_PUBLISHED)
  async handleJobPublished(event: JobPublishedEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.JOB_PUBLISHED,
      {
        title: 'Job Published',
        message: `Your job post "${event.jobTitle}" has been approved and published.`,
        actionUrl: '/employer/jobs',
      },
    );

    this.logger.log(
      `Job published notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.JOB_REJECTED)
  async handleJobRejected(event: JobRejectedEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.JOB_REJECTED,
      {
        title: 'Job Post Rejected',
        message: `Your job post "${event.jobTitle}" was rejected.${event.reason ? ` Reason: ${event.reason}` : ''}`,
        actionUrl: '/employer/jobs',
      },
    );

    this.logger.log(
      `Job rejected notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.APPLICATION_RECEIVED)
  async handleApplicationReceived(
    event: ApplicationReceivedEvent,
  ): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.APPLICATION_RECEIVED,
      {
        title: 'New Application Received',
        message: `${event.candidateName} has applied for ${event.jobTitle}.`,
        actionUrl: '/employer/jobs',
      },
      event.userEmail
        ? () =>
            this.emailService.sendJobApplicationReceived(
              event.userEmail!,
              event.candidateName,
              event.jobTitle,
            )
        : undefined,
    );

    this.logger.log(
      `Application received notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.APPLICATION_VIEWED)
  async handleApplicationViewed(event: ApplicationStatusEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.APPLICATION_VIEWED,
      {
        title: 'Application Viewed',
        message: `Your application for "${event.jobTitle}" has been viewed.`,
        actionUrl: '/dashboard/applications',
      },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.APPLICATION_SHORTLISTED)
  async handleApplicationShortlisted(
    event: ApplicationStatusEvent,
  ): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.APPLICATION_SHORTLISTED,
      {
        title: 'Application Shortlisted',
        message: `Your application for "${event.jobTitle}" has been shortlisted!`,
        actionUrl: '/dashboard/applications',
      },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.APPLICATION_REJECTED)
  async handleApplicationRejected(
    event: ApplicationStatusEvent,
  ): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.APPLICATION_REJECTED,
      {
        title: 'Application Update',
        message: `Your application for "${event.jobTitle}" was not selected.`,
        actionUrl: '/dashboard/applications',
      },
    );
  }

  // ──────────────────────────────────────────────
  // Employer events
  // ──────────────────────────────────────────────

  @OnEvent(NOTIFICATION_EVENTS.EMPLOYER_VERIFIED)
  async handleEmployerVerified(event: EmployerVerifiedEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.EMPLOYER_VERIFIED,
      {
        title: 'Organization Verified',
        message: `${event.companyName} has been verified. You can now browse candidates and post jobs.`,
        actionUrl: '/employer',
      },
      event.userEmail
        ? () =>
            this.emailService.sendEmployerVerified(
              event.userEmail!,
              event.companyName,
            )
        : undefined,
    );

    this.logger.log(
      `Employer verified notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.EMPLOYER_REJECTED)
  async handleEmployerRejected(event: EmployerRejectedEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.EMPLOYER_REJECTED,
      {
        title: 'Organization Verification Rejected',
        message: `${event.companyName} verification was rejected.${event.reason ? ` Reason: ${event.reason}` : ''}`,
        actionUrl: '/employer/settings',
      },
    );

    this.logger.log(
      `Employer rejected notification sent to user ${event.userId}`,
    );
  }

  // ──────────────────────────────────────────────
  // Placement events
  // ──────────────────────────────────────────────

  @OnEvent(NOTIFICATION_EVENTS.PLACEMENT_UPDATE)
  async handlePlacementUpdate(event: PlacementUpdateEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.PLACEMENT_UPDATE,
      {
        title: 'Placement Update',
        message: `Placement with ${event.employerName} moved from ${event.oldStatus} to ${event.newStatus}.`,
        actionUrl: '/dashboard',
      },
    );

    this.logger.log(
      `Placement update notification sent to user ${event.userId}`,
    );
  }

  // ──────────────────────────────────────────────
  // Admin events
  // ──────────────────────────────────────────────

  @OnEvent(NOTIFICATION_EVENTS.NEW_CANDIDATE)
  async handleNewCandidate(event: NewCandidateEvent): Promise<void> {
    for (const adminId of event.adminUserIds) {
      await this.sendNotification(
        adminId,
        NotificationType.NEW_CANDIDATE,
        {
          title: 'New Candidate Registration',
          message: `${event.candidateName} (${event.candidateEmail}) has registered as a new candidate.`,
          actionUrl: '/admin/candidates',
        },
      );
    }

    this.logger.log(
      `New candidate notifications sent to ${event.adminUserIds.length} admins`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.NEW_EMPLOYER)
  async handleNewEmployer(event: NewEmployerEvent): Promise<void> {
    for (const adminId of event.adminUserIds) {
      await this.sendNotification(
        adminId,
        NotificationType.NEW_EMPLOYER,
        {
          title: 'New Employer Registration',
          message: `${event.companyName} (${event.contactEmail}) has registered and needs verification.`,
          actionUrl: '/admin/employers',
        },
      );
    }

    this.logger.log(
      `New employer notifications sent to ${event.adminUserIds.length} admins`,
    );
  }

  // ──────────────────────────────────────────────
  // Interview events
  // ──────────────────────────────────────────────

  @OnEvent(NOTIFICATION_EVENTS.INTERVIEW_SCHEDULED)
  async handleInterviewScheduled(
    event: InterviewScheduledEvent,
  ): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.INTERVIEW_SCHEDULED,
      {
        title: 'Interview Scheduled',
        message: `A ${event.interviewType} interview has been scheduled for ${new Date(event.scheduledAt).toLocaleDateString()}.`,
        actionUrl: '/employer/interviews',
      },
    );

    this.logger.log(
      `Interview scheduled notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.INTERVIEW_CANCELLED)
  async handleInterviewCancelled(
    event: InterviewCancelledEvent,
  ): Promise<void> {
    this.logger.log(
      `Interview cancelled for candidate ${event.candidateId}`,
    );
  }

  // ──────────────────────────────────────────────
  // Pipeline events
  // ──────────────────────────────────────────────

  @OnEvent(NOTIFICATION_EVENTS.CANDIDATE_STAGE_MOVED)
  async handleCandidateStageMoved(
    event: CandidateStageMovedEvent,
  ): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.CANDIDATE_STAGE_MOVED,
      {
        title: 'Pipeline Stage Update',
        message: `${event.candidateName} was moved from "${event.fromStage}" to "${event.toStage}" in pipeline "${event.pipelineName}".`,
        actionUrl: '/employer/pipeline',
      },
    );

    this.logger.log(
      `Candidate stage moved notification sent to user ${event.userId}`,
    );
  }

  // ──────────────────────────────────────────────
  // Collaboration events
  // ──────────────────────────────────────────────

  @OnEvent(NOTIFICATION_EVENTS.MENTION_IN_NOTE)
  async handleMentionInNote(event: MentionInNoteEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.MENTION_IN_NOTE,
      {
        title: 'You were mentioned in a note',
        message: `You were mentioned in a note about ${event.candidateName}.`,
        actionUrl: `/employer/candidates`,
      },
    );

    this.logger.log(
      `Mention notification sent to user ${event.userId}`,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.TEAM_INVITE)
  async handleTeamInvite(event: TeamInviteEvent): Promise<void> {
    await this.sendNotification(
      event.userId,
      NotificationType.TEAM_INVITE,
      {
        title: 'Team Invitation',
        message: `${event.invitedBy} invited you to join ${event.companyName}.`,
        actionUrl: '/employer',
      },
    );

    this.logger.log(
      `Team invite notification sent to user ${event.userId}`,
    );
  }
}
