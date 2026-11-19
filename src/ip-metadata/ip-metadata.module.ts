import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IpMetadataService } from './ip-metadata.service';
import { IpMetadataController } from './ip-metadata.controller';
import {
  IpInfoRefreshBudget,
  IP_METADATA_REDIS,
} from './ip-metadata.refresh-budget';

/**
 * Upper bound for each IPInfo / GeoJS call. axios waits forever by default, and
 * a stale cached record is only served once the refresh gives up, so a hanging
 * upstream would otherwise hold the request open.
 */
export const IP_METADATA_API_TIMEOUT_MS = 5_000;

@Module({
  imports: [HttpModule.register({ timeout: IP_METADATA_API_TIMEOUT_MS })],
  controllers: [IpMetadataController],
  providers: [
    IpMetadataService,
    IpInfoRefreshBudget,
    {
      provide: IP_METADATA_REDIS,
      // The shared client connects when it is imported: load it only when the
      // provider is built, so tests that replace it never open a connection.
      useFactory: async () => (await import('../utils/redis.client')).default,
    },
  ],
})
export class IpMetadataModule {}
