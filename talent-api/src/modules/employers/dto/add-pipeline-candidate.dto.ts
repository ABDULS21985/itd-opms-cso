import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPipelineCandidateDto {
  @ApiProperty({ description: 'Candidate ID to add to the pipeline' })
  @IsString()
  candidateId!: string;

  @ApiPropertyOptional({ description: 'Stage ID to place the candidate in (defaults to first stage)' })
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional({ description: 'Match score for the candidate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  matchScore?: number;

  @ApiPropertyOptional({ description: 'Notes about the candidate' })
  @IsOptional()
  @IsString()
  notes?: string;
}
