import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from '../services/notifications.service';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../../../common/constants/status.constant';
import { PaginationMeta } from '../../../common/dto/pagination.dto';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<NotificationsService>;

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
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Notification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            findByUser: jest.fn(),
            getUnreadCount: jest.fn(),
            markAllAsRead: jest.fn(),
            markAsRead: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /me/notifications', () => {
    it('should return paginated notifications for the current user', async () => {
      const paginatedResult = {
        data: [mockNotification],
        meta: new PaginationMeta(1, 1, 20),
      };
      notificationsService.findByUser.mockResolvedValue(paginatedResult);

      const result = await controller.getNotifications(mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(notificationsService.findByUser).toHaveBeenCalledWith(
        mockUserId,
        { page: 1, limit: 20 },
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe(NotificationType.PROFILE_APPROVED);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty data when user has no notifications', async () => {
      const emptyResult = {
        data: [],
        meta: new PaginationMeta(0, 1, 20),
      };
      notificationsService.findByUser.mockResolvedValue(emptyResult);

      const result = await controller.getNotifications(mockUserId, {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should pass pagination parameters correctly', async () => {
      notificationsService.findByUser.mockResolvedValue({
        data: [],
        meta: new PaginationMeta(0, 3, 5),
      });

      await controller.getNotifications(mockUserId, { page: 3, limit: 5 });

      expect(notificationsService.findByUser).toHaveBeenCalledWith(
        mockUserId,
        { page: 3, limit: 5 },
      );
    });
  });

  describe('GET /me/notifications/unread-count', () => {
    it('should return unread notification count', async () => {
      notificationsService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount(mockUserId);

      expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result).toEqual({ data: { count: 5 } });
    });

    it('should return 0 when all notifications are read', async () => {
      notificationsService.getUnreadCount.mockResolvedValue(0);

      const result = await controller.getUnreadCount(mockUserId);

      expect(result).toEqual({ data: { count: 0 } });
    });
  });

  describe('PUT /me/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      notificationsService.markAllAsRead.mockResolvedValue(undefined);

      const result = await controller.markAllAsRead(mockUserId);

      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result).toEqual({
        message: 'All notifications marked as read',
      });
    });
  });

  describe('PUT /me/notifications/:id/read', () => {
    it('should mark a specific notification as read', async () => {
      notificationsService.markAsRead.mockResolvedValue(undefined);

      const result = await controller.markAsRead(mockUserId, 'notif-uuid-1');

      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        'notif-uuid-1',
        mockUserId,
      );
      expect(result).toEqual({ message: 'Notification marked as read' });
    });

    it('should pass the correct userId to scope the update', async () => {
      notificationsService.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead('different-user', 'notif-uuid-1');

      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        'notif-uuid-1',
        'different-user',
      );
    });
  });
});
