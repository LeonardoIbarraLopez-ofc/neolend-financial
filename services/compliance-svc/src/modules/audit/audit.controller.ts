import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('records/:correlationId')
  async getRecords(@Param('correlationId') correlationId: string) {
    const records = await this.auditService.getRecordsByCorrelationId(correlationId);
    if (!records || records.length === 0) {
      throw new NotFoundException(`No se encontraron registros para la solicitud: ${correlationId}`);
    }
    return records;
  }

  @Get('verify/:recordId')
  async verifyIntegrity(@Param('recordId') recordId: string) {
    const result = await this.auditService.verifyIntegrity(recordId);
    return result;
  }
}
