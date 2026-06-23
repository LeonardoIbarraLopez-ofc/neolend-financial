/**
 * Errores y formato de respuesta estándar RFC 7807 (problem+json).
 * Uniforme en todos los servicios (ver PLAN-DE-TRABAJO.md §3).
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  correlationId?: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail?: string,
    public readonly type = 'about:blank',
  ) {
    super(detail ?? title);
  }

  toProblem(correlationId?: string): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      correlationId,
    };
  }
}

export const NotFound = (detail?: string) => new AppError(404, 'Not Found', detail);
export const BadRequest = (detail?: string) => new AppError(400, 'Bad Request', detail);
export const Unauthorized = (detail?: string) => new AppError(401, 'Unauthorized', detail);
export const Conflict = (detail?: string) => new AppError(409, 'Conflict', detail);
export const ServiceUnavailable = (detail?: string) =>
  new AppError(503, 'Service Unavailable', detail);
