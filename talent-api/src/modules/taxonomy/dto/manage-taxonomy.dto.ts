import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  IsArray,
  IsUUID,
  Min,
  MinLength,
  MaxLength,
  ArrayMinSize,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Skill DTOs ──────────────────────────────────────────────────────────

export class CreateSkillDto {
  @ApiProperty({ example: 'TypeScript' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'programming_language' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class UpdateSkillDto {
  @ApiPropertyOptional({ example: 'TypeScript' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'programming_language' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Track DTOs ──────────────────────────────────────────────────────────

export class CreateTrackDto {
  @ApiProperty({ example: 'Full-Stack Development' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Full-stack web development track' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'code' })
  @IsOptional()
  @IsString()
  iconName?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: '#1E4DB7' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}

export class UpdateTrackDto {
  @ApiPropertyOptional({ example: 'Full-Stack Development' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Full-stack web development track' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'code' })
  @IsOptional()
  @IsString()
  iconName?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: '#1E4DB7' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Cohort DTOs ─────────────────────────────────────────────────────────

export class CreateCohortDto {
  @ApiProperty({ example: 'Cohort 3.0' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Cycle 3' })
  @IsOptional()
  @IsString()
  programCycle?: string;

  @ApiPropertyOptional({ example: '2025-01-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-06-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity?: number;
}

export class UpdateCohortDto {
  @ApiPropertyOptional({ example: 'Cohort 3.0' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Cycle 3' })
  @IsOptional()
  @IsString()
  programCycle?: string;

  @ApiPropertyOptional({ example: '2025-01-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-06-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Location DTOs ───────────────────────────────────────────────────────

export class CreateLocationDto {
  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  city!: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country!: string;

  @ApiPropertyOptional({ example: 'NG' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'Africa/Lagos' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateLocationDto {
  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  city?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: 'NG' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'Africa/Lagos' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Advanced Taxonomy DTOs ──────────────────────────────────────────────

export class MergeSkillsDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(2)
  sourceIds!: string[];

  @ApiProperty({ example: 'JavaScript/TypeScript' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  targetName!: string;

  @ApiPropertyOptional({ example: 'programming_language' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetCategory?: string;
}

class ReorderItemDto {
  @IsUUID('4')
  id!: string;

  @IsInt()
  @Min(0)
  displayOrder!: number;
}

export class ReorderDto {
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}

class BulkSkillItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class BulkImportSkillsDto {
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSkillItemDto)
  @ArrayMinSize(1)
  skills!: BulkSkillItemDto[];
}

export class SkillTrackAssociationDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds!: string[];
}
