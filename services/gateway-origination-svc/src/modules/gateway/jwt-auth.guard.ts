import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Unauthorized } from '@neolend/ts-common';
import type { Request } from 'express';

/**
 * Valida el JWT del header Authorization: Bearer <token> y adjunta el payload
 * (incluido el rol) a req.user. Las rutas públicas (login, health) no lo usan.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const auth = req.header('authorization');
    if (!auth?.startsWith('Bearer ')) {
      throw Unauthorized('token ausente');
    }
    try {
      req.user = await this.jwt.verifyAsync(auth.slice(7));
      return true;
    } catch {
      throw Unauthorized('token inválido o expirado');
    }
  }
}
