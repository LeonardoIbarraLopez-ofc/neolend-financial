import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import { Rfc7807Filter } from './common/filters/rfc7807.filter';
import { HealthController } from './health.controller';
import { GatewayModule } from './modules/gateway/gateway.module';
import { JwtAuthGuard } from './modules/gateway/jwt-auth.guard';
import { IdentityModule } from './modules/identity/identity.module';
import { OriginationModule } from './modules/origination/origination.module';

/**
 * Módulo raíz de gateway-origination-svc.
 * Integra los tres sub-dominios del rol D2:
 *  - GatewayModule      → auth JWT, CORS, RFC7807
 *  - IdentityModule     → applicants, OCR mock, cifrado AES de PII
 *  - OriginationModule  → saga de originación + timeline + eventos Kafka
 */
@Module({
  imports: [GatewayModule, IdentityModule, OriginationModule],
  controllers: [HealthController],
  providers: [
    // RFC 7807 global: todos los errores salen con el formato problem+json.
    { provide: APP_FILTER, useClass: Rfc7807Filter },
    // JWT auth guard global: protege todos los endpoints salvo los @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // El middleware de correlación corre antes de cualquier guard.
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
