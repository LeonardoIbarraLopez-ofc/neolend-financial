import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Módulos (sub-dominios extraíbles):
 *  - modules/decision       → auto ≤500 / manual + cola de revisión (inciso III)
 *  - modules/eventstore     → event store append-only + concurrencia optimista
 *  - modules/credit-command → comandos del agregado Credit (write, CQRS)
 *  - modules/credit-query   → proyecciones credit_view / schedule (read, CQRS)
 *  - modules/disbursement   → desembolso multicanal idempotente (inciso IV)
 *  - modules/ledger         → contabilidad double-entry
 */
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
