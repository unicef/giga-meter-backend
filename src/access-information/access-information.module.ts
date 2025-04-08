import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AccessInformationService } from './access-information.service';
import { AccessInformationController } from './access-information.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [AccessInformationController],
  providers: [AccessInformationService, PrismaService],
})
export class AccessInformationModule {}
