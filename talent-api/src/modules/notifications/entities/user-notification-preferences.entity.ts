import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { TalentUser } from '../../users/entities/talent-user.entity';

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  BOTH = 'both',
  NONE = 'none',
}

export type EmailDigestFrequency = 'immediate' | 'daily' | 'weekly' | 'none';

@Entity('user_notification_preferences')
export class UserNotificationPreferences extends BaseEntity {
  @Column({ name: 'user_id', unique: true })
  userId!: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  preferences!: Record<string, NotificationChannel>;

  @Column({
    name: 'email_digest',
    type: 'varchar',
    default: 'immediate',
  })
  emailDigest!: EmailDigestFrequency;

  @Column({ name: 'quiet_hours_start', type: 'time', nullable: true })
  quietHoursStart!: string | null;

  @Column({ name: 'quiet_hours_end', type: 'time', nullable: true })
  quietHoursEnd!: string | null;

  @Column({ name: 'browser_push_enabled', type: 'boolean', default: false })
  browserPushEnabled!: boolean;

  @OneToOne(() => TalentUser)
  @JoinColumn({ name: 'user_id' })
  user!: TalentUser;
}
