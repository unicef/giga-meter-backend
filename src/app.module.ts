import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { MessagesService } from './messages/messages.service';
import { MessagesController } from './messages/messages.controller';
import { FlaggedSchoolService } from './flagged-school/flagged-school.service';
import { FlaggedSchoolController } from './flagged-school/flagged-school.controller';

@Module({
  imports: [HttpModule],
  controllers: [AppController, MessagesController, FlaggedSchoolController],
  providers: [AppService, PrismaService, MessagesService, FlaggedSchoolService],
})
export class AppModule {}
