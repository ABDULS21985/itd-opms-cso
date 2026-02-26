import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlacementType, PlacementStatus } from '../../../common/constants/status.constant';

export class UpdatePlacementDto {
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

export class UpdatePlacementStatusDto {
  @ApiPropertyOptional({ description: 'New placement status', enum: PlacementStatus })
  @IsEnum(PlacementStatus)
  status!: PlacementStatus;
}
