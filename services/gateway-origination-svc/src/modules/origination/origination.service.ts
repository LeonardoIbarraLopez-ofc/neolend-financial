import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import {
  createLogger,
  EventBus,
  NotFound,
} from '@neolend/ts-common';
import { EventTypes, makeEnvelope, Topics } from '@neolend/ts-events';
import { PG_POOL } from '../../common/database';
import { ApplicantsService } from '../identity/applicants.service';
import { ScoringClient } from './clients/scoring.client';
import { CreditClient } from './clients/credit.client';
import type { CreateApplicationDto } from './dto/create-application.dto';

const log = createLogger('origination-saga');

/**
 * Saga de originación (orquestación). El applicationId ES el correlationId que
 * viaja por todo el flujo. Pasos: SCORING → DECISION → finalización.
 * Se ejecuta en segundo plano; el cliente consulta el estado por polling.
 */
@Injectable()
export class OriginationService {
  private readonly bus = new EventBus('gateway-origination-svc');

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly applicants: ApplicantsService,
    private readonly scoring: ScoringClient,
    private readonly credit: CreditClient,
  ) {}

  async submit(dto: CreateApplicationDto) {
    const { rows } = await this.pool.query(
      `INSERT INTO origination.loan_applications
         (applicant_id, requested_amount, currency, term_months)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [dto.applicantId, dto.requestedAmount, dto.currency ?? 'USD', dto.termMonths],
    );
    const applicationId: string = rows[0].id; // = correlationId
    await this.timeline(applicationId, 'RECEIVED', 'COMPLETED', 'Solicitud recibida');

    // Ejecuta la saga en segundo plano (respuesta 202 inmediata).
    setImmediate(() => this.runSaga(applicationId, dto).catch((err) => log.error({ err }, 'saga')));

    return { applicationId, status: 'PROCESSING', pollUrl: `/v1/loan-applications/${applicationId}` };
  }

  private async runSaga(applicationId: string, dto: CreateApplicationDto) {
    const correlationId = applicationId;
    try {
      const applicant = await this.applicants.get(dto.applicantId);

      // --- Paso 1: SCORING (incluye buró/fraude/alt-data internos) ---
      await this.setStep(applicationId, 'SCORING', 'STARTED');
      await this.timeline(applicationId, 'SCORING', 'STARTED', 'Calculando score crediticio');
      const score = await this.scoring.score(
        {
          applicationId,
          applicantId: applicant.id,
          documentNumber: applicant.documentNumber,
        },
        correlationId,
      );
      await this.timeline(
        applicationId,
        'SCORING',
        'COMPLETED',
        `Score ${score.score} (banda ${score.riskBand}${score.partialData ? ', datos parciales' : ''})`,
      );

      // --- Paso 2: DECISION (auto ≤500 / manual) ---
      await this.setStep(applicationId, 'DECISION', 'STARTED');
      await this.timeline(applicationId, 'DECISION', 'STARTED', 'Evaluando decisión');
      const fraudFlag = score.fraud?.decision === 'BLOCK';
      const decision = await this.credit.decide(
        {
          applicationId,
          scoreId: score.scoreId,
          score: score.score,
          riskBand: score.riskBand,
          requestedAmount: dto.requestedAmount,
          termMonths: dto.termMonths,
          fraudFlag,
          partialData: score.partialData,
        },
        correlationId,
      );

      // --- Finalización ---
      const status =
        decision.outcome === 'AUTO_APPROVED'
          ? 'APPROVED'
          : decision.outcome === 'MANUAL_PENDING'
            ? 'MANUAL_REVIEW'
            : 'REJECTED';
      await this.pool.query(
        `UPDATE origination.loan_applications SET status = $2, result = $3 WHERE id = $1`,
        [applicationId, status, JSON.stringify({ score, decision })],
      );
      await this.timeline(applicationId, 'DECISION', 'COMPLETED', `Resultado: ${decision.outcome}`);
      await this.publishSubmitted(applicationId, dto);
    } catch (err) {
      log.error({ err, applicationId }, 'saga falló — compensando');
      await this.pool.query(
        `UPDATE origination.loan_applications SET status = 'FAILED' WHERE id = $1`,
        [applicationId],
      );
      await this.timeline(
        applicationId,
        'FAILED',
        'FAILED',
        err instanceof Error ? err.message : 'error inesperado',
      );
    }
  }

  async getStatus(applicationId: string) {
    const app = await this.pool.query(
      `SELECT id, status, requested_amount, currency, term_months, result, created_at
         FROM origination.loan_applications WHERE id = $1`,
      [applicationId],
    );
    if (app.rows.length === 0) throw NotFound(`solicitud ${applicationId} no existe`);
    const timeline = await this.pool.query(
      `SELECT step, status, message, occurred_at
         FROM origination.application_timeline WHERE application_id = $1 ORDER BY id`,
      [applicationId],
    );
    const row = app.rows[0];
    return {
      applicationId: row.id,
      status: row.status,
      requestedAmount: Number(row.requested_amount),
      currency: row.currency,
      termMonths: row.term_months,
      result: row.result ?? undefined,
      timeline: timeline.rows.map((t) => ({
        step: t.step,
        status: t.status,
        message: t.message,
        occurredAt: t.occurred_at,
      })),
    };
  }

  private async setStep(applicationId: string, step: string, status: string) {
    await this.pool.query(
      `INSERT INTO origination.saga_state (application_id, current_step, step_status)
       VALUES ($1,$2,$3)
       ON CONFLICT (application_id)
       DO UPDATE SET current_step = $2, step_status = $3, updated_at = now()`,
      [applicationId, step, status],
    );
  }

  private async timeline(applicationId: string, step: string, status: string, message: string) {
    await this.pool.query(
      `INSERT INTO origination.application_timeline (application_id, step, status, message)
       VALUES ($1,$2,$3,$4)`,
      [applicationId, step, status, message],
    );
  }

  private async publishSubmitted(applicationId: string, dto: CreateApplicationDto) {
    try {
      const envelope = makeEnvelope({
        eventType: EventTypes.ApplicationSubmitted,
        correlationId: applicationId,
        producer: 'gateway-origination-svc',
        payload: {
          applicationId,
          applicantId: dto.applicantId,
          requestedAmount: dto.requestedAmount,
          currency: dto.currency ?? 'USD',
          termMonths: dto.termMonths,
        },
      });
      await Promise.race([
        this.bus.publish(Topics.origination, envelope),
        new Promise((_, rej) => setTimeout(() => rej(new Error('kafka timeout')), 3000)),
      ]);
    } catch (err) {
      // Best-effort: el estado ya está persistido; no bloquear por el bus.
      log.warn({ err, applicationId }, 'no se pudo publicar application.submitted');
    }
  }
}
