import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, PrismaService],
  exports: [HealthService],
})
export class HealthModule {}
