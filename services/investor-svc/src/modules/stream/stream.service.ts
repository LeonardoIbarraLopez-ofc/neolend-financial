import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../common/database';
import { EventBus, EventEnvelope, createLogger } from '@neolend/ts-common';
import { StreamGateway } from './stream.gateway';

const log = createLogger('investor-svc:stream-listener');

@Injectable()
export class StreamService implements OnModuleInit {
  private eventBus!: EventBus;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly gateway: StreamGateway,
  ) {}

  async onModuleInit() {
    this.eventBus = new EventBus('investor-svc');
    this.startListening().catch(err => {
      log.warn({ err }, 'No se pudo establecer conexión con el bus Kafka (Redpanda) al iniciar. La API REST y WebSocket seguirán operando.');
    });
  }

  private async startListening() {
    // Suscribirse a eventos de crédito, desembolso y cobranza
    await this.eventBus.subscribe(
      ['credit.events', 'disbursement.events', 'collections.events'],
      'investor-service-group',
      async (envelope: EventEnvelope<any>) => {
        log.info({ eventType: envelope.eventType }, 'Evento consumido por investor-svc');
        await this.processEvent(envelope);
      }
    );
  }

  private async processEvent(envelope: EventEnvelope<any>) {
    const { eventType, payload } = envelope;

    try {
      if (eventType === 'origination.application.submitted' || eventType === 'scoring.score.completed') {
        return; // No impact on active metrics
      }

      // 1. Cuando se aprueba / desembolsa un crédito (ej. de credit-svc)
      if (eventType === 'credit.disbursed' || eventType === 'disbursement.completed') {
        const amount = Number(payload.amount ?? payload.requestAmount ?? 1000);
        const segment = payload.segment ?? 'B';
        const irr = Number(payload.irr ?? 0.165);

        // Insertar métrica incremental en portfolio_metrics
        await this.pool.query(`
          INSERT INTO investor.portfolio_metrics (ts, segment, outstanding, irr, par30, par90, delinquency_rate, active_credits)
          VALUES (now(), $1, $2, $3, 0.0240, 0.0080, 0.0320, 1)
          ON CONFLICT (ts, segment) DO UPDATE SET 
            outstanding = investor.portfolio_metrics.outstanding + EXCLUDED.outstanding,
            active_credits = investor.portfolio_metrics.active_credits + 1
        `, [segment, amount, irr]);

        // Registrar flujo en proyecciones (inflow esperado en los siguientes meses)
        await this.pool.query(`
          INSERT INTO investor.cashflow_projection (fund_id, month, inflow, outflow, net)
          VALUES ('84819280-9281-4281-8281-291039103910', date_trunc('month', now() + interval '1 month')::date, $1 * 0.18, $1 * 0.08, $1 * 0.10)
          ON CONFLICT (fund_id, month) DO UPDATE SET 
            inflow = investor.cashflow_projection.inflow + EXCLUDED.inflow,
            net = investor.cashflow_projection.net + EXCLUDED.net
        `, [amount]);

        log.info({ amount, segment }, 'Procesada aprobación/desembolso en la base de datos de inversionistas');
      }

      // 2. Cuando se registra un pago (cobros)
      if (eventType === 'collections.payment.registered') {
        const paymentAmount = Number(payload.amount ?? 150);
        const fundId = '84819280-9281-4281-8281-291039103910';

        // Reducir outstanding del segmento correspondiente
        await this.pool.query(`
          UPDATE investor.portfolio_metrics 
          SET outstanding = LEAST(0.00, outstanding - $1)
          WHERE ts = (SELECT MAX(ts) FROM investor.portfolio_metrics)
        `, [paymentAmount]);

        // Registrar ingreso real en flujo de caja del mes en curso
        await this.pool.query(`
          INSERT INTO investor.cashflow_projection (fund_id, month, inflow, outflow, net)
          VALUES ($1, date_trunc('month', now())::date, $2, 0.00, $2)
          ON CONFLICT (fund_id, month) DO UPDATE SET 
            inflow = investor.cashflow_projection.inflow + EXCLUDED.inflow,
            net = investor.cashflow_projection.net + EXCLUDED.net
        `, [fundId, paymentAmount]);

        log.info({ paymentAmount }, 'Procesado registro de pago en el módulo del inversionista');
      }

      // Actualizar exposición de fondos
      if (eventType === 'credit.disbursed' || eventType === 'disbursement.completed') {
        const amount = Number(payload.amount ?? 1000);
        await this.pool.query(`
          UPDATE investor.funds 
          SET exposure = exposure + $1 
          WHERE id = '84819280-9281-4281-8281-291039103910'
        `, [amount]);
      }

      // Notificar a los WebSockets con las métricas recalculadas
      const res = await this.pool.query(`
        SELECT ts, segment, outstanding, irr, par30, par90, delinquency_rate, active_credits
        FROM investor.portfolio_metrics
        ORDER BY ts DESC
      `);
      this.gateway.broadcastMetricsUpdate(res.rows);

    } catch (err: any) {
      log.error({ err }, 'Error al procesar y retransmitir evento en el modulo stream');
    }
  }
}
