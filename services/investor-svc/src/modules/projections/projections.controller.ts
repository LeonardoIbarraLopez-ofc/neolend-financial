import { Controller, Get, Param } from '@nestjs/common';
import { ProjectionsService, CashFlowProjectionResponse, FundExposureResponse } from './projections.service';

@Controller('v1')
export class ProjectionsController {
  constructor(private readonly projectionsService: ProjectionsService) {}

  @Get('portfolio/cashflow/projection')
  async getCashFlow(): Promise<CashFlowProjectionResponse[]> {
    return this.projectionsService.getCashFlowProjections();
  }

  @Get('funds/:fundId/exposure')
  async getExposure(@Param('fundId') fundId: string): Promise<FundExposureResponse> {
    return this.projectionsService.getFundExposure(fundId);
  }
}
