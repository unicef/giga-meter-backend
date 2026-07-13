import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from './auth.guard';
import { CategoryConfigModule } from '../category-config/category-config.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [HttpModule, CategoryConfigModule],
  providers: [AuthGuard, PrismaService],
  exports: [AuthGuard, HttpModule],
})
export class AuthModule {}
