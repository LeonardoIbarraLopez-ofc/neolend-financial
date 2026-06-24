import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from './common/database.module';
import { CorrelationMiddleware } from './common/correlation.middleware';
import { GatewayModule } from './modules/gateway/gateway.module';
import { IdentityModule } from './modules/identity/identity.module';
import { OriginationModule } from './modules/origination/origination.module';

/**
 * Servicio 1 — borde + identidad + saga (inciso I).
 *  - GatewayModule      → auth JWT, guard
 *  - IdentityModule     → applicants, OCR, KYC
 *  - OriginationModule  → saga (scoring → credit) + timeline
 */
@Module({
  imports: [DatabaseModule, GatewayModule, IdentityModule, OriginationModule],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
