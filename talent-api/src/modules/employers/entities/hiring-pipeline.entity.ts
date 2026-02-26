import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { EmployerOrg } from './employer-org.entity';
import { PipelineCandidate } from './pipeline-candidate.entity';

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'interested', name: 'Interested', order: 0, color: '#6366F1' },
  { id: 'intro_requested', name: 'Intro Requested', order: 1, color: '#F59E0B' },
  { id: 'intro_approved', name: 'Intro Approved', order: 2, color: '#10B981' },
  { id: 'interview', name: 'Interview', order: 3, color: '#3B82F6' },
  { id: 'offer', name: 'Offer', order: 4, color: '#8B5CF6' },
  { id: 'placed', name: 'Placed', order: 5, color: '#059669' },
  { id: 'declined', name: 'Declined', order: 6, color: '#EF4444' },
];

@Entity('hiring_pipelines')
export class HiringPipeline extends BaseEntity {
  @Column({ name: 'employer_id' })
  employerId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @Column({ type: 'jsonb', default: () => `'${JSON.stringify(DEFAULT_PIPELINE_STAGES)}'` })
  stages!: PipelineStage[];

  @Column({ name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => EmployerOrg, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;

  @OneToMany(() => PipelineCandidate, (pc) => pc.pipeline)
  candidates!: PipelineCandidate[];
}
