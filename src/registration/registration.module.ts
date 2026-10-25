import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { RegistrationV2Controller } from './registration.v2.controller';
import { RegistrationService } from './registration.service';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityTypeModule } from '../facility-type/facility-type.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [FacilityTypeModule, HealthModule],
  controllers: [RegistrationController, RegistrationV2Controller],
  providers: [RegistrationService, PrismaService],
  exports: [RegistrationService],
})
export class RegistrationModule {}
