import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MovePipelineCandidateDto {
  @ApiProperty({ description: 'Target stage ID to move the candidate to' })
  @IsString()
  stageId!: string;
}
