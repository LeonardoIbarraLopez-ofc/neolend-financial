/** Header estándar para propagar la trazabilidad end-to-end. */
export declare const CORRELATION_HEADER = "x-correlation-id";
export declare function newCorrelationId(): string;
/** Extrae el correlationId del header o genera uno nuevo. */
export declare function correlationFromHeaders(headers: Record<string, unknown>): string;
