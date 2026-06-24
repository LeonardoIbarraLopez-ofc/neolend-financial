import { Controller, Get } from '@nestjs/common';
import { buildHealth } from '@neolend/ts-common';
import { Public } from './modules/gateway/public.decorator';

@Controller()
export class HealthController {
  /** Endpoint de health check — @Public() para monitoreo sin autenticación. */
  @Public()
  @Get('health')
  health() {
    return buildHealth('gateway-origination-svc');
  }
}
