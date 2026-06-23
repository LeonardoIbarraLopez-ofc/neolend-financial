import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Módulos (sub-dominios extraíbles) — servicio read-only (proyecciones):
 *  - modules/projections → consume credit/disbursement/collections events
 *  - modules/metrics     → TIR, PAR30/90, morosidad por segmento (inciso VI)
 *  - modules/stream      → WebSocket /portfolio/stream (tiempo real)
 */
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
