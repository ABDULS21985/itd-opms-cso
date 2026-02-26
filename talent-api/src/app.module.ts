import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
} from './common/config';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { EmployersModule } from './modules/employers/employers.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { IntroRequestsModule } from './modules/intro-requests/intro-requests.module';
import { PlacementsModule } from './modules/placements/placements.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UploadModule } from './modules/upload/upload.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MatchingModule } from './modules/matching/matching.module';
import { EmailModule } from './modules/email/email.module';
import { MetricsModule } from './metrics/metrics.module';
import { AppLoggingModule } from './logging/logging.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, storageConfig],
    }),

    // Event emitter
    EventEmitterModule.forRoot(),

    // Scheduling
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),

    // Database
    DatabaseModule,

    // Shared
    RedisModule,

    // Global modules
    EmailModule,
    MetricsModule,
    AppLoggingModule,

    // Auth
    AuthModule,

    // Feature modules
    HealthModule,
    UsersModule,
    CandidatesModule,
    EmployersModule,
    JobsModule,
    IntroRequestsModule,
    PlacementsModule,
    TaxonomyModule,
    NotificationsModule,
    AuditModule,
    ReportsModule,
    UploadModule,
    SettingsModule,
    MatchingModule,
  ],
  controllers: [AppController],
  providers: [
    // Global JWT auth guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
