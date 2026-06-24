import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LoanApplication } from './loan-application.entity';
import { OriginationController } from './origination.controller';
import { OriginationService } from './origination.service';
import { SagaState } from './saga-state.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplication, SagaState]),
    AuthModule,
  ],
  controllers: [OriginationController],
  providers: [OriginationService],
})
export class OriginationModule {}
