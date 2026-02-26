import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';

@Entity('tracks')
export class Track extends BaseEntity {
  @Column({ unique: true })
  @Index()
  name!: string;

  @Column({ unique: true })
  @Index()
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'icon_name', type: 'varchar', nullable: true })
  iconName!: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'varchar', length: 7, default: '#1E4DB7' })
  color!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
