import { Module } from '@nestjs/common';
import { RegulatorService } from './regulator.service';
import { RegulatorController } from './regulator.controller';
import { SigningModule } from '../signing/signing.module';

@Module({
  imports: [SigningModule],
  providers: [RegulatorService],
  controllers: [RegulatorController],
  exports: [RegulatorService],
})
export class RegulatorModule {}
