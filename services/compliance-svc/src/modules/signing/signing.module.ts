import { Module } from '@nestjs/common';
import { SigningService } from './signing.service';
import { SigningController } from './signing.controller';

@Module({
  providers: [SigningService],
  controllers: [SigningController],
  exports: [SigningService],
})
export class SigningModule {}
