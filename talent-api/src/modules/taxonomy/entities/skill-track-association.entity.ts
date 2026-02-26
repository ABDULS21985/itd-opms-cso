import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { SkillTag } from './skill-tag.entity';
import { Track } from './track.entity';

@Entity('skill_track_associations')
@Index(['skillId', 'trackId'], { unique: true })
export class SkillTrackAssociation extends BaseEntity {
  @Column({ name: 'skill_id' })
  skillId!: string;

  @Column({ name: 'track_id' })
  trackId!: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @ManyToOne(() => SkillTag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill!: SkillTag;

  @ManyToOne(() => Track, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Track;
}
