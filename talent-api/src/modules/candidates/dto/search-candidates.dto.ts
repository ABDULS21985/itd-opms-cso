import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  AvailabilityStatus,
  WorkMode,
  ExperienceLevel,
} from '../../../common/constants/status.constant';

export class SearchCandidatesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Full-text search on name, bio, skills' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by track IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  tracks?: string[];

  @ApiPropertyOptional({
    description: 'Filter by skill IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  skills?: string[];

  @ApiPropertyOptional({ description: 'Filter by location (city or country)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Filter by availability status',
    enum: AvailabilityStatus,
  })
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availability?: AvailabilityStatus;

  @ApiPropertyOptional({
    description: 'Filter by work mode',
    enum: WorkMode,
  })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiPropertyOptional({
    description: 'Filter by experience level',
    enum: ExperienceLevel,
  })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ description: 'Filter by cohort ID' })
  @IsOptional()
  @IsString()
  cohort?: string;
}
