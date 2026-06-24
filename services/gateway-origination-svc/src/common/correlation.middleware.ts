import { Injectable, NestMiddleware } from '@nestjs/common';
import { CORRELATION_HEADER, newCorrelationId } from '@neolend/ts-common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Garantiza que toda request tenga X-Correlation-Id (lo genera si falta) y lo
 * refleja en la respuesta, para trazabilidad end-to-end (PLAN-DE-TRABAJO.md §5).
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const existing = req.header(CORRELATION_HEADER);
    const correlationId = existing && existing.length > 0 ? existing : newCorrelationId();
    req.headers[CORRELATION_HEADER] = correlationId;
    res.setHeader(CORRELATION_HEADER, correlationId);
    next();
  }
}
