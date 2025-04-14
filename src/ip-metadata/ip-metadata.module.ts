import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IpMetadataService } from './ip-metadata.service';
import { IpMetadataController } from './ip-metadata.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [IpMetadataController],
  providers: [IpMetadataService, PrismaService],
})
export class IpMetadataModule {}
