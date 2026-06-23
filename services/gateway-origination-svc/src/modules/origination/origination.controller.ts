import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../gateway/jwt-auth.guard';
import { OriginationService } from './origination.service';
import { CreateApplicationDto } from './dto/create-application.dto';

@Controller('v1/loan-applications')
@UseGuards(JwtAuthGuard)
export class OriginationController {
  constructor(private readonly origination: OriginationService) {}

  @Post()
  @HttpCode(202)
  submit(@Body() dto: CreateApplicationDto) {
    return this.origination.submit(dto);
  }

  @Get(':id')
  status(@Param('id') id: string) {
    return this.origination.getStatus(id);
  }
}
