import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { ApplicationStatus } from '../../../common/constants/status.constant';
import { JobPost } from './job-post.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';

@Entity('job_applications')
export class JobApplication extends BaseEntity {
  @Column({ name: 'job_id' })
  jobId!: string;

  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column({ name: 'cover_note', type: 'text', nullable: true })
  coverNote!: string | null;

  @Column({ name: 'cv_document_id', type: 'varchar', nullable: true })
  cvDocumentId!: string | null;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.SUBMITTED,
  })
  status!: ApplicationStatus;

  @Column({ name: 'viewed_at', type: 'timestamptz', nullable: true })
  viewedAt!: Date | null;

  @Column({ name: 'shortlisted_at', type: 'timestamptz', nullable: true })
  shortlistedAt!: Date | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @ManyToOne(() => JobPost, (job) => job.jobApplications)
  @JoinColumn({ name: 'job_id' })
  job!: JobPost;

  @ManyToOne(() => CandidateProfile, (profile) => profile.jobApplications)
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;
}
