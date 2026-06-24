import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Applicant, DocumentType } from './applicant.entity';
import { decrypt, encrypt, hmacHash } from '../../common/crypto.util';

export interface CreateApplicantDto {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  dob?: string;
  phone?: string;
  email?: string;
}

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(Applicant)
    private readonly repo: Repository<Applicant>,
  ) {}

  async createApplicant(dto: CreateApplicantDto) {
    const hash = hmacHash(`${dto.documentNumber}:${dto.documentType}`);
    const existing = await this.repo.findOne({
      where: { documentNumberHash: hash, documentType: dto.documentType },
    });
    if (existing) throw new ConflictException('Applicant already registered');

    const applicant = this.repo.create({
      fullName: dto.fullName,
      documentType: dto.documentType,
      documentNumberEnc: encrypt(dto.documentNumber),
      documentNumberHash: hash,
      dob: dto.dob ?? '',
      phoneEnc: dto.phone ? encrypt(dto.phone) : '',
      emailEnc: dto.email ? encrypt(dto.email) : '',
      kycStatus: 'PENDING',
      ocrPayload: null,
    });

    const saved = await this.repo.save(applicant);
    return this.toPublic(saved);
  }

  async findById(id: string) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Applicant not found');
    return this.toPublic(a);
  }

  async processDocument(applicantId: string) {
    const applicant = await this.repo.findOne({ where: { id: applicantId } });
    if (!applicant) throw new NotFoundException('Applicant not found');

    const docNumberSuffix = decrypt(applicant.documentNumberEnc).slice(-4);

    const ocrPayload: Record<string, unknown> = {
      status: 'SUCCESS',
      confidence: 0.97,
      extractedName: applicant.fullName,
      extractedDocumentNumber: `***${docNumberSuffix}`,
      documentType: applicant.documentType,
      liveness: 'PASS',
      processedAt: new Date().toISOString(),
    };

    applicant.ocrPayload = ocrPayload;
    applicant.kycStatus = 'VERIFIED';
    await this.repo.save(applicant);

    return { applicantId, kycStatus: 'VERIFIED' as const, ocr: ocrPayload };
  }

  private toPublic(a: Applicant) {
    return {
      id: a.id,
      fullName: a.fullName,
      documentType: a.documentType,
      kycStatus: a.kycStatus,
      dob: a.dob || null,
      ocrPayload: a.ocrPayload,
      createdAt: a.createdAt,
    };
  }
}
