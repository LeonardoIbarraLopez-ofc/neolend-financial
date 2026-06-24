import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const ROLES = ['applicant', 'analyst', 'investor', 'collector', 'regulator'] as const;
export type Role = (typeof ROLES)[number];

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  // Perfil demo para el hackatón (en producción el rol vendría del IdP).
  @IsOptional()
  @IsIn(ROLES)
  role?: Role;
}
