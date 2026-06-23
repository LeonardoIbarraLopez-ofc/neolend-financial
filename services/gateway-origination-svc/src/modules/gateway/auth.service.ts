import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Unauthorized } from '@neolend/ts-common';
import type { LoginDto, Role } from './dto/login.dto';

/**
 * Autenticación local para el entorno de desarrollo/hackatón.
 * Acepta cualquier credencial no vacía y emite un JWT con el rol indicado
 * (por defecto 'applicant'). En producción se reemplaza por un IdP (OIDC).
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; role: Role; email: string }> {
    if (!dto.email || !dto.password) {
      throw Unauthorized('credenciales inválidas');
    }
    const role: Role = dto.role ?? 'applicant';
    const accessToken = await this.jwt.signAsync({ sub: dto.email, email: dto.email, role });
    return { accessToken, role, email: dto.email };
  }
}
