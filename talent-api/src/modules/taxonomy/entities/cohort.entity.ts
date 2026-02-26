import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';

@Entity('cohorts')
export class Cohort extends BaseEntity {
  @Column({ unique: true })
  @Index()
  name!: string;

  @Column({ unique: true })
  @Index()
  slug!: string;

  @Column({ name: 'program_cycle', type: 'varchar', nullable: true })
  programCycle!: string | null;

  @Column({ name: 'start_date', type: 'timestamptz', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate!: Date | null;

  @Column({ type: 'int', default: 0 })
  capacity!: number;

  @Column({ name: 'enrolled_count', type: 'int', default: 0 })
  enrolledCount!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
