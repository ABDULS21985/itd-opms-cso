import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreferencesService } from './notification-preferences.service';
import {
  UserNotificationPreferences,
  NotificationChannel,
} from '../entities/user-notification-preferences.entity';
import { NotificationType } from '../../../common/constants/status.constant';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let repo: jest.Mocked<Repository<UserNotificationPreferences>>;

  const mockUserId = 'user-uuid-123';

  const mockPrefs = {
    id: 'pref-uuid-1',
    userId: mockUserId,
    preferences: {
      [NotificationType.PROFILE_APPROVED]: NotificationChannel.BOTH,
      [NotificationType.INTRO_REQUESTED]: NotificationChannel.IN_APP,
      [NotificationType.JOB_PUBLISHED]: NotificationChannel.EMAIL,
      [NotificationType.SYSTEM_ALERT]: NotificationChannel.NONE,
    },
    emailDigest: 'immediate' as const,
    quietHoursStart: null,
    quietHoursEnd: null,
    browserPushEnabled: false,
  } as UserNotificationPreferences;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        {
          provide: getRepositoryToken(UserNotificationPreferences),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationPreferencesService>(
      NotificationPreferencesService,
    );
    repo = module.get(getRepositoryToken(UserNotificationPreferences));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return existing preferences for a user', async () => {
      repo.findOne.mockResolvedValue(mockPrefs);

      const result = await service.getPreferences(mockUserId);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(result).toEqual(mockPrefs);
      expect(result.emailDigest).toBe('immediate');
    });

    it('should create default preferences if none exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const defaultPrefs = {
        ...mockPrefs,
        preferences: expect.any(Object),
        emailDigest: 'immediate',
      };
      repo.create.mockReturnValue(defaultPrefs as any);
      repo.save.mockResolvedValue(defaultPrefs as any);

      const result = await service.getPreferences(mockUserId);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          emailDigest: 'immediate',
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('should set all notification types to BOTH by default', async () => {
      repo.findOne.mockResolvedValue(null);

      let capturedCreateArg: any;
      repo.create.mockImplementation((data: any) => {
        capturedCreateArg = data;
        return data as any;
      });
      repo.save.mockImplementation((data: any) => Promise.resolve(data));

      await service.getPreferences(mockUserId);

      const prefs = capturedCreateArg.preferences;
      // Check that every NotificationType has a default of BOTH
      for (const type of Object.values(NotificationType)) {
        expect(prefs[type]).toBe(NotificationChannel.BOTH);
      }
    });
  });

  describe('updatePreferences', () => {
    it('should merge preference updates into existing preferences', async () => {
      repo.findOne.mockResolvedValue({ ...mockPrefs });
      repo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.updatePreferences(mockUserId, {
        preferences: {
          [NotificationType.PROFILE_APPROVED]: NotificationChannel.EMAIL,
        },
      });

      expect(result.preferences[NotificationType.PROFILE_APPROVED]).toBe(
        NotificationChannel.EMAIL,
      );
      // Other preferences should remain unchanged
      expect(result.preferences[NotificationType.INTRO_REQUESTED]).toBe(
        NotificationChannel.IN_APP,
      );
    });

    it('should update emailDigest frequency', async () => {
      repo.findOne.mockResolvedValue({ ...mockPrefs });
      repo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.updatePreferences(mockUserId, {
        emailDigest: 'daily',
      });

      expect(result.emailDigest).toBe('daily');
    });

    it('should update quiet hours', async () => {
      repo.findOne.mockResolvedValue({ ...mockPrefs });
      repo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.updatePreferences(mockUserId, {
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      });

      expect(result.quietHoursStart).toBe('22:00');
      expect(result.quietHoursEnd).toBe('07:00');
    });

    it('should update browserPushEnabled', async () => {
      repo.findOne.mockResolvedValue({ ...mockPrefs });
      repo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.updatePreferences(mockUserId, {
        browserPushEnabled: true,
      });

      expect(result.browserPushEnabled).toBe(true);
    });

    it('should clear quiet hours when empty strings are passed', async () => {
      const prefsWithQuietHours = {
        ...mockPrefs,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      } as UserNotificationPreferences;
      repo.findOne.mockResolvedValue({ ...prefsWithQuietHours });
      repo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.updatePreferences(mockUserId, {
        quietHoursStart: '',
        quietHoursEnd: '',
      });

      expect(result.quietHoursStart).toBeNull();
      expect(result.quietHoursEnd).toBeNull();
    });

    it('should handle partial updates without affecting other fields', async () => {
      repo.findOne.mockResolvedValue({ ...mockPrefs });
      repo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.updatePreferences(mockUserId, {
        emailDigest: 'weekly',
      });

      // preferences and browserPushEnabled should remain unchanged
      expect(result.preferences).toEqual(mockPrefs.preferences);
      expect(result.browserPushEnabled).toBe(false);
      expect(result.emailDigest).toBe('weekly');
    });
  });

  describe('shouldSendChannel', () => {
    it('should return true for in_app when preference is BOTH', async () => {
      repo.findOne.mockResolvedValue(mockPrefs);

      const result = await service.shouldSendChannel(
        mockUserId,
        NotificationType.PROFILE_APPROVED,
        'in_app',
      );

      expect(result).toBe(true);
    });

    it('should return true for email when preference is BOTH', async () => {
      repo.findOne.mockResolvedValue(mockPrefs);

      const result = await service.shouldSendChannel(
        mockUserId,
        NotificationType.PROFILE_APPROVED,
        'email',
      );

      expect(result).toBe(true);
    });

    it('should return true for in_app when preference is IN_APP', async () => {
      repo.findOne.mockResolvedValue(mockPrefs);

      const result = await service.shouldSendChannel(
        mockUserId,
        NotificationType.INTRO_REQUESTED,
        'in_app',
      );

      expect(result).toBe(true);
    });

    it('should return false for email when preference is IN_APP', async () => {
      repo.findOne.mockResolvedValue(mockPrefs);

      const result = await service.shouldSendChannel(
        mockUserId,
        NotificationType.INTRO_REQUESTED,
        'email',
      );

      expect(result).toBe(false);
    });

    it('should return true for email when preference is EMAIL', async () => {
      repo.findOne.mockResolvedValue(mockPrefs);

      const result = await service.shouldSendChannel(
        mockUserId,
        NotificationType.JOB_PUBLISHED,
        'email',
      );

      expect(result).toBe(true);
    });

    it('should return false for in_app when preference is EMAIL', async () => {
      repo.findOne.mockResolvedValue(mockPrefs);

      const result = await service.shouldSendChannel(
        mockUserId,
        NotificationType.JOB_PUBLISHED,
        'in_app',
      );

      expect(result).toBe(false);
    });

    it('should return false for both channels when preference is NONE', async () => {
      repo.findOne.mockResolvedValue(mockPrefs);

      const resultInApp = await service.shouldSendChannel(
        mockUserId,
        NotificationType.SYSTEM_ALERT,
        'in_app',
      );
      const resultEmail = await service.shouldSendChannel(
        mockUserId,
        NotificationType.SYSTEM_ALERT,
        'email',
      );

      expect(resultInApp).toBe(false);
      expect(resultEmail).toBe(false);
    });

    it('should default to BOTH when preference for type is not set', async () => {
      const prefsWithoutType = {
        ...mockPrefs,
        preferences: {}, // No preferences set
      } as UserNotificationPreferences;
      repo.findOne.mockResolvedValue(prefsWithoutType);

      const result = await service.shouldSendChannel(
        mockUserId,
        NotificationType.PLACEMENT_UPDATE,
        'in_app',
      );

      expect(result).toBe(true);
    });
  });
});
