import { randomUUID } from 'node:crypto';

/**
 * Envelope estándar de TODO evento del bus (ver PLAN-DE-TRABAJO.md §4.1).
 * Nadie publica un evento sin este sobre.
 */
export interface EventEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  correlationId: string;
  causationId?: string;
  producer: string;
  schemaVersion: number;
  payload: T;
}

export function makeEnvelope<T>(args: {
  eventType: string;
  correlationId: string;
  producer: string;
  payload: T;
  causationId?: string;
  schemaVersion?: number;
}): EventEnvelope<T> {
  return {
    eventId: randomUUID(),
    eventType: args.eventType,
    occurredAt: new Date().toISOString(),
    correlationId: args.correlationId,
    causationId: args.causationId,
    producer: args.producer,
    schemaVersion: args.schemaVersion ?? 1,
    payload: args.payload,
  };
}
