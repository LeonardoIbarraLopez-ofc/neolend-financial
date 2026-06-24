import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createLogger } from '@neolend/ts-common';
import { AppModule } from './app.module';
import { createPool, runMigrations } from './common/database';

const log = createLogger('investor-svc');

async function bootstrap() {
  // Inicialización de base de datos y migraciones
  try {
    const pool = createPool();
    await runMigrations(pool);
    await pool.end();
    log.info('Base de datos conectada y migraciones ejecutadas.');
  } catch (err: any) {
    log.warn('No se pudo conectar a la base de datos de PostgreSQL. El servicio iniciará con fallbacks en memoria.');
  }

  // Inicializar servidor NestJS
  const app = await NestFactory.create(AppModule, { cors: true });
  
  const port = Number(process.env.INVESTOR_PORT ?? 8105);
  await app.listen(port, '0.0.0.0');
  log.info({ port }, 'investor-svc escuchando (portal RT end-to-end)');
}

bootstrap().catch((err) => {
  log.error({ err }, 'fallo al iniciar');
  process.exit(1);
});
