import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { correlationFromHeaders } from '@neolend/ts-common';
import { LoginDto } from './dto/login.dto';
import { GatewayService } from './gateway.service';
import { Public } from './public.decorator';

/**
 * Controlador del gateway de borde.
 * POST /v1/auth/login — emite JWT (público, sin auth previa).
 */
@Controller('v1/auth')
export class GatewayController {
  constructor(private readonly gatewaySvc: GatewayService) {}

  /** @Public — endpoint abierto: el solicitante no tiene token aún */
  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body() dto: LoginDto,
  ): { accessToken: string; expiresIn: string } {
    return this.gatewaySvc.login(dto);
  }
}
