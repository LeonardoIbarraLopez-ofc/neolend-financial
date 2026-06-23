import { Controller, Get } from '@nestjs/common';
import { buildHealth } from '@neolend/ts-common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return buildHealth('servicing-svc');
  }
}
