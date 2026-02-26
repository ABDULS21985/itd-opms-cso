import { IsString, IsOptional, MaxLength, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PipelineStageDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty()
  @IsNumber()
  order!: number;

  @ApiProperty()
  @IsString()
  color!: string;
}

export class CreatePipelineDto {
  @ApiProperty({ description: 'Name of the pipeline' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Description of the pipeline' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Custom stages (uses defaults if not provided)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStageDto)
  stages?: PipelineStageDto[];

  @ApiPropertyOptional({ description: 'Set as default pipeline' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
