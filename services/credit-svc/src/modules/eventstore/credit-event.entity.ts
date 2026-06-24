import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ schema: 'credit', name: 'credit_events' })
@Unique(['aggregate_id', 'aggregate_ver']) // Concurrencia optimista
export class CreditEventEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'global_seq' })
  globalSeq!: string;

  @Column({ type: 'uuid', name: 'event_id', unique: true })
  eventId!: string;

  @Column({ type: 'uuid', name: 'aggregate_id' })
  aggregateId!: string; // creditId

  @Column({ type: 'int', name: 'aggregate_ver' })
  aggregateVer!: number;

  @Column({ type: 'text', name: 'event_type' })
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  @Column({ type: 'jsonb' })
  metadata!: {
    correlationId: string;
    causationId: string;
    signature: string; // JWS provisto por D6 (compliance-svc)
    producer: string;
  };

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', name: 'occurred_at' })
  occurredAt!: Date;
}