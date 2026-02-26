import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShortlistDto {
  @ApiProperty({ description: 'Name of the shortlist' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Description of the shortlist' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
