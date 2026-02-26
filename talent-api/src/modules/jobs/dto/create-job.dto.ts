import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
  MaxLength,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  JobType,
  WorkMode,
  ExperienceLevel,
  JobStatus,
} from '../../../common/constants/status.constant';

export class CreateJobSkillDto {
  @ApiProperty({ description: 'Skill tag ID' })
  @IsUUID()
  skillId!: string;

  @ApiPropertyOptional({ description: 'Whether the skill is required', default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class CreateJobDto {
  @ApiProperty({ description: 'Job title' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ description: 'Job type', enum: JobType })
  @IsEnum(JobType)
  jobType!: JobType;

  @ApiProperty({ description: 'Work mode', enum: WorkMode })
  @IsEnum(WorkMode)
  workMode!: WorkMode;

  @ApiPropertyOptional({ description: 'Job location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Timezone preference' })
  @IsOptional()
  @IsString()
  timezonePreference?: string;

  @ApiProperty({ description: 'Job description' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Job responsibilities' })
  @IsOptional()
  @IsString()
  responsibilities?: string;

  @ApiPropertyOptional({ description: 'Minimum salary' })
  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @ApiPropertyOptional({ description: 'Salary currency' })
  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional({ description: 'Experience level', enum: ExperienceLevel })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ description: 'Application deadline' })
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ApiPropertyOptional({ description: 'Hiring process description' })
  @IsOptional()
  @IsString()
  hiringProcess?: string;

  @ApiPropertyOptional({ description: 'Nice to have skills', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  niceToHaveSkills?: string[];

  @ApiPropertyOptional({ description: 'Required and optional skills', type: [CreateJobSkillDto] })
  @IsOptional()
  @IsArray()
  skills?: CreateJobSkillDto[];

  @ApiPropertyOptional({ description: 'Initial job status', enum: [JobStatus.DRAFT, JobStatus.PENDING_REVIEW] })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
