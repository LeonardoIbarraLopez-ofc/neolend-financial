import { Global, Module } from '@nestjs/common';
import { createPool, PG_POOL } from './database';

/**
 * Provee el Pool de PostgreSQL como dependencia inyectable en todo el servicio.
 */
@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: createPool }],
  exports: [PG_POOL],
})
export class DatabaseModule {}
