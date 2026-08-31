import { Global, Module } from '@nestjs/common';
import { CategoryConfigService } from './category-config.service';
import { CategoryConfigController } from './category-config.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { CategoryConfigProvider } from 'src/common/category-config.provider';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [CategoryConfigController],
  providers: [CategoryConfigService, PrismaService, CategoryConfigProvider],
  exports: [CategoryConfigService, HttpModule, CategoryConfigProvider],
})
export class CategoryConfigModule {}
