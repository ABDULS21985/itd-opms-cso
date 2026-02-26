import { IsOptional, IsObject, IsIn, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '../entities/user-notification-preferences.entity';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Per-type channel preferences',
    example: { profile_approved: 'both', intro_requested: 'in_app' },
  })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, NotificationChannel>;

  @ApiPropertyOptional({
    description: 'Email digest frequency',
    enum: ['immediate', 'daily', 'weekly', 'none'],
  })
  @IsOptional()
  @IsIn(['immediate', 'daily', 'weekly', 'none'])
  emailDigest?: 'immediate' | 'daily' | 'weekly' | 'none';

  @ApiPropertyOptional({ description: 'Quiet hours start time (HH:mm)' })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Quiet hours end time (HH:mm)' })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @ApiPropertyOptional({ description: 'Enable browser push notifications' })
  @IsOptional()
  @IsBoolean()
  browserPushEnabled?: boolean;
}
