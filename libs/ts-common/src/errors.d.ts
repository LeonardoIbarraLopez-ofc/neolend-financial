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
export declare class AppError extends Error {
    readonly status: number;
    readonly title: string;
    readonly detail?: string | undefined;
    readonly type: string;
    constructor(status: number, title: string, detail?: string | undefined, type?: string);
    toProblem(correlationId?: string): ProblemDetails;
}
export declare const NotFound: (detail?: string) => AppError;
export declare const BadRequest: (detail?: string) => AppError;
export declare const Unauthorized: (detail?: string) => AppError;
export declare const Conflict: (detail?: string) => AppError;
export declare const ServiceUnavailable: (detail?: string) => AppError;
