import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateNoteDto {
  @ApiProperty({ description: 'Candidate ID' })
  @IsString()
  candidateId!: string;

  @ApiProperty({ description: 'Note content' })
  @IsString()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ description: 'User IDs mentioned in the note' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionedUserIds?: string[];
}
