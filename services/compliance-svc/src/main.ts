import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createLogger } from '@neolend/ts-common';
import { AppModule } from './app.module';
import { createPool, runMigrations } from './common/database';

const log = createLogger('compliance-svc');

async function bootstrap() {
  // Ejecutar migraciones antes de iniciar la app
  const pool = createPool();
  await runMigrations(pool);
  await pool.end();

  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.COMPLIANCE_PORT ?? 8106);
  await app.listen(port, '0.0.0.0');
  log.info({ port }, 'compliance-svc escuchando');
}

bootstrap().catch((err) => {
  log.error({ err }, 'fallo al iniciar');
  process.exit(1);
});
