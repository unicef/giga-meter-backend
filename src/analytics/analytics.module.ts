import { Global, Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

/** Server-side PostHog events. Global, like PrismaModule. */
@Global()
@Module({
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
