import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../gateway/jwt-auth.guard';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { IdentityService } from './identity.service';

/**
 * Controlador de Identidad / KYC.
 * Expone los endpoints del contrato de D2 (ver openapi.yaml):
 *   POST /v1/applicants
 *   POST /v1/applicants/:id/document
 *   GET  /v1/applicants/:id
 */
@UseGuards(JwtAuthGuard)
@Controller('v1/applicants')
export class IdentityController {
  constructor(private readonly identitySvc: IdentityService) {}

  /** Crea un solicitante y cifra su PII. */
  @Post()
  create(@Body() dto: CreateApplicantDto) {
    return this.identitySvc.create(dto);
  }

  /** Sube el documento de identidad y dispara el OCR (mock). */
  @Post(':id/document')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Si no hay archivo en la petición (testing sin multipart), usamos buffer vacío.
    const buffer = file?.buffer ?? Buffer.alloc(0);
    return this.identitySvc.processDocumentOcr(id, buffer);
  }

  /** Consulta el estado del solicitante (KYC + datos no sensibles). */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.identitySvc.findById(id);
  }
}
