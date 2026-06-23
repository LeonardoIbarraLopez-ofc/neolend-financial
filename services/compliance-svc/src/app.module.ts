import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Módulos (sub-dominios extraíbles):
 *  - modules/signing   → firma JWS (clave local) — usado por credit-svc
 *  - modules/audit     → bitácora append-only + hash chain + WORM local
 *  - modules/regulator → export de trazabilidad firmado + auditoría de sesgo
 * Consume TODOS los eventos relevantes para la bitácora inmutable.
 */
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
