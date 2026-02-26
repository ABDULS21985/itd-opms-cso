import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddShortlistCandidateDto {
  @ApiProperty({ description: 'Candidate profile ID to add to the shortlist' })
  @IsUUID()
  candidateId!: string;
}
