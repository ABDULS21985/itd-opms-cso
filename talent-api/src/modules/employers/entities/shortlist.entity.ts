import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { EmployerOrg } from './employer-org.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';

@Entity('shortlists')
export class Shortlist extends BaseEntity {
  @Column({ name: 'employer_id' })
  employerId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'created_by' })
  createdBy!: string;

  @Column({ name: 'candidate_notes', type: 'jsonb', nullable: true })
  candidateNotes!: Record<string, string> | null;

  @Column({ name: 'shared_with', type: 'simple-array', nullable: true })
  sharedWith!: string[] | null;

  @ManyToOne(() => EmployerOrg, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;

  @ManyToMany(() => CandidateProfile)
  @JoinTable({
    name: 'shortlist_candidates',
    joinColumn: { name: 'shortlist_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'candidate_id', referencedColumnName: 'id' },
  })
  candidates!: CandidateProfile[];
}
