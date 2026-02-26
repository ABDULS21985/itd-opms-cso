import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';

@Entity('skill_tags')
export class SkillTag extends BaseEntity {
  @Column({ unique: true })
  @Index()
  name!: string;

  @Column({ unique: true })
  @Index()
  slug!: string;

  @Column({ type: 'varchar', nullable: true })
  category!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount!: number;
}
