import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

/**
 * Módulos (sub-dominios extraíbles):
 *  - modules/signing   → firma JWS (clave local) — usado por credit-svc
 *  - modules/audit     → bitácora append-only + hash chain + WORM local
 *  - modules/regulator → export de trazabilidad firmado + auditoría de sesgo
 * Consume TODOS los eventos relevantes para la bitácora inmutable.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.COMPLIANCE_DB_PATH ?? './data/compliance.sqlite',
      entities: [],
      synchronize: true,
    }),
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
