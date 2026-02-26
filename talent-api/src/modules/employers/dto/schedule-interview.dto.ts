import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, Min, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewType } from '../../../common/constants/status.constant';

export class ScheduleInterviewDto {
  @ApiProperty({ description: 'Candidate ID' })
  @IsString()
  candidateId!: string;

  @ApiProperty({ description: 'Scheduled date and time (ISO 8601)' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ description: 'Interview type', enum: InterviewType })
  @IsEnum(InterviewType)
  type!: InterviewType;

  @ApiPropertyOptional({ description: 'Duration in minutes', default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  duration?: number;

  @ApiPropertyOptional({ description: 'Job ID related to this interview' })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Pipeline candidate ID if from a pipeline' })
  @IsOptional()
  @IsString()
  pipelineCandidateId?: string;

  @ApiPropertyOptional({ description: 'Physical location for in-person interviews' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Meeting URL for video interviews' })
  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @ApiPropertyOptional({ description: 'Notes for the interview' })
  @IsOptional()
  @IsString()
  notes?: string;
}
