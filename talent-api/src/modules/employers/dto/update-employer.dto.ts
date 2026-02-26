import { IsString, IsOptional, IsUrl, IsArray, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployerDto {
  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Industry sector' })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ description: 'Headquarters location' })
  @IsOptional()
  @IsString()
  locationHq?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Hiring tracks', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hiringTracks?: string[];

  @ApiPropertyOptional({ description: 'Hiring work modes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hiringWorkModes?: string[];
}
