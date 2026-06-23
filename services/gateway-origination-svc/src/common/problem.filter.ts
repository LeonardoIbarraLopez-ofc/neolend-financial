import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppError, CORRELATION_HEADER, type ProblemDetails } from '@neolend/ts-common';
import type { Request, Response } from 'express';

/**
 * Convierte cualquier excepción al formato estándar RFC 7807 (problem+json),
 * uniforme en todos los servicios (PLAN-DE-TRABAJO.md §3).
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const correlationId = req.header(CORRELATION_HEADER);

    let problem: ProblemDetails;
    if (exception instanceof AppError) {
      problem = exception.toProblem(correlationId);
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      problem = {
        type: 'about:blank',
        title: HttpStatus[status] ?? 'Error',
        status,
        detail: exception.message,
        correlationId,
      };
    } else {
      problem = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: exception instanceof Error ? exception.message : 'unexpected',
        correlationId,
      };
    }

    res.status(problem.status).type('application/problem+json').json(problem);
  }
}
