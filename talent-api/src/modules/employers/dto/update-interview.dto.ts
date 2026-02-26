import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewType } from '../../../common/constants/status.constant';

export class UpdateInterviewDto {
  @ApiPropertyOptional({ description: 'Rescheduled date and time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Interview type', enum: InterviewType })
  @IsOptional()
  @IsEnum(InterviewType)
  type?: InterviewType;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(15)
  duration?: number;

  @ApiPropertyOptional({ description: 'Physical location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Meeting URL' })
  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Feedback after interview' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
