import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileVisibility } from '../../../common/constants/status.constant';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Profile visibility level',
    enum: ProfileVisibility,
  })
  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibilityLevel?: ProfileVisibility;

  @ApiPropertyOptional({
    description: 'Enable email notifications for job matches',
  })
  @IsOptional()
  @IsBoolean()
  notifyJobMatches?: boolean;

  @ApiPropertyOptional({
    description: 'Enable email notifications for application updates',
  })
  @IsOptional()
  @IsBoolean()
  notifyApplicationUpdates?: boolean;

  @ApiPropertyOptional({
    description: 'Enable email notifications for intro requests',
  })
  @IsOptional()
  @IsBoolean()
  notifyIntroRequests?: boolean;
}
