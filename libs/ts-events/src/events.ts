/**
 * Catálogo de TOPICS y tipos de evento (fuente única de verdad).
 * Tabla maestra: PLAN-DE-TRABAJO.md §4.2. Cambios solo ADITIVOS.
 */

export const Topics = {
  origination: 'origination.events',
  scoring: 'scoring.events',
  credit: 'credit.events',
  disbursement: 'disbursement.events',
  collections: 'collections.events',
  gamification: 'gamification.events',
} as const;

export const EventTypes = {
  ApplicationSubmitted: 'origination.application.submitted',
  ScoreCompleted: 'scoring.score.completed',
  DecisionMade: 'decision.made',
  CreditOpened: 'credit.CreditOpened',
  CreditDisbursed: 'credit.CreditDisbursed',
  CreditDelinquent: 'credit.CreditDelinquent',
  PaymentRegistered: 'collections.payment.registered',
  RateBonusGranted: 'gamification.rate.bonus.granted',
} as const;

// ---------- Payloads ----------
export interface ApplicationSubmittedPayload {
  applicationId: string;
  applicantId: string;
  requestedAmount: number;
  currency: string;
  termMonths: number;
}

export interface ScoreCompletedPayload {
  scoreId: string;
  applicationId: string;
  applicantId: string;
  score: number;
  riskBand: string;
  probabilityOfDefault: number;
  modelVersion: string;
  partialData: boolean;
  shap: Array<{ feature: string; contribution: number }>;
}

export interface DecisionMadePayload {
  decisionId: string;
  applicationId: string;
  outcome: 'AUTO_APPROVED' | 'REJECTED' | 'MANUAL_PENDING';
  creditId?: string;
  approvedAmount?: number;
  interestRate?: number;
}

export interface CreditOpenedPayload {
  creditId: string;
  applicantId: string;
  principal: number;
  rate: number;
  termMonths: number;
  decisionId: string;
  scoreId: string;
}

export interface DisbursementCompletedPayload {
  disbursementId: string;
  creditId: string;
  amount: number;
  channel: 'WALLET' | 'BANK' | 'CORRESPONDENT';
}

export interface PaymentRegisteredPayload {
  creditId: string;
  installmentNo: number;
  amount: number;
  paidAt: string;
}
