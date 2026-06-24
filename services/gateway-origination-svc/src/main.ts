import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { createLogger } from '@neolend/ts-common';
import { AppModule } from './app.module';

const log = createLogger('gateway-origination-svc');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // CORS explícito (requerimiento D2.1 — gateway de borde).
  app.enableCors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });

  // Validación global de DTOs (class-validator).
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Puerto 3331 (requerimiento de sesión).
  const port = Number(process.env.GATEWAY_ORIGINATION_PORT ?? 3331);
  await app.listen(port);
  log.info({ port }, 'gateway-origination-svc escuchando en puerto ' + port);
}

bootstrap().catch((err) => {
  log.error({ err }, 'fallo al iniciar');
  process.exit(1);
});
