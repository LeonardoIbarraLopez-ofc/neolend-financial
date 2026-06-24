import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  EventBus,
  NotFound,
  correlationFromHeaders,
} from '@neolend/ts-common';
import {
  EventTypes,
  Topics,
  makeEnvelope,
  type ApplicationSubmittedPayload,
} from '@neolend/ts-events';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import {
  LoanApplication,
  ApplicationStatus,
  TimelineEntry,
} from './origination.model';

/**
 * Saga de originación (D2.3 + D2.4).
 *
 * Flujo:
 *  1. Recibe solicitud → publica `origination.application.submitted`.
 *  2. Llama scoring-svc /v1/scores (REST síncrono con mock si no disponible).
 *  3. Llama credit-svc /v1/credits/decision (REST síncrono con mock si no disponible).
 *  4. Actualiza estado del aggregate LoanApplication + timeline.
 *
 * Patrón: Saga orquestada (gateway controla el flujo).
 * Almacenamiento: Map en memoria (MVP — en producción = PostgreSQL/origination_db).
 */
@Injectable()
export class OriginationService {
  private readonly logger = new Logger(OriginationService.name);
  private readonly store = new Map<string, LoanApplication>();
  private readonly eventBus: EventBus;

  constructor() {
    this.eventBus = new EventBus('gateway-origination-svc');
  }

  /**
   * Inicia la saga de originación (async en background).
   * Retorna 202 inmediatamente con el applicationId y la URL de polling.
   */
  async submit(
    dto: CreateLoanApplicationDto,
    requestHeaders: Record<string, unknown> = {},
  ): Promise<{ applicationId: string; status: string; pollUrl: string }> {
    const applicationId = randomUUID();
    const correlationId = correlationFromHeaders(requestHeaders);

    const now = new Date().toISOString();
    const application: LoanApplication = {
      applicationId,
      correlationId,
      applicantId: dto.applicantId,
      requestedAmount: dto.requestedAmount,
      currency: dto.currency ?? 'USD',
      termMonths: dto.termMonths,
      status: 'SUBMITTED',
      timeline: [
        { step: 'SOLICITUD_RECIBIDA', status: 'done', occurredAt: now },
        { step: 'SCORING', status: 'pending' },
        { step: 'DECISION', status: 'pending' },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.store.set(applicationId, application);

    // Publicar evento origination.application.submitted (D2.4) — fire-and-forget.
    // Si Kafka no está disponible (local/test), el catch interno loguea y continúa.
    void this.publishSubmittedEvent(application);

    // Ejecutar la saga en background (sin bloquear el 202).
    void this.runSaga(applicationId);

    return {
      applicationId,
      status: 'PROCESSING',
      pollUrl: `/v1/loan-applications/${applicationId}`,
    };
  }

  /** Consulta el estado actual de la solicitud (polling). */
  findById(applicationId: string): LoanApplication {
    const app = this.store.get(applicationId);
    if (!app) {
      throw NotFound(`Solicitud ${applicationId} no encontrada`);
    }
    return app;
  }

  // ──────────────────────────────────────────────
  // SAGA STEPS (privados)
  // ──────────────────────────────────────────────

  private async runSaga(applicationId: string): Promise<void> {
    try {
      await this.stepScoring(applicationId);
      await this.stepDecision(applicationId);
    } catch (err) {
      this.logger.error(`Saga falló — applicationId: ${applicationId}, error: ${String(err)}`);
      this.updateStatus(applicationId, 'FAILED', 'DECISION', `Error: ${String(err)}`);
    }
  }

  /** Paso 1: llama scoring-svc (con mock si el servicio no está disponible). */
  private async stepScoring(applicationId: string): Promise<void> {
    const app = this.store.get(applicationId)!;
    this.updateTimeline(applicationId, 'SCORING', 'in_progress');
    this.mutate(applicationId, { status: 'SCORING' });

    const scoringUrl = process.env.SCORING_URL ?? 'http://localhost:8102';
    let scoreData: ScoringResponse;

    try {
      const res = await fetch(`${scoringUrl}/v1/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': app.correlationId,
        },
        body: JSON.stringify({
          applicationId: app.applicationId,
          applicantId: app.applicantId,
          documentNumber: '***mock',
          altData: {
            utilities: { onTimeRatio: 0.9 },
            wallet: { avgMonthlyInflow: 350 },
            ecommerce: { orders6m: 5 },
          },
          fraud: { selfieRef: 'mock', deviceFingerprint: 'mock' },
        }),
        signal: AbortSignal.timeout(Number(process.env.SCORING_TIMEOUT_MS ?? 5000)),
      });

      if (!res.ok) throw new Error(`scoring-svc respondió ${res.status}`);
      scoreData = (await res.json()) as ScoringResponse;
    } catch {
      // Mock fallback: scoring-svc no disponible → usamos score de prueba.
      this.logger.warn(`scoring-svc no disponible; usando mock — applicationId: ${applicationId}`);
      scoreData = mockScoreResponse(app.applicationId);
    }

    this.mutate(applicationId, {
      scoreId: scoreData.scoreId,
      score: scoreData.score,
      riskBand: scoreData.riskBand,
    });
    this.updateTimeline(applicationId, 'SCORING', 'done', `Score: ${scoreData.score}, Banda: ${scoreData.riskBand}`);
  }

  /** Paso 2: llama credit-svc para decisión (con mock si no disponible). */
  private async stepDecision(applicationId: string): Promise<void> {
    const app = this.store.get(applicationId)!;
    this.updateTimeline(applicationId, 'DECISION', 'in_progress');
    this.mutate(applicationId, { status: 'DECIDING' });

    const creditUrl = process.env.CREDIT_URL ?? 'http://localhost:8103';
    let decisionData: DecisionResponse;

    try {
      const res = await fetch(`${creditUrl}/v1/credits/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': app.correlationId,
        },
        body: JSON.stringify({
          applicationId: app.applicationId,
          scoreId: app.scoreId,
          score: app.score,
          riskBand: app.riskBand,
          requestedAmount: app.requestedAmount,
          fraudFlag: false,
          partialData: false,
        }),
        signal: AbortSignal.timeout(Number(process.env.CREDIT_TIMEOUT_MS ?? 5000)),
      });

      if (!res.ok) throw new Error(`credit-svc respondió ${res.status}`);
      decisionData = (await res.json()) as DecisionResponse;
    } catch {
      // Mock fallback: aprobación automática si monto ≤ 500.
      this.logger.warn(`credit-svc no disponible; usando mock — applicationId: ${applicationId}`);
      decisionData = mockDecisionResponse(app.applicationId, app.requestedAmount);
    }

    const newStatus: ApplicationStatus =
      decisionData.outcome === 'AUTO_APPROVED'
        ? 'APPROVED'
        : decisionData.outcome === 'REJECTED'
          ? 'REJECTED'
          : 'MANUAL';

    this.mutate(applicationId, {
      decisionId: decisionData.decisionId,
      creditId: decisionData.creditId,
      approvedAmount: decisionData.approvedAmount,
      interestRate: decisionData.interestRate,
      status: newStatus,
    });

    this.updateTimeline(
      applicationId,
      'DECISION',
      newStatus === 'REJECTED' ? 'failed' : 'done',
      `Decisión: ${decisionData.outcome}`,
    );

    this.logger.log(`Saga completada — applicationId: ${applicationId}, outcome: ${decisionData.outcome}`);
  }

  // ──────────────────────────────────────────────
  // Publicación de eventos (D2.4)
  // ──────────────────────────────────────────────

  private async publishSubmittedEvent(app: LoanApplication): Promise<void> {
    try {
      const payload: ApplicationSubmittedPayload = {
        applicationId: app.applicationId,
        applicantId: app.applicantId,
        requestedAmount: app.requestedAmount,
        currency: app.currency,
        termMonths: app.termMonths,
      };

      const envelope = makeEnvelope({
        eventType: EventTypes.ApplicationSubmitted,
        correlationId: app.correlationId,
        producer: 'gateway-origination-svc',
        payload,
      });

      await this.eventBus.publish(Topics.origination, envelope);
      this.logger.log(`Evento origination.application.submitted publicado — applicationId: ${app.applicationId}`);
    } catch (err) {
      // Kafka/Redpanda puede no estar disponible en desarrollo local → solo log.
      this.logger.warn(`No se pudo publicar evento (Kafka no disponible en modo local): ${String(err)}`);
    }
  }

  // ──────────────────────────────────────────────
  // Helpers de mutación del aggregate
  // ──────────────────────────────────────────────

  private mutate(id: string, patch: Partial<LoanApplication>): void {
    const app = this.store.get(id);
    if (!app) return;
    Object.assign(app, patch, { updatedAt: new Date().toISOString() });
    this.store.set(id, app);
  }

  private updateTimeline(
    id: string,
    step: string,
    status: TimelineEntry['status'],
    detail?: string,
  ): void {
    const app = this.store.get(id);
    if (!app) return;
    const entry = app.timeline.find((t) => t.step === step);
    if (entry) {
      entry.status = status;
      entry.occurredAt = new Date().toISOString();
      if (detail) entry.detail = detail;
    }
    app.updatedAt = new Date().toISOString();
    this.store.set(id, app);
  }

  private updateStatus(
    id: string,
    status: ApplicationStatus,
    step: string,
    detail: string,
  ): void {
    this.mutate(id, { status });
    this.updateTimeline(id, step, 'failed', detail);
  }
}

// ──────────────────────────────────────────────
// Tipos de respuesta de servicios externos
// ──────────────────────────────────────────────

interface ScoringResponse {
  scoreId: string;
  score: number;
  riskBand: string;
  probabilityOfDefault: number;
  modelVersion: string;
  modelSlot: string;
  partialData: boolean;
  fraud: { decision: string; fraudScore: number };
}

interface DecisionResponse {
  decisionId: string;
  outcome: 'AUTO_APPROVED' | 'REJECTED' | 'MANUAL_PENDING';
  creditId?: string;
  approvedAmount?: number;
  interestRate?: number;
  requiresManualReview: boolean;
}

// ──────────────────────────────────────────────
// Mocks de fallback (servicios no disponibles)
// ──────────────────────────────────────────────

function mockScoreResponse(applicationId: string): ScoringResponse {
  return {
    scoreId: randomUUID(),
    score: 712,
    riskBand: 'B',
    probabilityOfDefault: 0.083,
    modelVersion: 'v1.0.0-mock',
    modelSlot: 'BLUE',
    partialData: true,
    fraud: { decision: 'PASS', fraudScore: 0.05 },
  };
}

function mockDecisionResponse(
  applicationId: string,
  requestedAmount: number,
): DecisionResponse {
  const autoApprove = requestedAmount <= 500;
  return {
    decisionId: randomUUID(),
    outcome: autoApprove ? 'AUTO_APPROVED' : 'MANUAL_PENDING',
    creditId: autoApprove ? randomUUID() : undefined,
    approvedAmount: autoApprove ? requestedAmount : undefined,
    interestRate: autoApprove ? 0.0289 : undefined,
    requiresManualReview: !autoApprove,
  };
}
