import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../gateway/jwt-auth.guard';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { OriginationService } from './origination.service';

/**
 * Controlador de Originación.
 * POST /v1/loan-applications   → 202 (inicia la saga)
 * GET  /v1/loan-applications/:id → estado + timeline
 */
@UseGuards(JwtAuthGuard)
@Controller('v1/loan-applications')
export class OriginationController {
  constructor(private readonly originationSvc: OriginationService) {}

  /**
   * Inicia una solicitud de crédito.
   * Retorna 202 inmediatamente; el cliente hace polling al pollUrl.
   * El X-Correlation-Id se propaga como correlationId del aggregate.
   */
  @Post()
  @HttpCode(202)
  async submit(
    @Body() dto: CreateLoanApplicationDto,
    @Headers() headers: Record<string, unknown>,
  ) {
    return this.originationSvc.submit(dto, headers);
  }

  /** Consulta estado + progreso (timeline) de la solicitud. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.originationSvc.findById(id);
  }
}
