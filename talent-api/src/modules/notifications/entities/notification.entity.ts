import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { NotificationType } from '../../../common/constants/status.constant';
import { TalentUser } from '../../users/entities/talent-user.entity';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type!: NotificationType;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'action_url', type: 'varchar', nullable: true })
  actionUrl!: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ name: 'email_sent', type: 'boolean', default: false })
  emailSent!: boolean;

  @ManyToOne(() => TalentUser, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user!: TalentUser;
}
