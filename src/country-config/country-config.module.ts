import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CountryConfigController } from './country-config.controller';
import { CountryConfigService } from './country-config.service';

@Module({
  controllers: [CountryConfigController],
  providers: [CountryConfigService, PrismaService],
  exports: [CountryConfigService],
})
export class CountryConfigModule {}
