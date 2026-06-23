import pino from 'pino';

/**
 * Logger estructurado compartido. Todos los servicios deben loguear con esto
 * (no usar console.log). Incluye el nombre del servicio y, cuando exista,
 * el correlationId para trazabilidad end-to-end.
 */
export function createLogger(service: string) {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL ?? 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type Logger = ReturnType<typeof createLogger>;
