import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserBridgeService } from '../../auth/services/user-bridge.service';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow connections with no origin (mobile apps, server-to-server)
      if (!origin) return callback(null, true);

      const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3003').split(',');
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly userBridgeService: UserBridgeService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: no token provided`);
        client.disconnect();
        return;
      }

      // Manually verify JWT (same approach as the auth service)
      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = this.verifyJwt(token, secret!);

      if (!payload) {
        this.logger.warn(`Connection rejected: invalid token`);
        client.disconnect();
        return;
      }

      // Resolve externalUserId to internal talentUser id
      const user = await this.userBridgeService.findByExternalId(payload.sub);
      if (!user) {
        this.logger.warn(
          `Connection rejected: no user found for ${payload.sub}`,
        );
        client.disconnect();
        return;
      }

      const userId = user.id;
      client.data.userId = userId;
      client.join(`user:${userId}`);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} for user ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Connection failed for socket ${client.id}: ${(error as Error).message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data?.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendToUser(userId: string, notification: any): void {
    this.server?.to(`user:${userId}`).emit('notification', notification);
  }

  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) &&
      this.userSockets.get(userId)!.size > 0
    );
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  // ──────────────────────────────────────────────
  // JWT verification (mirrors auth.service.ts approach)
  // ──────────────────────────────────────────────

  private verifyJwt(
    token: string,
    secret: string,
  ): { sub: string; email: string } | null {
    try {
      const issuer = this.configService.get<string>('jwt.issuer');
      const audience = this.configService.get<string>('jwt.audience');

      const payload = jwt.verify(token, secret, {
        issuer: issuer || undefined,
        audience: audience || undefined,
      }) as jwt.JwtPayload;

      return { sub: payload.sub!, email: payload.email as string };
    } catch {
      return null;
    }
  }
}
