import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TranslateController } from './controllers/translate.controller';
import { TranslateService } from './services/translate.service';

@Module({
  imports: [HttpModule],
  controllers: [TranslateController],
  providers: [TranslateService],
  exports: [TranslateService],
})
export class TranslateModule {}
