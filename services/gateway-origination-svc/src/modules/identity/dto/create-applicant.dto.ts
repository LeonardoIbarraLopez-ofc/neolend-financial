import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateApplicantDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(4)
  documentNumber!: string;

  @IsIn(['DNI', 'CI', 'PASSPORT'])
  documentType!: 'DNI' | 'CI' | 'PASSPORT';

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UploadDocumentDto {
  @IsIn(['DNI', 'CI', 'PASSPORT'])
  documentType!: 'DNI' | 'CI' | 'PASSPORT';
}
