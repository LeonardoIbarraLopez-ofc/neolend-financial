import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CORRELATION_HEADER, correlationFromHeaders } from '@neolend/ts-common';

/**
 * Middleware que garantiza que cada request tenga un X-Correlation-Id.
 * Si el cliente no lo envía, se genera uno nuevo (UUID v4).
 * El ID se propaga también en la respuesta.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = correlationFromHeaders(
      req.headers as Record<string, unknown>,
    );

    // Normaliza el header entrante (garantiza lowercase).
    req.headers[CORRELATION_HEADER] = correlationId;

    // Propaga en la respuesta para que el cliente pueda trazar.
    res.setHeader(CORRELATION_HEADER, correlationId);

    next();
  }
}
