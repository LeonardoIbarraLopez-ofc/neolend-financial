import { Injectable } from '@nestjs/common';
import { CreateDecisionDto } from './decision.dto';
import { EventStoreService } from '../eventstore/eventstore.service';
import { randomUUID } from 'crypto';

@Injectable()
export class DecisionService {
  constructor(private readonly eventStore: EventStoreService) {}

  async processDecision(dto: CreateDecisionDto) {
    const decisionId = randomUUID();
    const creditId = randomUUID(); // Si aprueba, este será el aggregateId

    // Regla del negocio: Auto-aprobado si el monto es <= 500 y score óptimo
    let outcome: 'AUTO_APPROVED' | 'MANUAL_PENDING' | 'REJECTED' = 'MANUAL_PENDING';
    let requiresManual = true;

    if (dto.score < 400) {
      outcome = 'REJECTED';
      requiresManual = false;
    } else if (dto.requestedAmount <= 500 && dto.score >= 650) {
      outcome = 'AUTO_APPROVED';
      requiresManual = false;
    }

    const decisionEvidence = {
      id: decisionId,
      ...dto,
      outcome,
      requiresManual,
      decidedAt: new Date().toISOString(),
    };

    // Si es AUTO_APPROVED, generamos inmediatamente el evento fundacional en nuestro Event Store
    if (outcome === 'AUTO_APPROVED') {
      await this.eventStore.appendEvent({
        eventId: randomUUID(),
        aggregateId: creditId,
        aggregateVer: 1,
        eventType: 'CreditOpened',
        payload: {
          applicantId: dto.evidence?.applicantId ?? randomUUID(),
          principal: dto.requestedAmount,
          rate: 0.15, // Tasa fija base del MVP
          termMonths: dto.evidence?.termMonths ?? 12,
          decisionId,
          scoreId: dto.scoreId,
        },
        metadata: {
          correlationId: dto.correlationId,
          causationId: dto.scoreId,
          signature: 'MOCK_SIGNATURE_JWS', // Luego integraremos con D6/compliance
          producer: 'credit-svc',
        },
      });
    }

    return {
      decisionId,
      creditId: outcome === 'AUTO_APPROVED' ? creditId : null,
      outcome,
      requiresManual,
    };
  }
}