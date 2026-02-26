import {
  Entity,
  Column,
  OneToOne,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import {
  AvailabilityStatus,
  WorkMode,
  ProfileApprovalStatus,
  ProfileVisibility,
} from '../../../common/constants/status.constant';
import { TalentUser } from '../../users/entities/talent-user.entity';
import { Track } from '../../taxonomy/entities/track.entity';
import { Cohort } from '../../taxonomy/entities/cohort.entity';
import { CandidateSkill } from './candidate-skill.entity';
import { CandidateProject } from './candidate-project.entity';
import { CandidateDocument } from './candidate-document.entity';
import { CandidateConsent } from './candidate-consent.entity';
import { JobApplication } from '../../jobs/entities/job-application.entity';

@Entity('candidate_profiles')
export class CandidateProfile extends BaseEntity {
  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ unique: true })
  @Index()
  slug!: string;

  @Column({ name: 'photo_url', type: 'varchar', nullable: true })
  photoUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', nullable: true })
  timezone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'years_of_experience', type: 'int', nullable: true })
  yearsOfExperience!: number | null;

  @Column({ name: 'primary_stacks', type: 'simple-array', nullable: true })
  primaryStacks!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  languages!: string[] | null;

  @Column({ name: 'spoken_languages', type: 'simple-array', nullable: true })
  spokenLanguages!: string[] | null;

  @Column({ name: 'github_url', type: 'varchar', nullable: true })
  githubUrl!: string | null;

  @Column({ name: 'linkedin_url', type: 'varchar', nullable: true })
  linkedinUrl!: string | null;

  @Column({ name: 'portfolio_url', type: 'varchar', nullable: true })
  portfolioUrl!: string | null;

  @Column({ name: 'personal_website', type: 'varchar', nullable: true })
  personalWebsite!: string | null;

  @Column({
    name: 'availability_status',
    type: 'enum',
    enum: AvailabilityStatus,
    nullable: true,
  })
  availabilityStatus!: AvailabilityStatus | null;

  @Column({
    name: 'preferred_work_mode',
    type: 'enum',
    enum: WorkMode,
    nullable: true,
  })
  preferredWorkMode!: WorkMode | null;

  @Column({ name: 'preferred_hours_start', type: 'varchar', nullable: true })
  preferredHoursStart!: string | null;

  @Column({ name: 'preferred_hours_end', type: 'varchar', nullable: true })
  preferredHoursEnd!: string | null;

  @Column({ name: 'primary_track_id', type: 'varchar', nullable: true })
  primaryTrackId!: string | null;

  @Column({ name: 'cohort_id', type: 'varchar', nullable: true })
  cohortId!: string | null;

  @Column({ name: 'nitda_badge_verified', type: 'boolean', default: false })
  nitdaBadgeVerified!: boolean;

  @Column({ name: 'badge_id', type: 'varchar', nullable: true })
  badgeId!: string | null;

  @Column({ name: 'experience_areas', type: 'simple-array', nullable: true })
  experienceAreas!: string[] | null;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ProfileApprovalStatus,
    default: ProfileApprovalStatus.DRAFT,
  })
  approvalStatus!: ProfileApprovalStatus;

  @Column({
    name: 'visibility_level',
    type: 'enum',
    enum: ProfileVisibility,
    default: ProfileVisibility.PRIVATE,
  })
  visibilityLevel!: ProfileVisibility;

  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @Column({ name: 'internal_ratings', type: 'jsonb', nullable: true })
  internalRatings!: Record<string, any> | null;

  @Column({ name: 'admin_flags', type: 'simple-array', nullable: true })
  adminFlags!: string[] | null;

  @Column({ name: 'profile_strength', type: 'int', default: 0 })
  profileStrength!: number;

  @Column({ name: 'profile_views', type: 'int', default: 0 })
  profileViews!: number;

  @Column({ name: 'intro_requests_received', type: 'int', default: 0 })
  introRequestsReceived!: number;

  @Column({ name: 'notification_preferences', type: 'jsonb', nullable: true })
  notificationPreferences!: Record<string, boolean> | null;

  // Relations

  @OneToOne(() => TalentUser, (user) => user.candidateProfile)
  @JoinColumn({ name: 'user_id' })
  user!: TalentUser;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Track, { nullable: true })
  @JoinColumn({ name: 'primary_track_id' })
  primaryTrack!: Track | null;

  @ManyToMany(() => Track)
  @JoinTable({
    name: 'candidate_tracks',
    joinColumn: { name: 'candidate_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'track_id', referencedColumnName: 'id' },
  })
  tracks!: Track[];

  @ManyToOne(() => Cohort, { nullable: true })
  @JoinColumn({ name: 'cohort_id' })
  cohort!: Cohort | null;

  @OneToMany(() => CandidateSkill, (skill) => skill.candidate)
  candidateSkills!: CandidateSkill[];

  @OneToMany(() => CandidateProject, (project) => project.candidate)
  candidateProjects!: CandidateProject[];

  @OneToMany(() => CandidateDocument, (doc) => doc.candidate)
  candidateDocuments!: CandidateDocument[];

  @OneToMany(() => CandidateConsent, (consent) => consent.candidate)
  candidateConsents!: CandidateConsent[];

  @OneToMany(() => JobApplication, (application) => application.candidate)
  jobApplications!: JobApplication[];
}
