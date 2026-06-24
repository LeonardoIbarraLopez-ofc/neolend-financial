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
export declare function buildHealth(service: string, version?: string): HealthStatus;
