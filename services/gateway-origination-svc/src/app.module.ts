import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Módulos del servicio (cada sub-dominio es un módulo extraíble):
 *  - modules/gateway      → auth JWT, routing, CORS
 *  - modules/identity     → applicants, OCR (mock), KYC
 *  - modules/origination  → saga de originación + timeline
 * Se importan aquí a medida que se implementen (Fase 1).
 */
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
