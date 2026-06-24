import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { RegulatorService } from './regulator.service';

@Controller('v1/reports')
export class RegulatorController {
  constructor(private readonly regulatorService: RegulatorService) {}

  @Post('scoring-traceability')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestScoringTraceability(@Body() body: { periodFrom: string; periodTo: string }) {
    const result = await this.regulatorService.requestScoringTraceabilityReport(
      body.periodFrom,
      body.periodTo
    );
    return result;
  }

  @Get('bias-audit')
  async getBiasAudits() {
    const audits = await this.regulatorService.getBiasAudits();
    return audits;
  }

  @Get(':id/download')
  async downloadReport(@Param('id') id: string) {
    const content = await this.regulatorService.getReportDownload(id);
    return content;
  }
}
