import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlacementType, PlacementStatus } from '../../../common/constants/status.constant';

export class CreatePlacementDto {
  @ApiProperty({ description: 'Candidate profile ID' })
  @IsUUID()
  candidateId!: string;

  @ApiProperty({ description: 'Employer organization ID' })
  @IsUUID()
  employerId!: string;

  @ApiPropertyOptional({ description: 'Intro request ID' })
  @IsOptional()
  @IsUUID()
  introRequestId?: string;

  @ApiPropertyOptional({ description: 'Job post ID' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Initial placement status', enum: PlacementStatus, default: PlacementStatus.IN_DISCUSSION })
  @IsOptional()
  @IsEnum(PlacementStatus)
  status?: PlacementStatus;

  @ApiPropertyOptional({ description: 'Placement type', enum: PlacementType })
  @IsOptional()
  @IsEnum(PlacementType)
  placementType?: PlacementType;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Salary range' })
  @IsOptional()
  @IsString()
  salaryRange?: string;

  @ApiPropertyOptional({ description: 'Outcome notes' })
  @IsOptional()
  @IsString()
  outcomeNotes?: string;

  @ApiPropertyOptional({ description: 'Managed by user ID' })
  @IsOptional()
  @IsUUID()
  managedBy?: string;
}
