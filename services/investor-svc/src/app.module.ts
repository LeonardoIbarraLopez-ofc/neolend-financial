import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

/**
 * Módulos (sub-dominios extraíbles) — servicio read-only (proyecciones):
 *  - modules/projections → consume credit/disbursement/collections events
 *  - modules/metrics     → TIR, PAR30/90, morosidad por segmento (inciso VI)
 *  - modules/stream      → WebSocket /portfolio/stream (tiempo real)
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.INVESTOR_DB_PATH ?? './data/investor.sqlite',
      entities: [],
      synchronize: true,
    }),
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
