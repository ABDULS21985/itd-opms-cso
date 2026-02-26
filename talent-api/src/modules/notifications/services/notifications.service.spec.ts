import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../../../common/constants/status.constant';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: jest.Mocked<Repository<Notification>>;

  const mockUserId = 'user-uuid-123';
  const mockNotification = {
    id: 'notif-uuid-1',
    userId: mockUserId,
    type: NotificationType.PROFILE_APPROVED,
    title: 'Profile Approved',
    message: 'Your profile has been approved.',
    actionUrl: '/dashboard/profile',
    isRead: false,
    readAt: null,
    emailSent: false,
    createdAt: new Date('2026-02-17T10:00:00Z'),
    updatedAt: new Date('2026-02-17T10:00:00Z'),
  } as Notification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repo = module.get(getRepositoryToken(Notification));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a new notification', async () => {
      const createData = {
        userId: mockUserId,
        type: NotificationType.PROFILE_APPROVED,
        title: 'Profile Approved',
        message: 'Your profile has been approved.',
        actionUrl: '/dashboard/profile',
      };

      repo.create.mockReturnValue(mockNotification);
      repo.save.mockResolvedValue(mockNotification);

      const result = await service.create(createData);

      expect(repo.create).toHaveBeenCalledWith(createData);
      expect(repo.save).toHaveBeenCalledWith(mockNotification);
      expect(result).toEqual(mockNotification);
      expect(result.type).toBe(NotificationType.PROFILE_APPROVED);
    });

    it('should create notification without optional actionUrl', async () => {
      const createData = {
        userId: mockUserId,
        type: NotificationType.SYSTEM_ALERT,
        title: 'System Update',
        message: 'Maintenance window scheduled.',
      };

      const notifWithoutUrl = { ...mockNotification, actionUrl: null };
      repo.create.mockReturnValue(notifWithoutUrl as Notification);
      repo.save.mockResolvedValue(notifWithoutUrl as Notification);

      const result = await service.create(createData);

      expect(repo.create).toHaveBeenCalledWith(createData);
      expect(result.actionUrl).toBeNull();
    });

    it('should create notifications for different types', async () => {
      const types = [
        NotificationType.INTRO_REQUESTED,
        NotificationType.JOB_PUBLISHED,
        NotificationType.EMPLOYER_VERIFIED,
        NotificationType.PLACEMENT_UPDATE,
        NotificationType.APPLICATION_RECEIVED,
      ];

      for (const type of types) {
        const createData = {
          userId: mockUserId,
          type,
          title: `Test ${type}`,
          message: `Message for ${type}`,
        };

        const notif = { ...mockNotification, type, id: `notif-${type}` };
        repo.create.mockReturnValue(notif as Notification);
        repo.save.mockResolvedValue(notif as Notification);

        const result = await service.create(createData);
        expect(result.type).toBe(type);
      }

      expect(repo.create).toHaveBeenCalledTimes(types.length);
    });
  });

  describe('findByUser', () => {
    it('should return paginated notifications for a user', async () => {
      const notifications = [
        mockNotification,
        { ...mockNotification, id: 'notif-uuid-2', title: 'Second' },
      ] as Notification[];

      repo.findAndCount.mockResolvedValue([notifications, 2]);

      const result = await service.findByUser(mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should correctly paginate with page 2', async () => {
      repo.findAndCount.mockResolvedValue([[], 25]);

      const result = await service.findByUser(mockUserId, {
        page: 2,
        limit: 10,
      });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
    });

    it('should use default pagination when not provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findByUser(mockUserId, {});

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should return empty data array when user has no notifications', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findByUser(mockUserId, { page: 1 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should order notifications by createdAt DESC', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findByUser(mockUserId, {});

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read with timestamp', async () => {
      const beforeDate = new Date();
      repo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await service.markAsRead('notif-uuid-1', mockUserId);

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'notif-uuid-1', userId: mockUserId },
        expect.objectContaining({
          isRead: true,
          readAt: expect.any(Date),
        }),
      );

      const updateCall = repo.update.mock.calls[0][1] as any;
      expect(updateCall.readAt.getTime()).toBeGreaterThanOrEqual(
        beforeDate.getTime(),
      );
    });

    it('should scope the update to the correct user', async () => {
      repo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await service.markAsRead('notif-uuid-1', 'other-user');

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'notif-uuid-1', userId: 'other-user' },
        expect.anything(),
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      repo.update.mockResolvedValue({ affected: 5, raw: [], generatedMaps: [] });

      await service.markAllAsRead(mockUserId);

      expect(repo.update).toHaveBeenCalledWith(
        { userId: mockUserId, isRead: false },
        expect.objectContaining({
          isRead: true,
          readAt: expect.any(Date),
        }),
      );
    });

    it('should only target unread notifications', async () => {
      repo.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

      await service.markAllAsRead(mockUserId);

      const whereClause = repo.update.mock.calls[0][0] as any;
      expect(whereClause.isRead).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread notifications', async () => {
      repo.count.mockResolvedValue(7);

      const result = await service.getUnreadCount(mockUserId);

      expect(repo.count).toHaveBeenCalledWith({
        where: { userId: mockUserId, isRead: false },
      });
      expect(result).toBe(7);
    });

    it('should return 0 when all notifications are read', async () => {
      repo.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(mockUserId);

      expect(result).toBe(0);
    });

    it('should scope the count to the specific user', async () => {
      repo.count.mockResolvedValue(3);

      await service.getUnreadCount('specific-user-id');

      expect(repo.count).toHaveBeenCalledWith({
        where: { userId: 'specific-user-id', isRead: false },
      });
    });
  });
});
