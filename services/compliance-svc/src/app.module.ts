import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from './common/database.module';
import { SigningModule } from './modules/signing/signing.module';
import { AuditModule } from './modules/audit/audit.module';
import { RegulatorModule } from './modules/regulator/regulator.module';

/**
 * Módulos (sub-dominios extraíbles):
 *  - modules/signing   → firma JWS (clave local) — usado por credit-svc
 *  - modules/audit     → bitácora append-only + hash chain + WORM local
 *  - modules/regulator → export de trazabilidad firmado + auditoría de sesgo
 * Consume TODOS los eventos relevantes para la bitácora inmutable.
 */
@Module({
  imports: [DatabaseModule, SigningModule, AuditModule, RegulatorModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
