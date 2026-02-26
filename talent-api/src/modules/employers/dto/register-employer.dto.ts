import { IsString, IsOptional, IsUrl, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterEmployerDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @MaxLength(255)
  companyName!: string;

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

  @ApiProperty({ description: 'Contact person name' })
  @IsString()
  @MaxLength(255)
  contactName!: string;

  @ApiPropertyOptional({ description: 'Contact person role title' })
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;
}
