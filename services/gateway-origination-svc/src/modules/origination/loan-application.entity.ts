import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ApplicationStatus =
  | 'PROCESSING'
  | 'APPROVED'
  | 'REJECTED'
  | 'MANUAL_REVIEW'
  | 'FAILED';

@Entity('loan_applications')
export class LoanApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string; // = correlationId

  @Column({ name: 'applicant_id' })
  applicantId!: string;

  @Column({ name: 'requested_amount', type: 'decimal', precision: 14, scale: 2 })
  requestedAmount!: number;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  @Column({ name: 'term_months' })
  termMonths!: number;

  @Column({ name: 'status', default: 'PROCESSING' })
  status!: ApplicationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
