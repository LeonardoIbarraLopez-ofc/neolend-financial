import { Injectable } from '@nestjs/common';
import { postJson } from './http';

export interface ScoreResult {
  scoreId: string;
  score: number;
  riskBand: string;
  probabilityOfDefault: number;
  modelVersion: string;
  partialData: boolean;
  fraud?: { decision: string; fraudScore: number };
  explanation?: { shap: { feature: string; contribution: number }[] };
}

@Injectable()
export class ScoringClient {
  private readonly baseUrl = process.env.SCORING_URL ?? 'http://localhost:8102';

  // El servicio de scoring reúne internamente buró, datos alternativos y fraude
  // (módulos bureau/altdata/fraud); la Saga solo aporta los identificadores.
  score(
    body: { applicationId: string; applicantId: string; documentNumber: string },
    correlationId: string,
  ): Promise<ScoreResult> {
    return postJson<ScoreResult>(`${this.baseUrl}/v1/scores`, body, correlationId);
  }
}
