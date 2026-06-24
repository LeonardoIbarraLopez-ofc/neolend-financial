import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateApplicantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  /** Número de documento (se almacena cifrado con AES-256). */
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  documentNumber!: string;

  @IsIn(['CC', 'CE', 'PASSPORT', 'NIT'])
  documentType!: 'CC' | 'CE' | 'PASSPORT' | 'NIT';

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;
}
