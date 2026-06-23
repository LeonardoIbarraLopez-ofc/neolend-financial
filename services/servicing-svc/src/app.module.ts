import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Módulos (sub-dominios extraíbles):
 *  - modules/collections   → casos por DPD, acuerdos, reestructuración, reporte buró (inciso V)
 *  - modules/notification  → WhatsApp/SMS/email (mock proveedor)
 *  - modules/gamification  → cursos, rewards, bonus de tasa (inciso VIII)
 */
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
