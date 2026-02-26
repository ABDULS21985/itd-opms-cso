import { Entity, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import {
  WorkMode,
  IntroRequestStatus,
  CandidateIntroResponse,
} from '../../../common/constants/status.constant';
import { EmployerOrg } from '../../employers/entities/employer-org.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { PlacementRecord } from '../../placements/entities/placement-record.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';

@Entity('intro_requests')
export class IntroRequest extends BaseEntity {
  @Column({ name: 'employer_id' })
  employerId!: string;

  @Column({ name: 'requested_by_id' })
  requestedById!: string;

  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column({ name: 'job_id', type: 'uuid', nullable: true })
  jobId!: string | null;

  @Column({ name: 'role_title' })
  roleTitle!: string;

  @Column({ name: 'role_description', type: 'text' })
  roleDescription!: string;

  @Column({ name: 'desired_start_date', type: 'timestamptz', nullable: true })
  desiredStartDate!: Date | null;

  @Column({
    name: 'work_mode',
    type: 'enum',
    enum: WorkMode,
    nullable: true,
  })
  workMode!: WorkMode | null;

  @Column({ name: 'location_expectation', type: 'varchar', nullable: true })
  locationExpectation!: string | null;

  @Column({ name: 'notes_to_placement_unit', type: 'text', nullable: true })
  notesToPlacementUnit!: string | null;

  @Column({
    type: 'enum',
    enum: IntroRequestStatus,
    default: IntroRequestStatus.PENDING,
  })
  status!: IntroRequestStatus;

  @Column({ name: 'handled_by', type: 'varchar', nullable: true })
  handledBy!: string | null;

  @Column({ name: 'handled_at', type: 'timestamptz', nullable: true })
  handledAt!: Date | null;

  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason!: string | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @Column({
    name: 'candidate_response',
    type: 'enum',
    enum: CandidateIntroResponse,
    nullable: true,
  })
  candidateResponse!: CandidateIntroResponse | null;

  @Column({ name: 'candidate_responded_at', type: 'timestamptz', nullable: true })
  candidateRespondedAt!: Date | null;

  @ManyToOne(() => EmployerOrg, (org) => org.introRequests)
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;

  @ManyToOne(() => CandidateProfile)
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;

  @ManyToOne(() => JobPost, { nullable: true })
  @JoinColumn({ name: 'job_id' })
  job!: JobPost | null;

  @OneToOne(() => PlacementRecord, (placement) => placement.introRequest)
  placementRecord!: PlacementRecord;
}
