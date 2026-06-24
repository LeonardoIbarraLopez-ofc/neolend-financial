import { LoanApplication, EventLog, InvestorMetrics } from './types';

// Helper to generate UUID
export function generateUUID(): string {
  return 'app-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Synchronous mock hash
export function calculateHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return 'sha256-' + hex.repeat(8).substring(0, 64);
}

// Compact JWS serialization mock
export function signPayload(hash: string): string {
  const header = { alg: 'RS256', typ: 'JWT', kid: 'local-key-01' };
  const claims = {
    hash,
    iss: 'NeoLend Financial Corp.',
    aud: 'Superintendencia de Bancos',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  // Base64Url encode helper
  const b64Url = (obj: any) => {
    const str = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const encodedHeader = b64Url(header);
  const encodedClaims = b64Url(claims);
  const signature = 'sello_digital_firmado_por_compliance_service_local_worm_key_signature';
  const encodedSignature = btoa(signature)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedClaims}.${encodedSignature}`;
}

// Score algorithm
export function calculateNeoLendScore(data: {
  utilityPayments: number;
  ecommerceVolume: number;
  walletBalance: number;
  mobileTopupsCount: number;
  bureauScore: number;
}): number {
  let score = 300; // Base score
  
  score += (data.utilityPayments / 100) * 150;
  score += Math.min(data.ecommerceVolume / 5000, 1) * 200;
  score += Math.min(data.walletBalance / 3000, 1) * 150;
  score += Math.min(data.mobileTopupsCount / 50, 1) * 100;
  
  const normBureau = ((data.bureauScore - 300) / 550) * 100;
  score += normBureau;
  
  return Math.min(Math.round(score), 1000);
}

// SHAP Explicability Generator
export function generateSHAPValues(
  data: {
    utilityPayments: number;
    ecommerceVolume: number;
    walletBalance: number;
    mobileTopupsCount: number;
    bureauScore: number;
  },
  score: number
): Array<{ feature: string; value: number }> {
  return [
    { feature: 'Historial Buró Tradicional', value: Math.round(((data.bureauScore - 550) / 300) * 80) },
    { feature: 'Puntualidad de Servicios', value: Math.round((data.utilityPayments - 80) * 2.5) },
    { feature: 'Flujo Billetera Digital', value: Math.round(((data.walletBalance - 500) / 1000) * 45) },
    { feature: 'Consumo E-commerce', value: Math.round(((data.ecommerceVolume - 1000) / 2000) * 60) },
    { feature: 'Recargas Celulares', value: Math.round((data.mobileTopupsCount - 15) * 3) }
  ];
}

// Default initial database content
const DEFAULT_APPLICATIONS: LoanApplication[] = [
  {
    id: 'app-cf191ad85705ff5c73636917',
    correlationId: 'CORR-A8F2D9',
    applicantName: 'Carlos Eduardo Torres',
    applicantEmail: 'carlos.torres@email.com',
    applicantIdCard: 'MX-88273940',
    idPhotoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
    requestAmount: 400,
    durationMonths: 6,
    status: 'approved_auto',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    alternativeData: {
      utilityPayments: 98,
      ecommerceVolume: 2400,
      walletBalance: 1200,
      mobileTopupsCount: 28,
      bureauScore: 740
    },
    score: 765,
    shapValues: [
      { feature: 'Historial Buró Tradicional', value: 51 },
      { feature: 'Puntualidad de Servicios', value: 45 },
      { feature: 'Flujo Billetera Digital', value: 31 },
      { feature: 'Consumo E-commerce', value: 42 },
      { feature: 'Recargas Celulares', value: 39 }
    ],
    fraudScore: 4,
    fraudDetails: ['Validación biométrica exitosa', 'Verificación IP nacional limpia'],
    manualReviewReason: 'Crédito de USD 400 pre-aprobado instantáneamente en 90 segundos.',
    auditHash: 'sha256-e431ad845705ff5c7363691704e1496c40f42c00e431ad845705ff5c73636917',
    signature: ''
  },
  {
    id: 'app-df191ad85705ff5c73636918',
    correlationId: 'CORR-C2B7E1',
    applicantName: 'Diana Maria Beltran',
    applicantEmail: 'diana.beltran@email.com',
    applicantIdCard: 'CO-10029384',
    idPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    requestAmount: 350,
    durationMonths: 4,
    status: 'approved_auto',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    alternativeData: {
      utilityPayments: 95,
      ecommerceVolume: 1500,
      walletBalance: 800,
      mobileTopupsCount: 35,
      bureauScore: 300
    },
    score: 610,
    shapValues: [
      { feature: 'Historial Buró Tradicional', value: -67 },
      { feature: 'Puntualidad de Servicios', value: 38 },
      { feature: 'Flujo Billetera Digital', value: 14 },
      { feature: 'Consumo E-commerce', value: 15 },
      { feature: 'Recargas Celulares', value: 60 }
    ],
    fraudScore: 8,
    fraudDetails: ['Validación biométrica exitosa', 'Verificación IP nacional limpia'],
    manualReviewReason: 'Crédito de USD 350 pre-aprobado instantáneamente en 90 segundos.',
    auditHash: 'sha256-d431ad845705ff5c7363691704e1496c40f42c00e431ad845705ff5c73636918',
    signature: ''
  },
  {
    id: 'app-ef191ad85705ff5c73636919',
    correlationId: 'CORR-E3D9F2',
    applicantName: 'Jose Roberto Silva',
    applicantEmail: 'jose.silva@email.com',
    applicantIdCard: 'AR-49203921',
    idPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    requestAmount: 1200,
    durationMonths: 12,
    status: 'approved_manual',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    alternativeData: {
      utilityPayments: 50,
      ecommerceVolume: 100,
      walletBalance: 50,
      mobileTopupsCount: 2,
      bureauScore: 450
    },
    score: 480,
    shapValues: [
      { feature: 'Historial Buró Tradicional', value: -27 },
      { feature: 'Puntualidad de Servicios', value: -75 },
      { feature: 'Flujo Billetera Digital', value: -20 },
      { feature: 'Consumo E-commerce', value: -27 },
      { feature: 'Recargas Celulares', value: -39 }
    ],
    fraudScore: 12,
    fraudDetails: ['Verificación IP nacional limpia'],
    manualReviewReason: 'Solicitud de USD 1200 excede límite automático de USD 500. Escala a mesa de analistas de riesgo.',
    auditHash: 'sha256-a431ad845705ff5c7363691704e1496c40f42c00e431ad845705ff5c73636919',
    signature: ''
  }
];

// Initialize signatures for default apps
DEFAULT_APPLICATIONS.forEach(app => {
  app.signature = signPayload(app.auditHash);
});

const DEFAULT_EVENTS: EventLog[] = [];
DEFAULT_APPLICATIONS.forEach(app => {
  const cId = app.correlationId;
  DEFAULT_EVENTS.push({
    eventId: 'evt-' + Math.random().toString(36).substring(2, 10),
    eventType: 'origination.application.submitted',
    occurredAt: app.createdAt,
    correlationId: cId,
    producer: 'gateway-origination-svc',
    payload: {
      applicantName: app.applicantName,
      applicantEmail: app.applicantEmail,
      applicantIdCard: app.applicantIdCard,
      requestAmount: app.requestAmount,
      durationMonths: app.durationMonths
    }
  });
  DEFAULT_EVENTS.push({
    eventId: 'evt-' + Math.random().toString(36).substring(2, 10),
    eventType: 'scoring.score.completed',
    occurredAt: new Date(new Date(app.createdAt).getTime() + 2000).toISOString(),
    correlationId: cId,
    producer: 'scoring-svc',
    payload: {
      score: app.score,
      fraudScore: app.fraudScore,
      shapSummary: app.shapValues.map(s => `${s.feature}: ${s.value}pts`)
    }
  });
  DEFAULT_EVENTS.push({
    eventId: 'evt-' + Math.random().toString(36).substring(2, 10),
    eventType: 'decision.made',
    occurredAt: new Date(new Date(app.createdAt).getTime() + 4000).toISOString(),
    correlationId: cId,
    producer: 'credit-svc',
    payload: {
      decisionId: 'dec-' + Math.random().toString(36).substring(2, 10),
      status: app.status,
      amount: app.requestAmount,
      reviewReason: app.manualReviewReason,
      hash: app.auditHash,
      signature: app.signature
    }
  });
});

export const NeoLendDatabase = {
  getApplications(): LoanApplication[] {
    const data = localStorage.getItem('neolend_applications');
    if (!data) {
      this.saveApplications(DEFAULT_APPLICATIONS);
      return DEFAULT_APPLICATIONS;
    }
    return JSON.parse(data);
  },
  saveApplications(apps: LoanApplication[]) {
    localStorage.setItem('neolend_applications', JSON.stringify(apps));
  },
  getEvents(): EventLog[] {
    const data = localStorage.getItem('neolend_events');
    if (!data) {
      this.saveEvents(DEFAULT_EVENTS);
      return DEFAULT_EVENTS;
    }
    return JSON.parse(data);
  },
  saveEvents(events: EventLog[]) {
    localStorage.setItem('neolend_events', JSON.stringify(events));
  },
  pushEvent(eventType: string, correlationId: string, payload: any) {
    const events = this.getEvents();
    const newEvent: EventLog = {
      eventId: 'evt-' + Math.random().toString(36).substring(2, 12),
      eventType,
      occurredAt: new Date().toISOString(),
      correlationId,
      producer: eventType.startsWith('origination') ? 'gateway-origination-svc' : eventType.startsWith('scoring') ? 'scoring-svc' : 'credit-svc',
      payload
    };
    events.push(newEvent);
    this.saveEvents(events);
  },
  clearAll() {
    localStorage.removeItem('neolend_applications');
    localStorage.removeItem('neolend_events');
  }
};
