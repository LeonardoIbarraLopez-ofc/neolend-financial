/**
 * Contrato de health-check uniforme. Todos los servicios exponen GET /health
 * devolviendo este shape (ver Definition of Done en PLAN-DE-TRABAJO.md §8).
 */
export interface HealthStatus {
  service: string;
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

export function buildHealth(service: string, version = '0.1.0'): HealthStatus {
  return {
    service,
    status: 'ok',
    version,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
