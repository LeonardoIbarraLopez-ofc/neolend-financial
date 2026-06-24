import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SagaStep =
  | 'SCORING'
  | 'DECISION'
  | 'OPEN_CREDIT'
  | 'COMPLETED'
  | 'FAILED';

export type StepStatus = 'STARTED' | 'COMPLETED' | 'FAILED';

@Entity('saga_state')
export class SagaState {
  @PrimaryColumn({ name: 'application_id' })
  applicationId!: string;

  @Column({ name: 'current_step' })
  currentStep!: SagaStep;

  @Column({ name: 'step_status' })
  stepStatus!: StepStatus;

  @Column({ name: 'payload', type: 'simple-json', nullable: true })
  payload!: Record<string, unknown> | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
