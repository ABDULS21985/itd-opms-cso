import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { AuditAction } from '../../../common/constants/status.constant';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column({ name: 'actor_id' })
  actorId!: string;

  @Column({ name: 'actor_email' })
  actorEmail!: string;

  @Column({ name: 'actor_role' })
  actorRole!: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action!: AuditAction;

  @Column({ name: 'entity_type' })
  entityType!: string;

  @Column({ name: 'entity_id' })
  entityId!: string;

  @Column({ name: 'previous_values', type: 'jsonb', nullable: true })
  previousValues!: Record<string, any> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues!: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true })
  reason!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent!: string | null;
}
