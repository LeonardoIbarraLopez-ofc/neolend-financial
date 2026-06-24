import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanApplication } from './loan-application.entity';
import { SagaState } from './saga-state.entity';

export interface CreateLoanApplicationDto {
  applicantId: string;
  requestedAmount: number;
  currency?: string;
  termMonths: number;
}

@Injectable()
export class OriginationService {
  constructor(
    @InjectRepository(LoanApplication)
    private readonly loanRepo: Repository<LoanApplication>,
    @InjectRepository(SagaState)
    private readonly sagaRepo: Repository<SagaState>,
  ) {}

  async createLoanApplication(dto: CreateLoanApplicationDto) {
    const loan = this.loanRepo.create({
      applicantId: dto.applicantId,
      requestedAmount: dto.requestedAmount,
      currency: dto.currency ?? 'USD',
      termMonths: dto.termMonths,
      status: 'PROCESSING',
    });
    const saved = await this.loanRepo.save(loan);

    await this.sagaRepo.save(
      this.sagaRepo.create({
        applicationId: saved.id,
        currentStep: 'SCORING',
        stepStatus: 'STARTED',
        payload: {
          requestedAmount: dto.requestedAmount,
          applicantId: dto.applicantId,
        },
      }),
    );

    return {
      applicationId: saved.id,
      status: 'PROCESSING' as const,
      pollUrl: `/v1/loan-applications/${saved.id}`,
    };
  }

  async findById(id: string) {
    const loan = await this.loanRepo.findOne({ where: { id } });
    if (!loan) throw new NotFoundException('Loan application not found');

    const saga = await this.sagaRepo.findOne({ where: { applicationId: id } });

    return {
      applicationId: loan.id,
      applicantId: loan.applicantId,
      requestedAmount: Number(loan.requestedAmount),
      currency: loan.currency,
      termMonths: loan.termMonths,
      status: loan.status,
      currentStep: saga?.currentStep ?? null,
      updatedAt: saga?.updatedAt ?? null,
      createdAt: loan.createdAt,
    };
  }
}
