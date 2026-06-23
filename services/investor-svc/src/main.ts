import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createLogger } from '@neolend/ts-common';
import { AppModule } from './app.module';

const log = createLogger('investor-svc');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = Number(process.env.INVESTOR_PORT ?? 8105);
  await app.listen(port);
  log.info({ port }, 'investor-svc escuchando');
}

bootstrap().catch((err) => {
  log.error({ err }, 'fallo al iniciar');
  process.exit(1);
});
