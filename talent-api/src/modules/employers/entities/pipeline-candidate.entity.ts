import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { HiringPipeline } from './hiring-pipeline.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';

@Entity('pipeline_candidates')
export class PipelineCandidate extends BaseEntity {
  @Column({ name: 'pipeline_id' })
  pipelineId!: string;

  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column({ name: 'stage_id' })
  stageId!: string;

  @Column({ name: 'added_by' })
  addedBy!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'match_score', type: 'int', nullable: true })
  matchScore!: number | null;

  @Column({ name: 'moved_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  movedAt!: Date;

  @ManyToOne(() => HiringPipeline, (pipeline) => pipeline.candidates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline!: HiringPipeline;

  @ManyToOne(() => CandidateProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;
}
