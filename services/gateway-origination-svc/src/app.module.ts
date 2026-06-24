import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { Applicant } from './modules/identity/applicant.entity';
import { IdentityModule } from './modules/identity/identity.module';
import { LoanApplication } from './modules/origination/loan-application.entity';
import { OriginationModule } from './modules/origination/origination.module';
import { SagaState } from './modules/origination/saga-state.entity';

const ENTITIES = [Applicant, LoanApplication, SagaState];

function dbConfig(): TypeOrmModuleOptions {
  if (process.env.USE_SQLITE === 'true') {
    return {
      type: 'better-sqlite3',
      database: process.env.GATEWAY_DB_PATH ?? './data/gateway.sqlite',
      entities: ENTITIES,
      synchronize: true,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.ORIGINATION_DB_USER ?? 'origination_user',
    password: process.env.ORIGINATION_DB_PASSWORD ?? '',
    database: process.env.ORIGINATION_DB_NAME ?? 'origination_db',
    entities: ENTITIES,
    synchronize: false,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRoot(dbConfig()),
    AuthModule,
    IdentityModule,
    OriginationModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
