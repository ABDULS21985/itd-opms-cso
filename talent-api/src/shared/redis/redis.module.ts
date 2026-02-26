import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('redis.url', 'redis://localhost:6379');
        const keyPrefix = configService.get<string>('redis.keyPrefix', 'talent:');

        const client = new Redis(url, {
          keyPrefix,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
          },
        });

        client.on('connect', () => {
          // Connection established
        });

        client.on('error', (err: Error) => {
          console.error('Redis connection error:', err.message);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
