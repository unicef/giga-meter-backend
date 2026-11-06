import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeolocationController } from './geolocation.controller';
import { GeolocationUtility } from './geolocation.utility';
import { GeolocationCircuit } from './geolocation.circuit';
import { GeolocationCache, GEOLOCATION_REDIS } from './geolocation.cache';

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
  providers: [
    GeolocationUtility,
    GeolocationCircuit,
    GeolocationCache,
    {
      provide: GEOLOCATION_REDIS,
      // The shared client connects when it is imported: load it only when the
      // provider is built, so tests that replace it never open a connection.
      useFactory: async () => (await import('../utils/redis.client')).default,
    },
  ],
  exports: [GeolocationUtility],
})
export class GeolocationModule {}
