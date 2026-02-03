import { Module } from '@nestjs/common';
import { ContentController } from './controllers/content.controller';
import { MediaController } from './controllers/media.controller';
import { ContentService } from './services/content.service';
import { MediaService } from './services/media.service';
import { StorageService } from './services/storage.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContentController, MediaController],
  providers: [
    ContentService,
    MediaService,
    StorageService,
  ],
  exports: [ContentService, MediaService],
})
export class CmsModule { }
