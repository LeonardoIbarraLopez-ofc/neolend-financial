import { Injectable } from '@nestjs/common';

export interface OcrResult {
  fullName: string;
  documentNumber: string;
  dob: string;
  expiry: string;
  confidence: number;
}

/**
 * OCR mock (data residency: el procesamiento real sería on-premise nacional).
 * En el baseline simula la lectura del documento devolviendo los datos ya
 * conocidos del solicitante con una confianza alta. El contrato de producción
 * recibe la imagen (multipart) y extrae los campos.
 */
@Injectable()
export class OcrService {
  extract(known: { fullName: string; documentNumber: string; dob?: string }): OcrResult {
    const year = new Date().getFullYear() + 5;
    return {
      fullName: known.fullName,
      documentNumber: known.documentNumber,
      dob: known.dob ?? '1990-01-01',
      expiry: `${year}-01-01`,
      confidence: 0.96,
    };
  }
}
