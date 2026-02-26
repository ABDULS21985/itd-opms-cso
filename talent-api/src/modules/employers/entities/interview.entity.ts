import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { EmployerOrg } from './employer-org.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { InterviewType, InterviewStatus } from '../../../common/constants/status.constant';

@Entity('interviews')
export class Interview extends BaseEntity {
  @Column({ name: 'employer_id' })
  employerId!: string;

  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column({ name: 'scheduled_by' })
  scheduledBy!: string;

  @Column({ name: 'job_id', type: 'uuid', nullable: true })
  jobId!: string | null;

  @Column({ name: 'pipeline_candidate_id', type: 'uuid', nullable: true })
  pipelineCandidateId!: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({ type: 'int', default: 60 })
  duration!: number;

  @Column({ type: 'enum', enum: InterviewType })
  type!: InterviewType;

  @Column({ type: 'enum', enum: InterviewStatus, default: InterviewStatus.SCHEDULED })
  status!: InterviewStatus;

  @Column({ type: 'varchar', nullable: true })
  location!: string | null;

  @Column({ name: 'meeting_url', type: 'varchar', nullable: true })
  meetingUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'text', nullable: true })
  feedback!: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason!: string | null;

  @ManyToOne(() => EmployerOrg, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;

  @ManyToOne(() => CandidateProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;

  @ManyToOne(() => JobPost, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'job_id' })
  job!: JobPost | null;
}
