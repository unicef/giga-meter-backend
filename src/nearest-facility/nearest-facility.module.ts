import { Module } from '@nestjs/common';
import { NearestFacilityController } from './nearest-facility.controller';
import { NearestFacilityService } from './nearest-facility.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [NearestFacilityController],
  providers: [NearestFacilityService, PrismaService],
  exports: [NearestFacilityService],
})
export class NearestFacilityModule {}
