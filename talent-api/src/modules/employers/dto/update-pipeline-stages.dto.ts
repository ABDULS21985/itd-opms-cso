import { IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PipelineStageDto } from './create-pipeline.dto';

export class UpdatePipelineStagesDto {
  @ApiProperty({ description: 'Updated pipeline stages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStageDto)
  stages!: PipelineStageDto[];
}
