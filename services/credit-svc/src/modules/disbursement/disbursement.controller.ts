import { Controller, Post, Body } from '@nestjs/common';
import { DisbursementService } from './disbursement.service';
import { RequestDisbursementDto } from './disbursement.dto';

@Controller('v1/disbursements')
export class DisbursementController {
  constructor(private readonly disbursementService: DisbursementService) {}

  @Post()
  async requestDisbursement(@Body() dto: RequestDisbursementDto) {
    return this.disbursementService.executeDisbursement(dto);
  }
}