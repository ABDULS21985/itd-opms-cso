import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyJobDto {
  @ApiPropertyOptional({ description: 'Cover note for the application' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverNote?: string;

  @ApiPropertyOptional({ description: 'CV document ID' })
  @IsOptional()
  @IsUUID()
  cvDocumentId?: string;
}
