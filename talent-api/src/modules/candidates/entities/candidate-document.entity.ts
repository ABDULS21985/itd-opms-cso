import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { DocumentType } from '../../../common/constants/status.constant';
import { CandidateProfile } from './candidate-profile.entity';

@Entity('candidate_documents')
export class CandidateDocument extends BaseEntity {
  @Column({ name: 'candidate_id' })
  candidateId!: string;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: DocumentType,
  })
  documentType!: DocumentType;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Column({ name: 'file_url' })
  fileUrl!: string;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize!: number;

  @Column({ name: 'is_current', type: 'boolean', default: true })
  isCurrent!: boolean;

  @ManyToOne(() => CandidateProfile, (profile) => profile.candidateDocuments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateProfile;
}
