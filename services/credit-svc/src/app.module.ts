import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DecisionModule } from './modules/decision/decision.module';

/**
 * Módulos (sub-dominios extraíbles):
 *  - modules/decision       → auto ≤500 / manual (inciso III) [implementado]
 *  - modules/eventstore     → event store append-only (D4, Fase 4)
 *  - modules/credit-command → comandos del agregado Credit (write, CQRS)
 *  - modules/credit-query   → proyecciones credit_view / schedule (read, CQRS)
 *  - modules/disbursement   → desembolso multicanal idempotente (inciso IV)
 *  - modules/ledger         → contabilidad double-entry
 */
@Module({
  imports: [DecisionModule],
  controllers: [HealthController],
})
export class AppModule {}
