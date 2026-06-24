export class RequestDisbursementDto {
  creditId!: string;
  idempotencyKey!: string; // Clave única generada en la solicitud
  amount!: number;
  channel!: 'WALLET' | 'BANK' | 'CORRESPONDENT';
  destination!: Record<string, any>;
}