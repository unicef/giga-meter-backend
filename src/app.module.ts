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
import { CountryV2Controller } from './country/country.v2.controller';
import { CountryService } from './country/country.service';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { MeasurementController } from './measurement/measurement.controller';
import { MeasurementV2Controller } from './measurement/measurement.v2.controller';
import { MeasurementService } from './measurement/measurement.service';
import { MeasurementSandboxController } from './measurement/sandbox/sandbox.controller';
import { MeasurementSandboxService } from './measurement/sandbox/sandbox.service';
import { MeasurementServiceV2 } from './measurement/measurement.service.v2';
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
import { ConnectivityV2Controller } from './connectivity/connectivity.v2.controller';
import { ConnectivityService } from './connectivity/connectivity.service';
import { GeolocationModule } from './geolocation/geolocation.module';
import { NearestSchoolModule } from './nearest-school/nearest-school.module';
import { PublicController } from './public/public.controller';
import { PublicService } from './public/public.service';
import { CountryConfigModule } from './country-config/country-config.module';
import { SchoolRegistrationController } from './school-registration/school-registration.controller';
import { SchoolRegistrationGuard } from './school-registration/school-registration.guard';
import { SchoolRegistrationService } from './school-registration/school-registration.service';
import * as redisStore from 'cache-manager-redis-store';
import { DeviceTokenController } from './auth/device-token.controller';
import { DeviceTokenService } from './auth/device-token.service';
import { PingAggregationController } from './ping-aggregation/ping-aggregation.controller';
import { PingAggregationService } from './ping-aggregation/ping-aggregation.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler/scheduler.service';
import { AdminMeterModule } from './admin-meter/admin-meter.module';
import { TranslateModule } from './translate';
import { FeatureFlagModule } from './admin-meter/feature-flag/feature-flag.module';
import { FacilityTypeModule } from './facility-type/facility-type.module';
import { HealthModule } from './health/health.module';
import { RegistrationModule } from './registration/registration.module';
import { NearestFacilityModule } from './nearest-facility/nearest-facility.module';
import { ProtocolConfigController } from './protocol-config/protocol-config.controller';
import { ProtocolConfigService } from './protocol-config/protocol-config.service';

@Module({
  imports: [
    HttpModule,
    ThrottlerModule.forRoot([defaultRateLimitConfig.default]),
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
    ScheduleModule.forRoot(),
    CategoryConfigModule,
    CountryConfigModule,
    AuthModule,
    IpMetadataModule,
    GeolocationModule,
    NearestSchoolModule,
    AdminMeterModule,
    TranslateModule,
    FeatureFlagModule,
    FacilityTypeModule,
    HealthModule,
    RegistrationModule,
    NearestFacilityModule,
  ],
  controllers: [
    AppController,
    MessagesController,
    FlaggedSchoolController,
    SchoolController,
    SchoolMasterController,
    CountryController,
    CountryV2Controller,
    MeasurementController,
    MeasurementSandboxController,
    MeasurementV2Controller,
    AdminController,
    DataFixController,
    MetricsController,
    ConnectivityController,
    ConnectivityV2Controller,
    DeviceTokenController,
    PingAggregationController,
    PublicController,
    SchoolRegistrationController,
    ProtocolConfigController,
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
    MeasurementSandboxService,
    MeasurementServiceV2,
    AdminService,
    MetricsService,
    CategoryConfigProvider,
    DeviceTokenService,
    PingAggregationService,
    ConnectivityService,
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
    SchedulerService,
    ConnectivityService,
    PublicService,
    SchoolRegistrationGuard,
    SchoolRegistrationService,
    ProtocolConfigService,
  ],
})
export class AppModule {}
