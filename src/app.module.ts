import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { MessagesService } from './messages/messages.service';
import { MessagesController } from './messages/messages.controller';
import { FlaggedSchoolService } from './flagged-school/flagged-school.service';
import { FlaggedSchoolController } from './flagged-school/flagged-school.controller';
import { SchoolController } from './school/school.controller';
import { SchoolService } from './school/school.service';
import { CountryController } from './country/country.controller';
import { CountryService } from './country/country.service';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { MeasurementController } from './measurement/measurement.controller';
import { MeasurementService } from './measurement/measurement.service';
import { SchoolMasterController } from './school-master/school-master.controller';
import { SchoolMasterService } from './school-master/school-master.service';
import { DataFixController } from './data-fix/data-fix.controller';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { defaultRateLimitConfig } from './config/rate-limit.config';
import { CacheModule } from '@nestjs/cache-manager';
import { DEFAULT_CACHE_TTL } from './config/cache.config';
import { ConnectivityController } from './connectivity/connectivity.controller';
import { ConnectivityService } from './connectivity/connectivity.service';
// Redis store import
import { redisStore } from 'cache-manager-redis-yet';

const cacheEnabled = process.env.NO_CACHE === 'true';

@Module({
  imports: [
    HttpModule,
    ThrottlerModule.forRoot([defaultRateLimitConfig.default]),
    // Conditionally register CacheModule with Redis if caching is enabled
    (!cacheEnabled ? CacheModule.registerAsync({
      isGlobal: false, // Not global, use per-controller/route
      useFactory: async () => ({
        store: await redisStore({
          url: process.env.REDIS_URL || 'redis://localhost:6379',
        }),
        ttl: DEFAULT_CACHE_TTL * 1000, // ms
        max: 5000,
      }),
    }) : null),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true, // Enable collection of default metrics like CPU, memory, etc.
      },
    }),
  ],
  controllers: [
    AppController,
    MessagesController,
    FlaggedSchoolController,
    SchoolController,
    SchoolMasterController,
    CountryController,
    MeasurementController,
    AdminController,
    DataFixController,
    MetricsController,
    ConnectivityController,
  ],
  providers: [
    AppService,
    PrismaService,
    MessagesService,
    FlaggedSchoolService,
    SchoolService,
    SchoolMasterService,
    CountryService,
    MeasurementService,
    AdminService,
    MetricsService,
    ConnectivityService,
    // No APP_INTERCEPTOR for CacheInterceptor here!
  ],
})
export class AppModule {}
