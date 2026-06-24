import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

/**
 * Módulo de Identidad / KYC.
 * Responsabilidades: gestión de solicitantes, cifrado AES de PII, OCR mock.
 */
@Module({
  imports: [
    // Almacenamiento en memoria para multipart (MVP); sin límite de tamaño en demo.
    MulterModule.register({ dest: undefined }),
  ],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
