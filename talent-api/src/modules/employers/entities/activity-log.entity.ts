import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { EmployerOrg } from './employer-org.entity';
import { ActivityType } from '../../../common/constants/status.constant';

@Entity('employer_activity_logs')
export class EmployerActivityLog extends BaseEntity {
  @Column({ name: 'employer_id' })
  employerId!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'user_name', type: 'varchar', nullable: true })
  userName!: string | null;

  @Column({ name: 'activity_type', type: 'enum', enum: ActivityType })
  activityType!: ActivityType;

  @Column({ name: 'entity_type' })
  entityType!: string;

  @Column({ name: 'entity_id' })
  entityId!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => EmployerOrg, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employer_id' })
  employer!: EmployerOrg;
}
