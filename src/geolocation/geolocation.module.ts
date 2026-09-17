import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeolocationController } from './geolocation.controller';
import { GeolocationUtility } from './geolocation.utility';
import { PrismaService } from '../prisma/prisma.service';
import { GeolocationCircuit } from './geolocation.circuit';

/**
 * Upper bound for each call this module makes to Google. axios waits forever by
 * default, so a slow upstream used to keep the client's request open with it.
 * Kept below the 10 s the Windows client allows one geolocate request, so the
 * client gets an answer (a 504) before it gives up on its side.
 */
export const GOOGLE_API_TIMEOUT_MS = 8_000;

@Module({
  imports: [HttpModule.register({ timeout: GOOGLE_API_TIMEOUT_MS })],
  controllers: [GeolocationController],
  providers: [GeolocationUtility, PrismaService, GeolocationCircuit],
  exports: [GeolocationUtility],
})
export class GeolocationModule {}
