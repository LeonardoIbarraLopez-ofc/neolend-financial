import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  applicantId!: string;

  @IsNumber()
  @Min(1)
  requestedAmount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsInt()
  @Min(1)
  @Max(36)
  termMonths!: number;
}
