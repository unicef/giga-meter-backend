import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntityTypeModule } from '../entity-type/entity-type.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [EntityTypeModule, HealthModule],
  controllers: [RegistrationController],
  providers: [RegistrationService, PrismaService],
})
export class RegistrationModule {}
