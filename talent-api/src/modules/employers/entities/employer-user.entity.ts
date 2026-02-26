import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { EmployerUserRole } from '../../../common/constants/status.constant';
import { TalentUser } from '../../users/entities/talent-user.entity';
import { EmployerOrg } from './employer-org.entity';

@Entity('employer_users')
export class EmployerUser extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'org_id' })
  orgId!: string;

  @Column({ name: 'contact_name' })
  contactName!: string;

  @Column({ name: 'role_title', type: 'varchar', nullable: true })
  roleTitle!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({
    type: 'enum',
    enum: EmployerUserRole,
    default: EmployerUserRole.MEMBER,
  })
  role!: EmployerUserRole;

  @ManyToOne(() => TalentUser, (user) => user.employerUsers)
  @JoinColumn({ name: 'user_id' })
  user!: TalentUser;

  @ManyToOne(() => EmployerOrg, (org) => org.employerUsers)
  @JoinColumn({ name: 'org_id' })
  org!: EmployerOrg;
}
