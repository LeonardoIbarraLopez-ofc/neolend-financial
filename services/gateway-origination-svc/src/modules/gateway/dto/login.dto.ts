import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsIn(['applicant', 'analyst', 'investor', 'collector', 'regulator'])
  role!: 'applicant' | 'analyst' | 'investor' | 'collector' | 'regulator';
}
