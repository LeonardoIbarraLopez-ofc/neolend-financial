import { Injectable, BadRequestException } from '@nestjs/common';

export interface JournalEntryInput {
  account: 'ASSET_LOAN' | 'CASH' | 'INTEREST_INCOME' | 'PROVISION';
  direction: 'D' | 'C'; // D = Débito, C = Crédito
  amount: number;
}

@Injectable()
export class LedgerService {
  private entries: any[] = []; // Simulación en memoria para velocidad de la demo

  async createTransaction(creditId: string, entryType: 'DISBURSEMENT' | 'PAYMENT', inputs: JournalEntryInput[]) {
    const txnId = crypto.randomUUID();

    // Validar Invariante Contable: Suma(D) === Suma(C)
    const totalDebits = inputs.filter(i => i.direction === 'D').reduce((sum, i) => sum + i.amount, 0);
    const totalCredits = inputs.filter(i => i.direction === 'C').reduce((sum, i) => sum + i.amount, 0);

    // Redondear a 2 decimales para evitar problemas de coma flotante en JS
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException(`Desbalance contable detectado. Débitos (${totalDebits}) != Créditos (${totalCredits})`);
    }

    // Registrar el asiento balanceado
    for (const input of inputs) {
      this.entries.push({
        id: this.entries.length + 1,
        creditId,
        txnId,
        account: input.account,
        direction: input.direction,
        amount: input.amount,
        entryType,
        postedAt: new Date(),
      });
    }

    return {
      txnId,
      status: 'POSTED',
      balancedAmount: totalDebits,
    };
  }

  getEntriesByCredit(creditId: string) {
    return this.entries.filter(e => e.creditId === creditId);
  }
}