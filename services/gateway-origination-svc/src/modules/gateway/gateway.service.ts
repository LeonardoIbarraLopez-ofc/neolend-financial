import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Unauthorized } from '@neolend/ts-common';
import { LoginDto } from './dto/login.dto';

/**
 * Servicio de autenticación del gateway.
 * Emite tokens JWT con rol embebido.
 * En un entorno real verificaría credenciales contra la BD;
 * en local (demo) acepta cualquier contraseña non-vacía para agilizar.
 */
@Injectable()
export class GatewayService {
  constructor(private readonly jwtService: JwtService) {}

  login(dto: LoginDto): { accessToken: string; expiresIn: string } {
    // Guard mínimo: contraseña no vacía (suficiente para MVP demo).
    if (!dto.password || dto.password.trim().length < 4) {
      throw Unauthorized('Contraseña inválida');
    }

    const payload = {
      sub: `user-${dto.role}-${Date.now()}`,
      email: dto.email,
      role: dto.role,
    };

    const expiresIn = process.env.JWT_EXPIRES_IN ?? '1h';
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return { accessToken, expiresIn };
  }
}
