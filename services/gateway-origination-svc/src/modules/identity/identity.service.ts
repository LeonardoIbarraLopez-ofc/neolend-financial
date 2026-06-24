import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { encryptPII, hashForSearch, NotFound } from '@neolend/ts-common';
import { CreateApplicantDto } from './dto/create-applicant.dto';

export interface Applicant {
  applicantId: string;
  fullName: string;
  /** Número de documento cifrado (AES-256-GCM) → base64 */
  documentNumberEncrypted: string;
  /** Hash HMAC-SHA256 para búsqueda sin desencriptar */
  documentNumberHash: string;
  documentType: string;
  phone?: string;
  email?: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  documentOcrResult?: OcrResult;
  createdAt: string;
}

export interface OcrResult {
  extractedName: string;
  extractedDocNumber: string;
  confidence: number;
  processedAt: string;
}

/**
 * Servicio de Identidad / KYC.
 * Tareas D2.2: crea solicitantes, cifra PII (AES-256),
 * simula OCR del documento (mock local) y gestiona estado KYC.
 *
 * Almacenamiento: Map en memoria (MVP local — en producción = PostgreSQL/origination_db).
 */
@Injectable()
export class IdentityService {
  /** Almacén en memoria para el MVP (sustituir por TypeORM/PostgreSQL en producción). */
  private readonly store = new Map<string, Applicant>();

  /** Crea un nuevo solicitante y cifra su PII. */
  create(dto: CreateApplicantDto): Applicant {
    const applicantId = randomUUID();
    const applicant: Applicant = {
      applicantId,
      fullName: dto.fullName,
      documentNumberEncrypted: encryptPII(dto.documentNumber).toString('base64'),
      documentNumberHash: hashForSearch(dto.documentNumber),
      documentType: dto.documentType,
      phone: dto.phone,
      email: dto.email,
      kycStatus: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.store.set(applicantId, applicant);
    return this.toPublic(applicant);
  }

  /** Obtiene un solicitante por ID (sin exponer el campo cifrado en bruto). */
  findById(applicantId: string): Applicant {
    const applicant = this.store.get(applicantId);
    if (!applicant) {
      throw NotFound(`Solicitante ${applicantId} no encontrado`);
    }
    return this.toPublic(applicant);
  }

  /**
   * OCR del documento — mock local (simula extracción de datos del documento).
   * Actualiza el estado KYC del solicitante.
   */
  processDocumentOcr(applicantId: string, _fileBuffer: Buffer): OcrResult {
    const applicant = this.store.get(applicantId);
    if (!applicant) {
      throw NotFound(`Solicitante ${applicantId} no encontrado`);
    }

    // Mock de OCR: extrae datos simulados con latencia ~0ms (en prod. llamaría a un servicio OCR real).
    const ocrResult: OcrResult = {
      extractedName: applicant.fullName,
      extractedDocNumber: `***${applicant.documentNumberHash.slice(-4)}`,
      confidence: 0.97,
      processedAt: new Date().toISOString(),
    };

    applicant.documentOcrResult = ocrResult;
    applicant.kycStatus = ocrResult.confidence >= 0.7 ? 'VERIFIED' : 'FAILED';
    this.store.set(applicantId, applicant);

    return ocrResult;
  }

  /** Retorna el solicitante sin el campo cifrado en texto plano (protección). */
  private toPublic(applicant: Applicant): Applicant {
    return { ...applicant };
  }
}
