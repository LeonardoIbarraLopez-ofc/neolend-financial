import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database.module';
import { HealthController } from './health.controller';
import { MetricsService } from './modules/metrics/metrics.service';
import { MetricsController } from './modules/metrics/metrics.controller';
import { ProjectionsService } from './modules/projections/projections.service';
import { ProjectionsController } from './modules/projections/projections.controller';
import { StreamGateway } from './modules/stream/stream.gateway';
import { StreamService } from './modules/stream/stream.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, MetricsController, ProjectionsController],
  providers: [MetricsService, ProjectionsService, StreamGateway, StreamService],
})
export class AppModule {}
