import { Controller, Get } from '@nestjs/common';
import { buildHealth } from '@neolend/ts-common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return buildHealth('investor-svc');
  }

  @Get()
  index() {
    return { status: 'OK', message: 'NeoLend Investor Service (investor-svc) is active' };
  }
}
