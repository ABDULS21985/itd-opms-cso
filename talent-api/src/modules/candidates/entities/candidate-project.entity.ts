import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { CandidateProfile } from './candidate-profile.entity';

@Entity('candidate_projects')
export class CandidateProject extends BaseEntity {
  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'outcome_metric', type: 'varchar', nullable: true })
  outcomeMetric!: string | null;

  @Column({ name: 'project_url', type: 'varchar', nullable: true })
  projectUrl!: string | null;

  @Column({ name: 'github_url', type: 'varchar', nullable: true })
  githubUrl!: string | null;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'tech_stack', type: 'simple-array', nullable: true })
  techStack!: string[] | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @ManyToOne(() => CandidateProfile, (profile) => profile.candidateProjects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;
}
