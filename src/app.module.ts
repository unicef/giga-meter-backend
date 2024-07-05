import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { MessagesService } from './messages/messages.service';
import { MessagesController } from './messages/messages.controller';
import { FlaggedSchoolService } from './flagged-school/flagged-school.service';
import { FlaggedSchoolController } from './flagged-school/flagged-school.controller';
import { SchoolController } from './school/school.controller';
import { SchoolService } from './school/school.service';
import { CountryController } from './country/country.controller';
import { CountryService } from './country/country.service';

@Module({
  imports: [HttpModule],
  controllers: [
    AppController,
    MessagesController,
    FlaggedSchoolController,
    SchoolController,
    CountryController,
  ],
  providers: [
    AppService,
    PrismaService,
    MessagesService,
    FlaggedSchoolService,
    SchoolService,
    CountryService,
  ],
})
export class AppModule {}
