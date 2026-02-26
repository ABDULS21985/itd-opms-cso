import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { CandidateProfile } from './candidate-profile.entity';
import { SkillTag } from '../../taxonomy/entities/skill-tag.entity';

@Entity('candidate_skills')
export class CandidateSkill extends BaseEntity {
  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column({ name: 'skill_id' })
  skillId!: string;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ name: 'verified_by', type: 'varchar', nullable: true })
  verifiedBy!: string | null;

  @Column({ name: 'is_custom', type: 'boolean', default: false })
  isCustom!: boolean;

  @Column({ name: 'custom_tag_name', type: 'varchar', nullable: true })
  customTagName!: string | null;

  @ManyToOne(() => CandidateProfile, (profile) => profile.candidateSkills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;

  @ManyToOne(() => SkillTag, { eager: true })
  @JoinColumn({ name: 'skill_id' })
  skill!: SkillTag;
}
