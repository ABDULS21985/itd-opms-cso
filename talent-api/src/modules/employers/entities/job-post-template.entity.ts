import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { EmployerOrg } from './employer-org.entity';

export interface JobTemplateData {
  title?: string;
  description?: string;
  responsibilities?: string;
  skills?: string[];
  jobType?: string;
  workMode?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  location?: string;
}

@Entity('job_post_templates')
export class JobPostTemplate extends BaseEntity {
  @Column({ name: 'employer_id' })
  employerId!: string;

  @Column()
  name!: string;

  @Column({ name: 'template_data', type: 'jsonb' })
  templateData!: JobTemplateData;

  @ManyToOne(() => EmployerOrg, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;
}
