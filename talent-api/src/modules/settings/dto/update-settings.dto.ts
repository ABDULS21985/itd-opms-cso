import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject, IsNumber } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  portalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  portalDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultVisibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoApproveCandidates?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoApproveEmployers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoApproveJobs?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reviewSlaHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  flaggedKeywords?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  emailNotifications?: {
    newCandidate: boolean;
    newEmployer: boolean;
    newJob: boolean;
    newApplication: boolean;
    newIntroRequest: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  digestFrequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  auditLogRetention?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deletedRecordsRetention?: string;
}
