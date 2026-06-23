import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createLogger } from '@neolend/ts-common';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/problem.filter';
import { createPool, runMigrations } from './common/database';

const log = createLogger('gateway-origination-svc');

async function bootstrap() {
  // Migraciones idempotentes al arranque (entorno local).
  const pool = createPool();
  await runMigrations(pool);
  await pool.end();

  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ProblemDetailsFilter());

  const port = Number(process.env.GATEWAY_ORIGINATION_PORT ?? 8101);
  await app.listen(port, '0.0.0.0');
  log.info({ port }, 'gateway-origination-svc escuchando (gateway + identidad + saga)');
}

bootstrap().catch((err) => {
  log.error({ err }, 'fallo al iniciar');
  process.exit(1);
});
