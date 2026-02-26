import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { UserBridgeService } from '../../auth/services/user-bridge.service';
import { Socket, Server } from 'socket.io';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let configService: jest.Mocked<ConfigService>;
  let userBridgeService: jest.Mocked<UserBridgeService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'jwt.accessSecret': 'test-secret-key',
                'jwt.issuer': 'digiweb',
                'jwt.audience': 'digiweb-api',
              };
              return config[key];
            }),
          },
        },
        {
          provide: UserBridgeService,
          useValue: {
            findByExternalId: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    configService = module.get(ConfigService);
    userBridgeService = module.get(UserBridgeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendToUser', () => {
    it('should emit notification to the user room', () => {
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      gateway.server = { to: mockTo } as any;

      const notification = { id: 'notif-1', title: 'Test' };
      gateway.sendToUser('user-123', notification);

      expect(mockTo).toHaveBeenCalledWith('user:user-123');
      expect(mockEmit).toHaveBeenCalledWith('notification', notification);
    });

    it('should not throw when server is not initialized', () => {
      gateway.server = undefined as any;

      expect(() =>
        gateway.sendToUser('user-123', { id: 'notif-1' }),
      ).not.toThrow();
    });
  });

  describe('handleConnection', () => {
    it('should disconnect client when no token is provided', async () => {
      const mockClient = {
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
        id: 'socket-1',
      } as unknown as Socket;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client when token is invalid', async () => {
      const mockClient = {
        handshake: { auth: { token: 'invalid-token' }, headers: {} },
        disconnect: jest.fn(),
        id: 'socket-2',
      } as unknown as Socket;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client when user not found', async () => {
      // Create a valid JWT for testing
      const token = createTestJwt(
        { sub: 'external-user-1', email: 'test@test.com' },
        'test-secret-key',
      );

      const mockClient = {
        handshake: { auth: { token }, headers: {} },
        disconnect: jest.fn(),
        join: jest.fn(),
        id: 'socket-3',
        data: {},
      } as unknown as Socket;

      userBridgeService.findByExternalId.mockResolvedValue(null as any);

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should accept valid connection and join user room', async () => {
      const token = createTestJwt(
        { sub: 'external-user-1', email: 'test@test.com' },
        'test-secret-key',
      );

      const mockClient = {
        handshake: { auth: { token }, headers: {} },
        disconnect: jest.fn(),
        join: jest.fn(),
        id: 'socket-4',
        data: {},
      } as unknown as Socket;

      userBridgeService.findByExternalId.mockResolvedValue({
        id: 'internal-user-123',
      } as any);

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
      expect(mockClient.join).toHaveBeenCalledWith('user:internal-user-123');
      expect(mockClient.data.userId).toBe('internal-user-123');
    });

    it('should extract token from authorization header', async () => {
      const token = createTestJwt(
        { sub: 'external-user-2', email: 'test2@test.com' },
        'test-secret-key',
      );

      const mockClient = {
        handshake: {
          auth: {},
          headers: { authorization: `Bearer ${token}` },
        },
        disconnect: jest.fn(),
        join: jest.fn(),
        id: 'socket-5',
        data: {},
      } as unknown as Socket;

      userBridgeService.findByExternalId.mockResolvedValue({
        id: 'internal-user-456',
      } as any);

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user:internal-user-456');
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up user socket mapping', async () => {
      // First, simulate a connection
      const token = createTestJwt(
        { sub: 'external-user-1', email: 'test@test.com' },
        'test-secret-key',
      );

      const mockClient = {
        handshake: { auth: { token }, headers: {} },
        disconnect: jest.fn(),
        join: jest.fn(),
        id: 'socket-6',
        data: {},
      } as unknown as Socket;

      userBridgeService.findByExternalId.mockResolvedValue({
        id: 'user-to-disconnect',
      } as any);

      await gateway.handleConnection(mockClient);
      expect(gateway.isUserOnline('user-to-disconnect')).toBe(true);

      // Now disconnect
      gateway.handleDisconnect(mockClient);
      expect(gateway.isUserOnline('user-to-disconnect')).toBe(false);
    });

    it('should handle disconnect when userId is not set', () => {
      const mockClient = {
        data: {},
        id: 'socket-7',
      } as unknown as Socket;

      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
    });
  });

  describe('isUserOnline', () => {
    it('should return false when user has no connected sockets', () => {
      expect(gateway.isUserOnline('non-existent-user')).toBe(false);
    });
  });

  describe('getOnlineUserCount', () => {
    it('should return 0 when no users are connected', () => {
      expect(gateway.getOnlineUserCount()).toBe(0);
    });
  });
});

// ──────────────────────────────────────────────
// Test helper: create a valid HS256 JWT
// ──────────────────────────────────────────────

function createTestJwt(
  payload: {
    sub: string;
    email: string;
    iss?: string;
    aud?: string;
    exp?: number;
  },
  secret: string,
): string {
  const crypto = require('crypto');

  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iss: payload.iss || 'digiweb',
    aud: payload.aud || 'digiweb-api',
    exp: payload.exp || Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString(
    'base64url',
  );

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}
