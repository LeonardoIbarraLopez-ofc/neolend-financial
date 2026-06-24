/**
 * Modelos de dominio de la saga de originación.
 * Reflejan el contrato de eventos (PLAN-DE-TRABAJO.md §4).
 */

export type ApplicationStatus =
  | 'SUBMITTED'    // Solicitud recibida; saga iniciada
  | 'SCORING'      // Esperando score del scoring-svc
  | 'DECIDING'     // Score recibido; esperando decisión del credit-svc
  | 'APPROVED'     // Decisión AUTO_APPROVED
  | 'MANUAL'       // En cola de revisión manual
  | 'REJECTED'     // Decisión REJECTED
  | 'FAILED';      // Error en la saga (compensación activada)

export interface TimelineEntry {
  step: string;
  status: 'pending' | 'in_progress' | 'done' | 'failed';
  occurredAt?: string;
  detail?: string;
}

export interface LoanApplication {
  applicationId: string;
  correlationId: string;
  applicantId: string;
  requestedAmount: number;
  currency: string;
  termMonths: number;
  status: ApplicationStatus;
  timeline: TimelineEntry[];
  scoreId?: string;
  score?: number;
  riskBand?: string;
  decisionId?: string;
  creditId?: string;
  approvedAmount?: number;
  interestRate?: number;
  createdAt: string;
  updatedAt: string;
}
