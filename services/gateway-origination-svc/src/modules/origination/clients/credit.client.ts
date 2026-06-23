import { Injectable } from '@nestjs/common';
import { postJson } from './http';

export interface DecisionResult {
  decisionId: string;
  outcome: 'AUTO_APPROVED' | 'REJECTED' | 'MANUAL_PENDING';
  creditId?: string;
  approvedAmount?: number;
  interestRate?: number;
  termMonths?: number;
  requiresManualReview: boolean;
  reasons: string[];
}

@Injectable()
export class CreditClient {
  private readonly baseUrl = process.env.CREDIT_URL ?? 'http://localhost:8103';

  decide(
    body: {
      applicationId: string;
      scoreId: string;
      score: number;
      riskBand: string;
      requestedAmount: number;
      termMonths: number;
      fraudFlag: boolean;
      partialData: boolean;
    },
    correlationId: string,
  ): Promise<DecisionResult> {
    return postJson<DecisionResult>(`${this.baseUrl}/v1/credits/decision`, body, correlationId);
  }
}
