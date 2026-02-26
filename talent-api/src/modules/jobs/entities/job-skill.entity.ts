import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { JobPost } from './job-post.entity';
import { SkillTag } from '../../taxonomy/entities/skill-tag.entity';

@Entity('job_skills')
export class JobSkill extends BaseEntity {
  @Column({ name: 'job_id' })
  jobId!: string;

  @Column({ name: 'skill_id' })
  skillId!: string;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired!: boolean;

  @ManyToOne(() => JobPost, (job) => job.jobSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: JobPost;

  @ManyToOne(() => SkillTag, { eager: true })
  @JoinColumn({ name: 'skill_id' })
  skill!: SkillTag;
}
