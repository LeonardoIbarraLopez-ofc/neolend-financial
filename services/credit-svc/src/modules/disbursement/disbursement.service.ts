import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RequestDisbursementDto } from './disbursement.dto';
import { EventStoreService } from '../eventstore/eventstore.service';

@Injectable()
export class DisbursementService {
  // Simulación en memoria para el MVP rápido de la idempotency_key si no quieres reventar la BD
  private repoIdempotencia = new Set<string>();

  constructor(private readonly eventStore: EventStoreService) {}

  async executeDisbursement(dto: RequestDisbursementDto) {
    // 1. Control estricto de Idempotencia
    if (this.repoIdempotencia.has(dto.idempotencyKey)) {
      throw new ConflictException('Solicitud de desembolso duplicada (Idempotency Key ya procesada)');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('El monto a desembolsar debe ser mayor a cero');
    }

    this.repoIdempotencia.add(dto.idempotencyKey);

    const disbursementId = randomUUID();
    
    // 2. Aquí llamaríamos al mock del proveedor de billetera de D6. 
    // Como estamos local-first, simulamos éxito inmediato.
    const providerRef = `REF-MOCK-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Emitir el evento de que el dinero salió en el Event Store
    await this.eventStore.appendEvent({
      eventId: randomUUID(),
      aggregateId: dto.creditId,
      aggregateVer: 2, // Siguiente versión del crédito (1 fue CreditOpened)
      eventType: 'CreditDisbursed',
      payload: {
        disbursementId,
        channel: dto.channel,
        amount: dto.amount,
        providerRef,
        settledAt: new Date().toISOString(),
      },
      metadata: {
        correlationId: randomUUID(), // En un flujo real viaja el ID de la saga
        causationId: disbursementId,
        signature: 'MOCK_SIGNATURE_DISB',
        producer: 'credit-svc',
      },
    });

    return {
      disbursementId,
      status: 'COMPLETED',
      providerRef,
    };
  }
}