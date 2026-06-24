import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { decryptPII, encryptPII, hashForSearch, NotFound } from '@neolend/ts-common';
import { PG_POOL } from '../../common/database';
import { OcrService } from './ocr.service';
import type { CreateApplicantDto, UploadDocumentDto } from './dto/create-applicant.dto';

export interface ApplicantView {
  id: string;
  fullName: string;
  documentNumber: string;
  documentType: string;
  phone?: string;
  email?: string;
  kycStatus: string;
  ocr?: unknown;
  createdAt: string;
}

@Injectable()
export class ApplicantsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly ocr: OcrService,
  ) {}

  async create(dto: CreateApplicantDto): Promise<ApplicantView> {
    const { rows } = await this.pool.query(
      `INSERT INTO origination.applicants
         (full_name, document_number, document_number_hash, document_type, dob, phone, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, kyc_status, created_at`,
      [
        dto.fullName,
        encryptPII(dto.documentNumber),
        hashForSearch(dto.documentNumber),
        dto.documentType,
        dto.dob ?? null,
        dto.phone ? encryptPII(dto.phone) : null,
        dto.email ? encryptPII(dto.email) : null,
      ],
    );
    const row = rows[0];
    return {
      id: row.id,
      fullName: dto.fullName,
      documentNumber: dto.documentNumber,
      documentType: dto.documentType,
      phone: dto.phone,
      email: dto.email,
      kycStatus: row.kyc_status,
      createdAt: row.created_at,
    };
  }

  async uploadDocument(id: string, _dto: UploadDocumentDto) {
    const applicant = await this.getRaw(id);
    const ocr = this.ocr.extract({
      fullName: applicant.full_name,
      documentNumber: decryptPII(applicant.document_number),
      dob: applicant.dob,
    });
    const kyc = ocr.confidence >= 0.9 ? 'VERIFIED' : 'PENDING';
    await this.pool.query(
      `UPDATE origination.applicants SET ocr_payload = $2, kyc_status = $3 WHERE id = $1`,
      [id, JSON.stringify(ocr), kyc],
    );
    return { applicantId: id, ocr, kycStatus: kyc, confidence: ocr.confidence };
  }

  async get(id: string): Promise<ApplicantView> {
    const row = await this.getRaw(id);
    return {
      id: row.id,
      fullName: row.full_name,
      documentNumber: decryptPII(row.document_number),
      documentType: row.document_type,
      phone: row.phone ? decryptPII(row.phone) : undefined,
      email: row.email ? decryptPII(row.email) : undefined,
      kycStatus: row.kyc_status,
      ocr: row.ocr_payload ?? undefined,
      createdAt: row.created_at,
    };
  }

  private async getRaw(id: string) {
    const { rows } = await this.pool.query(`SELECT * FROM origination.applicants WHERE id = $1`, [
      id,
    ]);
    if (rows.length === 0) throw NotFound(`applicant ${id} no existe`);
    return rows[0];
  }
}
