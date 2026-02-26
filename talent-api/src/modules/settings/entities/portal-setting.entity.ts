import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';

@Entity('portal_settings')
export class PortalSetting extends BaseEntity {
  @Column({ name: 'setting_key', type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ name: 'setting_value', type: 'text' })
  value!: string;

  @Column({ name: 'value_type', type: 'varchar', default: 'string' })
  valueType!: string; // 'string' | 'boolean' | 'number' | 'json'

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;
}
