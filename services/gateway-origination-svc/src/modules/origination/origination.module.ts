import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OriginationController } from './origination.controller';
import { OriginationService } from './origination.service';
import { ScoringClient } from './clients/scoring.client';
import { CreditClient } from './clients/credit.client';

@Module({
  imports: [IdentityModule],
  controllers: [OriginationController],
  providers: [OriginationService, ScoringClient, CreditClient],
})
export class OriginationModule {}
