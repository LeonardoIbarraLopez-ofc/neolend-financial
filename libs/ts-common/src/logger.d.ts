import pino from 'pino';
/**
 * Logger estructurado compartido. Todos los servicios deben loguear con esto
 * (no usar console.log). Incluye el nombre del servicio y, cuando exista,
 * el correlationId para trazabilidad end-to-end.
 */
export declare function createLogger(service: string): pino.Logger<never, boolean>;
export type Logger = ReturnType<typeof createLogger>;
