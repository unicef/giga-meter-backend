import { Module } from '@nestjs/common';
import { EntityTypeService } from './entity-type.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [EntityTypeService, PrismaService],
  exports: [EntityTypeService],
})
export class EntityTypeModule {}
