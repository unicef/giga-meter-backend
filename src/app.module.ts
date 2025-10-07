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
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CategoryGuard } from './common/category.guard';
import { CategoryResponseInterceptor } from './common/category.interceptor';
import { AuthGuard } from './auth/auth.guard';
import { CategoryConfigModule } from './category-config/category-config.module';
import { CategoryConfigProvider } from './common/category-config.provider';
import { AuthModule } from './auth/auth.module';
import { IpMetadataModule } from './ip-metadata/ip-metadata.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { defaultRateLimitConfig } from './config/rate-limit.config';
import { CacheModule } from '@nestjs/cache-manager';
import { CACHE_TTL } from './config/cache.config';
import { ConnectivityController } from './connectivity/connectivity.controller';
import { ConnectivityService } from './connectivity/connectivity.service';
import { DeltaLakeScheduler } from './scheduler/delta-lake/delta-lake.scheduler';
import * as redisStore from 'cache-manager-redis-store';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    HttpModule,
    ThrottlerModule.forRoot([defaultRateLimitConfig.default]),
    ScheduleModule.forRoot(),

    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      ttl: CACHE_TTL,
      max: 5000,
    }),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true, // Enable collection of default metrics like CPU, memory, etc.
      },
    }),
    CategoryConfigModule,
    AuthModule,
    IpMetadataModule,
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
    CategoryConfigProvider,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CategoryGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CategoryResponseInterceptor,
    },
    ConnectivityService,
    DeltaLakeScheduler,
  ],
})
export class AppModule {}
