import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeolocationController } from './geolocation.controller';

@Module({
  imports: [HttpModule],
  controllers: [GeolocationController],
})
export class GeolocationModule {}
