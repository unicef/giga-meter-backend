import { Test, TestingModule } from '@nestjs/testing';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';

describe('SchoolController', () => {
  let controller: SchoolController;
  let service: SchoolService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SchoolController],
      providers: [SchoolService, PrismaService, AuthGuard],
      imports: [HttpModule],
    }).compile();

    controller = app.get<SchoolController>(SchoolController);
    service = app.get<SchoolService>(SchoolService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });
});
