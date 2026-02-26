import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { EmployerVerificationStatus } from '../../../common/constants/status.constant';
import { EmployerUser } from './employer-user.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { IntroRequest } from '../../intro-requests/entities/intro-request.entity';

@Entity('employer_orgs')
export class EmployerOrg extends BaseEntity {
  @Column({ name: 'company_name' })
  companyName!: string;

  @Column({ unique: true })
  @Index()
  slug!: string;

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'website_url', type: 'varchar', nullable: true })
  websiteUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  sector!: string | null;

  @Column({ name: 'location_hq', type: 'varchar', nullable: true })
  locationHq!: string | null;

  @Column({ type: 'varchar', nullable: true })
  country!: string | null;

  @Column({ name: 'hiring_tracks', type: 'simple-array', nullable: true })
  hiringTracks!: string[] | null;

  @Column({ name: 'hiring_work_modes', type: 'simple-array', nullable: true })
  hiringWorkModes!: string[] | null;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: EmployerVerificationStatus,
    default: EmployerVerificationStatus.PENDING,
  })
  verificationStatus!: EmployerVerificationStatus;

  @Column({ name: 'verified_by', type: 'varchar', nullable: true })
  verifiedBy!: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ name: 'email_verification_code', type: 'varchar', nullable: true })
  emailVerificationCode!: string | null;

  @Column({ name: 'total_requests', type: 'int', default: 0 })
  totalRequests!: number;

  @Column({ name: 'total_placements', type: 'int', default: 0 })
  totalPlacements!: number;

  @OneToMany(() => EmployerUser, (eu) => eu.org)
  employerUsers!: EmployerUser[];

  @OneToMany(() => JobPost, (job) => job.employer)
  jobPosts!: JobPost[];

  @OneToMany(() => IntroRequest, (intro) => intro.employer)
  introRequests!: IntroRequest[];
}
