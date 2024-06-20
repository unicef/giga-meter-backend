import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagesService } from './messages/messages.service';
import { PrismaService } from './prisma/prisma.service';
import { MessagesController } from './messages/messages.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [AppController, MessagesController],
  providers: [AppService, MessagesService, PrismaService],
})
export class AppModule {}
