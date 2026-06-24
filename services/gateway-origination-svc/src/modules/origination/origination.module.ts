import { Module } from '@nestjs/common';
import { OriginationController } from './origination.controller';
import { OriginationService } from './origination.service';

/**
 * Módulo de Originación — Saga orquestada.
 * Responsabilidades: iniciar solicitudes, orquestar scoring→decisión,
 * publicar eventos y mantener el timeline de estado.
 */
@Module({
  controllers: [OriginationController],
  providers: [OriginationService],
  exports: [OriginationService],
})
export class OriginationModule {}
