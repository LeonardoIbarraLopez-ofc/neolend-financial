import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

/**
 * Módulos (sub-dominios extraíbles):
 *  - modules/collections   → casos por DPD, acuerdos, reestructuración, reporte buró (inciso V)
 *  - modules/notification  → WhatsApp/SMS/email (mock proveedor)
 *  - modules/gamification  → cursos, rewards, bonus de tasa (inciso VIII)
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.SERVICING_DB_PATH ?? './data/servicing.sqlite',
      entities: [],
      synchronize: true,
    }),
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
