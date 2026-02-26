import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEventListener } from './notification-event.listener';
import { NotificationsService } from '../services/notifications.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { EmailService } from '../../email/services/email.service';
import { NotificationType } from '../../../common/constants/status.constant';
import { Notification } from '../entities/notification.entity';

describe('NotificationEventListener', () => {
  let listener: NotificationEventListener;
  let notificationsService: jest.Mocked<NotificationsService>;
  let gateway: jest.Mocked<NotificationsGateway>;
  let emailService: jest.Mocked<EmailService>;

  const mockNotification = {
    id: 'notif-uuid-1',
    userId: 'user-uuid-123',
    type: NotificationType.PROFILE_APPROVED,
    title: 'Profile Approved',
    message: 'Your profile has been approved.',
    actionUrl: '/dashboard/profile',
    isRead: false,
    readAt: null,
    createdAt: new Date(),
  } as Notification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEventListener,
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockNotification),
          },
        },
        {
          provide: NotificationsGateway,
          useValue: {
            sendToUser: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendCandidateApproved: jest.fn().mockResolvedValue(undefined),
            sendCandidateNeedsUpdate: jest.fn().mockResolvedValue(undefined),
            sendIntroRequestApproved: jest.fn().mockResolvedValue(undefined),
            sendIntroRequestCreated: jest.fn().mockResolvedValue(undefined),
            sendEmployerVerified: jest.fn().mockResolvedValue(undefined),
            sendJobApplicationReceived: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    listener = module.get<NotificationEventListener>(
      NotificationEventListener,
    );
    notificationsService = module.get(NotificationsService);
    gateway = module.get(NotificationsGateway);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // Profile events
  // ──────────────────────────────────────────────

  describe('handleProfileApproved', () => {
    const event = {
      userId: 'user-uuid-123',
      userEmail: 'john@example.com',
      candidateName: 'John Doe',
    };

    it('should create an in-app notification', async () => {
      await listener.handleProfileApproved(event);

      expect(notificationsService.create).toHaveBeenCalledWith({
        userId: event.userId,
        type: NotificationType.PROFILE_APPROVED,
        title: 'Profile Approved',
        message:
          'Your profile has been approved and is now visible to employers.',
        actionUrl: '/dashboard/profile',
      });
    });

    it('should push notification via WebSocket', async () => {
      await listener.handleProfileApproved(event);

      expect(gateway.sendToUser).toHaveBeenCalledWith(
        event.userId,
        mockNotification,
      );
    });

    it('should send email when userEmail is provided', async () => {
      await listener.handleProfileApproved(event);

      expect(emailService.sendCandidateApproved).toHaveBeenCalledWith(
        event.userEmail,
        event.candidateName,
      );
    });

    it('should not send email when userEmail is not provided', async () => {
      await listener.handleProfileApproved({
        userId: 'user-uuid-123',
        candidateName: 'John Doe',
      } as any);

      expect(emailService.sendCandidateApproved).not.toHaveBeenCalled();
    });

    it('should not throw when email sending fails', async () => {
      emailService.sendCandidateApproved.mockRejectedValue(
        new Error('SMTP error'),
      );

      await expect(
        listener.handleProfileApproved(event),
      ).resolves.not.toThrow();
    });
  });

  describe('handleProfileNeedsUpdate', () => {
    const event = {
      userId: 'user-uuid-123',
      userEmail: 'john@example.com',
      candidateName: 'John Doe',
      notes: 'Please update your work experience',
    };

    it('should create notification with update notes in message', async () => {
      await listener.handleProfileNeedsUpdate(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.PROFILE_NEEDS_UPDATE,
          message: expect.stringContaining(event.notes),
        }),
      );
    });

    it('should push real-time notification', async () => {
      await listener.handleProfileNeedsUpdate(event);

      expect(gateway.sendToUser).toHaveBeenCalledWith(
        event.userId,
        mockNotification,
      );
    });
  });

  describe('handleProfileSuspended', () => {
    const event = {
      userId: 'user-uuid-123',
      reason: 'Policy violation',
    };

    it('should create suspension notification', async () => {
      await listener.handleProfileSuspended(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.PROFILE_SUSPENDED,
          message: expect.stringContaining(event.reason),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // Intro request events
  // ──────────────────────────────────────────────

  describe('handleIntroRequested', () => {
    const event = {
      adminUserIds: ['admin-1', 'admin-2'],
      employerName: 'TechCorp',
      candidateName: 'Jane Smith',
      roleTitle: 'Senior Developer',
    };

    it('should create a notification for each admin user', async () => {
      await listener.handleIntroRequested(event);

      expect(notificationsService.create).toHaveBeenCalledTimes(2);
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          type: NotificationType.INTRO_REQUESTED,
        }),
      );
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-2',
          type: NotificationType.INTRO_REQUESTED,
        }),
      );
    });

    it('should push WebSocket notification to each admin', async () => {
      await listener.handleIntroRequested(event);

      expect(gateway.sendToUser).toHaveBeenCalledTimes(2);
      expect(gateway.sendToUser).toHaveBeenCalledWith(
        'admin-1',
        mockNotification,
      );
      expect(gateway.sendToUser).toHaveBeenCalledWith(
        'admin-2',
        mockNotification,
      );
    });

    it('should include employer, candidate, and role in notification message', async () => {
      await listener.handleIntroRequested(event);

      const createCall = notificationsService.create.mock.calls[0][0];
      expect(createCall.message).toContain(event.employerName);
      expect(createCall.message).toContain(event.candidateName);
      expect(createCall.message).toContain(event.roleTitle);
    });
  });

  describe('handleIntroApproved', () => {
    const event = {
      userId: 'user-uuid-123',
      userEmail: 'john@example.com',
      candidateName: 'John Doe',
      employerName: 'TechCorp',
      roleTitle: 'Software Engineer',
    };

    it('should create intro approved notification', async () => {
      await listener.handleIntroApproved(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INTRO_APPROVED,
          userId: event.userId,
        }),
      );
    });

    it('should send email notification', async () => {
      await listener.handleIntroApproved(event);

      expect(emailService.sendIntroRequestApproved).toHaveBeenCalledWith(
        event.userEmail,
        event.candidateName,
        event.employerName,
        event.roleTitle,
      );
    });
  });

  describe('handleIntroDeclined', () => {
    it('should include reason in message when provided', async () => {
      const event = {
        userId: 'user-uuid-123',
        employerName: 'TechCorp',
        roleTitle: 'Developer',
        reason: 'Not enough experience',
      };

      await listener.handleIntroDeclined(event);

      const createCall = notificationsService.create.mock.calls[0][0];
      expect(createCall.message).toContain(event.reason);
    });

    it('should create notification without reason', async () => {
      const event = {
        userId: 'user-uuid-123',
        employerName: 'TechCorp',
        roleTitle: 'Developer',
      };

      await listener.handleIntroDeclined(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INTRO_DECLINED,
        }),
      );
    });
  });

  describe('handleIntroCandidateResponded', () => {
    it('should set title correctly when candidate accepted', async () => {
      const event = {
        userId: 'employer-user-123',
        candidateName: 'Jane Smith',
        employerName: 'TechCorp',
        roleTitle: 'Engineer',
        response: 'accepted' as const,
      };

      await listener.handleIntroCandidateResponded(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Candidate Accepted Intro',
        }),
      );
    });

    it('should set title correctly when candidate declined', async () => {
      const event = {
        userId: 'employer-user-123',
        candidateName: 'Jane Smith',
        employerName: 'TechCorp',
        roleTitle: 'Engineer',
        response: 'declined' as const,
      };

      await listener.handleIntroCandidateResponded(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Candidate Declined Intro',
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // Job events
  // ──────────────────────────────────────────────

  describe('handleJobPublished', () => {
    const event = {
      userId: 'employer-user-123',
      jobTitle: 'Full Stack Developer',
    };

    it('should create job published notification', async () => {
      await listener.handleJobPublished(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.JOB_PUBLISHED,
          message: expect.stringContaining(event.jobTitle),
          actionUrl: '/employer/jobs',
        }),
      );
    });

    it('should push via WebSocket', async () => {
      await listener.handleJobPublished(event);

      expect(gateway.sendToUser).toHaveBeenCalledWith(
        event.userId,
        mockNotification,
      );
    });
  });

  describe('handleJobRejected', () => {
    it('should include rejection reason when provided', async () => {
      const event = {
        userId: 'employer-user-123',
        jobTitle: 'Junior Developer',
        reason: 'Incomplete job description',
      };

      await listener.handleJobRejected(event);

      const createCall = notificationsService.create.mock.calls[0][0];
      expect(createCall.message).toContain(event.reason);
    });
  });

  // ──────────────────────────────────────────────
  // Employer events
  // ──────────────────────────────────────────────

  describe('handleEmployerVerified', () => {
    const event = {
      userId: 'employer-user-123',
      userEmail: 'admin@techcorp.com',
      companyName: 'TechCorp Ltd',
    };

    it('should create verification notification', async () => {
      await listener.handleEmployerVerified(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.EMPLOYER_VERIFIED,
          message: expect.stringContaining(event.companyName),
        }),
      );
    });

    it('should send verification email', async () => {
      await listener.handleEmployerVerified(event);

      expect(emailService.sendEmployerVerified).toHaveBeenCalledWith(
        event.userEmail,
        event.companyName,
      );
    });
  });

  describe('handleEmployerRejected', () => {
    it('should create rejection notification with reason', async () => {
      const event = {
        userId: 'employer-user-123',
        companyName: 'Fake Corp',
        reason: 'Could not verify registration',
      };

      await listener.handleEmployerRejected(event);

      const createCall = notificationsService.create.mock.calls[0][0];
      expect(createCall.type).toBe(NotificationType.EMPLOYER_REJECTED);
      expect(createCall.message).toContain(event.reason);
    });
  });

  // ──────────────────────────────────────────────
  // Placement events
  // ──────────────────────────────────────────────

  describe('handlePlacementUpdate', () => {
    const event = {
      userId: 'candidate-user-123',
      placementId: 'placement-uuid-1',
      candidateName: 'John Doe',
      employerName: 'TechCorp',
      newStatus: 'interviewing',
      oldStatus: 'in_discussion',
    };

    it('should create placement update notification', async () => {
      await listener.handlePlacementUpdate(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.PLACEMENT_UPDATE,
          message: expect.stringContaining(event.employerName),
          message: expect.stringContaining(event.newStatus),
        }),
      );
    });

    it('should include old and new status in the message', async () => {
      await listener.handlePlacementUpdate(event);

      const createCall = notificationsService.create.mock.calls[0][0];
      expect(createCall.message).toContain(event.oldStatus);
      expect(createCall.message).toContain(event.newStatus);
    });
  });

  // ──────────────────────────────────────────────
  // Application events
  // ──────────────────────────────────────────────

  describe('handleApplicationReceived', () => {
    const event = {
      userId: 'employer-user-123',
      userEmail: 'hr@techcorp.com',
      candidateName: 'Jane Smith',
      jobTitle: 'Frontend Developer',
    };

    it('should create application received notification', async () => {
      await listener.handleApplicationReceived(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.APPLICATION_RECEIVED,
          message: expect.stringContaining(event.candidateName),
          message: expect.stringContaining(event.jobTitle),
        }),
      );
    });

    it('should send email to employer', async () => {
      await listener.handleApplicationReceived(event);

      expect(emailService.sendJobApplicationReceived).toHaveBeenCalledWith(
        event.userEmail,
        event.candidateName,
        event.jobTitle,
      );
    });
  });

  describe('handleApplicationViewed', () => {
    it('should create application viewed notification', async () => {
      const event = {
        userId: 'candidate-user-123',
        jobTitle: 'Backend Developer',
      };

      await listener.handleApplicationViewed(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.APPLICATION_VIEWED,
        }),
      );
    });
  });

  describe('handleApplicationShortlisted', () => {
    it('should create shortlisted notification', async () => {
      const event = {
        userId: 'candidate-user-123',
        jobTitle: 'DevOps Engineer',
      };

      await listener.handleApplicationShortlisted(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.APPLICATION_SHORTLISTED,
          message: expect.stringContaining('shortlisted'),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // Admin events
  // ──────────────────────────────────────────────

  describe('handleNewCandidate', () => {
    const event = {
      adminUserIds: ['admin-1', 'admin-2', 'admin-3'],
      candidateName: 'New Candidate',
      candidateEmail: 'new@example.com',
    };

    it('should create notification for each admin', async () => {
      await listener.handleNewCandidate(event);

      expect(notificationsService.create).toHaveBeenCalledTimes(3);
    });

    it('should push to all admins via WebSocket', async () => {
      await listener.handleNewCandidate(event);

      expect(gateway.sendToUser).toHaveBeenCalledTimes(3);
    });

    it('should include candidate details in the message', async () => {
      await listener.handleNewCandidate(event);

      const createCall = notificationsService.create.mock.calls[0][0];
      expect(createCall.message).toContain(event.candidateName);
      expect(createCall.message).toContain(event.candidateEmail);
    });
  });

  describe('handleNewEmployer', () => {
    const event = {
      adminUserIds: ['admin-1'],
      companyName: 'NewCorp',
      contactEmail: 'contact@newcorp.com',
    };

    it('should create notification for admins', async () => {
      await listener.handleNewEmployer(event);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.NEW_EMPLOYER,
          message: expect.stringContaining(event.companyName),
        }),
      );
    });
  });
});
