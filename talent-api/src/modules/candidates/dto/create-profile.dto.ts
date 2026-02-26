import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUrl,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AvailabilityStatus,
  WorkMode,
} from '../../../common/constants/status.constant';

export class CreateProfileDto {
  @ApiProperty({ description: 'Full name of the candidate' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiPropertyOptional({ description: 'Short biography' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Timezone (e.g. Africa/Lagos)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Years of experience' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description: 'Primary tech stacks',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primaryStacks?: string[];

  @ApiPropertyOptional({
    description: 'Programming languages',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({
    description: 'Spoken languages',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spokenLanguages?: string[];

  @ApiPropertyOptional({ description: 'GitHub profile URL' })
  @IsOptional()
  @ValidateIf((o) => !!o.githubUrl)
  @IsUrl()
  githubUrl?: string;

  @ApiPropertyOptional({ description: 'LinkedIn profile URL' })
  @IsOptional()
  @ValidateIf((o) => !!o.linkedinUrl)
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: 'Portfolio URL' })
  @IsOptional()
  @ValidateIf((o) => !!o.portfolioUrl)
  @IsUrl()
  portfolioUrl?: string;

  @ApiPropertyOptional({ description: 'Personal website URL' })
  @IsOptional()
  @ValidateIf((o) => !!o.personalWebsite)
  @IsUrl()
  personalWebsite?: string;

  @ApiPropertyOptional({
    description: 'Availability status',
    enum: AvailabilityStatus,
  })
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @ApiPropertyOptional({
    description: 'Preferred work mode',
    enum: WorkMode,
  })
  @IsOptional()
  @IsEnum(WorkMode)
  preferredWorkMode?: WorkMode;

  @ApiPropertyOptional({ description: 'Preferred work hours start (HH:mm)' })
  @IsOptional()
  @IsString()
  preferredHoursStart?: string;

  @ApiPropertyOptional({ description: 'Preferred work hours end (HH:mm)' })
  @IsOptional()
  @IsString()
  preferredHoursEnd?: string;

  @ApiPropertyOptional({ description: 'Primary track ID' })
  @IsOptional()
  @IsString()
  primaryTrackId?: string;

  @ApiPropertyOptional({ description: 'Cohort ID' })
  @IsOptional()
  @IsString()
  cohortId?: string;

  @ApiPropertyOptional({ description: 'Badge ID' })
  @IsOptional()
  @IsString()
  badgeId?: string;

  @ApiPropertyOptional({
    description: 'Experience areas',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experienceAreas?: string[];

  @ApiPropertyOptional({
    description: 'NITDA badge verified status',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  nitdaBadgeVerified?: boolean;
}
