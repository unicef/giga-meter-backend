import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeolocationController } from './geolocation.controller';
import { GeolocationUtility } from './geolocation.utility';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [GeolocationController],
  providers: [GeolocationUtility, PrismaService],
  exports: [GeolocationUtility],
})
export class GeolocationModule {}
