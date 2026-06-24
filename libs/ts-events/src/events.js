"use strict";
/**
 * Catálogo de TOPICS y tipos de evento (fuente única de verdad).
 * Tabla maestra: PLAN-DE-TRABAJO.md §4.2. Cambios solo ADITIVOS.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventTypes = exports.Topics = void 0;
exports.Topics = {
    origination: 'origination.events',
    scoring: 'scoring.events',
    credit: 'credit.events',
    disbursement: 'disbursement.events',
    collections: 'collections.events',
    gamification: 'gamification.events',
};
exports.EventTypes = {
    ApplicationSubmitted: 'origination.application.submitted',
    ScoreCompleted: 'scoring.score.completed',
    DecisionMade: 'decision.made',
    CreditOpened: 'credit.CreditOpened',
    CreditDisbursed: 'credit.CreditDisbursed',
    CreditDelinquent: 'credit.CreditDelinquent',
    PaymentRegistered: 'collections.payment.registered',
    RateBonusGranted: 'gamification.rate.bonus.granted',
};
//# sourceMappingURL=events.js.map