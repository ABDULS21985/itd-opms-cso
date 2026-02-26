import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkMode } from '../../../common/constants/status.constant';

export class CreateIntroRequestDto {
  @ApiProperty({ description: 'Candidate profile ID' })
  @IsUUID()
  candidateId!: string;

  @ApiPropertyOptional({ description: 'Job post ID to link this intro request to' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiProperty({ description: 'Role title for the introduction' })
  @IsString()
  @MaxLength(255)
  roleTitle!: string;

  @ApiProperty({ description: 'Role description' })
  @IsString()
  @MaxLength(5000)
  roleDescription!: string;

  @ApiPropertyOptional({ description: 'Desired start date' })
  @IsOptional()
  @IsDateString()
  desiredStartDate?: string;

  @ApiPropertyOptional({ description: 'Work mode preference', enum: WorkMode })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiPropertyOptional({ description: 'Location expectation' })
  @IsOptional()
  @IsString()
  locationExpectation?: string;

  @ApiPropertyOptional({ description: 'Notes to placement unit' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notesToPlacementUnit?: string;
}
