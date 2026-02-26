import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TalentUserType } from '../../../common/constants/status.constant';

export class RegisterDto {
  @ApiProperty({ example: 'ada.okafor@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: ['candidate', 'employer'], example: 'candidate' })
  @IsEnum(TalentUserType)
  userType!: TalentUserType;

  // Candidate fields
  @ApiPropertyOptional({ example: 'Ada Okafor' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Full-Stack Development' })
  @IsOptional()
  @IsString()
  track?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  dataProcessingConsent?: boolean;

  // Employer fields
  @ApiPropertyOptional({ example: 'Paystack' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'Amaka Nwosu' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: 'https://paystack.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  sector?: string;
}
