import { Module } from '@nestjs/common';
import { NearestFacilityController } from './nearest-facility.controller';
import { NearestFacilityV2Controller } from './nearest-facility.v2.controller';
import { NearestFacilityService } from './nearest-facility.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [NearestFacilityController, NearestFacilityV2Controller],
  providers: [NearestFacilityService, PrismaService],
  exports: [NearestFacilityService],
})
export class NearestFacilityModule {}
