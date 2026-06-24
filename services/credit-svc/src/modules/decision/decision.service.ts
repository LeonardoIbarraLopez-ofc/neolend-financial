import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { DecisionRequestDto } from './dto/decision.dto';

export interface DecisionResult {
  decisionId: string;
  applicationId: string;
  outcome: 'AUTO_APPROVED' | 'REJECTED' | 'MANUAL_PENDING';
  creditId?: string;
  approvedAmount?: number;
  interestRate?: number;
  termMonths?: number;
  requiresManualReview: boolean;
  reasons: string[];
  decidedAt: string;
}

/**
 * Política de crédito (slice de Fase 1, inciso III):
 *  - Auto-aprueba ≤ USD 500 si score≥600, sin fraude y datos suficientes.
 *  - Rechaza score < 550.
 *  - El resto escala a revisión manual.
 * Pendiente para D4: persistir en credit_db y abrir el crédito vía Event
 * Sourcing (CreditOpened firmado por compliance-svc).
 */
@Injectable()
export class DecisionService {
  private static readonly MAX_AUTO_AMOUNT = 500;
  private static readonly RATE_BY_BAND: Record<string, number> = {
    A: 0.018,
    B: 0.029,
    C: 0.045,
    D: 0.065,
  };

  // Almacén en memoria para el baseline (en producción: credit_db).
  private readonly store = new Map<string, DecisionResult>();

  decide(dto: DecisionRequestDto): DecisionResult {
    const reasons: string[] = [];
    let outcome: DecisionResult['outcome'];

    if (dto.fraudFlag) {
      outcome = 'REJECTED';
      reasons.push('fraud_flag');
    } else if (dto.score < 550) {
      outcome = 'REJECTED';
      reasons.push('score<550');
    } else if (
      dto.requestedAmount <= DecisionService.MAX_AUTO_AMOUNT &&
      dto.score >= 600 &&
      (!dto.partialData || dto.score >= 680)
    ) {
      outcome = 'AUTO_APPROVED';
      reasons.push('amount<=500', 'score>=600', dto.partialData ? 'partial_but_strong' : 'full_data');
    } else {
      outcome = 'MANUAL_PENDING';
      if (dto.requestedAmount > DecisionService.MAX_AUTO_AMOUNT) reasons.push('amount>500');
      if (dto.partialData) reasons.push('partial_data');
      if (dto.score < 600) reasons.push('score<600');
    }

    const rate = DecisionService.RATE_BY_BAND[dto.riskBand] ?? 0.05;
    const result: DecisionResult = {
      decisionId: randomUUID(),
      applicationId: dto.applicationId,
      outcome,
      creditId: outcome === 'AUTO_APPROVED' ? randomUUID() : undefined,
      approvedAmount: outcome === 'AUTO_APPROVED' ? dto.requestedAmount : undefined,
      interestRate: outcome === 'AUTO_APPROVED' ? rate : undefined,
      termMonths: outcome === 'AUTO_APPROVED' ? dto.termMonths : undefined,
      requiresManualReview: outcome === 'MANUAL_PENDING',
      reasons,
      decidedAt: new Date().toISOString(),
    };
    this.store.set(result.decisionId, result);
    return result;
  }
}
