import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CandidateIntroResponse } from '../../../common/constants/status.constant';

export class DeclineIntroRequestDto {
  @ApiPropertyOptional({ description: 'Reason for declining' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class CandidateRespondDto {
  @ApiPropertyOptional({ description: 'Candidate response', enum: [CandidateIntroResponse.ACCEPTED, CandidateIntroResponse.DECLINED] })
  @IsEnum(CandidateIntroResponse)
  response!: CandidateIntroResponse;
}
