import { Entity, Column, OneToOne, OneToMany, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../database/entities/base.entity';
import { TalentUserType } from '../../../common/constants/status.constant';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { EmployerUser } from '../../employers/entities/employer-user.entity';
import { TalentUserRole } from './talent-user-role.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('talent_users')
export class TalentUser extends BaseEntity {
  @Column({ name: 'external_user_id', unique: true })
  @Index()
  externalUserId!: string;

  @Column()
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true, select: false })
  @Exclude()
  passwordHash!: string | null;

  @Column({ name: 'display_name', type: 'varchar', nullable: true })
  displayName!: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: TalentUserType,
    default: TalentUserType.CANDIDATE,
  })
  userType!: TalentUserType;

  @Column({ type: 'jsonb', default: [] })
  permissions!: string[];

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt!: Date | null;

  @OneToOne(() => CandidateProfile, (profile) => profile.user)
  candidateProfile!: CandidateProfile;

  @OneToMany(() => EmployerUser, (eu) => eu.user)
  employerUsers!: EmployerUser[];

  @OneToMany(() => TalentUserRole, (role) => role.user)
  roles!: TalentUserRole[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];
}
