export class CreateDecisionDto {
  applicationId!: string;
  scoreId!: string;
  correlationId!: string;
  score!: number;
  riskBand!: string;
  requestedAmount!: number;
  evidence!: Record<string, any>;
}