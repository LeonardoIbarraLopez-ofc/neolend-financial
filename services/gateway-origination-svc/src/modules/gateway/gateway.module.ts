import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * Módulo de gateway de borde.
 * Responsabilidades: auth JWT, CORS, routing.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-only-change-me-super-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1h' },
    }),
  ],
  controllers: [GatewayController],
  providers: [GatewayService, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class GatewayModule {}
