import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createLogger } from '@neolend/ts-common';
import { AppModule } from './app.module';

const log = createLogger('compliance-svc');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = Number(process.env.COMPLIANCE_PORT ?? 8106);
  await app.listen(port);
  log.info({ port }, 'compliance-svc escuchando');
}

bootstrap().catch((err) => {
  log.error({ err }, 'fallo al iniciar');
  process.exit(1);
});
