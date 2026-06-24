import { Controller, Get } from '@nestjs/common';
import { MetricsService, PortfolioMetricsResponse } from './metrics.service';

@Controller('v1/portfolio')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  async getMetrics(): Promise<PortfolioMetricsResponse> {
    return this.metricsService.getLatestMetrics();
  }
}
