import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobTemplateData } from '../entities/job-post-template.entity';

export class CreateJobTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Template data containing job post fields' })
  @IsObject()
  templateData!: JobTemplateData;
}
