import { Module } from '@nestjs/common';
import { NearestSchoolController } from './nearest-school.controller';
import { NearestSchoolService } from './nearest-school.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [NearestSchoolController],
  providers: [NearestSchoolService, PrismaService],
  exports: [NearestSchoolService],
})
export class NearestSchoolModule {}