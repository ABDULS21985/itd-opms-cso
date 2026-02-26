import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';

@Entity('locations')
export class Location extends BaseEntity {
  @Column()
  city!: string;

  @Column()
  country!: string;

  @Column({ name: 'country_code', type: 'varchar', nullable: true })
  countryCode!: string | null;

  @Column({ type: 'varchar', nullable: true })
  timezone!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
