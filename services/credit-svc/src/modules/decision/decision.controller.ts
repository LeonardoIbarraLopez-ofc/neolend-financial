import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { DecisionService } from './decision.service';
import { DecisionRequestDto } from './dto/decision.dto';

@Controller('v1/credits')
export class DecisionController {
  constructor(private readonly decision: DecisionService) {}

  @Post('decision')
  @HttpCode(200)
  decide(@Body() dto: DecisionRequestDto) {
    return this.decision.decide(dto);
  }
}
