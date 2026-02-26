import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { TalentUser } from './talent-user.entity';

@Entity('talent_user_roles')
export class TalentUserRole extends BaseEntity {
  @Column({ type: 'enum', enum: TalentPortalRole })
  role!: TalentPortalRole;

  @Column({ name: 'assigned_by', type: 'varchar', nullable: true })
  assignedBy!: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;

  @ManyToOne(() => TalentUser, (user) => user.roles)
  @JoinColumn({ name: 'user_id' })
  user!: TalentUser;

  @Column({ name: 'user_id' })
  userId!: string;
}
