import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

// MVP 1 — Event Store & Decisión
import { CreditEventEntity } from './modules/eventstore/credit-event.entity';
import { EventStoreService } from './modules/eventstore/eventstore.service';
import { DecisionController } from './modules/decision/decision.controller';
import { DecisionService } from './modules/decision/decision.service';

// MVP 2 — Desembolso & Ledger (Contabilidad)
import { DisbursementController } from './modules/disbursement/disbursement.controller';
import { DisbursementService } from './modules/disbursement/disbursement.service';
import { LedgerService } from './modules/ledger/ledger.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'credit_user',
      password: process.env.DB_PASS ?? 'credit_pass',
      database: process.env.DB_NAME ?? 'credit_db',
      entities: [CreditEventEntity],
      synchronize: false, // ¡Usa migraciones reales para evitar machacar los esquemas de otros!
    }),
    TypeOrmModule.forFeature([CreditEventEntity]),
  ],
  controllers: [
    HealthController, 
    DecisionController,     // POST /v1/credits/decision
    DisbursementController, // POST /v1/disbursements
  ],
  providers: [
    EventStoreService, 
    DecisionService, 
    DisbursementService,    // Motor de desembolsos transaccionales
    LedgerService,          // Guardián de la partida doble contable
  ],
})
export class AppModule {}