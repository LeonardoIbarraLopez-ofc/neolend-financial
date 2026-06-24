import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateLoanApplicationDto {
  @IsUUID()
  applicantId!: string;

  @IsNumber()
  @Min(1)
  requestedAmount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(1)
  termMonths!: number;
}
