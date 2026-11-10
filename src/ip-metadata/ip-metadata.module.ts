import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IpMetadataService } from './ip-metadata.service';
import { IpMetadataController } from './ip-metadata.controller';

@Module({
  imports: [HttpModule],
  controllers: [IpMetadataController],
  providers: [IpMetadataService],
})
export class IpMetadataModule {}
