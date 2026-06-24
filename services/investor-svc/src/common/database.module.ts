import { Global, Module } from '@nestjs/common';
import { createPool, PG_POOL } from './database';

@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: createPool }],
  exports: [PG_POOL],
})
export class DatabaseModule {}
