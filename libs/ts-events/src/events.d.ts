/**
 * Catálogo de TOPICS y tipos de evento (fuente única de verdad).
 * Tabla maestra: PLAN-DE-TRABAJO.md §4.2. Cambios solo ADITIVOS.
 */
export declare const Topics: {
    readonly origination: "origination.events";
    readonly scoring: "scoring.events";
    readonly credit: "credit.events";
    readonly disbursement: "disbursement.events";
    readonly collections: "collections.events";
    readonly gamification: "gamification.events";
};
export declare const EventTypes: {
    readonly ApplicationSubmitted: "origination.application.submitted";
    readonly ScoreCompleted: "scoring.score.completed";
    readonly DecisionMade: "decision.made";
    readonly CreditOpened: "credit.CreditOpened";
    readonly CreditDisbursed: "credit.CreditDisbursed";
    readonly CreditDelinquent: "credit.CreditDelinquent";
    readonly PaymentRegistered: "collections.payment.registered";
    readonly RateBonusGranted: "gamification.rate.bonus.granted";
};
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
    shap: Array<{
        feature: string;
        contribution: number;
    }>;
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
