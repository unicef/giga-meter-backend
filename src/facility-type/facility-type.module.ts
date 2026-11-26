import { Module } from '@nestjs/common';
import { FacilityTypeService } from './facility-type.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [FacilityTypeService, PrismaService],
  exports: [FacilityTypeService],
})
export class FacilityTypeModule {}
