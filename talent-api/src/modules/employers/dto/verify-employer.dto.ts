import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectEmployerDto {
  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class SuspendEmployerDto {
  @ApiPropertyOptional({ description: 'Reason for suspension' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
