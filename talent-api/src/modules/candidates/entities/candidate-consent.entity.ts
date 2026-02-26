import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { ConsentType } from '../../../common/constants/status.constant';
import { CandidateProfile } from './candidate-profile.entity';

@Entity('candidate_consents')
export class CandidateConsent extends BaseEntity {
  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column({
    name: 'consent_type',
    type: 'enum',
    enum: ConsentType,
  })
  consentType!: ConsentType;

  @Column({ type: 'boolean', default: false })
  granted!: boolean;

  @Column({ name: 'granted_at', type: 'timestamptz' })
  grantedAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent!: string | null;

  @ManyToOne(() => CandidateProfile, (profile) => profile.candidateConsents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;
}
