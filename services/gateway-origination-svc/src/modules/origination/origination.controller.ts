import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import {
  CreateLoanApplicationDto,
  OriginationService,
} from './origination.service';

@Controller('v1/loan-applications')
@UseGuards(JwtAuthGuard)
export class OriginationController {
  constructor(private readonly originationService: OriginationService) {}

  @Post()
  @HttpCode(202)
  createLoanApplication(@Body() dto: CreateLoanApplicationDto) {
    return this.originationService.createLoanApplication(dto);
  }

  @Get(':id')
  getLoanApplication(@Param('id') id: string) {
    return this.originationService.findById(id);
  }
}
