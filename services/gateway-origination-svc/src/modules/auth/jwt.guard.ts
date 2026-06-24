import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Record<string, unknown>>();
    const headers = req['headers'] as Record<string, string | string[] | undefined>;
    const header = headers['authorization'];
    const token = Array.isArray(header) ? header[0] : header;

    if (!token?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }

    try {
      const payload = this.jwt.verify(token.slice(7));
      req['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
