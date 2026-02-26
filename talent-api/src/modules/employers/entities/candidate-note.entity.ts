import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { EmployerOrg } from './employer-org.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { TalentUser } from '../../users/entities/talent-user.entity';

@Entity('candidate_notes')
export class CandidateNote extends BaseEntity {
  @Column({ name: 'employer_id' })
  employerId!: string;

  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column({ name: 'author_id' })
  authorId!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'mentioned_user_ids', type: 'simple-array', nullable: true })
  mentionedUserIds!: string[] | null;

  @ManyToOne(() => EmployerOrg, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;

  @ManyToOne(() => CandidateProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;

  @ManyToOne(() => TalentUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author!: TalentUser;
}
