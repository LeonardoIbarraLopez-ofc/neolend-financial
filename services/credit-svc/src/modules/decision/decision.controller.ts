import { Controller, Post, Body } from '@nestjs/common';
import { DecisionService } from './decision.service';
import { CreateDecisionDto } from './decision.dto';

@Controller('v1/credits')
export class DecisionController {
  constructor(private readonly decisionService: DecisionService) {}

  @Post('decision')
  async createDecision(@Body() dto: CreateDecisionDto) {
    return this.decisionService.processDecision(dto);
  }
}