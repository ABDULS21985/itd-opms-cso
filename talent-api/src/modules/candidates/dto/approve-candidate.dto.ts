import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileVisibility } from '../../../common/constants/status.constant';

export class RejectCandidateDto {
  @ApiProperty({ description: 'Reason for rejection / update request' })
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class SuspendCandidateDto {
  @ApiProperty({ description: 'Reason for suspension' })
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class UpdateAdminNotesDto {
  @ApiProperty({ description: 'Admin notes for internal use' })
  @IsString()
  @MaxLength(5000)
  adminNotes!: string;
}

export class UpdateInternalRatingsDto {
  @ApiProperty({
    description: 'Internal ratings object (key-value pairs)',
    example: { communication: 4, technical: 5, portfolio: 3 },
  })
  @IsObject()
  internalRatings!: Record<string, any>;
}

export class UpdateAdminFlagsDto {
  @ApiProperty({
    description: 'Admin flags for the candidate',
    type: [String],
    example: ['top_talent', 'needs_mentoring'],
  })
  @IsArray()
  @IsString({ each: true })
  adminFlags!: string[];
}

export class UpdateAdminDataDto {
  @ApiPropertyOptional({ description: 'Admin notes for internal use' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNotes?: string;

  @ApiPropertyOptional({
    description: 'Internal ratings object (key-value pairs)',
    example: { communication: 4, technical: 5, teamwork: 3 },
  })
  @IsOptional()
  @IsObject()
  internalRatings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Admin flags for the candidate',
    type: [String],
    example: ['top_talent', 'needs_mentoring'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adminFlags?: string[];
}

export class UpdateVisibilityDto {
  @ApiProperty({
    description: 'Visibility level',
    enum: ProfileVisibility,
  })
  @IsEnum(ProfileVisibility)
  visibilityLevel!: ProfileVisibility;
}

export class UpdateSkillsDto {
  @ApiProperty({
    description: 'Array of skill IDs to associate with the candidate',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  skillIds!: string[];
}

export class CreateProjectDto {
  @ApiProperty({ description: 'Project title' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Outcome / impact metric' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  outcomeMetric?: string;

  @ApiPropertyOptional({ description: 'Project URL' })
  @IsOptional()
  @IsString()
  projectUrl?: string;

  @ApiPropertyOptional({ description: 'GitHub URL' })
  @IsOptional()
  @IsString()
  githubUrl?: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Tech stack used', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  displayOrder?: number;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Outcome / impact metric' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  outcomeMetric?: string;

  @ApiPropertyOptional({ description: 'Project URL' })
  @IsOptional()
  @IsString()
  projectUrl?: string;

  @ApiPropertyOptional({ description: 'GitHub URL' })
  @IsOptional()
  @IsString()
  githubUrl?: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Tech stack used', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  displayOrder?: number;
}

export class GrantConsentDto {
  @ApiProperty({
    description: 'Consent type',
    example: 'data_processing',
  })
  @IsString()
  consentType!: string;

  @ApiPropertyOptional({ description: 'Whether consent is granted', default: true })
  @IsOptional()
  granted?: boolean;
}
