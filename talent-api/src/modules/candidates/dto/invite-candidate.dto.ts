import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteCandidateDto {
  @ApiProperty({ description: 'Email address of the candidate to invite' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Name of the candidate' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ description: 'Optional track ID to associate the invite with' })
  @IsOptional()
  @IsString()
  trackId?: string;
}
