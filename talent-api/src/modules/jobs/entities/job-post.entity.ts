import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import {
  JobType,
  WorkMode,
  ExperienceLevel,
  JobStatus,
} from '../../../common/constants/status.constant';
import { EmployerOrg } from '../../employers/entities/employer-org.entity';
import { JobSkill } from './job-skill.entity';
import { JobApplication } from './job-application.entity';

@Entity('job_posts')
export class JobPost extends BaseEntity {
  @Column({ name: 'employer_id' })
  employerId!: string;

  @Column()
  title!: string;

  @Column({ unique: true })
  @Index()
  slug!: string;

  @Column({
    name: 'job_type',
    type: 'enum',
    enum: JobType,
  })
  jobType!: JobType;

  @Column({
    name: 'work_mode',
    type: 'enum',
    enum: WorkMode,
  })
  workMode!: WorkMode;

  @Column({ type: 'varchar', nullable: true })
  location!: string | null;

  @Column({ name: 'timezone_preference', type: 'varchar', nullable: true })
  timezonePreference!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  responsibilities!: string | null;

  @Column({ name: 'salary_min', type: 'numeric', nullable: true })
  salaryMin!: number | null;

  @Column({ name: 'salary_max', type: 'numeric', nullable: true })
  salaryMax!: number | null;

  @Column({ name: 'salary_currency', type: 'varchar', nullable: true })
  salaryCurrency!: string | null;

  @Column({
    name: 'experience_level',
    type: 'enum',
    enum: ExperienceLevel,
    nullable: true,
  })
  experienceLevel!: ExperienceLevel | null;

  @Column({ name: 'application_deadline', type: 'timestamptz', nullable: true })
  applicationDeadline!: Date | null;

  @Column({ name: 'hiring_process', type: 'text', nullable: true })
  hiringProcess!: string | null;

  @Column({ name: 'posted_by_id' })
  postedById!: string;

  @Column({ name: 'nice_to_have_skills', type: 'simple-array', nullable: true })
  niceToHaveSkills!: string[] | null;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.DRAFT,
  })
  status!: JobStatus;

  @Column({ name: 'moderated_by', type: 'varchar', nullable: true })
  moderatedBy!: string | null;

  @Column({ name: 'moderated_at', type: 'timestamptz', nullable: true })
  moderatedAt!: Date | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number;

  @Column({ name: 'application_count', type: 'int', default: 0 })
  applicationCount!: number;

  @ManyToOne(() => EmployerOrg, (org) => org.jobPosts)
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;

  @OneToMany(() => JobSkill, (skill) => skill.job)
  jobSkills!: JobSkill[];

  @OneToMany(() => JobApplication, (application) => application.job)
  jobApplications!: JobApplication[];
}
