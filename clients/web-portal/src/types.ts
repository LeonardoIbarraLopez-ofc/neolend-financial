export interface AlternativeData {
  utilityPayments: number;
  ecommerceVolume: number;
  walletBalance: number;
  mobileTopupsCount: number;
  bureauScore: number;
}

export interface LoanApplication {
  id: string;
  correlationId: string;
  applicantName: string;
  applicantEmail: string;
  applicantIdCard: string;
  idPhotoUrl: string;
  requestAmount: number;
  durationMonths: number;
  status: 'approved_auto' | 'approved_manual' | 'rejected';
  createdAt: string;
  alternativeData: AlternativeData;
  score: number;
  shapValues: Array<{ feature: string; value: number }>;
  fraudScore: number;
  fraudDetails: string[];
  manualReviewReason?: string;
  auditHash: string;
  signature: string;
}

export interface EventLog {
  eventId: string;
  eventType: string;
  occurredAt: string;
  correlationId: string;
  producer: string;
  payload: any;
}

export interface FlujoCaja {
  month: string;
  inflow: number;
  outflow: number;
}

export interface InvestorMetrics {
  irr: number;
  par30: number;
  par90: number;
  outstandingPrincipal: number;
  delinquencyBySegment: Record<string, number>;
  flujoCajaProyectado: FlujoCaja[];
}
