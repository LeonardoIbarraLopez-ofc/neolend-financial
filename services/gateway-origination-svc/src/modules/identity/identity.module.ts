import { Module } from '@nestjs/common';
import { ApplicantsController } from './applicants.controller';
import { ApplicantsService } from './applicants.service';
import { OcrService } from './ocr.service';

@Module({
  controllers: [ApplicantsController],
  providers: [ApplicantsService, OcrService],
  exports: [ApplicantsService],
})
export class IdentityModule {}
