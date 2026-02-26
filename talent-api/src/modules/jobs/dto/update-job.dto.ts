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
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  JobType,
  WorkMode,
  ExperienceLevel,
} from '../../../common/constants/status.constant';

export class UpdateJobSkillDto {
  @ApiPropertyOptional({ description: 'Skill tag ID' })
  @IsUUID()
  skillId!: string;

  @ApiPropertyOptional({ description: 'Whether the skill is required', default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class UpdateJobDto {
  @ApiPropertyOptional({ description: 'Job title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Job type', enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @ApiPropertyOptional({ description: 'Work mode', enum: WorkMode })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiPropertyOptional({ description: 'Job location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Timezone preference' })
  @IsOptional()
  @IsString()
  timezonePreference?: string;

  @ApiPropertyOptional({ description: 'Job description' })
  @IsOptional()
  @IsString()
  description?: string;

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

  @ApiPropertyOptional({ description: 'Updated skills list', type: [UpdateJobSkillDto] })
  @IsOptional()
  @IsArray()
  skills?: UpdateJobSkillDto[];
}
