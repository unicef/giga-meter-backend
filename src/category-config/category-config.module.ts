import { Module } from '@nestjs/common';
import { CategoryConfigService } from './category-config.service';
import { CategoryConfigController } from './category-config.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [CategoryConfigController],
  providers: [CategoryConfigService, PrismaService],
  exports: [CategoryConfigService, HttpModule],
})
export class CategoryConfigModule {}
