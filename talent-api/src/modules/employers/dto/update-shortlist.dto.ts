import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateShortlistDto {
  @ApiPropertyOptional({ description: 'Name of the shortlist' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the shortlist' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
