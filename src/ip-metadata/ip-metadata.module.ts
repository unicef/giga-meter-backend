import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IpMetadataService } from './ip-metadata.service';
import { IpMetadataController } from './ip-metadata.controller';

/**
 * Upper bound for each IPInfo / GeoJS call. axios waits forever by default, and
 * a stale cached record is only served once the refresh gives up, so a hanging
 * upstream would otherwise hold the request open.
 */
export const IP_METADATA_API_TIMEOUT_MS = 5_000;

@Module({
  imports: [HttpModule.register({ timeout: IP_METADATA_API_TIMEOUT_MS })],
  controllers: [IpMetadataController],
  providers: [IpMetadataService],
})
export class IpMetadataModule {}
