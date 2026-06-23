import { randomUUID } from 'node:crypto';

/** Header estándar para propagar la trazabilidad end-to-end. */
export const CORRELATION_HEADER = 'x-correlation-id';

export function newCorrelationId(): string {
  return randomUUID();
}

/** Extrae el correlationId del header o genera uno nuevo. */
export function correlationFromHeaders(headers: Record<string, unknown>): string {
  const raw = headers[CORRELATION_HEADER];
  return typeof raw === 'string' && raw.length > 0 ? raw : newCorrelationId();
}
