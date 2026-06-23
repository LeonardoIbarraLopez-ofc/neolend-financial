import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../gateway/jwt-auth.guard';
import { ApplicantsService } from './applicants.service';
import { CreateApplicantDto, UploadDocumentDto } from './dto/create-applicant.dto';

@Controller('v1/applicants')
@UseGuards(JwtAuthGuard)
export class ApplicantsController {
  constructor(private readonly applicants: ApplicantsService) {}

  @Post()
  create(@Body() dto: CreateApplicantDto) {
    return this.applicants.create(dto);
  }

  @Post(':id/document')
  uploadDocument(@Param('id') id: string, @Body() dto: UploadDocumentDto) {
    return this.applicants.uploadDocument(id, dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.applicants.get(id);
  }
}
