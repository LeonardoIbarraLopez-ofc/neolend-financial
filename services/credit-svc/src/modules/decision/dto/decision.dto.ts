import { IsBoolean, IsInt, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class DecisionRequestDto {
  @IsUUID()
  applicationId!: string;

  @IsUUID()
  scoreId!: string;

  @IsInt()
  score!: number;

  @IsString()
  riskBand!: string;

  @IsNumber()
  @Min(1)
  requestedAmount!: number;

  @IsInt()
  termMonths!: number;

  @IsBoolean()
  fraudFlag!: boolean;

  @IsBoolean()
  partialData!: boolean;
}
