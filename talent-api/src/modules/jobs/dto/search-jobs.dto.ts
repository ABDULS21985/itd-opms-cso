import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  JobType,
  WorkMode,
  ExperienceLevel,
} from '../../../common/constants/status.constant';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SearchJobsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search query for title or description' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by job type', enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @ApiPropertyOptional({ description: 'Filter by work mode', enum: WorkMode })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiPropertyOptional({ description: 'Filter by experience level', enum: ExperienceLevel })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ description: 'Filter by location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Filter by employer ID' })
  @IsOptional()
  @IsString()
  employerId?: string;

  @ApiPropertyOptional({ description: 'Filter by skill IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  skillIds?: string[];
}
