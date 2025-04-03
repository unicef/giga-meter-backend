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

@Module({
  imports: [
    HttpModule,
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
  ],
})
export class AppModule {}
