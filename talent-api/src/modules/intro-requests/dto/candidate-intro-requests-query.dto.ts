import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const VALID_FILTERS = [
  'pending',
  'approved',
  'more_info_needed',
  'declined',
  'scheduled',
  'completed',
  'accepted',
] as const;

export class CandidateIntroRequestsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: VALID_FILTERS,
    description: 'Filter by intro request status or candidate response',
  })
  @IsOptional()
  @IsIn(VALID_FILTERS)
  status?: string;
}
