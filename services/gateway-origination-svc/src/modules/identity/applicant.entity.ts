import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type DocumentType = 'DNI' | 'CI' | 'PASSPORT';

@Entity('applicants')
@Unique(['documentNumberHash', 'documentType'])
export class Applicant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ name: 'document_number_enc' })
  documentNumberEnc!: string; // AES-256-GCM base64

  @Column({ name: 'document_number_hash' })
  documentNumberHash!: string; // HMAC-SHA256 for dedup/lookup

  @Column({ name: 'document_type' })
  documentType!: DocumentType;

  @Column({ nullable: true })
  dob!: string;

  @Column({ name: 'phone_enc', nullable: true })
  phoneEnc!: string; // AES-256-GCM base64

  @Column({ name: 'email_enc', nullable: true })
  emailEnc!: string; // AES-256-GCM base64

  @Column({ name: 'kyc_status', default: 'PENDING' })
  kycStatus!: KycStatus;

  @Column({ name: 'ocr_payload', type: 'simple-json', nullable: true })
  ocrPayload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
