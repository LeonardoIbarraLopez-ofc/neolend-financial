import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError, CORRELATION_HEADER } from '@neolend/ts-common';

/**
 * Filtro global de excepciones — formato RFC 7807 (problem+json).
 * Uniforme en todos los servicios (PLAN-DE-TRABAJO.md §3).
 */
@Catch()
export class Rfc7807Filter implements ExceptionFilter {
  private readonly logger = new Logger(Rfc7807Filter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const correlationId =
      (req.headers[CORRELATION_HEADER] as string | undefined) ?? 'unknown';

    let status = 500;
    let problem: Record<string, unknown>;

    if (exception instanceof AppError) {
      status = exception.status;
      problem = exception.toProblem(correlationId) as unknown as Record<string, unknown>;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      problem = {
        type: 'about:blank',
        title: typeof resp === 'string' ? resp : (resp as { message?: string }).message ?? exception.message,
        status,
        correlationId,
      };
    } else {
      this.logger.error(`Excepción no controlada — correlationId: ${correlationId}, error: ${String(exception)}`);
      problem = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: exception instanceof Error ? exception.message : String(exception),
        correlationId,
      };
    }

    res.status(status).json(problem);
  }
}
