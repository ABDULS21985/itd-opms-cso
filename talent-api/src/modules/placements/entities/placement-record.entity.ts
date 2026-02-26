import { Entity, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import {
  PlacementStatus,
  PlacementType,
} from '../../../common/constants/status.constant';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { EmployerOrg } from '../../employers/entities/employer-org.entity';
import { IntroRequest } from '../../intro-requests/entities/intro-request.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';

@Entity('placement_records')
export class PlacementRecord extends BaseEntity {
  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column({ name: 'employer_id' })
  employerId!: string;

  @Column({ name: 'intro_request_id', type: 'varchar', nullable: true })
  introRequestId!: string | null;

  @Column({ name: 'job_id', type: 'varchar', nullable: true })
  jobId!: string | null;

  @Column({
    type: 'enum',
    enum: PlacementStatus,
  })
  status!: PlacementStatus;

  @Column({
    name: 'placement_type',
    type: 'enum',
    enum: PlacementType,
    nullable: true,
  })
  placementType!: PlacementType | null;

  @Column({ name: 'start_date', type: 'timestamptz', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate!: Date | null;

  @Column({ name: 'salary_range', type: 'varchar', nullable: true })
  salaryRange!: string | null;

  @Column({ name: 'outcome_notes', type: 'text', nullable: true })
  outcomeNotes!: string | null;

  @Column({ name: 'managed_by', type: 'varchar', nullable: true })
  managedBy!: string | null;

  @Column({ name: 'intro_date', type: 'timestamptz', nullable: true })
  introDate!: Date | null;

  @Column({ name: 'interview_date', type: 'timestamptz', nullable: true })
  interviewDate!: Date | null;

  @Column({ name: 'offer_date', type: 'timestamptz', nullable: true })
  offerDate!: Date | null;

  @Column({ name: 'placed_date', type: 'timestamptz', nullable: true })
  placedDate!: Date | null;

  @Column({ name: 'completed_date', type: 'timestamptz', nullable: true })
  completedDate!: Date | null;

  @ManyToOne(() => CandidateProfile)
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;

  @ManyToOne(() => EmployerOrg)
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;

  @OneToOne(() => IntroRequest, (intro) => intro.placementRecord)
  @JoinColumn({ name: 'intro_request_id' })
  introRequest!: IntroRequest | null;

  @ManyToOne(() => JobPost, { nullable: true })
  @JoinColumn({ name: 'job_id' })
  job!: JobPost | null;
}
