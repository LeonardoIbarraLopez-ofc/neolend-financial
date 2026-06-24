import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateApplicantDto, IdentityService } from './identity.service';

@Controller('v1/applicants')
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post()
  createApplicant(@Body() dto: CreateApplicantDto) {
    return this.identityService.createApplicant(dto);
  }

  @Get(':id')
  getApplicant(@Param('id') id: string) {
    return this.identityService.findById(id);
  }

  @Post(':id/document')
  uploadDocument(@Param('id') id: string) {
    return this.identityService.processDocument(id);
  }
}
