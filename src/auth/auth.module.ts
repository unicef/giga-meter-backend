import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from './auth.guard';
import { CategoryConfigModule } from '../category-config/category-config.module';
import { CategoryConfigProvider } from '../common/category-config.provider';

@Module({
  imports: [HttpModule, CategoryConfigModule],
  providers: [AuthGuard],
  exports: [AuthGuard, HttpModule],
})
export class AuthModule {}
